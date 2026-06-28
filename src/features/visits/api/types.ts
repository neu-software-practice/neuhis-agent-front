import type { z } from "zod"

import type {
  createFollowUpInputSchema,
  createSessionInputSchema,
  createSessionResultSchema,
  listSessionsInputSchema,
  listSessionsResultSchema,
  visitSessionSchema,
  visitSessionSummarySchema,
  visitSnapshotSchema,
  visitSummarySchema,
} from "@/features/visits/api/schemas"

export type VisitSummary = z.infer<typeof visitSummarySchema>
export type VisitSession = z.infer<typeof visitSessionSchema>
export type VisitSessionSummary = z.infer<typeof visitSessionSummarySchema>
export type ListSessionsInput = z.input<typeof listSessionsInputSchema>
export type ListSessionsResult = z.infer<typeof listSessionsResultSchema>
export type CreateSessionInput = z.infer<typeof createSessionInputSchema>
export type CreateFollowUpInput = z.infer<typeof createFollowUpInputSchema>
export type CreateSessionResult = z.infer<typeof createSessionResultSchema>
export type VisitSnapshot = z.infer<typeof visitSnapshotSchema>
