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
import { mapTimelineItemToMachineEvent } from "@/features/workbench/utils/card-normalizers"
import { useTimeline } from "@/features/workbench/hooks/useTimeline"
import {
  createOptimisticPatientMessage,
  createStreamingAssistantMessage,
  createSystemEventItem,
  createTerminalItem,
  generateClientMessageId,
  timelineItemsShareIdentity,
} from "@/features/workbench/utils/timeline-merge"
import { useFlowCardAction } from "@/features/workbench/hooks/useFlowCardAction"
import { useAssistantStream } from "@/features/workbench/hooks/useAssistantStream"
import { useSessionTitleGeneration } from "@/features/workbench/hooks/useSessionTitleGeneration"

// ---- 公开类型 ----

export interface UseWorkbenchSessionActions {
  sendMessage: (content: string) => Promise<void>
  askLockedQuestion: (content: string, cardId: string) => Promise<void>
  submitFlowAction: (action: FlowCardAction) => Promise<void>
  requestExit: () => void
  confirmExit: () => Promise<void>
  pauseVisit: () => Promise<void>
  resumeVisit: () => Promise<void>
  reportVitals: (input: ReportVitalsInput) => Promise<void>
  /** 急症误报恢复：还原会话 + 追加系统事件 + EMERGENCY_DISMISSED。 */
  dismissEmergency: () => Promise<void>
  /** 确认急症（前往急诊）：EMERGENCY_CONFIRMED → terminated。 */
  confirmEmergency: () => void
  /** 到期触发超时终止：abort 流 + VISIT_TIMEOUT → terminated(timeout)。 */
  triggerTimeout: () => void
  /** 空闲到期自动挂起：abort 流 + 持久化 suspended + VISIT_SUSPENDED。非终态，可复诊继续。 */
  suspendVisit: () => Promise<void>
  /** 从挂起态继续：按复诊流程创建新 session 并跳转（可携带刚输入的主诉）。 */
  resumeFromSuspended: (content?: string) => Promise<void>
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

export function findBlockingCard(
  items: TimelineItem[],
  currentCardId?: string,
): FlowCard | undefined {
  if (!currentCardId) return undefined

  const found = items.find(
    (item): item is FlowCardTimelineItem =>
      item.kind === "flow_card" && item.card.id === currentCardId,
  )
  if (!found?.card.blocking || found.card.status !== "pending") {
    return undefined
  }

  return found.card
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
    suspended: "suspended",
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
      const index = page.items.findIndex((item) =>
        timelineItemsShareIdentity(item, incoming),
      )
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
      item.id === itemId || timelineItemsShareIdentity(item, newItem)
        ? newItem
        : item,
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

  // ---- XState Actor ----
  const actorRef = useActorRef(visitMachine)
  const stateValue = useSelector(actorRef, (snapshot) => snapshot.value)
  const machineContext = useSelector(actorRef, (snapshot) => snapshot.context)

  // 将 stateValue 转为字符串，用于 UI 判断
  const stateLabel =
    typeof stateValue === "string" ? stateValue : "loadingContext"

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
  })

  // ---- Timeline Polling ----
  // 检验/药品支付后无 SSE 流，通过轮询 timeline 获取后端异步更新的结果
  const isPollingEligibleState =
    stateLabel === "labExecution" || stateLabel === "medicationFulfillment"
  const shouldPoll = isPollingEligibleState && !isStreaming
  const pollInterval = shouldPoll
    ? Number(import.meta.env.VITE_TIMELINE_POLL_INTERVAL_MS ?? 5000)
    : false

  // ---- Timeline ----
  const {
    items,
    fetchNextPage,
    hasMore,
    isFetching: isFetchingMore,
    isLoading: timelineLoading,
  } = useTimeline(sessionId, pollInterval)

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
    return findBlockingCard(items, machineContext.currentCardId)
  }, [machineContext.currentCardId, items])

  // ---- 轮询新卡检测 ----
  // 轮询获取到新 flow card 时驱动状态机。processedCardIdsRef 记录已处理卡片 ID，
  // 防重复触发（SSE/action 响应/初始加载中的卡片在进入轮询态时预填充）。
  const processedCardIdsRef = useRef(new Set<string>())

  // 状态进入轮询资格态时预填充已有卡片 ID；离开时清空
  useEffect(() => {
    if (isPollingEligibleState) {
      processedCardIdsRef.current = new Set(
        items
          .filter(
            (item): item is FlowCardTimelineItem =>
              item.kind === "flow_card",
          )
          .map((item) => item.card.id),
      )
    } else {
      processedCardIdsRef.current = new Set()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPollingEligibleState])

  // 检测轮询到的新 flow card 并发送状态机事件
  useEffect(() => {
    if (!isPollingEligibleState) return

    for (const item of items) {
      if (item.kind !== "flow_card") continue
      if (processedCardIdsRef.current.has(item.card.id)) continue
      processedCardIdsRef.current.add(item.card.id)

      const event = mapTimelineItemToMachineEvent(item)
      if (event) {
        actorRef.send(event)
      }
    }
  }, [items, isPollingEligibleState, actorRef])

  // ---- 会话标题生成 ----
  // 首轮 AI 回复完成后，自动触发后端 LLM 总结会话标题。
  useSessionTitleGeneration(sessionId, isStreaming)

  // ---- 首轮自动回复 ----
  // 从首页/新建会话进入工作台时，createSession 已把主诉写成首条患者消息，但
  // 不会自动触发 AI 回复（只有 sendMessage 才启动 stream）。这里在全新 chatting
  // 会话、且时间线最后一条实质消息是「未被回复的患者消息」时，自动启动首轮流式回复，
  // 否则用户进来只看到自己那句话、AI 永远不回，像「没进聊天」。
  const autoRepliedSessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (autoRepliedSessionIdRef.current === sessionId) return
    // 等 hydration 完成、时间线就绪
    if (hydratedSessionIdRef.current !== sessionId) return
    if (stateLabel !== "chatting" || isStreaming) return
    if (items.length === 0) return

    // 找最后一条 message
    let lastMessage: TimelineItem | undefined
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].kind === "message") {
        lastMessage = items[i]
        break
      }
    }
    if (
      !lastMessage ||
      lastMessage.kind !== "message" ||
      lastMessage.role !== "patient"
    ) {
      return
    }

    autoRepliedSessionIdRef.current = sessionId

    const streamMsg = createStreamingAssistantMessage(sessionId)
    queryClient.setQueryData<InfiniteData<ListTimelineResult>>(
      workbenchQueryKeys.timeline(sessionId),
      (old) => {
        if (!old) return old
        return appendToLastPage(old, streamMsg)
      },
    )
    actorRef.send({
      type: "MESSAGE_SENT",
      content: lastMessage.content,
      clientMessageId: generateClientMessageId(),
    })
    startStream({ streamMessageId: streamMsg.id })
  }, [
    sessionId,
    stateLabel,
    isStreaming,
    items,
    actorRef,
    queryClient,
    startStream,
  ])

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

  /**
   * 基于当前会话创建复诊 session 并跳转。
   *
   * 完成态意图分类命中复诊、以及挂起态「继续问诊」共用此入口：以本会话为
   * parentSessionId 创建 follow_up，把新 session / 首条时间线写入 cache，
   * 失活旧 cache 后回调 onFollowUpCreated 让页面导航到新 session。
   */
  const startFollowUp = useCallback(
    async (content?: string) => {
      const chiefComplaint = content?.trim()
      const result = await visitsApi.createFollowUp({
        patientId: sessionQuery.data?.patientId ?? "patient-mock-001",
        parentSessionId: sessionId,
        chiefComplaint: chiefComplaint || undefined,
      })
      queryClient.setQueryData(
        visitsQueryKeys.session(result.session.id),
        result.session,
      )
      queryClient.setQueryData<InfiniteData<ListTimelineResult>>(
        workbenchQueryKeys.timeline(result.session.id),
        {
          pages: [
            {
              items: result.initialTimeline,
              hasMore: false,
            },
          ],
          pageParams: [undefined],
        },
      )
      queryClient.invalidateQueries({ queryKey: visitsQueryKeys.all })
      onFollowUpCreated?.(result.session.id)
    },
    [onFollowUpCreated, queryClient, sessionId, sessionQuery.data?.patientId],
  )

  const handleCompletedMessage = useCallback(
    async (content: string) => {
      const intent = await workbenchApi.classifyFollowUpIntent({
        sessionId,
        content,
      })

      useComposerStore.getState().clearDraft(sessionId)

      if (intent.intent === "follow_up") {
        await startFollowUp(content)
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
      sessionId,
      startFollowUp,
      startStream,
    ],
  )

  /** 发送消息（P4.2：集成 SSE 流式回复） */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return
      // 挂起态直接输入：跳过意图分类，强制按复诊流程继续（创建复诊 session 并跳转）。
      if (stateLabel === "suspended" || sessionQuery.data?.status === "suspended") {
        useComposerStore.getState().clearDraft(sessionId)
        await startFollowUp(content.trim())
        return
      }
      if (stateLabel === "completed" || sessionQuery.data?.status === "completed") {
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
            return upsertItemsInPages(old, [streamMsg])
          },
        )

        // 6. 启动 SSE 流式回复
        startStream({ streamMessageId: streamMsg.id })
      } catch (e) {
        console.error("[sendMessage] API call or stream start failed:", e)
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
      sessionQuery.data?.status,
      handleCompletedMessage,
      startFollowUp,
      actorRef,
      queryClient,
      startStream,
    ],
  )

  /** 在阻塞卡片下提交疑问：只走锁定问题流，不推进主问诊流程。 */
  const askLockedQuestion = useCallback(
    async (content: string, cardId: string) => {
      const trimmed = content.trim()
      if (!trimmed) return

      const clientMessageId = generateClientMessageId()
      appendTimelineItem(
        createOptimisticPatientMessage(trimmed, clientMessageId, sessionId),
      )

      const streamMsg = createStreamingAssistantMessage(sessionId)
      appendTimelineItem(streamMsg)
      startStream({
        streamMessageId: streamMsg.id,
        mode: "lock-question",
        content: trimmed,
        cardId,
      })
    },
    [appendTimelineItem, sessionId, startStream],
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

  /**
   * 确认退出：进入退出结算 → 提交 exitVisit → 终止。
   *
   * 持久化失败不阻断本地退出：本地状态机仍进入 exited，
   * 刷新后由 hydration 与服务端对齐。
   */
  const confirmExit = useCallback(async () => {
    // 防御：已终止态不重复调用
    const snap = actorRef.getSnapshot()
    if (snap.value === "terminated" || snap.value === "exited") return

    abortStream("exit")
    actorRef.send({ type: "EXIT_REQUESTED" })
    try {
      const result = await workbenchApi.exitVisit({ sessionId, reason: "patient_request" })
      appendTimelineItem(result.timelineItem)
      await queryClient.invalidateQueries({
        queryKey: visitsQueryKeys.session(sessionId),
      })
      await queryClient.invalidateQueries({ queryKey: visitsQueryKeys.list() })
    } catch {
      // 忽略：本地已进入退出结算态，刷新后由 hydration 兜底。
    }
    actorRef.send({ type: "EXIT_CONFIRMED" })
  }, [abortStream, sessionId, actorRef, appendTimelineItem, queryClient])

  /** 暂停计时 */
  const pauseVisit = useCallback(async () => {
    const updatedSession = await workbenchApi.pauseVisitTimer({ sessionId })
    queryClient.setQueryData(visitsQueryKeys.session(sessionId), updatedSession)
    actorRef.send({ type: "TIMER_PAUSED" })
  }, [sessionId, queryClient, actorRef])

  /** 恢复计时 */
  const resumeVisit = useCallback(async () => {
    const updatedSession = await workbenchApi.resumeVisitTimer({ sessionId })
    queryClient.setQueryData(visitsQueryKeys.session(sessionId), updatedSession)
    actorRef.send({ type: "TIMER_RESUMED" })
  }, [sessionId, queryClient, actorRef])

  /** 上报急症体征 */
  const reportVitals = useCallback(
    async (input: ReportVitalsInput) => {
      try {
        console.log("[emergency] reportVitals called with:", input)
        const result = await workbenchApi.reportVitals(input)
        console.log("[emergency] reportVitals result:", result)
        if (result.emergency) {
          abortStream("emergency")
          actorRef.send({
            type: "EMERGENCY_DETECTED",
            source: input.source,
          })
          return
        }
        appendTimelineItem(
          createSystemEventItem(
            sessionId,
            "agent_thinking",
            "已收到急症求助",
            result.message,
          ),
        )
      } catch (e) {
        console.error("[emergency] reportVitals failed:", e)
      }
    },
    [abortStream, actorRef, appendTimelineItem, sessionId],
  )

  /** 急症误报恢复：还原会话 cache + 追加系统事件 + EMERGENCY_DISMISSED。 */
  const dismissEmergency = useCallback(async () => {
    try {
      console.log("[emergency] dismissEmergency called, sessionId:", sessionId)
      const result = await workbenchApi.dismissEmergency({ sessionId })
      console.log("[emergency] dismissEmergency result:", result)
      queryClient.setQueryData(
        visitsQueryKeys.session(sessionId),
        result.session,
      )
      appendTimelineItem(result.timelineItem)
      actorRef.send({ type: "EMERGENCY_DISMISSED" })
      console.log("[emergency] EMERGENCY_DISMISSED sent to state machine")
    } catch (e) {
      console.error("[emergency] dismissEmergency failed:", e)
      // 即使 API 失败，仍尝试本地恢复状态机（以降级模式继续问诊）
      // 真实后端可能不支持该端点，此时走前端本地恢复路径
      console.warn("[emergency] dismissEmergency API failed, falling back to local dismiss")
      appendTimelineItem(
        createSystemEventItem(
          sessionId,
          "emergency_dismissed",
          "抱歉打扰了，系统已记录这次反馈以改善判断。你可以继续刚才的问诊。",
        ),
      )
      actorRef.send({ type: "EMERGENCY_DISMISSED" })
    }
  }, [sessionId, queryClient, appendTimelineItem, actorRef])

  /** 确认急症（前往急诊）：EMERGENCY_CONFIRMED → terminated + 急症终止留痕。 */
  const confirmEmergency = useCallback(() => {
    console.log("[emergency] confirmEmergency called, sending EMERGENCY_CONFIRMED")
    // 追加急症终止卡到时间线
    appendTimelineItem(
      createTerminalItem(
        sessionId,
        "emergency",
        "本次问诊已结束",
        "建议立即前往急诊就医，请优先保障您的安全。",
      ),
    )
    actorRef.send({ type: "EMERGENCY_CONFIRMED" })
    console.log("[emergency] EMERGENCY_CONFIRMED sent, state should now be 'terminated'")
  }, [actorRef, appendTimelineItem, sessionId])

  /** 到期触发超时终止：abort 流 + VISIT_TIMEOUT → terminated(timeout)。 */
  const triggerTimeout = useCallback(() => {
    abortStream("timeout")
    actorRef.send({ type: "VISIT_TIMEOUT" })
  }, [abortStream, actorRef])

  /**
   * 空闲到期自动挂起：abort 流 + 持久化 suspended + VISIT_SUSPENDED → suspended。
   *
   * 非终态——患者随后直接输入或点「继续问诊」会走 startFollowUp 创建复诊 session。
   * 持久化失败不阻断本地挂起：本地状态机仍进入 suspended，刷新后由 hydration 兜底。
   */
  const suspendVisit = useCallback(async () => {
    abortStream("idle")
    actorRef.send({ type: "VISIT_SUSPENDED" })
    try {
      const result = await workbenchApi.suspendVisit({ sessionId })
      queryClient.setQueryData(visitsQueryKeys.session(sessionId), result.session)
      appendTimelineItem(result.timelineItem)
      await queryClient.invalidateQueries({ queryKey: visitsQueryKeys.list() })
    } catch {
      // 忽略：本地已进入挂起态，下次拉取会话会与服务端对齐。
    }
  }, [abortStream, actorRef, sessionId, queryClient, appendTimelineItem])

  /**
   * 从挂起态继续：按复诊流程创建新 session 并跳转。
   *
   * 「继续问诊」按钮（无主诉）与挂起态直接输入（带主诉）共用此入口，统一复用
   * startFollowUp 以本挂起会话为 parentSessionId 创建 follow_up。
   */
  const resumeFromSuspended = useCallback(
    async (content?: string) => {
      const trimmed = content?.trim()
      useComposerStore.getState().clearDraft(sessionId)
      await startFollowUp(trimmed && trimmed.length > 0 ? trimmed : undefined)
    },
    [sessionId, startFollowUp],
  )

  // ---- Compose result ----

  const loading = sessionQuery.isLoading || timelineLoading
  const error = sessionQuery.error?.message ?? undefined

  const actions: UseWorkbenchSessionActions = {
    sendMessage,
    askLockedQuestion,
    submitFlowAction,
    requestExit,
    confirmExit,
    pauseVisit,
    resumeVisit,
    reportVitals,
    dismissEmergency,
    confirmEmergency,
    triggerTimeout,
    suspendVisit,
    resumeFromSuspended,
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
