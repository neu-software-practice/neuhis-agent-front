import { z } from "zod"

export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  status: z.number().int().positive().optional(),
  details: z.unknown().optional(),
  retriable: z.boolean().optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>

export const patientIdSchema = z.string().trim().min(1)
export const sessionIdSchema = z.string().trim().min(1)
export const timelineItemIdSchema = z.string().trim().min(1)
export const flowCardIdSchema = z.string().trim().min(1)

export type PatientId = z.infer<typeof patientIdSchema>
export type SessionId = z.infer<typeof sessionIdSchema>
export type TimelineItemId = z.infer<typeof timelineItemIdSchema>
export type FlowCardId = z.infer<typeof flowCardIdSchema>

export const visitEntryTypeSchema = z.enum(["new", "follow_up"])

export const visitStatusSchema = z.enum([
  "loading_context",
  "chatting",
  "analyzing",
  "blocked",
  "diagnosis",
  "treatment",
  "completed",
  "transferred",
  "emergency_terminated",
  "exited",
])

export const visitMachineStateSchema = z.enum([
  "loadingContext",
  "chatting",
  "analyzing",
  "labDecision",
  "labPayment",
  "labExecution",
  "diagnosis",
  "treatmentDecision",
  "medicationPayment",
  "medicationFulfillment",
  "treatmentExecution",
  "adviceOnly",
  "completed",
  "emergencyPending",
  "terminated",
  "exitSettlement",
  "exited",
])

export const terminalReasonSchema = z.enum([
  "emergency",
  "timeout",
  "ask_limit_reached",
  "lab_limit_reached",
  "referral",
  "capability_insufficient",
  "exited",
])

export const paymentStatusSchema = z.enum([
  "unpaid",
  "pending",
  "paid",
  "failed",
  "refunded",
])

export const pageResultSchema = <TItem extends z.ZodType>(itemSchema: TItem) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().optional(),
    hasMore: z.boolean(),
  })

export type PageResult<TItem> = {
  items: TItem[]
  nextCursor?: string
  hasMore: boolean
}

export type VisitEntryType = z.infer<typeof visitEntryTypeSchema>
export type VisitStatus = z.infer<typeof visitStatusSchema>
export type VisitMachineState = z.infer<typeof visitMachineStateSchema>
export type TerminalReason = z.infer<typeof terminalReasonSchema>
export type PaymentStatus = z.infer<typeof paymentStatusSchema>
