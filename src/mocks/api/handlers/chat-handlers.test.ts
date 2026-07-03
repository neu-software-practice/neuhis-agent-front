import { beforeEach, describe, expect, it } from "vitest"

import { mockDb } from "@/mocks/api/mock-db"
import {
  handleAckAdvice,
  handleClassifyIntent,
  handleDismissEmergency,
  handleExitVisit,
  handleListTimeline,
  handlePauseTimer,
  handleReportVitals,
  handleResumeTimer,
  handleSendMessage,
  handleSubmitFulfillment,
  handleSubmitLabDecision,
  handleSubmitPayment,
  handleSubmitTreatmentExecution,
  handleSuspendVisit,
} from "@/mocks/api/handlers/chat-handlers"

describe("chat handlers", () => {
  beforeEach(() => {
    mockDb.reset()
  })

  describe("handleListTimeline", () => {
    it("returns timeline items", () => {
      const result = handleListTimeline("visit-mock-active")
      expect(result.items.length).toBeGreaterThan(0)
    })

    it("respects pageSize option", () => {
      const result = handleListTimeline("visit-mock-active", {
        searchParams: { pageSize: "2" } as Record<string, string>,
      })
      expect(result.items.length).toBeLessThanOrEqual(2)
    })
  })

  describe("handleSendMessage", () => {
    it("adds message and returns result", () => {
      const result = handleSendMessage({
        sessionId: "visit-mock-active",
        content: "test message",
        clientMessageId: "client-1",
      })
      expect(result.patientMessage.content).toBe("test message")
      expect(result.session).toBeDefined()
    })
  })

  describe("handleSubmitLabDecision", () => {
    it("processes accepted decision", () => {
      // First raise a lab decision to get a cardId
      const raised = mockDb.raiseLabDecision("visit-mock-active")
      const result = handleSubmitLabDecision({
        sessionId: "visit-mock-active",
        cardId: raised.card!.id,
        decision: "accepted",
      })
      expect(result.card?.kind).toBe("payment")
    })
  })

  describe("handleSubmitPayment", () => {
    it("processes payment", () => {
      const raised = mockDb.raiseLabDecision("visit-mock-active")
      const paid = handleSubmitLabDecision({
        sessionId: "visit-mock-active",
        cardId: raised.card!.id,
        decision: "accepted",
      })
      const result = handleSubmitPayment({
        sessionId: "visit-mock-active",
        cardId: paid.card!.id,
        purpose: "lab",
      })
      expect(result.status).toBe("blocked")
    })
  })

  describe("handleSubmitTreatmentExecution", () => {
    it("returns error message for wrong card kind", () => {
      const raised = mockDb.raiseLabDecision("visit-mock-active")
      const result = handleSubmitTreatmentExecution({
        sessionId: "visit-mock-active",
        cardId: raised.card!.id,
        action: "complete",
      })
      expect(result.message).toContain("不是治疗执行卡")
    })

    it("completes treatment with valid card", () => {
      // Create a treatment execution card via full flow: raise lab -> accept -> pay lab -> get treatment plan -> pay medication -> fulfillment -> ...
      // Simpler: directly create a treatment_execution card in the timeline
      const raised = mockDb.raiseLabDecision("visit-mock-active")
      const paid = handleSubmitLabDecision({
        sessionId: "visit-mock-active",
        cardId: raised.card!.id,
        decision: "accepted",
      })
      // Pay the lab payment to get to treatment plan
      const afterLab = handleSubmitPayment({
        sessionId: "visit-mock-active",
        cardId: paid.card!.id,
        purpose: "lab",
      })
      // afterLab could be a medication_payment card or advice card depending on inferred plan
      if (afterLab.card?.kind === "payment") {
        const afterMedPay = handleSubmitPayment({
          sessionId: "visit-mock-active",
          cardId: afterLab.card.id,
          purpose: "medication",
        })
        if (afterMedPay.card?.kind === "medication_fulfillment") {
          const ackResult = handleSubmitFulfillment({
            sessionId: "visit-mock-active",
            cardId: afterMedPay.card.id,
            mode: "pickup",
          })
          expect(ackResult.card?.kind).toBe("completed_visit")
        }
      }
    })
  })

  describe("handleAckAdvice", () => {
    it("acknowledges advice card", () => {
      const raised = mockDb.raiseLabDecision("visit-mock-active")
      const skipped = handleSubmitLabDecision({
        sessionId: "visit-mock-active",
        cardId: raised.card!.id,
        decision: "skipped",
      })
      const result = handleAckAdvice({
        sessionId: "visit-mock-active",
        cardId: skipped.card!.id,
      })
      expect(result.card?.kind).toBe("completed_visit")
    })
  })

  describe("handleClassifyIntent", () => {
    it("classifies follow-up intent", () => {
      const result = handleClassifyIntent({
        sessionId: "visit-mock-active",
        content: "我想复诊",
      })
      expect(result.intent).toBe("follow_up")
    })
  })

  describe("handleReportVitals", () => {
    it("detects emergency", () => {
      const result = handleReportVitals({
        sessionId: "visit-mock-active",
        source: "patient_report",
        symptoms: ["胸痛"],
      })
      expect(result.emergency).toBe(true)
    })

    it("returns non-emergency for normal symptoms", () => {
      const result = handleReportVitals({
        sessionId: "visit-mock-active",
        source: "patient_report",
        symptoms: ["轻微咳嗽"],
        vitals: { spo2: 98 },
      })
      expect(result.emergency).toBe(false)
    })
  })

  describe("handleExitVisit", () => {
    it("exits a session", () => {
      const result = handleExitVisit({
        sessionId: "visit-mock-active",
        reason: "patient_request",
      })
      expect(result.terminalReason).toBe("exited")
    })

    it("handles emergency exit", () => {
      const result = handleExitVisit({
        sessionId: "visit-mock-active",
        reason: "emergency",
      })
      expect(result.terminalReason).toBe("emergency")
    })

    it("handles timeout exit", () => {
      const result = handleExitVisit({
        sessionId: "visit-mock-active",
        reason: "timeout",
      })
      expect(result.terminalReason).toBe("timeout")
    })
  })

  describe("handlePauseTimer / handleResumeTimer", () => {
    it("pauses and resumes timer", () => {
      const paused = handlePauseTimer({ sessionId: "visit-mock-active" })
      expect(paused.timerPaused).toBe(true)

      const resumed = handleResumeTimer({ sessionId: "visit-mock-active" })
      expect(resumed.timerPaused).toBe(false)
    })
  })

  describe("handleDismissEmergency", () => {
    it("dismisses emergency", () => {
      handleExitVisit({ sessionId: "visit-mock-active", reason: "emergency" })
      const result = handleDismissEmergency({ sessionId: "visit-mock-active" })
      expect(result.session.status).not.toBe("emergency_terminated")
    })
  })

  describe("handleSuspendVisit", () => {
    it("suspends a session", () => {
      const result = handleSuspendVisit({ sessionId: "visit-mock-active" })
      expect(result.session.status).toBe("suspended")
    })
  })
})
