import { useCallback, useEffect, useMemo, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { InfiniteData } from "@tanstack/react-query"
import { useActorRef, useSelector } from "@xstate/react"

import { visitsQueries } from "@/features/visits/api/queries"
import { visitsApi } from "@/features/visits/api"
import { visitsQueryKeys } from "@/features/visits/api/queries"
import type { VisitSession } from "@/features/visits/api/types"
import { workbenchApi } from "@/features/workbench/api"
import { workbenchQueryKeys } from "@/features/workbench/api/queries"
import type {
  FlowCard,
  FlowCardAction,
  FlowCardTimelineItem,
  ListTimelineResult,
  ReportVitalsInput,
  TimelineItem,
} from "@/features/workbench/api"
import { visitMachine } from "@/features/workbench/machine/visit-machine"
import type { VisitMachineContext } from "@/features/workbench/machine/visit-machine.types"
import type { VisitMachineState, TerminalReason } from "@/lib/api/types"
import { useComposerStore } from "@/features/workbench/store/composer-store"
import { useTimeline } from "@/features/workbench/hooks/useTimeline"
import {
  createOptimisticPatientMessage,
  createStreamingAssistantMessage,
  createSystemEventItem,
  generateClientMessageId,
} from "@/features/workbench/utils/timeline-merge"
import { useFlowCardAction } from "@/features/workbench/hooks/useFlowCardAction"
import { useAssistantStream } from "@/features/workbench/hooks/useAssistantStream"

// ---- 公开类型 ----

export interface UseWorkbenchSessionActions {
  sendMessage: (content: string) => Promise<void>
  submitFlowAction: (action: FlowCardAction) => Promise<void>
  requestExit: () => void
  confirmExit: () => Promise<void>
  pauseVisit: () => Promise<void>
  resumeVisit: () => Promise<void>
  reportVitals: (input: ReportVitalsInput) => Promise<void>
}

export interface UseWorkbenchSessionResult {
  session?: VisitSession
  items: TimelineItem[]
  state: string
  context: VisitMachineContext
  blockingCard?: FlowCard
  loading: boolean
  error?: string
  hasMore: boolean
  fetchMore: () => void
  isFetchingMore: boolean
  isStreaming: boolean
  actions: UseWorkbenchSessionActions
}

export interface UseWorkbenchSessionOptions {
  onFollowUpCreated?: (sessionId: string) => void
}

// ---- 内部辅助函数 ----

/**
 * 从时间线 items 中找到最后一条 status 为 "pending" 的 FlowCardTimelineItem。
 */
function findPendingCard(items: TimelineItem[]): FlowCard | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    if (
      item.kind === "flow_card" &&
      item.card.blocking &&
      item.card.status === "pending"
    ) {
      return item.card
    }
  }
  return undefined
}

/**
 * 将 VisitSession.status 与当前阻塞卡（如有）映射到 VisitMachineState。
 *
 * 终止态直接映射 → "terminated"
 * blocked 态由 card.kind 反推对应机器态
 * 非 blocked 态直接映射 status → state
 */
function resolveHydrationTarget(
  session: VisitSession,
  currentCard?: FlowCard,
): {
  targetState: VisitMachineState
  currentCardId?: string
  terminalReason?: TerminalReason
} {
  const { status } = session

  // 终止态直接映射
  if (
    status === "transferred" ||
    status === "emergency_terminated" ||
    status === "exited"
  ) {
    return {
      targetState: "terminated",
      terminalReason: session.terminalReason,
    }
  }

  // blocked 态由 currentCard.kind 反推
  if (status === "blocked" && currentCard) {
    const kind = currentCard.kind
    if (kind === "lab_decision") {
      return { targetState: "labDecision", currentCardId: currentCard.id }
    }
    if (kind === "payment") {
      return {
        targetState:
          currentCard.purpose === "medication"
            ? "medicationPayment"
            : "labPayment",
        currentCardId: currentCard.id,
      }
    }
    if (kind === "lab_execution") {
      return { targetState: "labExecution", currentCardId: currentCard.id }
    }
    if (kind === "medication_fulfillment") {
      return {
        targetState: "medicationFulfillment",
        currentCardId: currentCard.id,
      }
    }
    if (kind === "treatment_execution") {
      return {
        targetState: "treatmentExecution",
        currentCardId: currentCard.id,
      }
    }
  }

  // 非 blocked 态直接映射
  const directMap: Partial<Record<string, VisitMachineState>> = {
    loading_context: "loadingContext",
    chatting: "chatting",
    analyzing: "analyzing",
    diagnosis: "diagnosis",
    treatment: "treatmentDecision",
    completed: "completed",
  }

  if (status in directMap) {
    return {
      targetState: directMap[status]!,
      currentCardId: session.activeCardId,
    }
  }

  // 兜底
  return { targetState: "chatting" }
}

// ---- 内部 cache 操作辅助 ----

/**
 * 在 InfiniteData 的最后一个 page 追加一个 item。
 */
function appendToLastPage(
  data: InfiniteData<ListTimelineResult>,
  item: TimelineItem,
): InfiniteData<ListTimelineResult> {
  if (data.pages.length === 0) return data
  const pages = [...data.pages]
  const lastPage = { ...pages[pages.length - 1] }
  lastPage.items = [...lastPage.items, item]
  pages[pages.length - 1] = lastPage
  return { ...data, pages }
}

function upsertItemsInPages(
  data: InfiniteData<ListTimelineResult>,
  incomingItems: TimelineItem[],
): InfiniteData<ListTimelineResult> {
  if (data.pages.length === 0 || incomingItems.length === 0) return data

  const pages = data.pages.map((page) => ({ ...page, items: [...page.items] }))
  const lastPage = pages[pages.length - 1]

  for (const incoming of incomingItems) {
    let replaced = false
    for (const page of pages) {
      const index = page.items.findIndex((item) => {
        if (item.id === incoming.id) return true
        return (
          item.kind === "flow_card" &&
          incoming.kind === "flow_card" &&
          item.card.id === incoming.card.id
        )
      })
      if (index >= 0) {
        page.items[index] = incoming
        replaced = true
        break
      }
    }
    if (!replaced) {
      lastPage.items.push(incoming)
    }
  }

  return { ...data, pages }
}

/**
 * 在 InfiniteData 的所有 pages 中找到匹配 id 的 item 并替换。
 */
function replaceItemInPages(
  data: InfiniteData<ListTimelineResult>,
  itemId: string,
  newItem: TimelineItem,
): InfiniteData<ListTimelineResult> {
  const pages = data.pages.map((page) => ({
    ...page,
    items: page.items.map((item) =>
      item.id === itemId ? newItem : item,
    ),
  }))
  return { ...data, pages }
}

/**
 * 在 InfiniteData 的所有 pages 中找到匹配 id 的 item 并更新 status。
 */
function updateItemStatusInPages(
  data: InfiniteData<ListTimelineResult>,
  itemId: string,
  status: TimelineItem["status"],
): InfiniteData<ListTimelineResult> {
  const pages = data.pages.map((page) => ({
    ...page,
    items: page.items.map((item) =>
      item.id === itemId ? ({ ...item, status } as TimelineItem) : item,
    ),
  }))
  return { ...data, pages }
}

/**
 * 在 InfiniteData 的所有 pages 中找到匹配 card.id 的 FlowCardTimelineItem 并更新其 card。
 */
function updateCardInPages(
  data: InfiniteData<ListTimelineResult>,
  cardId: string,
  updater: (card: FlowCard) => FlowCard,
): InfiniteData<ListTimelineResult> {
  const pages = data.pages.map((page) => ({
    ...page,
    items: page.items.map((item) => {
      if (item.kind === "flow_card" && item.card.id === cardId) {
        return { ...item, card: updater(item.card) } as FlowCardTimelineItem
      }
      return item
    }),
  }))
  return { ...data, pages }
}

// ---- Hook ----

/**
 * useWorkbenchSession：工作台主链路总装点。
 *
 * 组合 Query cache、XState 状态机、SSE 流式回复和 facade actions 为统一的 hook。
 * 供 WorkbenchPage 消费。
 */
export function useWorkbenchSession(
  sessionId: string,
  options: UseWorkbenchSessionOptions = {},
): UseWorkbenchSessionResult {
  const { onFollowUpCreated } = options

  // ---- Query ----
  const sessionQuery = useQuery(visitsQueries.session(sessionId))
  const queryClient = useQueryClient()

  // ---- Timeline ----
  const {
    items,
    fetchNextPage,
    hasMore,
    isFetching: isFetchingMore,
    isLoading: timelineLoading,
  } = useTimeline(sessionId)

  // ---- XState Actor ----
  const actorRef = useActorRef(visitMachine)
  const stateValue = useSelector(actorRef, (snapshot) => snapshot.value)
  const machineContext = useSelector(actorRef, (snapshot) => snapshot.context)

  // 将 stateValue 转为字符串，用于 UI 判断
  const stateLabel =
    typeof stateValue === "string" ? stateValue : "loadingContext"

  // ---- Hydration ----
  const hydratedSessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Session 数据未就绪或已水合，跳过
    if (!sessionQuery.data || hydratedSessionIdRef.current === sessionId) return

    const session = sessionQuery.data
    if (session.status === "blocked" && timelineLoading) return

    const currentCard = findPendingCard(items)
    const { targetState, currentCardId, terminalReason } =
      resolveHydrationTarget(session, currentCard)

    actorRef.send({
      type: "HYDRATE",
      state: targetState,
      session,
      currentCardId,
      terminalReason,
    })

    if (session.status === "blocked" && !currentCard) {
      queryClient.setQueryData<InfiniteData<ListTimelineResult>>(
        workbenchQueryKeys.timeline(sessionId),
        (old) => {
          if (!old) return old
          return appendToLastPage(
            old,
            createSystemEventItem(
              sessionId,
              "agent_thinking",
              "当前阻塞卡片已失效",
              "系统已恢复普通问诊输入。",
            ),
          )
        },
      )
    }

    hydratedSessionIdRef.current = sessionId
  }, [sessionQuery.data, timelineLoading, items, actorRef, queryClient, sessionId])

  // ---- blockingCard ----
  const blockingCard = useMemo(() => {
    if (!machineContext.currentCardId) return undefined
    const found = items.find(
      (item): item is FlowCardTimelineItem =>
        item.kind === "flow_card" &&
        item.card.id === machineContext.currentCardId,
    )
    return found?.card
  }, [machineContext.currentCardId, items])

  // ---- Assistant Stream (P4.2) ----
  const {
    startStream,
    abortStream,
    isStreaming,
  } = useAssistantStream({
    sessionId,
    sendMachineEvent: (event) => {
      actorRef.send(event)
    },
    appendTimelineItem: useCallback(
      (item: TimelineItem) => {
        queryClient.setQueryData<InfiniteData<ListTimelineResult>>(
          workbenchQueryKeys.timeline(sessionId),
          (old) => {
            if (!old) return old
            return appendToLastPage(old, item)
          },
        )
      },
      [queryClient, sessionId],
    ),
    updateTimelineItem: useCallback(
      (itemId: string, updater: (item: TimelineItem) => TimelineItem) => {
        queryClient.setQueryData<InfiniteData<ListTimelineResult>>(
          workbenchQueryKeys.timeline(sessionId),
          (old) => {
            if (!old) return old
            const pages = old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === itemId ? updater(item) : item,
              ),
            }))
            return { ...old, pages }
          },
        )
      },
      [queryClient, sessionId],
    ),
  })

  // ---- Flow Card Actions (P4.3) ----
  const findCardById = useCallback(
    (cardId: string): FlowCard | undefined => {
      for (const item of items) {
        if (item.kind === "flow_card" && item.card.id === cardId) {
          return item.card
        }
      }
      return undefined
    },
    [items],
  )

  const { handleAction } = useFlowCardAction({
    sessionId,
    sendMachineEvent: (event) => {
      actorRef.send(event)
    },
    updateCardInTimeline: useCallback(
      (cardId: string, updater: (card: FlowCard) => FlowCard) => {
        queryClient.setQueryData<InfiniteData<ListTimelineResult>>(
          workbenchQueryKeys.timeline(sessionId),
          (old) => {
            if (!old) return old
            return updateCardInPages(old, cardId, updater)
          },
        )
      },
      [queryClient, sessionId],
    ),
    upsertTimelineItems: useCallback(
      (newItems: TimelineItem[]) => {
        queryClient.setQueryData<InfiniteData<ListTimelineResult>>(
          workbenchQueryKeys.timeline(sessionId),
          (old) => {
            if (!old) return old
            return upsertItemsInPages(old, newItems)
          },
        )
      },
      [queryClient, sessionId],
    ),
    findCardById,
  })

  // ---- Actions ----

  const appendTimelineItem = useCallback(
    (item: TimelineItem) => {
      queryClient.setQueryData<InfiniteData<ListTimelineResult>>(
        workbenchQueryKeys.timeline(sessionId),
        (old) => {
          if (!old) return old
          return appendToLastPage(old, item)
        },
      )
    },
    [queryClient, sessionId],
  )

  const handleCompletedMessage = useCallback(
    async (content: string) => {
      const intent = await workbenchApi.classifyFollowUpIntent({
        sessionId,
        content,
      })

      useComposerStore.getState().clearDraft(sessionId)

      if (intent.intent === "follow_up") {
        const result = await visitsApi.createFollowUp({
          patientId: sessionQuery.data?.patientId ?? "patient-mock-001",
          parentSessionId: sessionId,
          chiefComplaint: content,
        })
        queryClient.setQueryData(
          visitsQueryKeys.session(result.session.id),
          result.session,
        )
        queryClient.invalidateQueries({ queryKey: visitsQueryKeys.all })
        onFollowUpCreated?.(result.session.id)
        return
      }

      const clientMessageId = generateClientMessageId()
      appendTimelineItem(
        createOptimisticPatientMessage(content, clientMessageId, sessionId),
      )
      actorRef.send({ type: "FOLLOW_UP_MESSAGE_SENT", content })

      if (intent.intent === "consultation") {
        const streamMsg = createStreamingAssistantMessage(sessionId)
        appendTimelineItem(streamMsg)
        startStream({
          streamMessageId: streamMsg.id,
          mode: "consultation",
          content,
        })
        return
      }

      appendTimelineItem(
        createSystemEventItem(
          sessionId,
          "agent_thinking",
          "请补充复诊意图",
          "可以直接描述新症状，或针对本次诊断、用药和观察建议继续提问。",
        ),
      )
    },
    [
      actorRef,
      appendTimelineItem,
      onFollowUpCreated,
      queryClient,
      sessionId,
      sessionQuery.data?.patientId,
      startStream,
    ],
  )

  /** 发送消息（P4.2：集成 SSE 流式回复） */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return
      if (stateLabel === "completed") {
        await handleCompletedMessage(content.trim())
        return
      }

      const clientMessageId = generateClientMessageId()

      // 1. 乐观插入患者消息到 timeline cache
      const optimisticItem = createOptimisticPatientMessage(
        content,
        clientMessageId,
        sessionId,
      )
      queryClient.setQueryData<InfiniteData<ListTimelineResult>>(
        workbenchQueryKeys.timeline(sessionId),
        (old) => {
          if (!old) return old
          return appendToLastPage(old, optimisticItem)
        },
      )

      // 2. 清空草稿
      useComposerStore.getState().clearDraft(sessionId)

      // 3. 发送状态机事件
      actorRef.send({ type: "MESSAGE_SENT", content, clientMessageId })

      // 4. 调用 sendMessage API
      try {
        const result = await workbenchApi.sendMessage({
          sessionId,
          content,
          clientMessageId,
        })

        // 用服务端返回的正式消息替换乐观消息
        queryClient.setQueryData<InfiniteData<ListTimelineResult>>(
          workbenchQueryKeys.timeline(sessionId),
          (old) => {
            if (!old) return old
            return replaceItemInPages(old, clientMessageId, result.patientMessage)
          },
        )

        // 5. 创建 streaming assistant 占位消息并追加到 timeline
        const streamMsg =
          result.assistantPlaceholder ?? createStreamingAssistantMessage(sessionId)
        queryClient.setQueryData<InfiniteData<ListTimelineResult>>(
          workbenchQueryKeys.timeline(sessionId),
          (old) => {
            if (!old) return old
            return appendToLastPage(old, streamMsg)
          },
        )

        // 6. 启动 SSE 流式回复
        startStream({ streamMessageId: streamMsg.id })
      } catch {
        // 标记乐观消息失败
        queryClient.setQueryData<InfiniteData<ListTimelineResult>>(
          workbenchQueryKeys.timeline(sessionId),
          (old) => {
            if (!old) return old
            return updateItemStatusInPages(old, clientMessageId, "failed")
          },
        )
      }
    },
    [
      sessionId,
      stateLabel,
      handleCompletedMessage,
      actorRef,
      queryClient,
      startStream,
    ],
  )

  /** 提交流程卡片操作（P4.3：通过 useFlowCardAction 分发到真实 API + cache 更新 + 状态机事件） */
  const submitFlowAction = useCallback(
    async (action: FlowCardAction) => {
      await handleAction(action)
      await queryClient.invalidateQueries({
        queryKey: visitsQueryKeys.session(sessionId),
      })
      await queryClient.invalidateQueries({ queryKey: visitsQueryKeys.list() })
    },
    [handleAction, queryClient, sessionId],
  )

  /** 请求退出 */
  const requestExit = useCallback(() => {
    abortStream("exit")
    actorRef.send({ type: "EXIT_REQUESTED" })
  }, [abortStream, actorRef])

  /** 确认退出 */
  const confirmExit = useCallback(async () => {
    await workbenchApi.exitVisit({ sessionId, reason: "patient_request" })
    actorRef.send({ type: "EXIT_CONFIRMED" })
  }, [sessionId, actorRef])

  /** 暂停计时 */
  const pauseVisit = useCallback(async () => {
    await workbenchApi.pauseVisitTimer({ sessionId })
    actorRef.send({ type: "TIMER_PAUSED" })
  }, [sessionId, actorRef])

  /** 恢复计时 */
  const resumeVisit = useCallback(async () => {
    await workbenchApi.resumeVisitTimer({ sessionId })
    actorRef.send({ type: "TIMER_RESUMED" })
  }, [sessionId, actorRef])

  /** 上报急症体征 */
  const reportVitals = useCallback(
    async (input: ReportVitalsInput) => {
      const result = await workbenchApi.reportVitals(input)
      if (result.emergency) {
        abortStream("emergency")
        actorRef.send({
          type: "EMERGENCY_DETECTED",
          source: input.source,
        })
      }
    },
    [abortStream, actorRef],
  )

  // ---- Compose result ----

  const loading = sessionQuery.isLoading || timelineLoading
  const error = sessionQuery.error?.message ?? undefined

  const actions: UseWorkbenchSessionActions = {
    sendMessage,
    submitFlowAction,
    requestExit,
    confirmExit,
    pauseVisit,
    resumeVisit,
    reportVitals,
  }

  return {
    session: sessionQuery.data,
    items,
    state: stateLabel,
    context: machineContext,
    blockingCard,
    loading,
    error,
    hasMore,
    fetchMore: fetchNextPage,
    isFetchingMore,
    isStreaming,
    actions,
  }
}
