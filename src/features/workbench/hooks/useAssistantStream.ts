import { useCallback, useEffect, useRef, useState } from "react"

import { workbenchApi } from "@/features/workbench/api"
import type {
  AssistantStreamEvent,
  FlowCardTimelineItem,
  TimelineItem,
} from "@/features/workbench/api"
import type { StreamHandlers } from "@/lib/api/transport"
import type { VisitMachineEvent } from "@/features/workbench/machine/visit-machine.types"
import {
  appendMessageDelta,
  createSystemEventItem,
  finalizeStreamingMessage,
} from "@/features/workbench/utils/timeline-merge"
import { mapCardToMachineEvent } from "@/features/workbench/utils/card-normalizers"

// ==============================
// 公开类型
// ==============================

export interface UseAssistantStreamOptions {
  /** 当前会话 ID */
  sessionId: string
  /** 向 XState 状态机发送事件的回调 */
  sendMachineEvent: (event: VisitMachineEvent) => void
  /** 向 timeline cache 追加一个 item 的回调 */
  appendTimelineItem: (item: TimelineItem) => void
  /** 按 itemId 更新 timeline cache 中某条 item 的回调 */
  updateTimelineItem: (
    itemId: string,
    updater: (item: TimelineItem) => TimelineItem,
  ) => void
}

export interface UseAssistantStreamResult {
  /** 启动 SSE 流式回复 */
  startStream: (input: {
    streamMessageId: string
    mode?: "assistant" | "consultation"
    content?: string
  }) => void
  /** 中止当前 SSE 流 */
  abortStream: (reason?: StreamAbortReason) => void
  /** 是否正在流式接收中 */
  isStreaming: boolean
}

export type StreamAbortReason = "exit" | "emergency" | "timeout" | "error"

// ==============================
// 内部辅助函数
// ==============================

/**
 * 根据 state 映射到对应的状态机事件。
 * 返回 null 表示无需发送事件（状态已由其他事件覆盖）。
 */
function mapStateToEvent(
  state: string,
  requestId?: string,
): VisitMachineEvent | null {
  switch (state) {
    case "analyzing":
      return { type: "AGENT_ANALYSIS_STARTED", requestId }
    // labDecision / labPayment / diagnosis 等状态已由 card 事件驱动，
    // 此处不做重复映射。
    default:
      return null
  }
}

/**
 * 生成唯一的流请求 ID。
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function markInterrupted(
  item: TimelineItem,
  reason: StreamAbortReason,
): TimelineItem {
  if (item.kind !== "message" || item.status !== "streaming") return item
  if (reason === "error") {
    return { ...item, status: "failed" }
  }
  return { ...item, status: "invalidated", interruptedBy: reason }
}

// ==============================
// Hook
// ==============================

/**
 * useAssistantStream — 管理 SSE 流式连接生命周期。
 *
 * 职责范围：
 * - 接收 SSE 事件（delta / message_final / card / state / emergency / done / error）
 * - 使用 requestAnimationFrame 批量合并 delta 文本，避免每个 token 重渲染
 * - 更新 timeline cache（通过 appendTimelineItem / updateTimelineItem 回调）
 * - 驱动状态机（通过 sendMachineEvent 回调）
 *
 * 本 hook 不直接依赖 useWorkbenchSession，而是通过回调与外部通信，
 * 方便后续集成时灵活组合。
 */
export function useAssistantStream(
  options: UseAssistantStreamOptions,
): UseAssistantStreamResult {
  const { sessionId, sendMachineEvent, appendTimelineItem, updateTimelineItem } =
    options

  const [isStreaming, setIsStreaming] = useState(false)

  // ---- Refs ----

  /** AbortController，用于中断 SSE 连接 */
  const abortRef = useRef<AbortController | null>(null)
  /** 当前流式占位消息的 ID，delta 更新时定位目标 */
  const streamMessageIdRef = useRef<string | null>(null)
  /** 待刷新的 delta 文本缓存 */
  const pendingDeltaRef = useRef<string>("")
  /** requestAnimationFrame ID，用于批量合并 delta */
  const rafIdRef = useRef<number | null>(null)

  // ---- 组件卸载时清理 ----

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  // ---- Delta 刷新函数 ----

  /**
   * 在 requestAnimationFrame 回调中 flush 累积的 delta 文本到 timeline cache。
   */
  const flushDelta = useCallback(() => {
    const delta = pendingDeltaRef.current
    const msgId = streamMessageIdRef.current

    if (delta && msgId) {
      pendingDeltaRef.current = ""
      updateTimelineItem(msgId, (item) => appendMessageDelta(item, delta))
    }

    rafIdRef.current = null
  }, [updateTimelineItem])

  const markCurrentStreamInterrupted = useCallback(
    (reason: StreamAbortReason) => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      const msgId = streamMessageIdRef.current
      if (msgId) {
        updateTimelineItem(msgId, (item) => markInterrupted(item, reason))
      }
      streamMessageIdRef.current = null
      pendingDeltaRef.current = ""
    },
    [updateTimelineItem],
  )

  // ---- 核心方法 ----

  /**
   * 启动 SSE 流式回复。
   *
   * 调用方需确保在调用前已将流式占位消息（createStreamingAssistantMessage）
   * 追加到 timeline cache 中，并将该消息的 ID 传入 input.streamMessageId。
   */
  const startStream = useCallback(
    (input: {
      streamMessageId: string
      mode?: "assistant" | "consultation"
      content?: string
    }) => {
      const { streamMessageId, mode = "assistant", content = "" } = input

      // 中止前一个未完成的流
      abortRef.current?.abort()
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

      // 生成 flow requestId（用于 SSE 连接标识）
      const requestId = generateRequestId()

      const controller = new AbortController()
      abortRef.current = controller
      streamMessageIdRef.current = streamMessageId
      pendingDeltaRef.current = ""

      setIsStreaming(true)

      const handlers: StreamHandlers<AssistantStreamEvent> = {
        signal: controller.signal,

        onOpen: () => {
          // isStreaming 已在 startStream 开头设为 true
        },

        onEvent: (event) => {
          switch (event.type) {
            // ---- delta：追加 AI 回复文本 ----
            case "delta": {
              pendingDeltaRef.current += event.content
              if (rafIdRef.current === null) {
                rafIdRef.current = requestAnimationFrame(flushDelta)
              }
              break
            }

            // ---- message_final：AI 回复完成 ----
            case "message_final": {
              // 先 flush 残留的 delta
              if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current)
                rafIdRef.current = null
              }
              flushDelta()

              const msgId = streamMessageIdRef.current
              if (msgId) {
                updateTimelineItem(msgId, (item) =>
                  finalizeStreamingMessage(item, event.item.content),
                )
              }
              break
            }

            // ---- card：流程卡 ----
            case "card": {
              if (event.timelineItem) {
                appendTimelineItem(event.timelineItem)
              } else {
                const cardItem: FlowCardTimelineItem = {
                  kind: "flow_card",
                  id: event.card.id,
                  sessionId: event.sessionId,
                  createdAt: event.card.createdAt,
                  status: "done",
                  card: event.card,
                }
                appendTimelineItem(cardItem)
              }
              sendMachineEvent(mapCardToMachineEvent(event.card))
              break
            }

            // ---- state：状态机状态同步 ----
            case "state": {
              appendTimelineItem(
                createSystemEventItem(
                  sessionId,
                  "agent_thinking",
                  `Agent 状态: ${event.state}`,
                ),
              )
              const machineEvent = mapStateToEvent(event.state, requestId)
              if (machineEvent) {
                sendMachineEvent(machineEvent)
              }
              break
            }

            // ---- emergency：急症信号 ----
            case "emergency": {
              markCurrentStreamInterrupted("emergency")
              appendTimelineItem(
                createSystemEventItem(
                  sessionId,
                  "agent_thinking",
                  event.message,
                ),
              )
              sendMachineEvent({
                type: "EMERGENCY_DETECTED",
                source: event.severity,
              })
              setIsStreaming(false)
              break
            }

            // ---- done：流正常结束 ----
            case "done": {
              setIsStreaming(false)
              break
            }

            // ---- error：流错误 ----
            case "error": {
              const msgId = streamMessageIdRef.current
              if (msgId) {
                updateTimelineItem(msgId, (item) => ({
                  ...item,
                  status: "failed" as const,
                }))
              }
              setIsStreaming(false)
              break
            }
          }
        },

        onError: () => {
          // 当底层 transport 触发 onError（可能伴随 onEvent('error')），
          // 以 onEvent('error') 中的处理为准，此处仅重置状态。
          setIsStreaming(false)
        },

        onDone: () => {
          setIsStreaming(false)
        },
      }

      // 启动 SSE 连接（fire-and-forget；错误已在 handlers 中处理）
      const stream =
        mode === "consultation"
          ? workbenchApi.streamConsultationReply(
              { sessionId, requestId, content },
              handlers,
            )
          : workbenchApi.streamAssistantMessage({ sessionId, requestId }, handlers)

      stream.catch(() => {
        setIsStreaming(false)
      })
    },
    [
      sessionId,
      sendMachineEvent,
      appendTimelineItem,
      updateTimelineItem,
      flushDelta,
      markCurrentStreamInterrupted,
    ],
  )

  /**
   * 中止当前 SSE 流。
   */
  const abortStream = useCallback((reason: StreamAbortReason = "error") => {
    markCurrentStreamInterrupted(reason)
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
  }, [markCurrentStreamInterrupted])

  return {
    startStream,
    abortStream,
    isStreaming,
  }
}
