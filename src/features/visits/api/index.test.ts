import { beforeEach, describe, expect, it, vi } from "vitest"

import { getTransport } from "@/lib/api"

import { visitsApi } from "@/features/visits/api"

vi.mock("@/lib/api", () => ({
  getTransport: vi.fn(),
}))

describe("visitsApi", () => {
  const mockTransport = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    stream: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getTransport as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockTransport,
    )
  })

  const mockVisitSession = {
    id: "session-1",
    patientId: "patient-1",
    patientName: "张三",
    entryType: "new" as const,
    status: "chatting" as const,
    startedAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T01:00:00Z",
    askRound: 0,
    askRoundLimit: 20,
    labRound: 0,
    labRoundLimit: 3,
    timerPaused: false,
    summary: {
      chiefComplaint: "头痛",
    },
  }

  const mockSessionSummary = {
    id: "session-1",
    patientId: "patient-1",
    patientName: "张三",
    entryType: "new" as const,
    status: "chatting" as const,
    startedAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T01:00:00Z",
    summary: {
      chiefComplaint: "头痛",
    },
  }

  describe("listSessions", () => {
    it("calls GET /visits with default params when no input given", async () => {
      const response = {
        items: [mockSessionSummary, { ...mockSessionSummary, id: "session-2" }],
        hasMore: false,
      }
      mockTransport.get.mockResolvedValue(response)

      const result = await visitsApi.listSessions()

      expect(mockTransport.get).toHaveBeenCalledWith("/visits", {
        searchParams: { pageSize: 20 },
      })
      expect(mockTransport.get).toHaveBeenCalledTimes(1)
      expect(result.items).toHaveLength(2)
    })

    it("passes custom filters as search params", async () => {
      const response = { items: [mockSessionSummary], hasMore: false }
      mockTransport.get.mockResolvedValue(response)

      const result = await visitsApi.listSessions({
        patientId: "patient-1",
        status: "completed",
        pageSize: 10,
      })

      expect(mockTransport.get).toHaveBeenCalledWith("/visits", {
        searchParams: { patientId: "patient-1", status: "completed", pageSize: 10 },
      })
      expect(result.items).toHaveLength(1)
    })

    it("propagates transport errors", async () => {
      mockTransport.get.mockRejectedValue(new Error("Server error"))

      await expect(visitsApi.listSessions()).rejects.toThrow("Server error")
    })
  })

  describe("getSession", () => {
    it("calls GET /visits/:id", async () => {
      mockTransport.get.mockResolvedValue(mockVisitSession)

      const result = await visitsApi.getSession("session-1")

      expect(mockTransport.get).toHaveBeenCalledWith("/visits/session-1")
      expect(mockTransport.get).toHaveBeenCalledTimes(1)
      expect(result.id).toBe("session-1")
      expect(result.status).toBe("chatting")
    })

    it("propagates transport errors", async () => {
      mockTransport.get.mockRejectedValue(new Error("Not found"))

      await expect(
        visitsApi.getSession("nonexistent"),
      ).rejects.toThrow("Not found")
    })
  })

  describe("createSession", () => {
    it("calls POST /visits with input", async () => {
      const input = {
        patientId: "patient-1",
        entryType: "new" as const,
        chiefComplaint: "头痛三天",
      }
      const response = {
        session: { ...mockVisitSession, status: "chatting" as const },
        initialTimeline: [],
      }
      mockTransport.post.mockResolvedValue(response)

      const result = await visitsApi.createSession(input)

      expect(mockTransport.post).toHaveBeenCalledWith("/visits", input)
      expect(mockTransport.post).toHaveBeenCalledTimes(1)
      expect(result.session.status).toBe("chatting")
      expect(result.initialTimeline).toEqual([])
    })

    it("propagates transport errors", async () => {
      mockTransport.post.mockRejectedValue(new Error("Validation error"))

      await expect(
        visitsApi.createSession({
          patientId: "patient-1",
          entryType: "new",
        }),
      ).rejects.toThrow("Validation error")
    })
  })

  describe("createFollowUp", () => {
    it("calls POST /visits/:parentId/follow-up", async () => {
      const input = {
        patientId: "patient-1",
        parentSessionId: "session-1",
        chiefComplaint: "继续复诊",
      }
      const response = {
        session: {
          ...mockVisitSession,
          id: "session-2",
          entryType: "follow_up" as const,
          parentSessionId: "session-1",
          status: "chatting" as const,
        },
        initialTimeline: [],
      }
      mockTransport.post.mockResolvedValue(response)

      const result = await visitsApi.createFollowUp(input)

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/session-1/follow-up",
        input,
      )
      expect(mockTransport.post).toHaveBeenCalledTimes(1)
      expect(result.session.parentSessionId).toBe("session-1")
    })

    it("propagates transport errors", async () => {
      mockTransport.post.mockRejectedValue(new Error("Conflict"))

      await expect(
        visitsApi.createFollowUp({
          patientId: "patient-1",
          parentSessionId: "session-1",
        }),
      ).rejects.toThrow("Conflict")
    })
  })

  describe("getReadonlySnapshot", () => {
    it("calls GET /visits/:id/snapshot", async () => {
      const response = {
        session: { ...mockVisitSession, status: "completed" as const },
        timeline: [],
        readonly: true as const,
      }
      mockTransport.get.mockResolvedValue(response)

      const result = await visitsApi.getReadonlySnapshot({
        sessionId: "session-1",
      })

      expect(mockTransport.get).toHaveBeenCalledWith(
        "/visits/session-1/snapshot",
      )
      expect(mockTransport.get).toHaveBeenCalledTimes(1)
      expect(result.readonly).toBe(true)
    })

    it("propagates transport errors", async () => {
      mockTransport.get.mockRejectedValue(new Error("Forbidden"))

      await expect(
        visitsApi.getReadonlySnapshot({ sessionId: "session-1" }),
      ).rejects.toThrow("Forbidden")
    })
  })

  describe("generateTitle", () => {
    it("calls POST /visits/:id/generate-title", async () => {
      const input = { sessionId: "session-1" }
      const response = {
        sessionId: "session-1",
        title: "头痛问诊记录",
      }
      mockTransport.post.mockResolvedValue(response)

      const result = await visitsApi.generateTitle(input)

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/session-1/generate-title",
        input,
      )
      expect(mockTransport.post).toHaveBeenCalledTimes(1)
      expect(result.title).toBe("头痛问诊记录")
    })

    it("propagates transport errors", async () => {
      mockTransport.post.mockRejectedValue(new Error("Rate limited"))

      await expect(
        visitsApi.generateTitle({ sessionId: "session-1" }),
      ).rejects.toThrow("Rate limited")
    })
  })
})
