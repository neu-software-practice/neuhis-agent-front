import { describe, expect, it } from "vitest"

import type {
  FlowCard,
  FlowCardAction,
  TimelineItem,
} from "@/features/workbench/api"
import {
  getCardActionLabel,
  getLockReason,
  isBlockingCard,
  mapCardToMachineEvent,
  mapTimelineItemToMachineEvent,
  toAckAdviceInput,
  toFulfillmentInput,
  toLabDecisionInput,
  toTreatmentExecutionInput,
} from "@/features/workbench/utils/card-normalizers"

function baseCard(kind: FlowCard["kind"], patch: Partial<FlowCard> = {}): FlowCard {
  return {
    id: "card-001",
    sessionId: "visit-test-001",
    status: "pending",
    blocking: false,
    title: "测试卡片",
    createdAt: "2026-06-28T01:00:00.000Z",
    kind,
    ...patch,
  } as FlowCard
}

describe("card-normalizers", () => {
  describe("toLabDecisionInput", () => {
    it("maps accept_lab to decision=accepted", () => {
      const action = { type: "accept_lab", cardId: "card-lab-001" } as FlowCardAction
      expect(toLabDecisionInput(action, "visit-001")).toEqual({
        sessionId: "visit-001",
        cardId: "card-lab-001",
        decision: "accepted",
      })
    })

    it("maps skip_lab to decision=skipped", () => {
      const action = { type: "skip_lab", cardId: "card-lab-001" } as FlowCardAction
      expect(toLabDecisionInput(action, "visit-001")).toEqual({
        sessionId: "visit-001",
        cardId: "card-lab-001",
        decision: "skipped",
      })
    })

    it("maps veto_lab to decision=vetoed", () => {
      const action = { type: "veto_lab", cardId: "card-lab-001" } as FlowCardAction
      expect(toLabDecisionInput(action, "visit-001")).toEqual({
        sessionId: "visit-001",
        cardId: "card-lab-001",
        decision: "vetoed",
      })
    })
  })

  describe("toFulfillmentInput", () => {
    it("maps choose_fulfillment with delivery mode and addressId", () => {
      const action = {
        type: "choose_fulfillment",
        cardId: "card-ful-001",
        mode: "delivery",
        addressId: "addr-001",
      } as FlowCardAction
      expect(toFulfillmentInput(action, "visit-001")).toEqual({
        sessionId: "visit-001",
        cardId: "card-ful-001",
        mode: "delivery",
        addressId: "addr-001",
      })
    })

    it("maps choose_fulfillment with pickup mode and no addressId", () => {
      const action = {
        type: "choose_fulfillment",
        cardId: "card-ful-001",
        mode: "pickup",
      } as FlowCardAction
      expect(toFulfillmentInput(action, "visit-001")).toEqual({
        sessionId: "visit-001",
        cardId: "card-ful-001",
        mode: "pickup",
        addressId: undefined,
      })
    })
  })

  describe("toTreatmentExecutionInput", () => {
    it("maps submit_treatment_execution with action field", () => {
      const action = {
        type: "submit_treatment_execution",
        cardId: "card-tx-001",
        action: "schedule",
      } as FlowCardAction
      expect(toTreatmentExecutionInput(action, "visit-001")).toEqual({
        sessionId: "visit-001",
        cardId: "card-tx-001",
        action: "schedule",
      })
    })
  })

  describe("toAckAdviceInput", () => {
    it("maps ack_advice to sessionId and cardId", () => {
      const action = { type: "ack_advice", cardId: "card-adv-001" } as FlowCardAction
      expect(toAckAdviceInput(action, "visit-001")).toEqual({
        sessionId: "visit-001",
        cardId: "card-adv-001",
      })
    })
  })

  describe("mapCardToMachineEvent", () => {
    it("maps lab_decision to LAB_CARD_RAISED", () => {
      const card = baseCard("lab_decision")
      expect(mapCardToMachineEvent(card)).toEqual({
        type: "LAB_CARD_RAISED",
        cardId: "card-001",
      })
    })

    it("maps payment with purpose=medication to MEDICATION_PAYMENT_RAISED", () => {
      const card = baseCard("payment", { purpose: "medication" } as Partial<FlowCard>)
      expect(mapCardToMachineEvent(card)).toEqual({
        type: "MEDICATION_PAYMENT_RAISED",
        cardId: "card-001",
      })
    })

    it("maps payment with purpose=lab to PAYMENT_CARD_RAISED", () => {
      const card = baseCard("payment", { purpose: "lab" } as Partial<FlowCard>)
      expect(mapCardToMachineEvent(card)).toEqual({
        type: "PAYMENT_CARD_RAISED",
        cardId: "card-001",
        purpose: "lab",
      })
    })

    it("maps lab_execution to LAB_EXECUTION_STARTED", () => {
      const card = baseCard("lab_execution")
      expect(mapCardToMachineEvent(card)).toEqual({
        type: "LAB_EXECUTION_STARTED",
        cardId: "card-001",
      })
    })

    it("maps diagnosis to DIAGNOSIS_READY", () => {
      const card = baseCard("diagnosis")
      expect(mapCardToMachineEvent(card)).toEqual({
        type: "DIAGNOSIS_READY",
        cardId: "card-001",
      })
    })

    it("maps treatment_plan to TREATMENT_DECIDED with plan", () => {
      const card = baseCard("treatment_plan", { plan: "medication" } as Partial<FlowCard>)
      expect(mapCardToMachineEvent(card)).toEqual({
        type: "TREATMENT_DECIDED",
        cardId: "card-001",
        plan: "medication",
      })
    })

    it("maps medication_fulfillment to MEDICATION_FULFILLMENT_RAISED", () => {
      const card = baseCard("medication_fulfillment")
      expect(mapCardToMachineEvent(card)).toEqual({
        type: "MEDICATION_FULFILLMENT_RAISED",
        cardId: "card-001",
      })
    })

    it("maps treatment_execution to TREATMENT_EXECUTION_RAISED", () => {
      const card = baseCard("treatment_execution")
      expect(mapCardToMachineEvent(card)).toEqual({
        type: "TREATMENT_EXECUTION_RAISED",
        cardId: "card-001",
      })
    })

    it("maps advice_only to ADVICE_CARD_RAISED", () => {
      const card = baseCard("advice_only")
      expect(mapCardToMachineEvent(card)).toEqual({
        type: "ADVICE_CARD_RAISED",
        cardId: "card-001",
      })
    })

    it("maps completed_visit to VISIT_COMPLETED", () => {
      const card = baseCard("completed_visit")
      expect(mapCardToMachineEvent(card)).toEqual({
        type: "VISIT_COMPLETED",
      })
    })
  })

  describe("mapTimelineItemToMachineEvent", () => {
    it("maps a flow_card timeline item to its machine event", () => {
      const item = {
        id: "tl-001",
        sessionId: "visit-001",
        createdAt: "2026-06-28T01:00:00.000Z",
        status: "done",
        kind: "flow_card",
        card: baseCard("lab_decision"),
      } as unknown as TimelineItem
      expect(mapTimelineItemToMachineEvent(item)).toEqual({
        type: "LAB_CARD_RAISED",
        cardId: "card-001",
      })
    })

    it("returns null for non-flow_card timeline items", () => {
      const item = {
        id: "tl-002",
        sessionId: "visit-001",
        createdAt: "2026-06-28T01:00:00.000Z",
        status: "done",
        kind: "message",
        role: "patient",
        content: "hello",
      } as unknown as TimelineItem
      expect(mapTimelineItemToMachineEvent(item)).toBeNull()
    })
  })

  describe("getCardActionLabel", () => {
    it.each([
      ["accept_lab", "同意检验"],
      ["skip_lab", "跳过检验"],
      ["veto_lab", "暂不决定"],
      ["submit_payment", "确认支付"],
      ["defer_payment", "暂不缴费"],
      ["ack_advice", "已知晓"],
    ] as const)("returns label for %s", (type, expected) => {
      const action = { type, cardId: "card-001" } as FlowCardAction
      expect(getCardActionLabel(action)).toBe(expected)
    })

    it("returns 自取 for choose_fulfillment pickup", () => {
      const action = {
        type: "choose_fulfillment",
        cardId: "card-001",
        mode: "pickup",
      } as FlowCardAction
      expect(getCardActionLabel(action)).toBe("自取")
    })

    it("returns 配送 for choose_fulfillment delivery", () => {
      const action = {
        type: "choose_fulfillment",
        cardId: "card-001",
        mode: "delivery",
      } as FlowCardAction
      expect(getCardActionLabel(action)).toBe("配送")
    })

    it.each([
      ["schedule", "预约"],
      ["confirm_arrival", "确认到号"],
      ["start", "开始执行"],
      ["complete", "确认完成"],
      ["cancel", "取消"],
    ] as const)("returns label for submit_treatment_execution %s", (act, expected) => {
      const action = {
        type: "submit_treatment_execution",
        cardId: "card-001",
        action: act,
      } as FlowCardAction
      expect(getCardActionLabel(action)).toBe(expected)
    })

    it("falls back to raw action string for unknown treatment execution action", () => {
      const action = {
        type: "submit_treatment_execution",
        cardId: "card-001",
        action: "unknown_action",
      } as unknown as FlowCardAction
      expect(getCardActionLabel(action)).toBe("unknown_action")
    })
  })

  describe("isBlockingCard", () => {
    it("returns true when card.blocking is true", () => {
      const card = baseCard("lab_decision", { blocking: true })
      expect(isBlockingCard(card)).toBe(true)
    })

    it("returns false when card.blocking is false", () => {
      const card = baseCard("lab_decision", { blocking: false })
      expect(isBlockingCard(card)).toBe(false)
    })
  })

  describe("getLockReason", () => {
    it("returns card.lockReason when present", () => {
      const card = baseCard("lab_decision", { lockReason: "请先完成检验" })
      expect(getLockReason(card)).toBe("请先完成检验")
    })

    it("returns default text when lockReason is absent", () => {
      const card = baseCard("lab_decision")
      expect(getLockReason(card)).toBe("请先处理当前卡片")
    })
  })
})
