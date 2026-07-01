import type { RequestOptions } from "@/lib/api/transport"
import {
  createFollowUpInputSchema,
  createSessionInputSchema,
  generateTitleInputSchema,
  generateTitleResultSchema,
  listSessionsInputSchema,
} from "@/features/visits/api/schemas"
import { mockDb } from "@/mocks/api/mock-db"

export function handleListSessions(options?: RequestOptions) {
  return mockDb.listSessions(
    listSessionsInputSchema.parse({
      ...options?.searchParams,
      pageSize:
        options?.searchParams?.pageSize === undefined
          ? undefined
          : Number(options.searchParams.pageSize),
    }),
  )
}

export function handleCreateSession(body: unknown) {
  return mockDb.createSession(createSessionInputSchema.parse(body))
}

export function handleCreateFollowUp(body: unknown) {
  return mockDb.createFollowUp(createFollowUpInputSchema.parse(body))
}

export function handleGetSession(sessionId: string) {
  return mockDb.getSession(sessionId)
}

export function handleGetReadonlySnapshot(sessionId: string) {
  return mockDb.getReadonlySnapshot(sessionId)
}

export function handleGenerateTitle(body: unknown) {
  return generateTitleResultSchema.parse(
    mockDb.generateTitle(generateTitleInputSchema.parse(body)),
  )
}
