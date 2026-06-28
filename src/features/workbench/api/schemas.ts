import { z } from "zod"

import { visitSessionSchema } from "@/features/visits/api/schemas"
import {
  assistantStreamEventSchema,
  flowCardSchema,
  timelineItemSchema,
} from "@/features/workbench/api/timeline-schemas"
import {
  flowCardIdSchema,
  pageResultSchema,
  paymentStatusSchema,
  sessionIdSchema,
  terminalReasonSchema,
  visitStatusSchema,
} from "@/lib/api/types"

export const listTimelineInputSchema = z.object({
  sessionId: sessionIdSchema,
  cursor: z.string().optional(),
  pageSize: z.number().int().min(1).max(100).default(50),
})

export const listTimelineResultSchema = pageResultSchema(timelineItemSchema)

export const sendMessageInputSchema = z.object({
  sessionId: sessionIdSchema,
  content: z.string().trim().min(1).max(2000),
  clientMessageId: z.string().trim().min(1),
})

export const sendMessageResultSchema = z.object({
  session: visitSessionSchema,
  patientMessage: timelineItemSchema,
  assistantPlaceholder: timelineItemSchema.optional(),
})

export const streamAssistantInputSchema = z.object({
  sessionId: sessionIdSchema,
  requestId: z.string().trim().min(1),
  clientMessageId: z.string().trim().min(1).optional(),
})

export const streamAssistantResultSchema = assistantStreamEventSchema

export const flowActionResultSchema = z.object({
  sessionId: sessionIdSchema,
  status: visitStatusSchema,
  activeCardId: flowCardIdSchema.optional(),
  card: flowCardSchema.optional(),
  timelineItems: z.array(timelineItemSchema),
  message: z.string().optional(),
})

export const submitLabDecisionInputSchema = z.object({
  sessionId: sessionIdSchema,
  cardId: flowCardIdSchema,
  decision: z.enum(["accepted", "skipped", "vetoed"]),
})

export const submitPaymentInputSchema = z.object({
  sessionId: sessionIdSchema,
  cardId: flowCardIdSchema,
  purpose: z.enum(["lab", "medication"]),
  paymentMethodId: z.string().trim().min(1).optional(),
  simulateStatus: paymentStatusSchema.optional(),
  defer: z.boolean().optional(),
})

export const submitFulfillmentInputSchema = z.object({
  sessionId: sessionIdSchema,
  cardId: flowCardIdSchema,
  mode: z.enum(["pickup", "delivery"]),
})

export const submitTreatmentExecutionInputSchema = z.object({
  sessionId: sessionIdSchema,
  cardId: flowCardIdSchema,
  action: z.enum(["schedule", "confirm_arrival", "start", "complete", "cancel"]),
})

export const ackAdviceInputSchema = z.object({
  sessionId: sessionIdSchema,
  cardId: flowCardIdSchema,
})

export const askLockedQuestionInputSchema = z.object({
  sessionId: sessionIdSchema,
  cardId: flowCardIdSchema,
  content: z.string().trim().min(1).max(1000),
  requestId: z.string().trim().min(1),
})

export const classifyIntentInputSchema = z.object({
  sessionId: sessionIdSchema,
  content: z.string().trim().min(1).max(1000),
})

export const classifyIntentResultSchema = z.object({
  intent: z.enum(["consultation", "follow_up", "uncertain"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().optional(),
})

export const consultationInputSchema = z.object({
  sessionId: sessionIdSchema,
  content: z.string().trim().min(1).max(1000),
  requestId: z.string().trim().min(1),
})

export const reportVitalsInputSchema = z.object({
  sessionId: sessionIdSchema,
  source: z.enum(["patient_report", "device", "manual"]),
  symptoms: z.array(z.string().trim().min(1)),
  vitals: z
    .object({
      temperature: z.number().optional(),
      heartRate: z.number().int().positive().optional(),
      systolicPressure: z.number().int().positive().optional(),
      diastolicPressure: z.number().int().positive().optional(),
      spo2: z.number().min(0).max(100).optional(),
    })
    .optional(),
})

export const emergencyRecheckResultSchema = z.object({
  emergency: z.boolean(),
  severity: z.enum(["suspected", "critical"]).optional(),
  message: z.string().optional(),
})

export const exitVisitInputSchema = z.object({
  sessionId: sessionIdSchema,
  reason: z.enum(["patient_request", "timeout", "emergency", "other"]),
})

export const exitSettlementResultSchema = z.object({
  sessionId: sessionIdSchema,
  terminalReason: terminalReasonSchema,
  refundAmount: z.number().min(0),
  payableAmount: z.number().min(0),
  timelineItem: timelineItemSchema,
})

export const pauseVisitTimerInputSchema = z.object({
  sessionId: sessionIdSchema,
})

export const resumeVisitTimerInputSchema = z.object({
  sessionId: sessionIdSchema,
})

export function parseListTimelineResult(value: unknown) {
  return listTimelineResultSchema.parse(value)
}

export function safeParseListTimelineResult(value: unknown) {
  return listTimelineResultSchema.safeParse(value)
}

export function parseSendMessageResult(value: unknown) {
  return sendMessageResultSchema.parse(value)
}

export function safeParseSendMessageResult(value: unknown) {
  return sendMessageResultSchema.safeParse(value)
}

export function parseFlowActionResult(value: unknown) {
  return flowActionResultSchema.parse(value)
}

export function safeParseFlowActionResult(value: unknown) {
  return flowActionResultSchema.safeParse(value)
}

export function parseExitSettlementResult(value: unknown) {
  return exitSettlementResultSchema.parse(value)
}

export function safeParseExitSettlementResult(value: unknown) {
  return exitSettlementResultSchema.safeParse(value)
}
