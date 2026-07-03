import { describe, expect, it } from "vitest"

import {
  mockActiveSession,
  mockCompletedSession,
  mockScreenshotSession,
} from "@/mocks/api/fixtures/visits"

describe("visits fixtures", () => {
  describe("mockActiveSession", () => {
    it("has required fields", () => {
      expect(mockActiveSession.id).toBe("visit-mock-active")
      expect(mockActiveSession.patientId).toBe("patient-mock-001")
      expect(mockActiveSession.status).toBe("chatting")
      expect(mockActiveSession.entryType).toBe("new")
    })

    it("has ask round tracking", () => {
      expect(mockActiveSession.askRound).toBeGreaterThanOrEqual(0)
      expect(mockActiveSession.askRoundLimit).toBeGreaterThan(0)
    })

    it("has lab round tracking", () => {
      expect(mockActiveSession.labRound).toBeGreaterThanOrEqual(0)
      expect(mockActiveSession.labRoundLimit).toBeGreaterThan(0)
    })

    it("has summary with chief complaint", () => {
      expect(mockActiveSession.summary.chiefComplaint).toBeTruthy()
    })

    it("is not timer paused", () => {
      expect(mockActiveSession.timerPaused).toBe(false)
    })
  })

  describe("mockCompletedSession", () => {
    it("has completed status", () => {
      expect(mockCompletedSession.status).toBe("completed")
    })

    it("has endedAt timestamp", () => {
      expect(mockCompletedSession.endedAt).toBeTruthy()
    })

    it("has diagnosis in summary", () => {
      expect(mockCompletedSession.summary.diagnosis).toBeTruthy()
    })

    it("has treatment summary", () => {
      expect(mockCompletedSession.summary.treatmentSummary).toBeTruthy()
    })
  })

  describe("mockScreenshotSession", () => {
    it("has completed status", () => {
      expect(mockScreenshotSession.status).toBe("completed")
    })

    it("has title in summary", () => {
      expect(mockScreenshotSession.summary.title).toBeTruthy()
    })

    it("has endedAt matching updatedAt", () => {
      expect(mockScreenshotSession.endedAt).toBe(mockScreenshotSession.updatedAt)
    })

    it("has lab round > 0 (lab was performed)", () => {
      expect(mockScreenshotSession.labRound).toBeGreaterThan(0)
    })
  })

  describe("session relationships", () => {
    it("all sessions reference the same patient", () => {
      expect(mockActiveSession.patientId).toBe("patient-mock-001")
      expect(mockCompletedSession.patientId).toBe("patient-mock-001")
      expect(mockScreenshotSession.patientId).toBe("patient-mock-001")
    })

    it("all sessions have unique IDs", () => {
      const ids = [
        mockActiveSession.id,
        mockCompletedSession.id,
        mockScreenshotSession.id,
      ]
      expect(new Set(ids).size).toBe(3)
    })
  })
})
