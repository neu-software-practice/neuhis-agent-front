import { describe, expect, it } from "vitest"

import type { FlowActionResult, FlowCard, TimelineItem } from "@/features/workbench/api"
import { collectFlowActionSuccessEvents } from "@/features/workbench/hooks/useFlowCardAction"
import {
  createCompletedLabExecutionCard,
  createDiagnosisCard,
  createLabPaymentCard,
  createMedicationFulfillmentCard,
  createMedicationPaymentCard,
  createTreatmentPlanCard,
} from "@/mocks/api/fixtures/flow-cards"

const sessionId = "visit-test"

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

describe("collectFlowActionSuccessEvents", () => {
  it("keeps lab payment success anchored to the submitted lab payment card", () => {
    const submittedCard = createLabPaymentCard(sessionId, "card-lab-pay")
    const labExecutionCard = createCompletedLabExecutionCard(sessionId, "card-lab-result")
    const medicationPaymentCard = createMedicationPaymentCard(sessionId, "card-med-pay")
    const result: FlowActionResult = {
      sessionId,
      status: "blocked",
      activeCardId: medicationPaymentCard.id,
      card: medicationPaymentCard,
      timelineItems: [
        cardItem(labExecutionCard),
        cardItem(createDiagnosisCard(sessionId, "card-diagnosis")),
        cardItem(createTreatmentPlanCard(sessionId, "card-plan", "medication")),
        cardItem(medicationPaymentCard),
      ],
    }

    const events = collectFlowActionSuccessEvents(
      {
        type: "submit_payment",
        cardId: submittedCard.id,
        paymentMethodId: "default",
      },
      result,
      submittedCard,
    )

    expect(events.map((event) => event.type)).toEqual([
      "LAB_PAYMENT_SUCCEEDED",
      "DIAGNOSIS_READY",
      "TREATMENT_DECIDED",
      "MEDICATION_PAYMENT_RAISED",
    ])
    expect(events[0]).toMatchObject({
      type: "LAB_PAYMENT_SUCCEEDED",
      cardId: labExecutionCard.id,
    })
  })

  it("maps medication payment success to medication fulfillment", () => {
    const submittedCard = createMedicationPaymentCard(sessionId, "card-med-pay")
    const fulfillmentCard = createMedicationFulfillmentCard(sessionId, "card-fulfillment")
    const result: FlowActionResult = {
      sessionId,
      status: "blocked",
      activeCardId: fulfillmentCard.id,
      card: fulfillmentCard,
      timelineItems: [cardItem(fulfillmentCard)],
    }

    const events = collectFlowActionSuccessEvents(
      {
        type: "submit_payment",
        cardId: submittedCard.id,
        paymentMethodId: "default",
      },
      result,
      submittedCard,
    )

    expect(events).toEqual([
      { type: "MEDICATION_PAID", cardId: fulfillmentCard.id },
    ])
  })

  it("maps failed payments without advancing the flow", () => {
    const submittedCard = createLabPaymentCard(sessionId, "card-lab-pay")
    if (submittedCard.kind !== "payment") {
      throw new Error("expected payment card")
    }
    const failedCard: FlowCard = {
      ...submittedCard,
      status: "failed",
      paymentStatus: "failed",
    }
    const result: FlowActionResult = {
      sessionId,
      status: "blocked",
      activeCardId: submittedCard.id,
      card: failedCard,
      timelineItems: [],
    }

    const events = collectFlowActionSuccessEvents(
      {
        type: "submit_payment",
        cardId: submittedCard.id,
        paymentMethodId: "default",
      },
      result,
      submittedCard,
    )

    expect(events).toEqual([
      { type: "PAYMENT_FAILED", cardId: submittedCard.id, purpose: "lab" },
    ])
  })
})
