import { beforeEach, describe, expect, it } from "vitest"

import { mockDb } from "@/mocks/api/mock-db"
import {
  handleCreateFollowUp,
  handleCreateSession,
  handleGenerateTitle,
  handleGetReadonlySnapshot,
  handleGetSession,
  handleListSessions,
} from "@/mocks/api/handlers/visit-handlers"

describe("visit handlers", () => {
  beforeEach(() => {
    mockDb.reset()
  })

  describe("handleListSessions", () => {
    it("returns sessions list", () => {
      const result = handleListSessions()
      expect(result.items.length).toBeGreaterThan(0)
    })

    it("respects pageSize", () => {
      const result = handleListSessions({
        searchParams: { pageSize: "1" } as Record<string, string>,
      })
      expect(result.items.length).toBeLessThanOrEqual(1)
    })
  })

  describe("handleCreateSession", () => {
    it("creates a new session", () => {
      const result = handleCreateSession({
        patientId: "patient-mock-001",
        entryType: "new",
        chiefComplaint: "头痛",
      })
      expect(result.session.status).toBe("chatting")
      expect(result.session.summary.chiefComplaint).toBe("头痛")
    })
  })

  describe("handleCreateFollowUp", () => {
    it("creates a follow-up session", () => {
      const result = handleCreateFollowUp({
        patientId: "patient-mock-001",
        parentSessionId: "visit-mock-completed",
        chiefComplaint: "复诊",
      })
      expect(result.session.entryType).toBe("follow_up")
      expect(result.session.parentSessionId).toBe("visit-mock-completed")
    })
  })

  describe("handleGetSession", () => {
    it("returns a session by ID", () => {
      const result = handleGetSession("visit-mock-active")
      expect(result.id).toBe("visit-mock-active")
    })

    it("throws for nonexistent session", () => {
      expect(() => handleGetSession("nonexistent")).toThrow()
    })
  })

  describe("handleGetReadonlySnapshot", () => {
    it("returns a readonly snapshot", () => {
      const result = handleGetReadonlySnapshot("visit-mock-completed")
      expect(result.readonly).toBe(true)
      expect(result.session).toBeDefined()
      expect(result.timeline).toBeDefined()
    })
  })

  describe("handleGenerateTitle", () => {
    it("generates a title", () => {
      const result = handleGenerateTitle({ sessionId: "visit-mock-completed" })
      expect(result.sessionId).toBe("visit-mock-completed")
      expect(result.title).toBeTruthy()
    })
  })
})
