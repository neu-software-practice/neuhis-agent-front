import { describe, expect, it } from "vitest"

import {
  createAdviceOnlyCard,
  createCompletedLabExecutionCard,
  createCompletedVisitCard,
  createDiagnosisCard,
  createLabDecisionCard,
  createLabPaymentCard,
  createMedicationFulfillmentCard,
  createMedicationPaymentCard,
  createTreatmentExecutionCard,
  createTreatmentPlanCard,
} from "@/mocks/api/fixtures/flow-cards"

const SESSION_ID = "session-test"

describe("flow-card fixtures", () => {
  describe("createLabDecisionCard", () => {
    it("creates a lab_decision card", () => {
      const card = createLabDecisionCard(SESSION_ID, "card-1")
      expect(card.kind).toBe("lab_decision")
      expect(card.sessionId).toBe(SESSION_ID)
      expect(card.id).toBe("card-1")
      expect(card.status).toBe("pending")
      expect(card.blocking).toBe(true)
    })

    it("includes test items and reason", () => {
      const card = createLabDecisionCard(SESSION_ID, "card-2")
      expect(card.testItems.length).toBeGreaterThan(0)
      expect(card.reason).toBeTruthy()
      expect(card.estimatedFee).toBeGreaterThan(0)
    })
  })

  describe("createLabPaymentCard", () => {
    it("creates a payment card for lab purpose", () => {
      const card = createLabPaymentCard(SESSION_ID, "card-3")
      expect(card.kind).toBe("payment")
      expect(card.purpose).toBe("lab")
      expect(card.totalAmount).toBe(35)
      expect(card.paymentStatus).toBe("unpaid")
      expect(card.blocking).toBe(true)
    })

    it("has insurance and self-pay split", () => {
      const card = createLabPaymentCard(SESSION_ID, "card-4")
      expect(card.insuranceAmount).toBeGreaterThan(0)
      expect(card.selfPayAmount).toBeGreaterThan(0)
      expect(card.totalAmount).toBe(card.insuranceAmount + card.selfPayAmount)
    })
  })

  describe("createMedicationPaymentCard", () => {
    it("creates a payment card for medication purpose", () => {
      const card = createMedicationPaymentCard(SESSION_ID, "card-5")
      expect(card.kind).toBe("payment")
      expect(card.purpose).toBe("medication")
      expect(card.totalAmount).toBe(30)
    })
  })

  describe("createCompletedLabExecutionCard", () => {
    it("creates a completed lab_execution card", () => {
      const card = createCompletedLabExecutionCard(SESSION_ID, "card-6")
      expect(card.kind).toBe("lab_execution")
      expect(card.status).toBe("completed")
      expect(card.executionStatus).toBe("completed")
      expect(card.blocking).toBe(false)
      expect(card.resultSummary).toBeTruthy()
    })
  })

  describe("createDiagnosisCard", () => {
    it("creates a diagnosis card with evidence", () => {
      const card = createDiagnosisCard(SESSION_ID, "card-7")
      expect(card.kind).toBe("diagnosis")
      expect(card.status).toBe("completed")
      expect(card.diagnosis).toBeTruthy()
      expect(card.confidence).toBe("medium")
      expect(card.evidence.length).toBeGreaterThan(0)
    })

    it("supports includeLabEvidence option", () => {
      const withLab = createDiagnosisCard(SESSION_ID, "card-8", { includeLabEvidence: true })
      const withoutLab = createDiagnosisCard(SESSION_ID, "card-9", { includeLabEvidence: false })
      // With lab evidence includes "血常规白细胞轻度升高"; without uses "患者选择暂不进行检验"
      expect(withLab.evidence).toContain("血常规白细胞轻度升高")
      expect(withoutLab.evidence).toContain("患者选择暂不进行检验")
      expect(withLab.evidenceSources).toContain("lab_result")
      expect(withoutLab.evidenceSources).not.toContain("lab_result")
    })
  })

  describe("createTreatmentPlanCard", () => {
    it("defaults to medication plan", () => {
      const card = createTreatmentPlanCard(SESSION_ID, "card-10")
      expect(card.kind).toBe("treatment_plan")
      expect(card.plan).toBe("medication")
      expect(card.status).toBe("completed")
    })

    it("supports treatment plan type", () => {
      const card = createTreatmentPlanCard(SESSION_ID, "card-11", "treatment")
      expect(card.plan).toBe("treatment")
      expect(card.actions.length).toBeGreaterThan(0)
    })

    it("supports advice_only plan type", () => {
      const card = createTreatmentPlanCard(SESSION_ID, "card-12", "advice_only")
      expect(card.plan).toBe("advice_only")
    })

    it("supports referral plan type", () => {
      const card = createTreatmentPlanCard(SESSION_ID, "card-13", "referral")
      expect(card.plan).toBe("referral")
      expect(card.capability).toBe("unavailable")
    })
  })

  describe("createTreatmentExecutionCard", () => {
    it("creates a pending treatment_execution card", () => {
      const card = createTreatmentExecutionCard(SESSION_ID, "card-14")
      expect(card.kind).toBe("treatment_execution")
      expect(card.status).toBe("pending")
      expect(card.blocking).toBe(true)
      expect(card.executionStatus).toBe("pending")
      expect(card.availableActions).toContain("schedule")
    })
  })

  describe("createMedicationFulfillmentCard", () => {
    it("creates a medication_fulfillment card", () => {
      const card = createMedicationFulfillmentCard(SESSION_ID, "card-15")
      expect(card.kind).toBe("medication_fulfillment")
      expect(card.status).toBe("pending")
      expect(card.blocking).toBe(true)
      expect(card.medications.length).toBeGreaterThan(0)
      expect(card.availableModes).toContain("pickup")
      expect(card.availableModes).toContain("delivery")
    })
  })

  describe("createCompletedVisitCard", () => {
    it("creates a completed_visit card", () => {
      const card = createCompletedVisitCard(SESSION_ID, "card-16")
      expect(card.kind).toBe("completed_visit")
      expect(card.status).toBe("completed")
      expect(card.blocking).toBe(false)
      expect(card.diagnosis).toBeTruthy()
      expect(card.followUpSuggestion).toBeTruthy()
    })
  })

  describe("createAdviceOnlyCard", () => {
    it("creates an advice_only card", () => {
      const card = createAdviceOnlyCard(SESSION_ID, "card-17")
      expect(card.kind).toBe("advice_only")
      expect(card.status).toBe("pending")
      expect(card.blocking).toBe(true)
      expect(card.advices.length).toBeGreaterThan(0)
      expect(card.watchItems.length).toBeGreaterThan(0)
    })
  })

  describe("factory uniqueness", () => {
    it("produces unique cards with different IDs", () => {
      const card1 = createLabDecisionCard(SESSION_ID, "unique-1")
      const card2 = createLabDecisionCard(SESSION_ID, "unique-2")
      expect(card1.id).not.toBe(card2.id)
    })

    it("respects the sessionId parameter", () => {
      const card = createDiagnosisCard("different-session", "card-x")
      expect(card.sessionId).toBe("different-session")
    })
  })
})
