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
import { assistantStreamEventSchema } from "@/features/workbench/api/timeline-schemas"
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
    return visitSessionSchema.parse(result)
  },

  async listTimeline(input: ListTimelineInput) {
    const query = listTimelineInputSchema.parse(input)
    const result = await getTransport().get(`/visits/${query.sessionId}/timeline`, {
      searchParams: query,
    })
    return listTimelineResultSchema.parse(result)
  },

  async sendMessage(input: SendMessageInput) {
    const body = sendMessageInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/messages`,
      body,
    )
    return sendMessageResultSchema.parse(result)
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
    return flowActionResultSchema.parse(result)
  },

  async submitPayment(input: SubmitPaymentInput) {
    const body = submitPaymentInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/payments`,
      body,
    )
    return flowActionResultSchema.parse(result)
  },

  async submitFulfillment(input: SubmitFulfillmentInput) {
    const body = submitFulfillmentInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/fulfillment`,
      body,
    )
    return flowActionResultSchema.parse(result)
  },

  async submitTreatmentExecution(input: SubmitTreatmentExecutionInput) {
    const body = submitTreatmentExecutionInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/treatment-execution`,
      body,
    )
    return flowActionResultSchema.parse(result)
  },

  async ackAdvice(input: AckAdviceInput) {
    const body = ackAdviceInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.sessionId}/advice-ack`,
      body,
    )
    return flowActionResultSchema.parse(result)
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
