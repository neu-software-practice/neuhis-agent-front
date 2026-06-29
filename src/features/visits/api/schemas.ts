import { z } from "zod"

import { timelineItemSchema } from "@/features/workbench/api/timeline-schemas"
import {
  pageResultSchema,
  patientIdSchema,
  sessionIdSchema,
  terminalReasonSchema,
  visitEntryTypeSchema,
  visitStatusSchema,
} from "@/lib/api/types"

export const visitSummarySchema = z.object({
  chiefComplaint: z.string().optional(),
  diagnosis: z.string().optional(),
  treatmentSummary: z.string().optional(),
  lastMessage: z.string().optional(),
})

const visitSessionBaseSchema = z.object({
  id: sessionIdSchema,
  patientId: patientIdSchema,
  entryType: visitEntryTypeSchema,
  status: visitStatusSchema,
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  timeoutAt: z.string().datetime().optional(),
  // 暂停账：记录当前一次暂停的起点。resume 时把暂停时长加回 timeoutAt 并清空。
  // 与 timerPaused 并存：timerPaused 表达"是否暂停"，pausedAt 表达"从何时暂停"。
  pausedAt: z.string().datetime().optional(),
  askRound: z.number().int().min(0),
  askRoundLimit: z.number().int().positive(),
  labRound: z.number().int().min(0),
  labRoundLimit: z.number().int().positive(),
  parentSessionId: sessionIdSchema.optional(),
  terminalReason: terminalReasonSchema.optional(),
  activeCardId: z.string().optional(),
  timerPaused: z.boolean(),
  summary: visitSummarySchema,
})

export const visitSessionSchema = visitSessionBaseSchema
  .superRefine((session, context) => {
    if (session.entryType === "new" && session.parentSessionId) {
      context.addIssue({
        code: "custom",
        path: ["parentSessionId"],
        message: "new entry sessions cannot have parentSessionId",
      })
    }

    if (session.status === "blocked" && !session.activeCardId) {
      context.addIssue({
        code: "custom",
        path: ["activeCardId"],
        message: "blocked sessions must expose activeCardId",
      })
    }
  })

export const visitSessionSummarySchema = visitSessionBaseSchema.pick({
  id: true,
  patientId: true,
  entryType: true,
  status: true,
  startedAt: true,
  updatedAt: true,
  endedAt: true,
  parentSessionId: true,
  terminalReason: true,
  summary: true,
})

export const listSessionsInputSchema = z.object({
  patientId: patientIdSchema.optional(),
  status: visitStatusSchema.optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().min(1).max(50).default(20),
})

export const listSessionsResultSchema = pageResultSchema(visitSessionSummarySchema)

export const createSessionInputSchema = z
  .object({
    patientId: patientIdSchema,
    entryType: z.literal("new"),
    chiefComplaint: z.string().trim().min(1).max(2000).optional(),
  })
  .strict()

export const createFollowUpInputSchema = z.object({
  patientId: patientIdSchema,
  parentSessionId: sessionIdSchema,
  chiefComplaint: z.string().trim().min(1).max(2000).optional(),
})

export const createSessionResultSchema = z.object({
  session: visitSessionSchema,
  initialTimeline: z.array(timelineItemSchema),
})

export const visitSnapshotSchema = z.object({
  session: visitSessionSchema,
  timeline: z.array(timelineItemSchema),
  readonly: z.literal(true),
  terminalReason: terminalReasonSchema.optional(),
})

export function parseVisitSession(value: unknown) {
  return visitSessionSchema.parse(value)
}

export function safeParseVisitSession(value: unknown) {
  return visitSessionSchema.safeParse(value)
}

export function parseListSessionsResult(value: unknown) {
  return listSessionsResultSchema.parse(value)
}

export function safeParseListSessionsResult(value: unknown) {
  return listSessionsResultSchema.safeParse(value)
}

export function parseCreateSessionResult(value: unknown) {
  return createSessionResultSchema.parse(value)
}

export function safeParseCreateSessionResult(value: unknown) {
  return createSessionResultSchema.safeParse(value)
}

export function parseVisitSnapshot(value: unknown) {
  return visitSnapshotSchema.parse(value)
}

export function safeParseVisitSnapshot(value: unknown) {
  return visitSnapshotSchema.safeParse(value)
}
