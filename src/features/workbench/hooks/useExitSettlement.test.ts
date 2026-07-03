import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { FlowCard, TimelineItem } from "@/features/workbench/api"
import { useExitSettlement } from "@/features/workbench/hooks/useExitSettlement"
import {
  createCompletedLabExecutionCard,
  createDiagnosisCard,
  createLabPaymentCard,
  createMedicationFulfillmentCard,
  createTreatmentExecutionCard,
} from "@/mocks/api/fixtures/flow-cards"

const sessionId = "visit-exit-test"

function cardItem(card: FlowCard): TimelineItem {
  return {
    id: `tl-${card.id}`,
    sessionId,
    kind: "flow_card",
    status: "done",
    createdAt: card.createdAt,
    card,
  }
}

/** 把 fixture 的 payment 卡标记为已支付（fixture 默认 unpaid）。 */
function paidLabPayment(id: string): FlowCard {
  const card = createLabPaymentCard(sessionId, id)
  if (card.kind !== "payment") {
    throw new Error("expected payment card")
  }
  return { ...card, status: "completed", paymentStatus: "paid" }
}

/** 把 fixture 的 payment 卡标记为已支付 0 元（自付部分 0）。 */
function paidZeroAmountPayment(id: string): FlowCard {
  const card = createLabPaymentCard(sessionId, id)
  if (card.kind !== "payment") {
    throw new Error("expected payment card")
  }
  return { ...card, status: "completed", paymentStatus: "paid", selfPayAmount: 0 }
}

/** 把 fixture 的取药卡标记为已完成（fixture 默认 pending）。 */
function dispensedMedication(id: string): FlowCard {
  const card = createMedicationFulfillmentCard(sessionId, id)
  if (card.kind !== "medication_fulfillment") {
    throw new Error("expected medication_fulfillment card")
  }
  return { ...card, status: "completed", fulfillmentStatus: "completed" }
}

/** 把 fixture 的 treatment_execution 卡标记为已完成。 */
function completedTreatmentExecution(id: string): FlowCard {
  const card = createTreatmentExecutionCard(sessionId, id)
  return { ...card, status: "completed", executionStatus: "completed" }
}

describe("useExitSettlement", () => {
  it("derives no_fee when no payment has been made", () => {
    const items = [cardItem(createDiagnosisCard(sessionId, "card-diagnosis"))]

    const { result } = renderHook(() => useExitSettlement(items))
    const { consequence } = result.current

    expect(consequence.kind).toBe("no_fee")
    expect(consequence.amount).toBeUndefined()
    expect(consequence.text).toBe("本次问诊将直接结束，不产生费用。")
  })

  it("derives refundable with the self-pay amount when paid but nothing executed", () => {
    const items = [
      cardItem(createDiagnosisCard(sessionId, "card-diagnosis")),
      cardItem(paidLabPayment("card-lab-pay")),
    ]

    const { result } = renderHook(() => useExitSettlement(items))
    const { consequence } = result.current

    expect(consequence.kind).toBe("refundable")
    // fixture selfPayAmount = 15
    expect(consequence.amount).toBe(15)
    expect(consequence.text).toContain("¥15")
  })

  it("derives executed_no_refund when a paid payment has a completed execution", () => {
    const items = [
      cardItem(paidLabPayment("card-lab-pay")),
      cardItem(createCompletedLabExecutionCard(sessionId, "card-lab-result")),
    ]

    const { result } = renderHook(() => useExitSettlement(items))
    const { consequence } = result.current

    expect(consequence.kind).toBe("executed_no_refund")
    expect(consequence.amount).toBeUndefined()
    expect(consequence.text).toBe(
      "已完成的检验/治疗费用不可退，结果会留档供下次使用。",
    )
  })

  it("derives medication_dispensed and prioritizes it over execution/payment tiers", () => {
    const items = [
      cardItem(paidLabPayment("card-lab-pay")),
      cardItem(createCompletedLabExecutionCard(sessionId, "card-lab-result")),
      cardItem(dispensedMedication("card-fulfillment")),
    ]

    const { result } = renderHook(() => useExitSettlement(items))
    const { consequence } = result.current

    expect(consequence.kind).toBe("medication_dispensed")
    expect(consequence.text).toBe("已取药品按退药政策处理，详见结算明细。")
  })

  // ---- New edge case tests ----

  it("derives executed_no_refund for treatment execution (not just lab)", () => {
    const items = [
      cardItem(paidLabPayment("card-lab-pay")),
      cardItem(completedTreatmentExecution("card-tx-result")),
    ]

    const { result } = renderHook(() => useExitSettlement(items))
    const { consequence } = result.current

    expect(consequence.kind).toBe("executed_no_refund")
    expect(consequence.text).toBe(
      "已完成的检验/治疗费用不可退，结果会留档供下次使用。",
    )
  })

  it("returns no_fee for empty timeline items", () => {
    const items: TimelineItem[] = []

    const { result } = renderHook(() => useExitSettlement(items))
    const { consequence } = result.current

    expect(consequence.kind).toBe("no_fee")
    expect(consequence.amount).toBeUndefined()
  })

  it("derives refundable with amount=0 when selfPayAmount is 0", () => {
    const items = [
      cardItem(paidZeroAmountPayment("card-zero-pay")),
    ]

    const { result } = renderHook(() => useExitSettlement(items))
    const { consequence } = result.current

    expect(consequence.kind).toBe("refundable")
    expect(consequence.amount).toBe(0)
    expect(consequence.text).toContain("¥0")
  })

  it("derives refundable with selfPayAmount summed from multiple paid payments", () => {
    const pay1 = paidLabPayment("card-pay-1")
    const pay2 = paidLabPayment("card-pay-2")
    // Each fixture has selfPayAmount = 15
    const items = [cardItem(pay1), cardItem(pay2)]

    const { result } = renderHook(() => useExitSettlement(items))
    const { consequence } = result.current

    expect(consequence.kind).toBe("refundable")
    expect(consequence.amount).toBe(30)
  })

  it("handles timeline items that are not flow_card gracefully", () => {
    const items = [
      {
        kind: "message" as const,
        id: "msg-001",
        sessionId,
        createdAt: "2026-06-28T01:00:00.000Z",
        status: "done" as const,
        role: "patient" as const,
        content: "hello",
      } as TimelineItem,
    ]

    const { result } = renderHook(() => useExitSettlement(items))

    // No flow cards → no payments → no_fee
    expect(result.current.consequence.kind).toBe("no_fee")
  })
})
