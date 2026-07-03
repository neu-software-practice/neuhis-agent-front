import { describe, expect, it, vi } from "vitest"

import {
  workbenchMutations,
  workbenchQueries,
  workbenchQueryKeys,
} from "@/features/workbench/api/queries"

// Mock the API facade so queryFn / mutationFn calls don't reach real transport.
vi.mock("@/features/workbench/api", () => ({
  workbenchApi: {
    getSession: vi.fn(),
    listTimeline: vi.fn(),
    sendMessage: vi.fn(),
    submitLabDecision: vi.fn(),
    submitPayment: vi.fn(),
    submitFulfillment: vi.fn(),
    submitTreatmentExecution: vi.fn(),
    ackAdvice: vi.fn(),
    exitVisit: vi.fn(),
    reportVitals: vi.fn(),
    pauseVisitTimer: vi.fn(),
    resumeVisitTimer: vi.fn(),
    dismissEmergency: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// workbenchQueryKeys
// ---------------------------------------------------------------------------
describe("workbenchQueryKeys", () => {
  it("all is a stable ['workbench'] tuple", () => {
    expect(workbenchQueryKeys.all).toEqual(["workbench"])
  })

  it("session builds key with sessionId", () => {
    const key = workbenchQueryKeys.session("sess-1")
    expect(key).toEqual(["workbench", "session", "sess-1"])
  })

  it("timeline builds key with sessionId", () => {
    const key = workbenchQueryKeys.timeline("sess-1")
    expect(key).toEqual(["workbench", "timeline", "sess-1"])
  })
})

// ---------------------------------------------------------------------------
// workbenchQueries
// ---------------------------------------------------------------------------
describe("workbenchQueries", () => {
  describe("session", () => {
    it("returns queryOptions with correct queryKey", () => {
      const opts = workbenchQueries.session("sess-1")
      expect(opts.queryKey).toEqual(["workbench", "session", "sess-1"])
      expect(typeof opts.queryFn).toBe("function")
    })

    it("queryFn calls workbenchApi.getSession", async () => {
      const { workbenchApi } = await import("@/features/workbench/api")
      const fake = vi.mocked(workbenchApi.getSession).mockResolvedValue({
        id: "sess-1",
        patientId: "pat-1",
        patientName: "张三",
        entryType: "new",
        status: "chatting",
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        askRound: 0,
        askRoundLimit: 10,
        labRound: 0,
        labRoundLimit: 3,
        timerPaused: false,
        summary: {},
      } as never)

      const opts = workbenchQueries.session("sess-1")
      const result = await opts.queryFn!({} as never)

      expect(fake).toHaveBeenCalledWith("sess-1")
      expect(result.id).toBe("sess-1")
    })
  })

  describe("timeline", () => {
    it("returns infiniteQueryOptions with correct key and pageParam config", () => {
      const opts = workbenchQueries.timeline({
        sessionId: "sess-1",
        cursor: "initial-cursor",
      })
      expect(opts.queryKey).toEqual(["workbench", "timeline", "sess-1"])
      expect(opts.initialPageParam).toBe("initial-cursor")
      expect(typeof opts.queryFn).toBe("function")
    })

    it("queryFn calls workbenchApi.listTimeline with merged cursor", async () => {
      const { workbenchApi } = await import("@/features/workbench/api")
      const fake = vi.mocked(workbenchApi.listTimeline).mockResolvedValue({
        items: [],
        hasMore: false,
      } as never)

      const opts = workbenchQueries.timeline({
        sessionId: "sess-1",
        cursor: "initial",
        pageSize: 20,
      })
      await opts.queryFn!({ pageParam: "page-2" } as never)

      expect(fake).toHaveBeenCalledWith({
        sessionId: "sess-1",
        cursor: "page-2",
        pageSize: 20,
      })
    })

    it("returns nextCursor when hasMore is true", () => {
      const opts = workbenchQueries.timeline({ sessionId: "sess-1" })
      const next = opts.getNextPageParam!({
        items: [],
        hasMore: true,
        nextCursor: "next-cursor",
      })
      expect(next).toBe("next-cursor")
    })

    it("returns undefined when hasMore is false", () => {
      const opts = workbenchQueries.timeline({ sessionId: "sess-1" })
      const next = opts.getNextPageParam!({
        items: [],
        hasMore: false,
      })
      expect(next).toBeUndefined()
    })
  })
})

// ---------------------------------------------------------------------------
// workbenchMutations
// ---------------------------------------------------------------------------
describe("workbenchMutations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("sendMessage returns mutationOptions calling workbenchApi.sendMessage", async () => {
    const { workbenchApi } = await import("@/features/workbench/api")
    vi.mocked(workbenchApi.sendMessage).mockResolvedValue({} as never)

    const opts = workbenchMutations.sendMessage()
    await opts.mutationFn!({
      sessionId: "sess-1",
      content: "hello",
      clientMessageId: "cm-1",
    })

    expect(workbenchApi.sendMessage).toHaveBeenCalledWith({
      sessionId: "sess-1",
      content: "hello",
      clientMessageId: "cm-1",
    })
  })

  it("submitLabDecision returns mutationOptions calling workbenchApi.submitLabDecision", async () => {
    const { workbenchApi } = await import("@/features/workbench/api")
    vi.mocked(workbenchApi.submitLabDecision).mockResolvedValue({} as never)

    const opts = workbenchMutations.submitLabDecision()
    await opts.mutationFn!({
      sessionId: "sess-1",
      cardId: "card-1",
      decision: "accepted",
    })

    expect(workbenchApi.submitLabDecision).toHaveBeenCalled()
  })

  it("submitPayment returns mutationOptions calling workbenchApi.submitPayment", async () => {
    const { workbenchApi } = await import("@/features/workbench/api")
    vi.mocked(workbenchApi.submitPayment).mockResolvedValue({} as never)

    const opts = workbenchMutations.submitPayment()
    await opts.mutationFn!({
      sessionId: "sess-1",
      cardId: "card-1",
      purpose: "lab",
    })

    expect(workbenchApi.submitPayment).toHaveBeenCalled()
  })

  it("submitFulfillment returns mutationOptions calling workbenchApi.submitFulfillment", async () => {
    const { workbenchApi } = await import("@/features/workbench/api")
    vi.mocked(workbenchApi.submitFulfillment).mockResolvedValue({} as never)

    const opts = workbenchMutations.submitFulfillment()
    await opts.mutationFn!({
      sessionId: "sess-1",
      cardId: "card-1",
      mode: "pickup",
    })

    expect(workbenchApi.submitFulfillment).toHaveBeenCalled()
  })

  it("submitTreatmentExecution returns mutationOptions calling workbenchApi.submitTreatmentExecution", async () => {
    const { workbenchApi } = await import("@/features/workbench/api")
    vi.mocked(workbenchApi.submitTreatmentExecution).mockResolvedValue({} as never)

    const opts = workbenchMutations.submitTreatmentExecution()
    await opts.mutationFn!({
      sessionId: "sess-1",
      cardId: "card-1",
      action: "start",
    })

    expect(workbenchApi.submitTreatmentExecution).toHaveBeenCalled()
  })

  it("ackAdvice returns mutationOptions calling workbenchApi.ackAdvice", async () => {
    const { workbenchApi } = await import("@/features/workbench/api")
    vi.mocked(workbenchApi.ackAdvice).mockResolvedValue({} as never)

    const opts = workbenchMutations.ackAdvice()
    await opts.mutationFn!({
      sessionId: "sess-1",
      cardId: "card-1",
    })

    expect(workbenchApi.ackAdvice).toHaveBeenCalled()
  })

  it("exitVisit returns mutationOptions calling workbenchApi.exitVisit", async () => {
    const { workbenchApi } = await import("@/features/workbench/api")
    vi.mocked(workbenchApi.exitVisit).mockResolvedValue({} as never)

    const opts = workbenchMutations.exitVisit()
    await opts.mutationFn!({
      sessionId: "sess-1",
      reason: "patient_request",
    })

    expect(workbenchApi.exitVisit).toHaveBeenCalled()
  })

  it("reportVitals returns mutationOptions calling workbenchApi.reportVitals", async () => {
    const { workbenchApi } = await import("@/features/workbench/api")
    vi.mocked(workbenchApi.reportVitals).mockResolvedValue({} as never)

    const opts = workbenchMutations.reportVitals()
    await opts.mutationFn!({
      sessionId: "sess-1",
      source: "patient_report",
      symptoms: ["headache"],
    })

    expect(workbenchApi.reportVitals).toHaveBeenCalled()
  })

  it("pauseVisitTimer returns mutationOptions calling workbenchApi.pauseVisitTimer", async () => {
    const { workbenchApi } = await import("@/features/workbench/api")
    vi.mocked(workbenchApi.pauseVisitTimer).mockResolvedValue({} as never)

    const opts = workbenchMutations.pauseVisitTimer()
    await opts.mutationFn!({ sessionId: "sess-1" })

    expect(workbenchApi.pauseVisitTimer).toHaveBeenCalledWith({ sessionId: "sess-1" })
  })

  it("resumeVisitTimer returns mutationOptions calling workbenchApi.resumeVisitTimer", async () => {
    const { workbenchApi } = await import("@/features/workbench/api")
    vi.mocked(workbenchApi.resumeVisitTimer).mockResolvedValue({} as never)

    const opts = workbenchMutations.resumeVisitTimer()
    await opts.mutationFn!({ sessionId: "sess-1" })

    expect(workbenchApi.resumeVisitTimer).toHaveBeenCalledWith({ sessionId: "sess-1" })
  })

  it("dismissEmergency returns mutationOptions calling workbenchApi.dismissEmergency", async () => {
    const { workbenchApi } = await import("@/features/workbench/api")
    vi.mocked(workbenchApi.dismissEmergency).mockResolvedValue({} as never)

    const opts = workbenchMutations.dismissEmergency()
    await opts.mutationFn!({ sessionId: "sess-1" })

    expect(workbenchApi.dismissEmergency).toHaveBeenCalledWith({ sessionId: "sess-1" })
  })
})
