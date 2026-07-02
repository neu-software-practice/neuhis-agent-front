import { describe, expect, it } from "vitest"

import { mapCardToMachineEvent } from "@/features/workbench/utils/card-normalizers"
import type { FlowCard } from "@/features/workbench/api"

const sessionId = "visit-test"
const baseFields = {
  id: "card-001",
  sessionId,
  blocking: false,
  title: "Test Card",
  createdAt: new Date().toISOString(),
} as const

describe("mapCardToMachineEvent", () => {
  describe("lab_execution card", () => {
    it("emits LAB_EXECUTION_STARTED for pending/processing statuses", () => {
      const nonCompletedStatuses = [
        "waiting_payment",
        "queued",
        "collecting",
        "testing",
      ] as const

      for (const executionStatus of nonCompletedStatuses) {
        const card: FlowCard = {
          ...baseFields,
          kind: "lab_execution",
          status: "pending",
          labOrderId: "lab-001",
          executionStatus,
        }
        const event = mapCardToMachineEvent(card)
        expect(event).toEqual({
          type: "LAB_EXECUTION_STARTED",
          cardId: card.id,
        })
      }
    })

    it("emits LAB_RESULT_RECEIVED for completed executionStatus", () => {
      const card: FlowCard = {
        ...baseFields,
        kind: "lab_execution",
        status: "completed",
        labOrderId: "lab-001",
        executionStatus: "completed",
        resultSummary: "白细胞轻度升高",
        resultReturnedAt: new Date().toISOString(),
      }
      const event = mapCardToMachineEvent(card)
      expect(event).toEqual({ type: "LAB_RESULT_RECEIVED" })
    })

    it("emits LAB_RESULT_RECEIVED for result_ready executionStatus", () => {
      const card: FlowCard = {
        ...baseFields,
        kind: "lab_execution",
        status: "completed",
        labOrderId: "lab-001",
        executionStatus: "result_ready",
        resultSummary: "检验结果已就绪",
      }
      const event = mapCardToMachineEvent(card)
      expect(event).toEqual({ type: "LAB_RESULT_RECEIVED" })
    })
  })

  describe("medication_fulfillment card", () => {
    it("emits MEDICATION_FULFILLMENT_RAISED for pending", () => {
      const card: FlowCard = {
        ...baseFields,
        kind: "medication_fulfillment",
        status: "pending",
        medications: [
          {
            name: "阿莫西林",
            spec: "0.25g",
            quantity: 12,
            dosage: "每日三次",
            days: 3,
            price: 15.0,
          },
        ],
        availableModes: ["pickup"],
        fulfillmentStatus: "pending",
      }
      const event = mapCardToMachineEvent(card)
      expect(event).toEqual({
        type: "MEDICATION_FULFILLMENT_RAISED",
        cardId: card.id,
      })
    })

    it("emits MEDICATION_FULFILLED for confirmed/completed fulfillmentStatus", () => {
      const fulfilledStatuses = ["confirmed", "completed"] as const

      for (const fulfillmentStatus of fulfilledStatuses) {
        const card: FlowCard = {
          ...baseFields,
          kind: "medication_fulfillment",
          status: "completed",
          medications: [
            {
              name: "阿莫西林",
              spec: "0.25g",
              quantity: 12,
              dosage: "每日三次",
              days: 3,
              price: 15.0,
            },
          ],
          availableModes: ["pickup"],
          fulfillmentStatus,
        }
        const event = mapCardToMachineEvent(card)
        expect(event).toEqual({
          type: "MEDICATION_FULFILLED",
          cardId: card.id,
        })
      }
    })

  })

  describe("other cards — no behavior change", () => {
    it("still maps lab_decision to LAB_CARD_RAISED", () => {
      const card: FlowCard = {
        ...baseFields,
        kind: "lab_decision",
        status: "pending",
        testItems: [{ code: "CBC", name: "血常规" }],
        estimatedFee: 35,
      }
      expect(mapCardToMachineEvent(card)).toEqual({
        type: "LAB_CARD_RAISED",
        cardId: card.id,
      })
    })

    it("still maps diagnosis to DIAGNOSIS_READY", () => {
      const card: FlowCard = {
        ...baseFields,
        kind: "diagnosis",
        status: "done",
        diagnosis: "上呼吸道感染",
        confidence: "high",
        evidence: ["咽部充血"],
        evidenceSources: ["answer"],
        riskSignals: [],
      }
      expect(mapCardToMachineEvent(card)).toEqual({
        type: "DIAGNOSIS_READY",
        cardId: card.id,
      })
    })
  })
})
