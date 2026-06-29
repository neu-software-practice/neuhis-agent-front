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
    lastActivityAt: "2026-06-28T01:05:00.000Z",
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

  it("stops the timer in completed: shadows timeout and exit but still allows emergency", () => {
    const timeoutActor = startVisitActor()
    timeoutActor.send({
      type: "HYDRATE",
      state: "completed",
      session: createSession({ status: "completed" }),
    })
    expect(timeoutActor.getSnapshot().value).toBe("completed")

    timeoutActor.send({ type: "VISIT_TIMEOUT" })
    expect(timeoutActor.getSnapshot().value).toBe("completed")
    expect(timeoutActor.getSnapshot().context.terminalReason).toBeUndefined()

    timeoutActor.send({ type: "EXIT_REQUESTED" })
    expect(timeoutActor.getSnapshot().value).toBe("completed")

    timeoutActor.send({ type: "EMERGENCY_DETECTED", source: "vitals" })
    expect(timeoutActor.getSnapshot().value).toBe("emergencyPending")
    expect(timeoutActor.getSnapshot().context.previousStateBeforeOverlay).toBe("completed")
  })

  it("records an emergency recheck request without leaving emergencyPending", () => {
    const actor = startVisitActor()
    actor.send({
      type: "HYDRATE",
      state: "chatting",
      session: createSession(),
    })
    actor.send({ type: "EMERGENCY_DETECTED", source: "stream" })
    expect(actor.getSnapshot().value).toBe("emergencyPending")

    actor.send({ type: "EMERGENCY_RECHECK_REQUESTED", cardId: "card-recheck-001" })
    expect(actor.getSnapshot().value).toBe("emergencyPending")
    expect(actor.getSnapshot().context.currentCardId).toBe("card-recheck-001")
    expect(actor.getSnapshot().context.previousStateBeforeOverlay).toBe("chatting")

    actor.send({ type: "EMERGENCY_DISMISSED" })
    expect(actor.getSnapshot().value).toBe("chatting")
  })

  it("shadows VISIT_TIMEOUT once in exitSettlement (exit outranks timeout)", () => {
    const actor = startVisitActor()
    actor.send({
      type: "HYDRATE",
      state: "chatting",
      session: createSession(),
    })
    actor.send({ type: "EXIT_REQUESTED" })
    expect(actor.getSnapshot().value).toBe("exitSettlement")

    actor.send({ type: "VISIT_TIMEOUT" })
    expect(actor.getSnapshot().value).toBe("exitSettlement")
    expect(actor.getSnapshot().context.terminalReason).toBeUndefined()

    actor.send({ type: "EXIT_CONFIRMED" })
    expect(actor.getSnapshot().value).toBe("exited")
  })

  it("lets emergency interrupt exitSettlement (emergency > exit), but shadows transfer and repeat exit", () => {
    // 安全保证：急症是绝对最高优先级，必须能打断退出结算（患者在退费界面突发不适）。
    // exitSettlement 仅 shadow VISIT_TIMEOUT / TRANSFER_REQUIRED / 重复 EXIT_REQUESTED，
    // 但【不】shadow EMERGENCY_DETECTED——它冒泡进 emergencyPending 并快照前态。
    const actor = startVisitActor()
    actor.send({
      type: "HYDRATE",
      state: "chatting",
      session: createSession(),
    })
    actor.send({ type: "EXIT_REQUESTED" })
    expect(actor.getSnapshot().value).toBe("exitSettlement")

    // 转诊 / 重复退出仍被 shadow，结算态保持确定性。
    actor.send({ type: "TRANSFER_REQUIRED", reason: "referral" })
    expect(actor.getSnapshot().value).toBe("exitSettlement")
    actor.send({ type: "EXIT_REQUESTED" })
    expect(actor.getSnapshot().value).toBe("exitSettlement")

    // 急症打断退出结算，进入 emergencyPending 并记住前态。
    actor.send({ type: "EMERGENCY_DETECTED", source: "vitals" })
    expect(actor.getSnapshot().value).toBe("emergencyPending")
    expect(actor.getSnapshot().context.previousStateBeforeOverlay).toBe(
      "exitSettlement",
    )
  })

  it("restores to exitSettlement after a false-alarm emergency dismiss from the settlement screen", () => {
    const actor = startVisitActor()
    actor.send({
      type: "HYDRATE",
      state: "chatting",
      session: createSession(),
    })
    actor.send({ type: "EXIT_REQUESTED" })
    expect(actor.getSnapshot().value).toBe("exitSettlement")

    actor.send({ type: "EMERGENCY_DETECTED", source: "vitals" })
    expect(actor.getSnapshot().value).toBe("emergencyPending")

    // 误报恢复：回到退出结算态，而不是兜底的 chatting。
    actor.send({ type: "EMERGENCY_DISMISSED" })
    expect(actor.getSnapshot().value).toBe("exitSettlement")
    expect(actor.getSnapshot().context.previousStateBeforeOverlay).toBeUndefined()

    // 恢复后仍可正常收口结算。
    actor.send({ type: "EXIT_SETTLED" })
    expect(actor.getSnapshot().value).toBe("exited")
  })

  it("confirms emergency from exitSettlement terminates with reason emergency", () => {
    const actor = startVisitActor()
    actor.send({
      type: "HYDRATE",
      state: "chatting",
      session: createSession(),
    })
    actor.send({ type: "EXIT_REQUESTED" })
    actor.send({ type: "EMERGENCY_DETECTED", source: "vitals" })
    actor.send({ type: "EMERGENCY_CONFIRMED" })
    expect(actor.getSnapshot().value).toBe("terminated")
    expect(actor.getSnapshot().context.terminalReason).toBe("emergency")
  })

  it("restores labDecision after an emergency false-alarm dismiss", () => {
    const actor = startVisitActor()
    actor.send({
      type: "HYDRATE",
      state: "labDecision",
      session: createSession({
        status: "blocked",
        activeCardId: "card-lab-001",
      }),
    })
    actor.send({ type: "EMERGENCY_DETECTED", source: "stream" })
    expect(actor.getSnapshot().value).toBe("emergencyPending")
    expect(actor.getSnapshot().context.previousStateBeforeOverlay).toBe("labDecision")

    actor.send({ type: "EMERGENCY_DISMISSED" })
    expect(actor.getSnapshot().value).toBe("labDecision")
    expect(actor.getSnapshot().context.previousStateBeforeOverlay).toBeUndefined()
  })

  it("ignores external interrupts after terminating on emergency confirm", () => {
    const actor = startVisitActor()
    actor.send({
      type: "HYDRATE",
      state: "chatting",
      session: createSession(),
    })
    actor.send({ type: "EMERGENCY_DETECTED", source: "vitals" })
    actor.send({ type: "EMERGENCY_CONFIRMED" })
    expect(actor.getSnapshot().value).toBe("terminated")
    expect(actor.getSnapshot().context.terminalReason).toBe("emergency")

    actor.send({ type: "VISIT_TIMEOUT" })
    actor.send({ type: "EXIT_REQUESTED" })
    actor.send({ type: "EMERGENCY_DETECTED", source: "vitals" })
    expect(actor.getSnapshot().value).toBe("terminated")
    expect(actor.getSnapshot().context.terminalReason).toBe("emergency")
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

  it("suspends on VISIT_SUSPENDED without writing a terminalReason (non-terminal)", () => {
    const actor = startVisitActor()
    actor.send({ type: "HYDRATE", state: "chatting", session: createSession() })

    actor.send({ type: "VISIT_SUSPENDED" })
    expect(actor.getSnapshot().value).toBe("suspended")
    // 挂起是非终态：不写 terminalReason，仅记录 interruptedBy。
    expect(actor.getSnapshot().context.terminalReason).toBeUndefined()
    expect(actor.getSnapshot().context.interruptedBy).toBe("idle")
    expect(actor.getSnapshot().context.blocking).toBe(false)
  })

  it("hydrates directly into suspended and stays non-blocking", () => {
    const actor = startVisitActor()
    actor.send({
      type: "HYDRATE",
      state: "suspended",
      session: createSession({ status: "suspended" }),
    })
    expect(actor.getSnapshot().value).toBe("suspended")
    expect(actor.getSnapshot().context.blocking).toBe(false)
  })

  it("keeps suspended on normal/follow-up messages (continue handled by caller via follow-up)", () => {
    const actor = startVisitActor()
    actor.send({ type: "HYDRATE", state: "suspended", session: createSession({ status: "suspended" }) })

    actor.send({ type: "MESSAGE_SENT", content: "我又不舒服了", clientMessageId: "c-1" })
    expect(actor.getSnapshot().value).toBe("suspended")

    actor.send({ type: "FOLLOW_UP_MESSAGE_SENT", content: "继续问诊" })
    expect(actor.getSnapshot().value).toBe("suspended")
  })

  it("lets emergency interrupt a suspended session (emergency > idle)", () => {
    const actor = startVisitActor()
    actor.send({ type: "HYDRATE", state: "suspended", session: createSession({ status: "suspended" }) })

    actor.send({ type: "EMERGENCY_DETECTED", source: "patient_report" })
    expect(actor.getSnapshot().value).toBe("emergencyPending")
    expect(actor.getSnapshot().context.previousStateBeforeOverlay).toBe("suspended")
  })

  it("shadows VISIT_SUSPENDED in completed / emergencyPending / exitSettlement (idle lowest priority)", () => {
    const completedActor = startVisitActor()
    completedActor.send({ type: "HYDRATE", state: "completed", session: createSession({ status: "completed" }) })
    completedActor.send({ type: "VISIT_SUSPENDED" })
    expect(completedActor.getSnapshot().value).toBe("completed")

    const emergencyActor = startVisitActor()
    emergencyActor.send({ type: "HYDRATE", state: "chatting", session: createSession() })
    emergencyActor.send({ type: "EMERGENCY_DETECTED", source: "vitals" })
    emergencyActor.send({ type: "VISIT_SUSPENDED" })
    expect(emergencyActor.getSnapshot().value).toBe("emergencyPending")

    const exitActor = startVisitActor()
    exitActor.send({ type: "HYDRATE", state: "chatting", session: createSession() })
    exitActor.send({ type: "EXIT_REQUESTED" })
    exitActor.send({ type: "VISIT_SUSPENDED" })
    expect(exitActor.getSnapshot().value).toBe("exitSettlement")
  })
})
