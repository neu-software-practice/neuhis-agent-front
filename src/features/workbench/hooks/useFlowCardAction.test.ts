import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { FlowActionResult, FlowCard, TimelineItem } from "@/features/workbench/api"
import { workbenchApi } from "@/features/workbench/api"
import { collectFlowActionSuccessEvents } from "@/features/workbench/hooks/useFlowCardAction"
import { useFlowCardAction } from "@/features/workbench/hooks/useFlowCardAction"
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

afterEach(() => {
  vi.restoreAllMocks()
})

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

describe("useFlowCardAction", () => {
  it("marks the submitted payment card as paid even when the result card is the next flow card", async () => {
    const submittedCard = createLabPaymentCard(sessionId, "card-lab-pay")
    const nextCard = createMedicationPaymentCard(sessionId, "card-med-pay")
    if (submittedCard.kind !== "payment") {
      throw new Error("expected payment card")
    }

    vi.spyOn(workbenchApi, "submitPayment").mockResolvedValue({
      sessionId,
      status: "blocked",
      activeCardId: nextCard.id,
      card: nextCard,
      timelineItems: [cardItem(nextCard)],
    })

    let currentCard: FlowCard = submittedCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
        findCardById: () => submittedCard,
      }),
    )

    await act(async () => {
      await result.current.handleAction({
        type: "submit_payment",
        cardId: submittedCard.id,
        paymentMethodId: "default",
      })
    })

    expect(currentCard).toMatchObject({
      kind: "payment",
      status: "paid",
      paymentStatus: "paid",
      blocking: false,
    })
    expect(currentCard.handledAt).toBeDefined()
  })
})
