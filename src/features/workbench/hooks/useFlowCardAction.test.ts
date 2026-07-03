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
  // ---- submit_payment tests ----

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

  // ---- accept_lab ----

  it("maps accept_lab to LAB_ACCEPTED using result card id when available", () => {
    const submittedCard = createLabPaymentCard(sessionId, "card-lab")
    const result: FlowActionResult = {
      sessionId,
      status: "blocked",
      activeCardId: "next-card",
      card: { id: "result-card-001" } as FlowCard,
      timelineItems: [],
    }

    const events = collectFlowActionSuccessEvents(
      { type: "accept_lab", cardId: "card-lab" },
      result,
      submittedCard,
    )

    expect(events).toEqual([
      { type: "LAB_ACCEPTED", cardId: "result-card-001" },
    ])
  })

  it("maps accept_lab using action.cardId when result has no card", () => {
    const result: FlowActionResult = {
      sessionId,
      status: "blocked",
      card: undefined,
      timelineItems: [],
    }

    const events = collectFlowActionSuccessEvents(
      { type: "accept_lab", cardId: "card-lab" },
      result,
    )

    expect(events).toEqual([
      { type: "LAB_ACCEPTED", cardId: "card-lab" },
    ])
  })

  // ---- skip_lab and veto_lab (default branch via mapActionToSuccessEvent) ----

  it("maps skip_lab to LAB_SKIPPED", () => {
    const events = collectFlowActionSuccessEvents(
      { type: "skip_lab", cardId: "card-lab" },
      { sessionId, status: "blocked", timelineItems: [] },
    )

    expect(events).toEqual([
      { type: "LAB_SKIPPED", cardId: "card-lab" },
    ])
  })

  it("maps veto_lab to LAB_VETOED", () => {
    const events = collectFlowActionSuccessEvents(
      { type: "veto_lab", cardId: "card-lab" },
      { sessionId, status: "blocked", timelineItems: [] },
    )

    expect(events).toEqual([
      { type: "LAB_VETOED", cardId: "card-lab" },
    ])
  })

  // ---- defer_payment ----

  it("maps defer_payment to PAYMENT_DEFERRED using submittedCard purpose", () => {
    const submittedCard = createMedicationPaymentCard(sessionId, "card-med-pay")
    if (submittedCard.kind !== "payment") throw new Error("expected payment card")

    const events = collectFlowActionSuccessEvents(
      { type: "defer_payment", cardId: "card-med-pay" },
      { sessionId, status: "blocked", timelineItems: [] },
      submittedCard,
    )

    expect(events).toEqual([
      { type: "PAYMENT_DEFERRED", cardId: "card-med-pay", purpose: "medication" },
    ])
  })

  it("maps defer_payment to PAYMENT_DEFERRED using result card purpose when submittedCard is not a payment card", () => {
    const submittedCard = { id: "card-001", kind: "lab_decision" } as FlowCard
    const result: FlowActionResult = {
      sessionId,
      status: "blocked",
      card: { id: "card-pay", kind: "payment", purpose: "lab" } as FlowCard,
      timelineItems: [],
    }

    const events = collectFlowActionSuccessEvents(
      { type: "defer_payment", cardId: "card-001" },
      result,
      submittedCard,
    )

    expect(events).toEqual([
      { type: "PAYMENT_DEFERRED", cardId: "card-001", purpose: "lab" },
    ])
  })

  it("maps defer_payment to PAYMENT_DEFERRED with default purpose lab when neither card has purpose", () => {
    const events = collectFlowActionSuccessEvents(
      { type: "defer_payment", cardId: "card-001" },
      { sessionId, status: "blocked", timelineItems: [] },
    )

    expect(events).toEqual([
      { type: "PAYMENT_DEFERRED", cardId: "card-001", purpose: "lab" },
    ])
  })

  // ---- choose_fulfillment ----

  it("maps choose_fulfillment to MEDICATION_FULFILLED and collects timeline events", () => {
    const fulfillmentCard = createMedicationFulfillmentCard(sessionId, "card-ful")
    const timelineEvents = [cardItem(fulfillmentCard)]
    const result: FlowActionResult = {
      sessionId,
      status: "blocked",
      card: fulfillmentCard,
      timelineItems: timelineEvents,
    }

    const events = collectFlowActionSuccessEvents(
      { type: "choose_fulfillment", cardId: "card-ful", mode: "pickup" },
      result,
    )

    expect(events).toEqual([
      { type: "MEDICATION_FULFILLED", cardId: "card-ful" },
      { type: "MEDICATION_FULFILLMENT_RAISED", cardId: "card-ful" },
    ])
  })

  // ---- submit_treatment_execution ----

  it("maps submit_treatment_execution schedule to TREATMENT_SCHEDULED", () => {
    const events = collectFlowActionSuccessEvents(
      { type: "submit_treatment_execution", cardId: "card-tx", action: "schedule" },
      { sessionId, status: "blocked", timelineItems: [] },
    )

    expect(events).toEqual([
      { type: "TREATMENT_SCHEDULED", cardId: "card-tx" },
    ])
  })

  it("maps submit_treatment_execution cancel to TRANSFER_REQUIRED", () => {
    const events = collectFlowActionSuccessEvents(
      { type: "submit_treatment_execution", cardId: "card-tx", action: "cancel" },
      { sessionId, status: "blocked", timelineItems: [] },
    )

    expect(events).toEqual([
      { type: "TRANSFER_REQUIRED", reason: "capability_insufficient" },
    ])
  })

  it("maps submit_treatment_execution confirm_arrival to TREATMENT_ARRIVED", () => {
    const events = collectFlowActionSuccessEvents(
      { type: "submit_treatment_execution", cardId: "card-tx", action: "confirm_arrival" },
      { sessionId, status: "blocked", timelineItems: [] },
    )

    expect(events).toEqual([{ type: "TREATMENT_ARRIVED", cardId: "card-tx" }])
  })

  it("maps submit_treatment_execution start to TREATMENT_STARTED", () => {
    const events = collectFlowActionSuccessEvents(
      { type: "submit_treatment_execution", cardId: "card-tx", action: "start" },
      { sessionId, status: "blocked", timelineItems: [] },
    )

    expect(events).toEqual([{ type: "TREATMENT_STARTED", cardId: "card-tx" }])
  })

  it("maps submit_treatment_execution complete to TREATMENT_COMPLETED", () => {
    const events = collectFlowActionSuccessEvents(
      { type: "submit_treatment_execution", cardId: "card-tx", action: "complete" },
      { sessionId, status: "blocked", timelineItems: [] },
    )

    expect(events).toEqual([{ type: "TREATMENT_COMPLETED", cardId: "card-tx" }])
  })

  // ---- submit_treatment_execution with unknown action (covers `return null` in inner switch) ----

  it("maps submit_treatment_execution with unknown action returns no events", () => {
    const events = collectFlowActionSuccessEvents(
      { type: "submit_treatment_execution", cardId: "card-tx", action: "unknown_action" as any },
      { sessionId, status: "blocked", timelineItems: [] },
    )

    expect(events).toEqual([])
  })

  // ---- ack_advice ----

  it("maps ack_advice to ADVICE_ACKNOWLEDGED", () => {
    const events = collectFlowActionSuccessEvents(
      { type: "ack_advice", cardId: "card-adv" },
      { sessionId, status: "blocked", timelineItems: [] },
    )

    expect(events).toEqual([
      { type: "ADVICE_ACKNOWLEDGED", cardId: "card-adv" },
    ])
  })

  // ---- submit_payment edge cases ----

  it("maps submit_payment to LAB_PAYMENT_SUCCEEDED when submittedCard is not a payment card", () => {
    const submittedCard = { id: "card-001", kind: "lab_decision" } as FlowCard
    const result: FlowActionResult = {
      sessionId,
      status: "blocked",
      card: undefined,
      timelineItems: [],
    }

    const events = collectFlowActionSuccessEvents(
      { type: "submit_payment", cardId: "card-001", paymentMethodId: "default" },
      result,
      submittedCard,
    )

    expect(events).toEqual([
      { type: "LAB_PAYMENT_SUCCEEDED", cardId: "card-001" },
    ])
  })

  it("maps failed payment using result.card.status === 'failed'", () => {
    const submittedCard = createLabPaymentCard(sessionId, "card-lab-pay")
    if (submittedCard.kind !== "payment") throw new Error("expected payment card")
    const failedCard: FlowCard = {
      ...submittedCard,
      status: "failed",
      paymentStatus: undefined,
    }
    const result: FlowActionResult = {
      sessionId,
      status: "blocked",
      activeCardId: submittedCard.id,
      card: failedCard,
      timelineItems: [],
    }

    const events = collectFlowActionSuccessEvents(
      { type: "submit_payment", cardId: submittedCard.id, paymentMethodId: "default" },
      result,
      submittedCard,
    )

    expect(events).toEqual([
      { type: "PAYMENT_FAILED", cardId: submittedCard.id, purpose: "lab" },
    ])
  })

  it("maps submit_payment to MEDICATION_PAID when purpose is medication but submittedCard is not a payment card", () => {
    const submittedCard = createMedicationPaymentCard(sessionId, "card-med-pay")
    if (submittedCard.kind !== "payment") throw new Error("expected payment card")

    const result: FlowActionResult = {
      sessionId,
      status: "blocked",
      card: undefined,
      timelineItems: [],
    }

    const events = collectFlowActionSuccessEvents(
      { type: "submit_payment", cardId: submittedCard.id, paymentMethodId: "default" },
      result,
      submittedCard,
    )

    expect(events).toEqual([
      { type: "MEDICATION_PAID", cardId: submittedCard.id },
    ])
  })
})

describe("useFlowCardAction", () => {
  // ---- submit_payment ----

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

  // ---- accept_lab ----

  it("handles accept_lab action and marks card as accepted", async () => {
    vi.spyOn(workbenchApi, "submitLabDecision").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: undefined,
      timelineItems: [],
    })

    let currentCard: FlowCard = { id: "card-lab-001", kind: "lab_decision", status: "pending", blocking: true } as FlowCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
      }),
    )

    await act(async () => {
      await result.current.handleAction({ type: "accept_lab", cardId: "card-lab-001" })
    })

    expect(currentCard).toMatchObject({
      status: "accepted",
      blocking: false,
    })
    expect(workbenchApi.submitLabDecision).toHaveBeenCalledOnce()
  })

  // ---- skip_lab ----

  it("handles skip_lab action and marks card as skipped", async () => {
    vi.spyOn(workbenchApi, "submitLabDecision").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: undefined,
      timelineItems: [],
    })

    let currentCard: FlowCard = { id: "card-lab-001", kind: "lab_decision", status: "pending", blocking: true } as FlowCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
      }),
    )

    await act(async () => {
      await result.current.handleAction({ type: "skip_lab", cardId: "card-lab-001" })
    })

    expect(currentCard).toMatchObject({
      status: "skipped",
      blocking: false,
    })
  })

  // ---- veto_lab ----

  it("handles veto_lab action and marks card as vetoed", async () => {
    vi.spyOn(workbenchApi, "submitLabDecision").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: undefined,
      timelineItems: [],
    })

    let currentCard: FlowCard = { id: "card-lab-001", kind: "lab_decision", status: "pending", blocking: true } as FlowCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
      }),
    )

    await act(async () => {
      await result.current.handleAction({ type: "veto_lab", cardId: "card-lab-001" })
    })

    expect(currentCard).toMatchObject({
      status: "vetoed",
      blocking: false,
    })
  })

  // ---- defer_payment ----

  it("handles defer_payment and marks card as invalidated", async () => {
    vi.spyOn(workbenchApi, "submitPayment").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: undefined,
      timelineItems: [],
    })

    let currentCard: FlowCard = createLabPaymentCard(sessionId, "card-lab-pay")
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
        findCardById: () => currentCard,
      }),
    )

    await act(async () => {
      await result.current.handleAction({ type: "defer_payment", cardId: "card-lab-pay" })
    })

    expect(currentCard).toMatchObject({
      status: "invalidated",
      blocking: false,
    })
    expect(workbenchApi.submitPayment).toHaveBeenCalledWith(
      expect.objectContaining({ defer: true }),
    )
  })

  // ---- choose_fulfillment ----

  it("handles choose_fulfillment and marks card as completed when resultCard is provided", async () => {
    vi.spyOn(workbenchApi, "submitFulfillment").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: { id: "card-ful-001", kind: "medication_fulfillment", status: "completed", blocking: false } as FlowCard,
      timelineItems: [],
    })

    let currentCard: FlowCard = { id: "card-ful-001", kind: "medication_fulfillment", status: "pending", blocking: true } as FlowCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
      }),
    )

    await act(async () => {
      await result.current.handleAction({
        type: "choose_fulfillment",
        cardId: "card-ful-001",
        mode: "delivery",
        addressId: "addr-001",
      })
    })

    expect(workbenchApi.submitFulfillment).toHaveBeenCalledOnce()
    expect(currentCard).toMatchObject({
      status: "completed",
      blocking: false,
    })
  })

  it("handles choose_fulfillment with undefined result.card and falls back to local status", async () => {
    // result.card is undefined → markHandledCard's `resultCard ?? { ...card, status: "completed" }` falls back
    vi.spyOn(workbenchApi, "submitFulfillment").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: undefined,
      timelineItems: [],
    })

    let currentCard: FlowCard = { id: "card-ful-001", kind: "medication_fulfillment", status: "pending", blocking: true } as FlowCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
      }),
    )

    await act(async () => {
      await result.current.handleAction({
        type: "choose_fulfillment",
        cardId: "card-ful-001",
        mode: "pickup",
      })
    })

    expect(currentCard).toMatchObject({
      status: "completed",
      blocking: false,
    })
  })

  // ---- submit_treatment_execution ----

  it("handles submit_treatment_execution and marks card as completed when resultCard is provided", async () => {
    vi.spyOn(workbenchApi, "submitTreatmentExecution").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: { id: "card-tx-001", kind: "treatment_execution", status: "completed", blocking: false } as FlowCard,
      timelineItems: [],
    })

    let currentCard: FlowCard = { id: "card-tx-001", kind: "treatment_execution", status: "pending", blocking: true } as FlowCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
      }),
    )

    await act(async () => {
      await result.current.handleAction({
        type: "submit_treatment_execution",
        cardId: "card-tx-001",
        action: "schedule",
      })
    })

    expect(workbenchApi.submitTreatmentExecution).toHaveBeenCalledOnce()
    expect(currentCard).toMatchObject({ blocking: false })
  })

  it("handles submit_treatment_execution with undefined result.card and falls back to local status", async () => {
    vi.spyOn(workbenchApi, "submitTreatmentExecution").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: undefined,
      timelineItems: [],
    })

    let currentCard: FlowCard = { id: "card-tx-001", kind: "treatment_execution", status: "pending", blocking: true } as FlowCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
      }),
    )

    await act(async () => {
      await result.current.handleAction({
        type: "submit_treatment_execution",
        cardId: "card-tx-001",
        action: "schedule",
      })
    })

    expect(currentCard).toMatchObject({
      status: "completed",
      blocking: false,
    })
  })

  // ---- ack_advice ----

  it("handles ack_advice and marks card as completed when resultCard is provided", async () => {
    vi.spyOn(workbenchApi, "ackAdvice").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: { id: "card-adv-001", kind: "advice_only", status: "completed", blocking: false } as FlowCard,
      timelineItems: [],
    })

    let currentCard: FlowCard = { id: "card-adv-001", kind: "advice_only", status: "pending", blocking: true } as FlowCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
      }),
    )

    await act(async () => {
      await result.current.handleAction({ type: "ack_advice", cardId: "card-adv-001" })
    })

    expect(workbenchApi.ackAdvice).toHaveBeenCalledOnce()
    expect(currentCard).toMatchObject({ blocking: false })
  })

  it("handles ack_advice with undefined result.card and falls back to local status", async () => {
    vi.spyOn(workbenchApi, "ackAdvice").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: undefined,
      timelineItems: [],
    })

    let currentCard: FlowCard = { id: "card-adv-001", kind: "advice_only", status: "pending", blocking: true } as FlowCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
      }),
    )

    await act(async () => {
      await result.current.handleAction({ type: "ack_advice", cardId: "card-adv-001" })
    })

    expect(currentCard).toMatchObject({
      status: "completed",
      blocking: false,
    })
  })

  // ---- Error handling ----

  it("rolls back card to pending on API failure", async () => {
    vi.spyOn(workbenchApi, "submitLabDecision").mockRejectedValue(
      new Error("API error"),
    )

    let currentCard: FlowCard = { id: "card-lab-001", kind: "lab_decision", status: "processing", blocking: false } as FlowCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
      }),
    )

    await act(async () => {
      await expect(
        result.current.handleAction({ type: "accept_lab", cardId: "card-lab-001" }),
      ).rejects.toThrow("API error")
    })

    expect(currentCard).toMatchObject({
      status: "pending",
    })
  })

  it("tracks isSubmitting state during action lifecycle", async () => {
    vi.spyOn(workbenchApi, "submitLabDecision").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: undefined,
      timelineItems: [],
    })

    let currentCard: FlowCard = { id: "card-lab-001", kind: "lab_decision", status: "pending", blocking: true } as FlowCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
      }),
    )

    expect(result.current.isSubmitting).toBe(false)

    let actionPromise: Promise<void>
    act(() => {
      actionPromise = result.current.handleAction({ type: "accept_lab", cardId: "card-lab-001" })
    })

    expect(result.current.isSubmitting).toBe(true)

    await act(async () => {
      await actionPromise
    })

    expect(result.current.isSubmitting).toBe(false)
  })

  // ---- findCardById returning undefined (purpose derivation fallback) ----

  it("derives purpose from result card when submittedCard is undefined", async () => {
    vi.spyOn(workbenchApi, "submitPayment").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: { id: "card-pay-001", kind: "payment", purpose: "lab" } as FlowCard,
      timelineItems: [],
    })

    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId) => {},
        upsertTimelineItems: vi.fn(),
      }),
    )

    await act(async () => {
      await result.current.handleAction({
        type: "defer_payment",
        cardId: "card-pay-001",
      })
    })

    expect(workbenchApi.submitPayment).toHaveBeenCalledOnce()
  })

  // ---- markHandledCard: resultCard with matching id returns the resultCard directly ----

  it("uses resultCard directly when it has the same id as the submitted card", async () => {
    const resultCard: FlowCard = {
      id: "card-lab-001",
      kind: "lab_decision",
      status: "accepted",
      blocking: false,
      sessionId,
      title: "已处理",
      createdAt: new Date().toISOString(),
    }

    vi.spyOn(workbenchApi, "submitLabDecision").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: resultCard,
      timelineItems: [],
    })

    let currentCard: FlowCard = {
      id: "card-lab-001",
      kind: "lab_decision",
      status: "pending",
      blocking: true,
    } as FlowCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
      }),
    )

    await act(async () => {
      await result.current.handleAction({ type: "accept_lab", cardId: "card-lab-001" })
    })

    expect(currentCard).toBe(resultCard)
  })

  // ---- markHandledCard: payment card where kind is NOT "payment" (non-payment card edge case) ----

  it("handles submit_payment on a non-payment card without paymentStatus", async () => {
    const nonPaymentCard: FlowCard = {
      id: "card-non-pay",
      kind: "advice_only",
      status: "pending",
      blocking: true,
    } as FlowCard

    vi.spyOn(workbenchApi, "submitPayment").mockResolvedValue({
      sessionId,
      status: "blocked",
      card: undefined,
      timelineItems: [],
    })

    let currentCard: FlowCard = nonPaymentCard
    const { result } = renderHook(() =>
      useFlowCardAction({
        sessionId,
        sendMachineEvent: vi.fn(),
        updateCardInTimeline: (_cardId, updater) => {
          currentCard = updater(currentCard)
        },
        upsertTimelineItems: vi.fn(),
        findCardById: () => nonPaymentCard,
      }),
    )

    await act(async () => {
      await result.current.handleAction({
        type: "submit_payment",
        cardId: "card-non-pay",
        paymentMethodId: "default",
      })
    })

    expect(currentCard).toMatchObject({
      status: "paid",
      blocking: false,
    })
    expect((currentCard as any).paymentStatus).toBeUndefined()
  })
})
