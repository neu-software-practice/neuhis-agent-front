import { apiConfig } from "@/lib/api/config"
import { createApiError, toApiError } from "@/lib/api/errors"
import type { StreamHandlers } from "@/lib/api/transport"
import type { SessionId } from "@/lib/api/types"
import type { AssistantStreamEvent } from "@/features/workbench/api/timeline-types"
import { parseAssistantStreamEvent } from "@/features/workbench/api/timeline-schemas"
import { mockDb } from "@/mocks/api/mock-db"

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeoutId)
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true },
    )
  })
}

async function emit(
  handlers: StreamHandlers<AssistantStreamEvent>,
  event: AssistantStreamEvent,
) {
  handlers.onEvent?.(parseAssistantStreamEvent(event))
  await wait(Math.max(10, apiConfig.mockDelayMs / 4), handlers.signal)
}

export async function simulateAssistantStream(
  input: { sessionId: SessionId; requestId: string },
  handlers: StreamHandlers<AssistantStreamEvent>,
) {
  handlers.onOpen?.()

  try {
    const session = mockDb.getSession(input.sessionId)
    const text = session.summary.lastMessage ?? ""

    if (/胸痛|呼吸困难|意识|抽搐|昏迷/.test(text)) {
      await emit(handlers, {
        type: "emergency",
        sessionId: input.sessionId,
        severity: "critical",
        message: "描述中包含急症风险，请立即前往急诊或呼叫急救。",
      })
      await emit(handlers, {
        type: "done",
        sessionId: input.sessionId,
        requestId: input.requestId,
      })
      handlers.onDone?.()
      return
    }

    const content =
      "根据你补充的症状，我建议先做血常规，帮助判断炎症程度和感染类型。"
    for (const chunk of ["根据你补充的症状，", "我建议先做血常规，", "帮助判断炎症程度和感染类型。"]) {
      await emit(handlers, {
        type: "delta",
        sessionId: input.sessionId,
        requestId: input.requestId,
        content: chunk,
      })
    }

    const item = mockDb.appendAssistantMessage(input.sessionId, content)
    await emit(handlers, {
      type: "message_final",
      sessionId: input.sessionId,
      requestId: input.requestId,
      item,
    })

    const result = mockDb.raiseLabDecision(input.sessionId)
    if (result.card) {
      await emit(handlers, {
        type: "card",
        sessionId: input.sessionId,
        requestId: input.requestId,
        card: result.card,
      })
    }
    await emit(handlers, {
      type: "state",
      sessionId: input.sessionId,
      state: "labDecision",
      status: result.status,
      activeCardId: result.activeCardId,
    })
    await emit(handlers, {
      type: "done",
      sessionId: input.sessionId,
      requestId: input.requestId,
    })
    handlers.onDone?.()
  } catch (error) {
    const apiError = toApiError(error)
    handlers.onError?.(apiError)
    handlers.onEvent?.({
      type: "error",
      sessionId: input.sessionId,
      requestId: input.requestId,
      error: apiError,
    })
  }
}

export async function simulateSimpleReplyStream(
  input: { sessionId: SessionId; requestId: string; content: string },
  handlers: StreamHandlers<AssistantStreamEvent>,
) {
  handlers.onOpen?.()
  try {
    const reply = `我会基于本次记录回答：${input.content}`
    await emit(handlers, {
      type: "delta",
      sessionId: input.sessionId,
      requestId: input.requestId,
      content: reply,
    })
    const item = mockDb.appendAssistantMessage(input.sessionId, reply)
    await emit(handlers, {
      type: "message_final",
      sessionId: input.sessionId,
      requestId: input.requestId,
      item,
    })
    await emit(handlers, {
      type: "done",
      sessionId: input.sessionId,
      requestId: input.requestId,
    })
    handlers.onDone?.()
  } catch {
    handlers.onError?.(
      createApiError({
        code: "MOCK_STREAM_ERROR",
        message: "mock 流式回复失败",
        retriable: true,
      }),
    )
  }
}
