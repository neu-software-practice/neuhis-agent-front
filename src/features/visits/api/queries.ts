import { mutationOptions, queryOptions } from "@tanstack/react-query"

import { visitsApi } from "@/features/visits/api"
import type {
  CreateFollowUpInput,
  CreateSessionInput,
  GenerateTitleInput,
  ListSessionsInput,
} from "@/features/visits/api/types"
import type { SessionId } from "@/lib/api/types"

export const visitsQueryKeys = {
  all: ["visits"] as const,
  list: (input: ListSessionsInput = {}) =>
    [...visitsQueryKeys.all, "list", input] as const,
  session: (sessionId: SessionId) =>
    [...visitsQueryKeys.all, "session", sessionId] as const,
  snapshot: (sessionId: SessionId) =>
    [...visitsQueryKeys.all, "snapshot", sessionId] as const,
}

export const visitsQueries = {
  list: (input: ListSessionsInput = {}) =>
    queryOptions({
      queryKey: visitsQueryKeys.list(input),
      queryFn: () => visitsApi.listSessions(input),
    }),
  session: (sessionId: SessionId) =>
    queryOptions({
      queryKey: visitsQueryKeys.session(sessionId),
      queryFn: () => visitsApi.getSession(sessionId),
    }),
  snapshot: (sessionId: SessionId) =>
    queryOptions({
      queryKey: visitsQueryKeys.snapshot(sessionId),
      queryFn: () => visitsApi.getReadonlySnapshot({ sessionId }),
    }),
}

export const visitsMutations = {
  createSession: () =>
    mutationOptions({
      mutationFn: (input: CreateSessionInput) => visitsApi.createSession(input),
    }),
  createFollowUp: () =>
    mutationOptions({
      mutationFn: (input: CreateFollowUpInput) => visitsApi.createFollowUp(input),
    }),
  generateTitle: () =>
    mutationOptions({
      mutationFn: (input: GenerateTitleInput) => visitsApi.generateTitle(input),
    }),
}
