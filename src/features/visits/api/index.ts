import { getTransport } from "@/lib/api"
import type { SessionId } from "@/lib/api/types"
import {
  createFollowUpInputSchema,
  createSessionInputSchema,
  createSessionResultSchema,
  listSessionsInputSchema,
  listSessionsResultSchema,
  visitSessionSchema,
  visitSnapshotSchema,
} from "@/features/visits/api/schemas"
import type {
  CreateFollowUpInput,
  CreateSessionInput,
  ListSessionsInput,
} from "@/features/visits/api/types"

export const visitsApi = {
  async listSessions(input: ListSessionsInput = {}) {
    const query = listSessionsInputSchema.parse(input)
    const result = await getTransport().get("/visits", {
      searchParams: query,
    })
    return listSessionsResultSchema.parse(result)
  },

  async getSession(sessionId: SessionId) {
    const result = await getTransport().get(`/visits/${sessionId}`)
    return visitSessionSchema.parse(result)
  },

  async createSession(input: CreateSessionInput) {
    const body = createSessionInputSchema.parse(input)
    const result = await getTransport().post("/visits", body)
    return createSessionResultSchema.parse(result)
  },

  async createFollowUp(input: CreateFollowUpInput) {
    const body = createFollowUpInputSchema.parse(input)
    const result = await getTransport().post(
      `/visits/${body.parentSessionId}/follow-up`,
      body,
    )
    return createSessionResultSchema.parse(result)
  },

  async getReadonlySnapshot(input: { sessionId: SessionId }) {
    const result = await getTransport().get(`/visits/${input.sessionId}/snapshot`)
    return visitSnapshotSchema.parse(result)
  },
}

export * from "@/features/visits/api/schemas"
export * from "@/features/visits/api/types"
