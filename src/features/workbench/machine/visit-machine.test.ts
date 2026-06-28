import { createActor } from "xstate"
import { describe, expect, it } from "vitest"

import type { VisitSession } from "@/features/visits/api/types"
import { visitMachine } from "@/features/workbench/machine/visit-machine"

function createSession(patch: Partial<VisitSession> = {}): VisitSession {
  return {
    id: "visit-test-001",
    patientId: "patient-test-001",
    entryType: "new",
    status: "chatting",
    startedAt: "2026-06-28T01:00:00.000Z",
    updatedAt: "2026-06-28T01:05:00.000Z",
    timeoutAt: "2026-06-28T01:30:00.000Z",
    askRound: 1,
    askRoundLimit: 6,
    labRound: 0,
    labRoundLimit: 2,
    timerPaused: false,
    summary: {
      chiefComplaint: "发热两天",
      lastMessage: "请补充体温。",
    },
    ...patch,
  }
}

function startVisitActor() {
  const actor = createActor(visitMachine)
  actor.start()
  return actor
}

describe("visitMachine", () => {
  it("hydrates directly into a blocking lab decision state", () => {
    const actor = startVisitActor()

    actor.send({
      type: "HYDRATE",
      state: "labDecision",
      session: createSession({
        status: "blocked",
        activeCardId: "card-lab-001",
      }),
      currentCardId: "card-lab-001",
    })

    expect(actor.getSnapshot().value).toBe("labDecision")
    expect(actor.getSnapshot().context.currentCardId).toBe("card-lab-001")
    expect(actor.getSnapshot().context.blocking).toBe(true)
  })

  it("does not let a normal message advance while a blocking card is pending", () => {
    const actor = startVisitActor()

    actor.send({
      type: "HYDRATE",
      state: "labDecision",
      session: createSession({
        status: "blocked",
        activeCardId: "card-lab-001",
      }),
    })
    actor.send({
      type: "MESSAGE_SENT",
      content: "我想继续说症状",
      clientMessageId: "client-1",
    })

    expect(actor.getSnapshot().value).toBe("labDecision")
    expect(actor.getSnapshot().context.askRound).toBe(1)
  })

  it("moves through lab decision to lab payment and back to chatting on veto", () => {
    const actor = startVisitActor()

    actor.send({
      type: "CONTEXT_LOADED",
      session: createSession(),
    })
    actor.send({
      type: "MESSAGE_SENT",
      content: "体温最高 38.6 度",
      clientMessageId: "client-2",
    })
    actor.send({ type: "LAB_CARD_RAISED", cardId: "card-lab-001" })
    actor.send({ type: "LAB_ACCEPTED", cardId: "card-lab-001" })

    expect(actor.getSnapshot().value).toBe("labPayment")
    expect(actor.getSnapshot().context.labRound).toBe(1)

    actor.send({
      type: "PAYMENT_DEFERRED",
      cardId: "card-pay-001",
      purpose: "lab",
    })

    expect(actor.getSnapshot().value).toBe("chatting")
    expect(actor.getSnapshot().context.blocking).toBe(false)
  })

  it("restores the previous blocking state when emergency is dismissed", () => {
    const actor = startVisitActor()

    actor.send({
      type: "HYDRATE",
      state: "labPayment",
      session: createSession({
        status: "blocked",
        activeCardId: "card-pay-001",
      }),
    })
    actor.send({ type: "EMERGENCY_DETECTED", source: "stream" })

    expect(actor.getSnapshot().value).toBe("emergencyPending")
    expect(actor.getSnapshot().context.previousStateBeforeOverlay).toBe("labPayment")

    actor.send({ type: "EMERGENCY_DISMISSED" })

    expect(actor.getSnapshot().value).toBe("labPayment")
    expect(actor.getSnapshot().context.previousStateBeforeOverlay).toBeUndefined()
  })

  it("gives emergency priority and confirms into terminated", () => {
    const actor = startVisitActor()

    actor.send({
      type: "HYDRATE",
      state: "chatting",
      session: createSession(),
    })
    actor.send({ type: "EMERGENCY_DETECTED", source: "vitals" })
    actor.send({ type: "VISIT_TIMEOUT" })

    expect(actor.getSnapshot().value).toBe("emergencyPending")
    expect(actor.getSnapshot().context.terminalReason).toBeUndefined()

    const secondActor = startVisitActor()
    secondActor.send({
      type: "HYDRATE",
      state: "chatting",
      session: createSession(),
    })
    secondActor.send({ type: "EMERGENCY_DETECTED", source: "vitals" })
    secondActor.send({ type: "EMERGENCY_CONFIRMED" })

    expect(secondActor.getSnapshot().value).toBe("terminated")
    expect(secondActor.getSnapshot().context.terminalReason).toBe("emergency")
  })

  it("routes treatment decisions to medication, advice, treatment, or referral states", () => {
    const medicationActor = startVisitActor()
    medicationActor.send({
      type: "HYDRATE",
      state: "diagnosis",
      session: createSession(),
    })
    medicationActor.send({
      type: "TREATMENT_DECIDED",
      cardId: "card-plan-001",
      plan: "medication",
    })
    expect(medicationActor.getSnapshot().value).toBe("medicationPayment")

    const adviceActor = startVisitActor()
    adviceActor.send({
      type: "HYDRATE",
      state: "diagnosis",
      session: createSession(),
    })
    adviceActor.send({
      type: "TREATMENT_DECIDED",
      cardId: "card-plan-002",
      plan: "advice_only",
    })
    expect(adviceActor.getSnapshot().value).toBe("adviceOnly")

    const treatmentActor = startVisitActor()
    treatmentActor.send({
      type: "HYDRATE",
      state: "diagnosis",
      session: createSession(),
    })
    treatmentActor.send({
      type: "TREATMENT_DECIDED",
      cardId: "card-plan-003",
      plan: "treatment",
    })
    expect(treatmentActor.getSnapshot().value).toBe("treatmentExecution")

    const referralActor = startVisitActor()
    referralActor.send({
      type: "HYDRATE",
      state: "diagnosis",
      session: createSession(),
    })
    referralActor.send({
      type: "TRANSFER_REQUIRED",
      reason: "referral",
    })
    expect(referralActor.getSnapshot().value).toBe("terminated")
    expect(referralActor.getSnapshot().context.terminalReason).toBe("referral")
  })
})
