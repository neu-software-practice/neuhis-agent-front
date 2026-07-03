import { describe, expect, it, vi } from "vitest"

import { visitsApi } from "@/features/visits/api"
import {
  visitsMutations,
  visitsQueries,
  visitsQueryKeys,
} from "@/features/visits/api/queries"

vi.mock("@/features/visits/api", () => ({
  visitsApi: {
    listSessions: vi.fn(),
    getSession: vi.fn(),
    createSession: vi.fn(),
    createFollowUp: vi.fn(),
    getReadonlySnapshot: vi.fn(),
    generateTitle: vi.fn(),
  },
}))

describe("visitsQueryKeys", () => {
  it("produces a stable 'all' key", () => {
    expect(visitsQueryKeys.all).toEqual(["visits"])
  })

  it("builds a list key that includes input", () => {
    const key = visitsQueryKeys.list({ patientId: "p1" })
    expect(key).toEqual(["visits", "list", { patientId: "p1" }])
  })

  it("builds a list key with empty default input", () => {
    const key = visitsQueryKeys.list()
    expect(key).toEqual(["visits", "list", {}])
  })

  it("builds a session key with the sessionId", () => {
    expect(visitsQueryKeys.session("visit-1")).toEqual(["visits", "session", "visit-1"])
  })

  it("builds a snapshot key with the sessionId", () => {
    expect(visitsQueryKeys.snapshot("visit-1")).toEqual(["visits", "snapshot", "visit-1"])
  })
})

describe("visitsQueries", () => {
  it("list() returns queryOptions with correct key and fn", () => {
    const options = visitsQueries.list({ status: "completed" })
    expect(options.queryKey).toEqual(["visits", "list", { status: "completed" }])
    expect(typeof options.queryFn).toBe("function")
  })

  it("session() returns queryOptions with correct key and fn", () => {
    const options = visitsQueries.session("visit-1")
    expect(options.queryKey).toEqual(["visits", "session", "visit-1"])
    expect(typeof options.queryFn).toBe("function")
  })

  it("snapshot() returns queryOptions with correct key and fn", () => {
    const options = visitsQueries.snapshot("visit-1")
    expect(options.queryKey).toEqual(["visits", "snapshot", "visit-1"])
    expect(typeof options.queryFn).toBe("function")
  })

  it("list queryFn calls visitsApi.listSessions", async () => {
    vi.mocked(visitsApi.listSessions).mockResolvedValue({ items: [], hasMore: false })
    const options = visitsQueries.list({ patientId: "p1" })
    const result = await options.queryFn!({} as never)
    expect(visitsApi.listSessions).toHaveBeenCalledWith({ patientId: "p1" })
    expect(result.items).toEqual([])
  })

  it("session queryFn calls visitsApi.getSession", async () => {
    vi.mocked(visitsApi.getSession).mockResolvedValue({
      id: "visit-1",
      patientId: "p1",
      patientName: "张三",
      entryType: "new",
      status: "chatting",
      startedAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      askRound: 0,
      askRoundLimit: 10,
      labRound: 0,
      labRoundLimit: 3,
      timerPaused: false,
      summary: {},
    })
    const options = visitsQueries.session("visit-1")
    const result = await options.queryFn!({} as never)
    expect(visitsApi.getSession).toHaveBeenCalledWith("visit-1")
    expect(result.id).toBe("visit-1")
  })
})

describe("visitsMutations", () => {
  it("createSession() returns mutationOptions with a mutationFn", () => {
    const options = visitsMutations.createSession()
    expect(typeof options.mutationFn).toBe("function")
  })

  it("createFollowUp() returns mutationOptions with a mutationFn", () => {
    const options = visitsMutations.createFollowUp()
    expect(typeof options.mutationFn).toBe("function")
  })

  it("generateTitle() returns mutationOptions with a mutationFn", () => {
    const options = visitsMutations.generateTitle()
    expect(typeof options.mutationFn).toBe("function")
  })

  it("createSession mutationFn calls visitsApi.createSession", async () => {
    vi.mocked(visitsApi.createSession).mockResolvedValue({
      session: {
        id: "visit-new",
        patientId: "p1",
        patientName: "张三",
        entryType: "new",
        status: "chatting",
        startedAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        askRound: 0,
        askRoundLimit: 10,
        labRound: 0,
        labRoundLimit: 3,
        timerPaused: false,
        summary: {},
      },
      initialTimeline: [],
    })
    const options = visitsMutations.createSession()
    const result = await options.mutationFn!({ patientId: "p1", entryType: "new" })
    expect(visitsApi.createSession).toHaveBeenCalled()
    expect(result.session.id).toBe("visit-new")
  })
})
