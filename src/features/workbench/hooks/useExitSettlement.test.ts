import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { FlowCard, TimelineItem } from "@/features/workbench/api"
import { useExitSettlement } from "@/features/workbench/hooks/useExitSettlement"
import {
  createCompletedLabExecutionCard,
  createDiagnosisCard,
  createLabPaymentCard,
  createMedicationFulfillmentCard,
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

/** 把 fixture 的取药卡标记为已完成（fixture 默认 pending）。 */
function dispensedMedication(id: string): FlowCard {
  const card = createMedicationFulfillmentCard(sessionId, id)
  if (card.kind !== "medication_fulfillment") {
    throw new Error("expected medication_fulfillment card")
  }
  return { ...card, status: "completed", fulfillmentStatus: "completed" }
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
})
