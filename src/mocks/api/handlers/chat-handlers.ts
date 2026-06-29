import type { RequestOptions } from "@/lib/api/transport"
import {
  ackAdviceInputSchema,
  classifyIntentInputSchema,
  dismissEmergencyInputSchema,
  exitVisitInputSchema,
  listTimelineInputSchema,
  pauseVisitTimerInputSchema,
  reportVitalsInputSchema,
  resumeVisitTimerInputSchema,
  sendMessageInputSchema,
  submitFulfillmentInputSchema,
  submitLabDecisionInputSchema,
  submitPaymentInputSchema,
  submitTreatmentExecutionInputSchema,
  suspendVisitInputSchema,
} from "@/features/workbench/api/schemas"
import { mockDb } from "@/mocks/api/mock-db"

export function handleListTimeline(sessionId: string, options?: RequestOptions) {
  return mockDb.listTimeline(
    listTimelineInputSchema.parse({
      sessionId,
      ...options?.searchParams,
      pageSize:
        options?.searchParams?.pageSize === undefined
          ? undefined
          : Number(options.searchParams.pageSize),
    }),
  )
}

export function handleSendMessage(body: unknown) {
  return mockDb.sendMessage(sendMessageInputSchema.parse(body))
}

export function handleSubmitLabDecision(body: unknown) {
  return mockDb.submitLabDecision(submitLabDecisionInputSchema.parse(body))
}

export function handleSubmitPayment(body: unknown) {
  return mockDb.submitPayment(submitPaymentInputSchema.parse(body))
}

export function handleSubmitFulfillment(body: unknown) {
  return mockDb.submitFulfillment(submitFulfillmentInputSchema.parse(body))
}

export function handleSubmitTreatmentExecution(body: unknown) {
  return mockDb.submitTreatmentExecution(
    submitTreatmentExecutionInputSchema.parse(body),
  )
}

export function handleAckAdvice(body: unknown) {
  return mockDb.ackAdvice(ackAdviceInputSchema.parse(body))
}

export function handleClassifyIntent(body: unknown) {
  return mockDb.classifyFollowUpIntent(classifyIntentInputSchema.parse(body))
}

export function handleReportVitals(body: unknown) {
  return mockDb.reportVitals(reportVitalsInputSchema.parse(body))
}

export function handleExitVisit(body: unknown) {
  return mockDb.exitVisit(exitVisitInputSchema.parse(body))
}

export function handlePauseTimer(body: unknown) {
  const input = pauseVisitTimerInputSchema.parse(body)
  return mockDb.pauseVisitTimer(input.sessionId)
}

export function handleResumeTimer(body: unknown) {
  const input = resumeVisitTimerInputSchema.parse(body)
  return mockDb.resumeVisitTimer(input.sessionId)
}

export function handleDismissEmergency(body: unknown) {
  return mockDb.dismissEmergency(dismissEmergencyInputSchema.parse(body))
}

export function handleSuspendVisit(body: unknown) {
  return mockDb.suspendVisit(suspendVisitInputSchema.parse(body))
}
