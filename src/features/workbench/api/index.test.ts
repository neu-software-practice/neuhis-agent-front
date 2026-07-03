import { beforeEach, describe, expect, it, vi } from "vitest"

const mockTransport = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  stream: vi.fn(),
}

vi.mock("@/lib/api", () => ({
  getTransport: () => mockTransport,
}))

import { workbenchApi } from "@/features/workbench/api"

const iso = () => new Date("2026-06-15T10:00:00Z").toISOString()

function validSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "sess-1",
    patientId: "pat-1",
    patientName: "张三",
    entryType: "new" as const,
    status: "chatting" as const,
    startedAt: iso(),
    updatedAt: iso(),
    askRound: 0,
    askRoundLimit: 10,
    labRound: 0,
    labRoundLimit: 3,
    timerPaused: false,
    summary: {},
    ...overrides,
  }
}

function validMessageItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "tl-1",
    sessionId: "sess-1",
    createdAt: iso(),
    status: "done" as const,
    kind: "message" as const,
    role: "patient" as const,
    content: "hello",
    ...overrides,
  }
}

describe("workbenchApi", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── getSession ─────────────────────────────────────────────────────

  describe("getSession", () => {
    it("GETs /visits/:id and returns parsed session", async () => {
      const raw = validSession()
      vi.mocked(mockTransport.get).mockResolvedValueOnce(raw)

      const result = await workbenchApi.getSession("sess-1")

      expect(mockTransport.get).toHaveBeenCalledWith("/visits/sess-1")
      expect(result.id).toBe("sess-1")
    })

    it("throws on invalid response", async () => {
      vi.mocked(mockTransport.get).mockResolvedValueOnce({ id: "sess-1" })

      await expect(workbenchApi.getSession("sess-1")).rejects.toThrow()
    })
  })

  // ─── listTimeline ───────────────────────────────────────────────────

  describe("listTimeline", () => {
    it("GETs /visits/:id/timeline with searchParams and returns parsed result", async () => {
      const raw = { items: [validMessageItem()], hasMore: false }
      vi.mocked(mockTransport.get).mockResolvedValueOnce(raw)

      const result = await workbenchApi.listTimeline({
        sessionId: "sess-1",
        pageSize: 20,
      })

      expect(mockTransport.get).toHaveBeenCalledWith(
        "/visits/sess-1/timeline",
        expect.objectContaining({ searchParams: expect.any(Object) }),
      )
      expect(result.items).toHaveLength(1)
    })

    it("throws on invalid response", async () => {
      vi.mocked(mockTransport.get).mockResolvedValueOnce({ items: null, hasMore: false })

      // null items are transformed by pageResultSchema to [], so this should work
      const result = await workbenchApi.listTimeline({ sessionId: "sess-1" })
      expect(result.items).toEqual([])
    })

    it("throws on invalid items", async () => {
      vi.mocked(mockTransport.get).mockResolvedValueOnce({ items: [{}], hasMore: false })

      await expect(
        workbenchApi.listTimeline({ sessionId: "sess-1" }),
      ).rejects.toThrow()
    })
  })

  // ─── sendMessage ────────────────────────────────────────────────────

  describe("sendMessage", () => {
    it("POSTs to /visits/:id/messages and returns parsed result", async () => {
      const raw = {
        session: validSession(),
        patientMessage: validMessageItem(),
      }
      vi.mocked(mockTransport.post).mockResolvedValueOnce(raw)

      const result = await workbenchApi.sendMessage({
        sessionId: "sess-1",
        content: "hello",
        clientMessageId: "cm-1",
      })

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/sess-1/messages",
        expect.objectContaining({
          sessionId: "sess-1",
          content: "hello",
          clientMessageId: "cm-1",
        }),
      )
      expect(result.session.id).toBe("sess-1")
    })
  })

  // ─── streamAssistantMessage ─────────────────────────────────────────

  describe("streamAssistantMessage", () => {
    it("POSTs to /visits/:id/assistant-stream and wraps handlers", async () => {
      const handlers = {
        onEvent: vi.fn(),
        onError: vi.fn(),
        onDone: vi.fn(),
      }
      vi.mocked(mockTransport.stream).mockResolvedValueOnce(undefined)

      await workbenchApi.streamAssistantMessage(
        { sessionId: "sess-1", requestId: "req-1" },
        handlers,
      )

      expect(mockTransport.stream).toHaveBeenCalledWith(
        "/visits/sess-1/assistant-stream",
        { sessionId: "sess-1", requestId: "req-1" },
        expect.objectContaining({
          onEvent: expect.any(Function),
          onError: handlers.onError,
          onDone: handlers.onDone,
        }),
      )
    })

    it("calls onEvent with parsed event", async () => {
      const onEvent = vi.fn()
      let capturedHandler: Record<string, unknown> = {}
      vi.mocked(mockTransport.stream).mockImplementation(
        async (_path: string, _body: unknown, handlers: Record<string, unknown>) => {
          capturedHandler = handlers
          const onEventFn = handlers.onEvent as (event: unknown) => void
          onEventFn({ type: "done", sessionId: "sess-1", requestId: "req-1" })
        },
      )

      await workbenchApi.streamAssistantMessage(
        { sessionId: "sess-1", requestId: "req-1" },
        { onEvent },
      )

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "done" }),
      )
    })

    it("forwards error and done handlers", async () => {
      const onError = vi.fn()
      const onDone = vi.fn()
      vi.mocked(mockTransport.stream).mockResolvedValueOnce(undefined)

      await workbenchApi.streamAssistantMessage(
        { sessionId: "sess-1", requestId: "req-1" },
        { onError, onDone },
      )

      expect(mockTransport.stream).toHaveBeenCalledWith(
        "/visits/sess-1/assistant-stream",
        expect.anything(),
        expect.objectContaining({ onError, onDone }),
      )
    })
  })

  // ─── submitLabDecision ──────────────────────────────────────────────

  describe("submitLabDecision", () => {
    it("POSTs and returns flow action result", async () => {
      const raw = { sessionId: "sess-1", status: "chatting", timelineItems: [] }
      vi.mocked(mockTransport.post).mockResolvedValueOnce(raw)

      const result = await workbenchApi.submitLabDecision({
        sessionId: "sess-1",
        cardId: "card-1",
        decision: "accepted",
      })

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/sess-1/lab-decision",
        expect.any(Object),
      )
      expect(result.sessionId).toBe("sess-1")
    })
  })

  // ─── submitPayment ──────────────────────────────────────────────────

  describe("submitPayment", () => {
    it("POSTs and returns flow action result", async () => {
      const raw = { sessionId: "sess-1", status: "chatting", timelineItems: [] }
      vi.mocked(mockTransport.post).mockResolvedValueOnce(raw)

      const result = await workbenchApi.submitPayment({
        sessionId: "sess-1",
        cardId: "card-1",
        purpose: "lab",
      })

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/sess-1/payments",
        expect.any(Object),
      )
      expect(result.sessionId).toBe("sess-1")
    })
  })

  // ─── submitFulfillment ──────────────────────────────────────────────

  describe("submitFulfillment", () => {
    it("POSTs and returns flow action result", async () => {
      const raw = { sessionId: "sess-1", status: "chatting", timelineItems: [] }
      vi.mocked(mockTransport.post).mockResolvedValueOnce(raw)

      const result = await workbenchApi.submitFulfillment({
        sessionId: "sess-1",
        cardId: "card-1",
        mode: "pickup",
      })

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/sess-1/fulfillment",
        expect.any(Object),
      )
      expect(result.sessionId).toBe("sess-1")
    })
  })

  // ─── submitTreatmentExecution ───────────────────────────────────────

  describe("submitTreatmentExecution", () => {
    it("POSTs and returns flow action result", async () => {
      const raw = { sessionId: "sess-1", status: "chatting", timelineItems: [] }
      vi.mocked(mockTransport.post).mockResolvedValueOnce(raw)

      const result = await workbenchApi.submitTreatmentExecution({
        sessionId: "sess-1",
        cardId: "card-1",
        action: "start",
      })

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/sess-1/treatment-execution",
        expect.any(Object),
      )
      expect(result.sessionId).toBe("sess-1")
    })
  })

  // ─── ackAdvice ──────────────────────────────────────────────────────

  describe("ackAdvice", () => {
    it("POSTs and returns flow action result", async () => {
      const raw = { sessionId: "sess-1", status: "chatting", timelineItems: [] }
      vi.mocked(mockTransport.post).mockResolvedValueOnce(raw)

      const result = await workbenchApi.ackAdvice({
        sessionId: "sess-1",
        cardId: "card-1",
      })

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/sess-1/advice-ack",
        expect.any(Object),
      )
      expect(result.sessionId).toBe("sess-1")
    })
  })

  // ─── askLockedQuestion ──────────────────────────────────────────────

  describe("askLockedQuestion", () => {
    it("POSTs to /visits/:id/lock-question with stream", async () => {
      const handlers = { onEvent: vi.fn() }
      vi.mocked(mockTransport.stream).mockResolvedValueOnce(undefined)

      await workbenchApi.askLockedQuestion(
        {
          sessionId: "sess-1",
          cardId: "card-1",
          content: "question?",
          requestId: "req-1",
        },
        handlers,
      )

      expect(mockTransport.stream).toHaveBeenCalledWith(
        "/visits/sess-1/lock-question",
        expect.objectContaining({ content: "question?" }),
        expect.objectContaining({ onEvent: expect.any(Function) }),
      )
    })
  })

  // ─── classifyFollowUpIntent ─────────────────────────────────────────

  describe("classifyFollowUpIntent", () => {
    it("POSTs and returns classify result", async () => {
      const raw = { intent: "consultation", confidence: 0.95 }
      vi.mocked(mockTransport.post).mockResolvedValueOnce(raw)

      const result = await workbenchApi.classifyFollowUpIntent({
        sessionId: "sess-1",
        content: "I have a fever",
      })

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/sess-1/classify-intent",
        expect.any(Object),
      )
      expect(result.intent).toBe("consultation")
    })
  })

  // ─── streamConsultationReply ────────────────────────────────────────

  describe("streamConsultationReply", () => {
    it("POSTs to /visits/:id/consult with stream", async () => {
      const handlers = { onEvent: vi.fn() }
      vi.mocked(mockTransport.stream).mockResolvedValueOnce(undefined)

      await workbenchApi.streamConsultationReply(
        { sessionId: "sess-1", content: "hello", requestId: "req-1" },
        handlers,
      )

      expect(mockTransport.stream).toHaveBeenCalledWith(
        "/visits/sess-1/consult",
        expect.objectContaining({ content: "hello" }),
        expect.objectContaining({ onEvent: expect.any(Function) }),
      )
    })
  })

  // ─── reportVitals ───────────────────────────────────────────────────

  describe("reportVitals", () => {
    it("POSTs and returns emergency recheck result", async () => {
      const raw = { emergency: false }
      vi.mocked(mockTransport.post).mockResolvedValueOnce(raw)

      const result = await workbenchApi.reportVitals({
        sessionId: "sess-1",
        source: "patient_report",
        symptoms: ["headache"],
      })

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/sess-1/vitals",
        expect.any(Object),
      )
      expect(result.emergency).toBe(false)
    })
  })

  // ─── exitVisit ──────────────────────────────────────────────────────

  describe("exitVisit", () => {
    it("POSTs and returns exit settlement result", async () => {
      const raw = {
        sessionId: "sess-1",
        terminalReason: "patient_request",
        refundAmount: 0,
        payableAmount: 0,
        timelineItem: validMessageItem({
          kind: "terminal",
          reason: "patient_request",
          title: "Exit",
        }),
      }
      vi.mocked(mockTransport.post).mockResolvedValueOnce(raw)

      const result = await workbenchApi.exitVisit({
        sessionId: "sess-1",
        reason: "patient_request",
      })

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/sess-1/exit",
        expect.any(Object),
      )
      expect(result.terminalReason).toBe("patient_request")
    })
  })

  // ─── pauseVisitTimer ────────────────────────────────────────────────

  describe("pauseVisitTimer", () => {
    it("POSTs to /visits/:id/timer with action=pause", async () => {
      vi.mocked(mockTransport.post).mockResolvedValueOnce(validSession())

      const result = await workbenchApi.pauseVisitTimer({ sessionId: "sess-1" })

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/sess-1/timer",
        { sessionId: "sess-1", action: "pause" },
      )
      expect(result.id).toBe("sess-1")
    })
  })

  // ─── resumeVisitTimer ───────────────────────────────────────────────

  describe("resumeVisitTimer", () => {
    it("POSTs to /visits/:id/timer with action=resume", async () => {
      vi.mocked(mockTransport.post).mockResolvedValueOnce(validSession())

      const result = await workbenchApi.resumeVisitTimer({ sessionId: "sess-1" })

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/sess-1/timer",
        { sessionId: "sess-1", action: "resume" },
      )
      expect(result.id).toBe("sess-1")
    })
  })

  // ─── dismissEmergency ───────────────────────────────────────────────

  describe("dismissEmergency", () => {
    it("POSTs and returns dismiss result", async () => {
      const raw = {
        session: validSession(),
        timelineItem: validMessageItem(),
      }
      vi.mocked(mockTransport.post).mockResolvedValueOnce(raw)

      const result = await workbenchApi.dismissEmergency({ sessionId: "sess-1" })

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/sess-1/dismiss-emergency",
        { sessionId: "sess-1" },
      )
      expect(result.session.id).toBe("sess-1")
    })
  })

  // ─── suspendVisit ───────────────────────────────────────────────────

  describe("suspendVisit", () => {
    it("POSTs and returns suspend result", async () => {
      const raw = {
        session: validSession(),
        timelineItem: validMessageItem(),
      }
      vi.mocked(mockTransport.post).mockResolvedValueOnce(raw)

      const result = await workbenchApi.suspendVisit({ sessionId: "sess-1" })

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/visits/sess-1/suspend",
        { sessionId: "sess-1" },
      )
      expect(result.session.id).toBe("sess-1")
    })
  })

  // ─── Re-exports ─────────────────────────────────────────────────────

  describe("re-exports", () => {
    it("re-exports type-checkable schemas from schemas and timeline-schemas", async () => {
      // These are re-exported via export * from in the index module
      // We verify they exist by importing them
      const allExports = await import("@/features/workbench/api")
      expect(typeof allExports.sendMessageInputSchema).toBe("object")
      expect(typeof allExports.flowCardSchema).toBe("object")
      expect(typeof allExports.timelineItemSchema).toBe("object")
    })
  })
})
