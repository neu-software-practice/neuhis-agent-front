import type { z } from "zod"

import type {
  ackAdviceInputSchema,
  askLockedQuestionInputSchema,
  classifyIntentInputSchema,
  classifyIntentResultSchema,
  consultationInputSchema,
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
} from "@/features/workbench/api/schemas"

export type {
  AssistantStreamEvent,
  FlowCard,
  FlowCardKind,
  FlowCardStatus,
  TimelineItem,
} from "@/features/workbench/api/timeline-types"

export type ListTimelineInput = z.input<typeof listTimelineInputSchema>
export type ListTimelineResult = z.infer<typeof listTimelineResultSchema>
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>
export type SendMessageResult = z.infer<typeof sendMessageResultSchema>
export type StreamAssistantInput = z.infer<typeof streamAssistantInputSchema>
export type FlowActionResult = z.infer<typeof flowActionResultSchema>
export type SubmitLabDecisionInput = z.infer<typeof submitLabDecisionInputSchema>
export type SubmitPaymentInput = z.infer<typeof submitPaymentInputSchema>
export type SubmitFulfillmentInput = z.infer<typeof submitFulfillmentInputSchema>
export type SubmitTreatmentExecutionInput = z.infer<
  typeof submitTreatmentExecutionInputSchema
>
export type AckAdviceInput = z.infer<typeof ackAdviceInputSchema>
export type AskLockedQuestionInput = z.infer<typeof askLockedQuestionInputSchema>
export type ClassifyIntentInput = z.infer<typeof classifyIntentInputSchema>
export type ClassifyIntentResult = z.infer<typeof classifyIntentResultSchema>
export type ConsultationInput = z.infer<typeof consultationInputSchema>
export type ReportVitalsInput = z.infer<typeof reportVitalsInputSchema>
export type EmergencyRecheckResult = z.infer<typeof emergencyRecheckResultSchema>
export type ExitVisitInput = z.infer<typeof exitVisitInputSchema>
export type ExitSettlementResult = z.infer<typeof exitSettlementResultSchema>
export type PauseVisitTimerInput = z.infer<typeof pauseVisitTimerInputSchema>
export type ResumeVisitTimerInput = z.infer<typeof resumeVisitTimerInputSchema>
