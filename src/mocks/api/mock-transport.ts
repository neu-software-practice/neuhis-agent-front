import { apiConfig } from "@/lib/api/config"
import { createApiError, toApiError, throwApiError } from "@/lib/api/errors"
import type {
  ApiTransport,
  RequestOptions,
  StreamHandlers,
} from "@/lib/api/transport"
import type { AssistantStreamEvent } from "@/features/workbench/api/timeline-types"
import {
  askLockedQuestionInputSchema,
  consultationInputSchema,
  streamAssistantInputSchema,
} from "@/features/workbench/api/schemas"
import {
  handleGetPatientContext,
  handleUpdatePatientProfile,
  handleVerifyIdentity,
} from "@/mocks/api/handlers/patient-handlers"
import {
  handleCreateFollowUp,
  handleCreateSession,
  handleGetReadonlySnapshot,
  handleGetSession,
  handleListSessions,
} from "@/mocks/api/handlers/visit-handlers"
import {
  handleAckAdvice,
  handleClassifyIntent,
  handleDismissEmergency,
  handleExitVisit,
  handleListTimeline,
  handlePauseTimer,
  handleReportVitals,
  handleResumeTimer,
  handleSendMessage,
  handleSuspendVisit,
  handleSubmitFulfillment,
  handleSubmitLabDecision,
  handleSubmitPayment,
  handleSubmitTreatmentExecution,
} from "@/mocks/api/handlers/chat-handlers"
import {
  simulateAssistantStream,
  simulateSimpleReplyStream,
} from "@/mocks/api/stream-simulator"

type MockMethod = "GET" | "POST" | "PATCH" | "DELETE"

function match(path: string, pattern: RegExp) {
  return path.match(pattern)
}

async function delayed<T>(value: T): Promise<T> {
  await new Promise((resolve) => window.setTimeout(resolve, apiConfig.mockDelayMs))
  return value
}

function route(method: MockMethod, path: string, body?: unknown, options?: RequestOptions) {
  if (method === "POST" && path === "/patients/verify") {
    return handleVerifyIdentity()
  }

  const patientContextMatch = match(path, /^\/patients\/([^/]+)\/context$/)
  if (method === "GET" && patientContextMatch) {
    return handleGetPatientContext(patientContextMatch[1])
  }

  const patientProfileMatch = match(path, /^\/patients\/([^/]+)\/profile$/)
  if (method === "PATCH" && patientProfileMatch) {
    return handleUpdatePatientProfile({
      ...(body as Record<string, unknown>),
      patientId: patientProfileMatch[1],
    })
  }

  if (method === "GET" && path === "/visits") {
    return handleListSessions(options)
  }

  if (method === "POST" && path === "/visits") {
    return handleCreateSession(body)
  }

  const followUpMatch = match(path, /^\/visits\/([^/]+)\/follow-up$/)
  if (method === "POST" && followUpMatch) {
    return handleCreateFollowUp({
      ...(body as Record<string, unknown>),
      parentSessionId: followUpMatch[1],
    })
  }

  const snapshotMatch = match(path, /^\/visits\/([^/]+)\/snapshot$/)
  if (method === "GET" && snapshotMatch) {
    return handleGetReadonlySnapshot(snapshotMatch[1])
  }

  const timelineMatch = match(path, /^\/visits\/([^/]+)\/timeline$/)
  if (method === "GET" && timelineMatch) {
    return handleListTimeline(timelineMatch[1], options)
  }

  const messagesMatch = match(path, /^\/visits\/([^/]+)\/messages$/)
  if (method === "POST" && messagesMatch) {
    return handleSendMessage({
      ...(body as Record<string, unknown>),
      sessionId: messagesMatch[1],
    })
  }

  const labDecisionMatch = match(path, /^\/visits\/([^/]+)\/lab-decision$/)
  if (method === "POST" && labDecisionMatch) {
    return handleSubmitLabDecision({
      ...(body as Record<string, unknown>),
      sessionId: labDecisionMatch[1],
    })
  }

  const paymentsMatch = match(path, /^\/visits\/([^/]+)\/payments$/)
  if (method === "POST" && paymentsMatch) {
    return handleSubmitPayment({
      ...(body as Record<string, unknown>),
      sessionId: paymentsMatch[1],
    })
  }

  const fulfillmentMatch = match(path, /^\/visits\/([^/]+)\/fulfillment$/)
  if (method === "POST" && fulfillmentMatch) {
    return handleSubmitFulfillment({
      ...(body as Record<string, unknown>),
      sessionId: fulfillmentMatch[1],
    })
  }

  const treatmentMatch = match(path, /^\/visits\/([^/]+)\/treatment-execution$/)
  if (method === "POST" && treatmentMatch) {
    return handleSubmitTreatmentExecution({
      ...(body as Record<string, unknown>),
      sessionId: treatmentMatch[1],
    })
  }

  const adviceMatch = match(path, /^\/visits\/([^/]+)\/advice-ack$/)
  if (method === "POST" && adviceMatch) {
    return handleAckAdvice({
      ...(body as Record<string, unknown>),
      sessionId: adviceMatch[1],
    })
  }

  const classifyMatch = match(path, /^\/visits\/([^/]+)\/classify-intent$/)
  if (method === "POST" && classifyMatch) {
    return handleClassifyIntent({
      ...(body as Record<string, unknown>),
      sessionId: classifyMatch[1],
    })
  }

  const vitalsMatch = match(path, /^\/visits\/([^/]+)\/vitals$/)
  if (method === "POST" && vitalsMatch) {
    return handleReportVitals({
      ...(body as Record<string, unknown>),
      sessionId: vitalsMatch[1],
    })
  }

  const exitMatch = match(path, /^\/visits\/([^/]+)\/exit$/)
  if (method === "POST" && exitMatch) {
    return handleExitVisit({
      ...(body as Record<string, unknown>),
      sessionId: exitMatch[1],
    })
  }

  const dismissEmergencyMatch = match(path, /^\/visits\/([^/]+)\/dismiss-emergency$/)
  if (method === "POST" && dismissEmergencyMatch) {
    return handleDismissEmergency({
      ...(body as Record<string, unknown>),
      sessionId: dismissEmergencyMatch[1],
    })
  }

  const suspendMatch = match(path, /^\/visits\/([^/]+)\/suspend$/)
  if (method === "POST" && suspendMatch) {
    return handleSuspendVisit({
      ...(body as Record<string, unknown>),
      sessionId: suspendMatch[1],
    })
  }

  const timerMatch = match(path, /^\/visits\/([^/]+)\/timer$/)
  if (method === "POST" && timerMatch) {
    const nextBody = {
      ...(body as Record<string, unknown>),
      sessionId: timerMatch[1],
    }
    return (body as { action?: string } | undefined)?.action === "pause"
      ? handlePauseTimer(nextBody)
      : handleResumeTimer(nextBody)
  }

  const visitMatch = match(path, /^\/visits\/([^/]+)$/)
  if (method === "GET" && visitMatch) {
    return handleGetSession(visitMatch[1])
  }

  throwApiError(
    createApiError({
      code: "MOCK_ROUTE_NOT_FOUND",
      message: `Mock endpoint not found: ${method} ${path}`,
      status: 404,
      retriable: false,
    }),
  )
}

export function createMockTransport(): ApiTransport {
  return {
    async get<T>(path: string, options?: RequestOptions) {
      return delayed(route("GET", path, undefined, options) as T)
    },
    async post<T>(path: string, body?: unknown, options?: RequestOptions) {
      return delayed(route("POST", path, body, options) as T)
    },
    async patch<T>(path: string, body?: unknown, options?: RequestOptions) {
      return delayed(route("PATCH", path, body, options) as T)
    },
    async delete<T>(path: string, options?: RequestOptions) {
      return delayed(route("DELETE", path, undefined, options) as T)
    },
    async stream<TEvent>(
      path: string,
      body: unknown,
      handlers: StreamHandlers<TEvent>,
    ) {
      try {
        const assistantMatch = match(path, /^\/visits\/([^/]+)\/assistant-stream$/)
        if (assistantMatch) {
          const input = streamAssistantInputSchema.parse({
            ...(body as Record<string, unknown>),
            sessionId: assistantMatch[1],
          })
          await simulateAssistantStream(
            input,
            handlers as StreamHandlers<AssistantStreamEvent>,
          )
          return
        }

        const lockedMatch = match(path, /^\/visits\/([^/]+)\/lock-question$/)
        if (lockedMatch) {
          const input = askLockedQuestionInputSchema.parse({
            ...(body as Record<string, unknown>),
            sessionId: lockedMatch[1],
          })
          await simulateSimpleReplyStream(
            input,
            handlers as StreamHandlers<AssistantStreamEvent>,
          )
          return
        }

        const consultMatch = match(path, /^\/visits\/([^/]+)\/consult$/)
        if (consultMatch) {
          const input = consultationInputSchema.parse({
            ...(body as Record<string, unknown>),
            sessionId: consultMatch[1],
          })
          await simulateSimpleReplyStream(
            input,
            handlers as StreamHandlers<AssistantStreamEvent>,
          )
          return
        }

        throwApiError(
          createApiError({
            code: "MOCK_STREAM_ROUTE_NOT_FOUND",
            message: `Mock stream endpoint not found: ${path}`,
            status: 404,
            retriable: false,
          }),
        )
      } catch (error) {
        handlers.onError?.(toApiError(error))
      }
    },
  }
}
