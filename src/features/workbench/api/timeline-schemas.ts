import { z } from "zod"

import {
  apiErrorSchema,
  flowCardIdSchema,
  paymentStatusSchema,
  sessionIdSchema,
  terminalReasonSchema,
  timelineItemIdSchema,
  visitMachineStateSchema,
  visitStatusSchema,
} from "@/lib/api/types"

const moneySchema = z.number().min(0)

export const flowCardStatusSchema = z.enum([
  "pending",
  "accepted",
  "skipped",
  "vetoed",
  "paid",
  "processing",
  "completed",
  "failed",
  "invalidated",
])

export const flowCardKindSchema = z.enum([
  "lab_decision",
  "payment",
  "lab_execution",
  "diagnosis",
  "treatment_plan",
  "medication_fulfillment",
  "treatment_execution",
  "advice_only",
  "completed_visit",
])

const flowCardBaseSchema = z.object({
  id: flowCardIdSchema,
  sessionId: sessionIdSchema,
  status: flowCardStatusSchema,
  blocking: z.boolean(),
  title: z.string().trim().min(1),
  createdAt: z.string().datetime(),
  handledAt: z.string().datetime().optional(),
  lockReason: z.string().optional(),
})

export const labDecisionCardSchema = flowCardBaseSchema.extend({
  kind: z.literal("lab_decision"),
  testItems: z.array(
    z.object({
      code: z.string().trim().min(1),
      name: z.string().trim().min(1),
      sampleType: z.string().optional(),
    }),
  ),
  reason: z.string().trim().min(1),
  differentialTargets: z.array(z.string().trim().min(1)),
  estimatedFee: moneySchema,
})

export const paymentCardSchema = flowCardBaseSchema.extend({
  kind: z.literal("payment"),
  paymentId: z.string().trim().min(1),
  purpose: z.enum(["lab", "medication"]),
  items: z.array(
    z.object({
      name: z.string().trim().min(1),
      amount: moneySchema,
      quantity: z.number().int().positive().optional(),
    }),
  ),
  totalAmount: moneySchema,
  insuranceAmount: moneySchema,
  selfPayAmount: moneySchema,
  paymentStatus: paymentStatusSchema,
})

export const labExecutionCardSchema = flowCardBaseSchema.extend({
  kind: z.literal("lab_execution"),
  labOrderId: z.string().trim().min(1),
  executionStatus: z.enum([
    "waiting_payment",
    "queued",
    "collecting",
    "testing",
    "result_ready",
    "completed",
  ]),
  resultSummary: z.string().optional(),
  resultReturnedAt: z.string().datetime().optional(),
})

export const diagnosisCardSchema = flowCardBaseSchema.extend({
  kind: z.literal("diagnosis"),
  diagnosis: z.string().trim().min(1),
  confidence: z.enum(["low", "medium", "high"]),
  evidence: z.array(z.string().trim().min(1)),
  evidenceSources: z.array(z.enum(["history", "answer", "lab_result"])),
  riskSignals: z.array(z.string().trim().min(1)),
})

export const treatmentPlanCardSchema = flowCardBaseSchema.extend({
  kind: z.literal("treatment_plan"),
  plan: z.enum(["medication", "treatment", "advice_only", "referral"]),
  capability: z.enum(["available", "limited", "unavailable"]),
  summary: z.string().trim().min(1),
  actions: z.array(z.string().trim().min(1)),
})

export const medicationFulfillmentCardSchema = flowCardBaseSchema.extend({
  kind: z.literal("medication_fulfillment"),
  medications: z.array(
    z.object({
      name: z.string().trim().min(1),
      spec: z.string().trim().min(1),
      quantity: z.number().int().positive(),
      dosage: z.string().trim().min(1),
      days: z.number().int().positive(),
      price: moneySchema,
    }),
  ),
  availableModes: z.array(z.enum(["pickup", "delivery"])),
  selectedMode: z.enum(["pickup", "delivery"]).optional(),
  fulfillmentStatus: z.enum(["pending", "confirmed", "completed"]),
})

export const treatmentExecutionCardSchema = flowCardBaseSchema.extend({
  kind: z.literal("treatment_execution"),
  treatmentName: z.string().trim().min(1),
  capability: z.enum(["available", "limited", "unavailable"]),
  executionStatus: z.enum([
    "pending",
    "scheduled",
    "arrived",
    "in_progress",
    "completed",
    "canceled",
  ]),
  appointmentAt: z.string().datetime().optional(),
  queueNo: z.string().optional(),
  notices: z.array(z.string().trim().min(1)),
  availableActions: z.array(
    z.enum(["schedule", "confirm_arrival", "start", "complete", "cancel"]),
  ),
})

export const adviceOnlyCardSchema = flowCardBaseSchema.extend({
  kind: z.literal("advice_only"),
  advices: z.array(z.string().trim().min(1)),
  watchItems: z.array(z.string().trim().min(1)),
  followUpRecommendation: z.string().trim().min(1),
})

export const completedVisitCardSchema = flowCardBaseSchema.extend({
  kind: z.literal("completed_visit"),
  diagnosis: z.string().trim().min(1),
  treatmentSummary: z.string().trim().min(1),
  followUpSuggestion: z.string().trim().min(1),
  completedAt: z.string().datetime(),
})

export const flowCardSchema = z.discriminatedUnion("kind", [
  labDecisionCardSchema,
  paymentCardSchema,
  labExecutionCardSchema,
  diagnosisCardSchema,
  treatmentPlanCardSchema,
  medicationFulfillmentCardSchema,
  treatmentExecutionCardSchema,
  adviceOnlyCardSchema,
  completedVisitCardSchema,
])

export const timelineItemStatusSchema = z.enum([
  "pending",
  "streaming",
  "done",
  "failed",
  "invalidated",
])

const timelineItemBaseSchema = z.object({
  id: timelineItemIdSchema,
  sessionId: sessionIdSchema,
  createdAt: z.string().datetime(),
  status: timelineItemStatusSchema,
})

export const messageTimelineItemSchema = timelineItemBaseSchema.extend({
  kind: z.literal("message"),
  role: z.enum(["patient", "assistant"]),
  content: z.string(),
  localKey: z.string().optional(),
  interruptedBy: z.enum(["emergency", "timeout", "exit"]).optional(),
})

export const flowCardTimelineItemSchema = timelineItemBaseSchema.extend({
  kind: z.literal("flow_card"),
  card: flowCardSchema,
})

export const systemEventTimelineItemSchema = timelineItemBaseSchema.extend({
  kind: z.literal("system_event"),
  eventType: z.enum([
    "context_loaded",
    "agent_thinking",
    "lab_result_received",
    "payment_succeeded",
    "drug_purchased",
    "follow_up_started",
    "emergency_dismissed",
    "exit_settled",
  ]),
  title: z.string().trim().min(1),
  description: z.string().optional(),
})

export const terminalTimelineItemSchema = timelineItemBaseSchema.extend({
  kind: z.literal("terminal"),
  reason: terminalReasonSchema,
  title: z.string().trim().min(1),
  description: z.string().optional(),
  suggestedDepartment: z.string().optional(),
})

export const timelineItemSchema = z.discriminatedUnion("kind", [
  messageTimelineItemSchema,
  flowCardTimelineItemSchema,
  systemEventTimelineItemSchema,
  terminalTimelineItemSchema,
])

export const assistantStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("delta"),
    sessionId: sessionIdSchema,
    requestId: z.string().trim().min(1),
    content: z.string(),
  }),
  z.object({
    type: z.literal("message_final"),
    sessionId: sessionIdSchema,
    requestId: z.string().trim().min(1),
    item: messageTimelineItemSchema,
  }),
  z.object({
    type: z.literal("card"),
    sessionId: sessionIdSchema,
    requestId: z.string().trim().min(1),
    card: flowCardSchema,
    timelineItem: flowCardTimelineItemSchema.optional(),
  }),
  z.object({
    type: z.literal("state"),
    sessionId: sessionIdSchema,
    state: visitMachineStateSchema,
    status: visitStatusSchema.optional(),
    activeCardId: flowCardIdSchema.optional(),
  }),
  z.object({
    type: z.literal("emergency"),
    sessionId: sessionIdSchema,
    severity: z.enum(["suspected", "critical"]),
    message: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("done"),
    sessionId: sessionIdSchema,
    requestId: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("error"),
    sessionId: sessionIdSchema.optional(),
    requestId: z.string().optional(),
    error: apiErrorSchema,
  }),
])

export function parseTimelineItem(value: unknown) {
  return timelineItemSchema.parse(value)
}

export function safeParseTimelineItem(value: unknown) {
  return timelineItemSchema.safeParse(value)
}

export function parseFlowCard(value: unknown) {
  return flowCardSchema.parse(value)
}

export function safeParseFlowCard(value: unknown) {
  return flowCardSchema.safeParse(value)
}

export function parseAssistantStreamEvent(value: unknown) {
  return assistantStreamEventSchema.parse(value)
}

export function safeParseAssistantStreamEvent(value: unknown) {
  return assistantStreamEventSchema.safeParse(value)
}
