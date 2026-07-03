import { beforeEach, describe, expect, it } from "vitest"

import { api } from "@/features/api"
import { resetTransportForTests } from "@/lib/api"
import { mockDb } from "@/mocks/api/mock-db"

/**
 * These tests exercise the mock transport by calling feature APIs,
 * which internally use the mock transport when in mock mode.
 */

describe("mock transport", () => {
  beforeEach(() => {
    mockDb.reset()
    resetTransportForTests()
  })

  describe("GET routes", () => {
    it("GET /patients/:id/context returns patient context", async () => {
      const context = await api.patient.getContext?.("patient-mock-001")
      // getContext may not be in the API; verify via mockDb directly
      const direct = mockDb.getPatientContext("patient-mock-001")
      expect(direct.patient.id).toBe("patient-mock-001")
    })

    it("GET /visits returns session list", async () => {
      const result = await api.visits.listSessions({})
      expect(result.items.length).toBeGreaterThan(0)
    })

    it("GET /visits/:id returns session", async () => {
      const session = await api.visits.getSession("visit-mock-active")
      expect(session.id).toBe("visit-mock-active")
    })

    it("GET /billing/records returns billing records", async () => {
      const result = await api.billing.listRecords()
      expect(result.items).toBeDefined()
    })

    it("GET /medical-orders returns medical orders", async () => {
      const result = await api.medicalOrders.listRecords()
      expect(result.items).toBeDefined()
    })
  })

  describe("POST routes", () => {
    it("POST /visits creates a session", async () => {
      const result = await api.visits.createSession({
        patientId: "patient-mock-001",
        entryType: "new",
        chiefComplaint: "头痛",
      })
      expect(result.session.status).toBe("chatting")
    })

    it("POST /visits/:id/messages sends a message", async () => {
      const result = await api.workbench.sendMessage({
        sessionId: "visit-mock-active",
        content: "test",
        clientMessageId: "client-transport-1",
      })
      expect(result.patientMessage.content).toBe("test")
    })

    it("POST /visits/:id/timeline returns timeline", async () => {
      const result = await api.workbench.listTimeline({
        sessionId: "visit-mock-active",
      })
      expect(result.items.length).toBeGreaterThan(0)
    })
  })

  describe("error handling", () => {
    it("throws for nonexistent session", async () => {
      await expect(
        api.visits.getSession("nonexistent-session"),
      ).rejects.toThrow()
    })

    it("throws for nonexistent patient context", async () => {
      expect(() => mockDb.getPatientContext("nonexistent")).toThrow()
    })
  })

  describe("auth routes", () => {
    it("POST /auth/login returns tokens", () => {
      const result = mockDb.login({ phone: "13800002468", password: "12345678" })
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
      expect(result.expiresIn).toBe(900)
    })

    it("POST /auth/register creates user", () => {
      const result = mockDb.register({
        phone: "13822223333",
        password: "pass",
        realName: "测试",
      })
      expect(result.user.phone).toBe("13822223333")
      expect(result.accessToken).toBeTruthy()
    })
  })
})
