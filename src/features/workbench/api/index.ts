import type { StreamHandlers } from "@/lib/api/transport"
import { getTransport } from "@/lib/api"
import type { SessionId } from "@/lib/api/types"
import { visitSessionSchema } from "@/features/visits/api/schemas"
import {
  ackAdviceInputSchema,
  askLockedQuestionInputSchema,
  classifyIntentInputSchema,
  classifyIntentResultSchema,
  consultationInputSchema,
  dismissEmergencyInputSchema,
  dismissEmergencyResultSchema,
  emergencyRecheckResultSchema,
  exitSettlementResultSchema,
  exitVisitInputSchema,
  flowActionResultSchema,
  listTimelineInputSchema,
  listTimelineResultSchema,
  pauseVisitTimerInputSchema,
  reportVitalsInputSchema,
  resumeVisitTimerInputSchema,
  normalizeSendMessageResult,
  sendMessageInputSchema,
  sendMessageResultSchema,
  streamAssistantInputSchema,
  submitFulfillmentInputSchema,
  submitLabDecisionInputSchema,
  submitPaymentInputSchema,
  submitTreatmentExecutionInputSchema,
  suspendVisitInputSchema,
  suspendVisitResultSchema,
} from "@/features/workbench/api/schemas"
import { assistantStreamEventSchema, timelineItemSchema } from "@/features/workbench/api/timeline-schemas"
import type {
  AckAdviceInput,
  AskLockedQuestionInput,
  AssistantStreamEvent,
  ClassifyIntentInput,
  ConsultationInput,
  DismissEmergencyInput,
  ExitVisitInput,
  SuspendVisitInput,
  ListTimelineInput,
  ReportVitalsInput,
  SendMessageInput,
  StreamAssistantInput,
  SubmitFulfillmentInput,
  SubmitLabDecisionInput,
  SubmitPaymentInput,
  SubmitTreatmentExecutionInput,
} from "@/features/workbench/api/types"

function streamHandlers(
  handlers: StreamHandlers<AssistantStreamEvent>,
): StreamHandlers<unknown> {
  return {
    ...handlers,
    onEvent: (event) => {
      handlers.onEvent?.(assistantStreamEventSchema.parse(event))
    },
  }
}

export const workbenchApi = {
  async getSession(sessionId: SessionId) {
    const result = await getTransport().get(`/visits/${sessionId}`)
    console.log("[api] getSession raw result:", JSON.stringify(result, null, 2))
    try {
      return visitSessionSchema.parse(result)
    } catch (e) {
      console.error("[api] getSession zod parse failed:", e)
      throw e
    }
  },

  async listTimeline(input: ListTimelineInput) {
    const query = listTimelineInputSchema.parse(input)
    const result = await getTransport().get(`/visits/${query.sessionId}/timeline`, {
      searchParams: query,
    })
    console.log("[api] listTimeline raw result type:", typeof result, "items count:", (result as any)?.items?.length)
    try {
      const parsed = listTimelineResultSchema.parse(result)
      console.log("[api] listTimeline parsed OK, items:", parsed.items.length)
      return parsed
    } catch (e) {
      console.error("[api] listTimeline zod parse failed:", e)
      // 逐条解析定位问题 item
      if (result && typeof result === "object" && Array.isArray((result as any).items)) {
        const arr = result as any
        console.log("[api] listTimeline: trying per-item parse, total:", arr.items.length)
        for (let i = 0; i < arr.items.length; i++) {
          try {
            timelineItemSchema.parse(arr.items[i])
          } catch (itemErr) {
            console.error(`[api] listTimeline: item[${i}] parse failed:`, itemErr)
            console.log(`[api] listTimeline: item[${i}] raw:`, JSON.stringify(arr.items[i], null, 2))
          }
        }
      }
      throw e
    }
  },

  async sendMessage(input: SendMessageInput) {
    const body = sendMessageInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/messages`,
      body,
    )
    console.log("[api] sendMessage raw result:", result)
    try {
      const parsed = sendMessageResultSchema.parse(
        normalizeSendMessageResult(result),
      )
      return parsed
    } catch (e) {
      console.error("[api] sendMessage zod parse failed:", e)
      throw e
    }
  },

  async streamAssistantMessage(
    input: StreamAssistantInput,
    handlers: StreamHandlers<AssistantStreamEvent>,
  ) {
    const body = streamAssistantInputSchema.parse(input)
    await getTransport().stream(
      `/visits/${body.sessionId}/assistant-stream`,
      body,
      streamHandlers(handlers),
    )
  },

  async submitLabDecision(input: SubmitLabDecisionInput) {
    const body = submitLabDecisionInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/lab-decision`,
      body,
    )
    console.log("[api] submitLabDecision raw result:", JSON.stringify(result, null, 2))
    try {
      return flowActionResultSchema.parse(result)
    } catch (e) {
      console.error("[api] submitLabDecision zod parse failed:", e)
      throw e
    }
  },

  async submitPayment(input: SubmitPaymentInput) {
    const body = submitPaymentInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/payments`,
      body,
    )
    console.log("[api] submitPayment raw result:", JSON.stringify(result, null, 2))
    try {
      return flowActionResultSchema.parse(result)
    } catch (e) {
      console.error("[api] submitPayment zod parse failed:", e)
      throw e
    }
  },

  async submitFulfillment(input: SubmitFulfillmentInput) {
    const body = submitFulfillmentInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/fulfillment`,
      body,
    )
    console.log("[api] submitFulfillment raw result:", JSON.stringify(result, null, 2))
    try {
      return flowActionResultSchema.parse(result)
    } catch (e) {
      console.error("[api] submitFulfillment zod parse failed:", e)
      throw e
    }
  },

  async submitTreatmentExecution(input: SubmitTreatmentExecutionInput) {
    const body = submitTreatmentExecutionInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/treatment-execution`,
      body,
    )
    console.log("[api] submitTreatmentExecution raw result:", JSON.stringify(result, null, 2))
    try {
      return flowActionResultSchema.parse(result)
    } catch (e) {
      console.error("[api] submitTreatmentExecution zod parse failed:", e)
      throw e
    }
  },

  async ackAdvice(input: AckAdviceInput) {
    const body = ackAdviceInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/advice-ack`,
      body,
    )
    console.log("[api] ackAdvice raw result:", JSON.stringify(result, null, 2))
    try {
      return flowActionResultSchema.parse(result)
    } catch (e) {
      console.error("[api] ackAdvice zod parse failed:", e)
      throw e
    }
  },

  async askLockedQuestion(
    input: AskLockedQuestionInput,
    handlers: StreamHandlers<AssistantStreamEvent>,
  ) {
    const body = askLockedQuestionInputSchema.parse(input)
    await getTransport().stream(
      `/visits/${body.sessionId}/lock-question`,
      body,
      streamHandlers(handlers),
    )
  },

  async classifyFollowUpIntent(input: ClassifyIntentInput) {
    const body = classifyIntentInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/classify-intent`,
      body,
    )
    return classifyIntentResultSchema.parse(result)
  },

  async streamConsultationReply(
    input: ConsultationInput,
    handlers: StreamHandlers<AssistantStreamEvent>,
  ) {
    const body = consultationInputSchema.parse(input)
    await getTransport().stream(
      `/visits/${body.sessionId}/consult`,
      body,
      streamHandlers(handlers),
    )
  },

  async reportVitals(input: ReportVitalsInput) {
    const body = reportVitalsInputSchema.parse(input)
    const result = await getTransport().post(`/visits/${body.sessionId}/vitals`, body)
    return emergencyRecheckResultSchema.parse(result)
  },

  async exitVisit(input: ExitVisitInput) {
    const body = exitVisitInputSchema.parse(input)
    const result = await getTransport().post(`/visits/${body.sessionId}/exit`, body)
    return exitSettlementResultSchema.parse(result)
  },

  async pauseVisitTimer(input: { sessionId: SessionId }) {
    const body = pauseVisitTimerInputSchema.parse(input)
    const result = await getTransport().post(`/visits/${body.sessionId}/timer`, {
      ...body,
      action: "pause",
    })
    return visitSessionSchema.parse(result)
  },

  async resumeVisitTimer(input: { sessionId: SessionId }) {
    const body = resumeVisitTimerInputSchema.parse(input)
    const result = await getTransport().post(`/visits/${body.sessionId}/timer`, {
      ...body,
      action: "resume",
    })
    return visitSessionSchema.parse(result)
  },

  async dismissEmergency(input: DismissEmergencyInput) {
    const body = dismissEmergencyInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/dismiss-emergency`,
      body,
    )
    return dismissEmergencyResultSchema.parse(result)
  },

  async suspendVisit(input: SuspendVisitInput) {
    const body = suspendVisitInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/suspend`,
      body,
    )
    return suspendVisitResultSchema.parse(result)
  },
}

export * from "@/features/workbench/api/schemas"
export * from "@/features/workbench/api/timeline-schemas"
export * from "@/features/workbench/api/timeline-types"
export * from "@/features/workbench/api/types"
