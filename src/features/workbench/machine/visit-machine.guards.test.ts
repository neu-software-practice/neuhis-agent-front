import { describe, expect, it } from "vitest"

import type {
  VisitMachineContext,
  VisitMachineEvent,
} from "@/features/workbench/machine/visit-machine.types"
import type { VisitMachineState } from "@/lib/api/types"
import {
  canSendMessage,
  hadPreviousOverlayState,
  hasCurrentCard,
  isHydratingTo,
  isPaymentPurpose,
  isTreatmentPlan,
} from "@/features/workbench/machine/visit-machine.guards"

type GuardArgs = {
  context: VisitMachineContext
  event: VisitMachineEvent
}

function makeContext(patch: Partial<VisitMachineContext> = {}): VisitMachineContext {
  return {
    sessionId: "visit-test-001",
    currentCardId: undefined,
    previousStateBeforeOverlay: undefined,
    terminalReason: undefined,
    askRound: 1,
    labRound: 0,
    blocking: false,
    timerPaused: false,
    streamRequestId: undefined,
    emergencySource: undefined,
    interruptedBy: undefined,
    ...patch,
  }
}

function makeEvent(event: VisitMachineEvent): VisitMachineEvent {
  return event
}

function makeArgs(
  contextPatch: Partial<VisitMachineContext> = {},
  event: VisitMachineEvent = { type: "MESSAGE_SENT", content: "x", clientMessageId: "c-1" },
): GuardArgs {
  return { context: makeContext(contextPatch), event: makeEvent(event) }
}

describe("visit-machine guards", () => {
  describe("hasCurrentCard", () => {
    it("returns true when currentCardId is set", () => {
      const args = makeArgs({ currentCardId: "card-001" })
      expect(hasCurrentCard(args)).toBe(true)
    })

    it("returns false when currentCardId is undefined", () => {
      const args = makeArgs({ currentCardId: undefined })
      expect(hasCurrentCard(args)).toBe(false)
    })
  })

  describe("canSendMessage", () => {
    it("returns true when not blocking and no terminal reason", () => {
      const args = makeArgs({ blocking: false, terminalReason: undefined })
      expect(canSendMessage(args)).toBe(true)
    })

    it("returns false when blocking is true", () => {
      const args = makeArgs({ blocking: true, terminalReason: undefined })
      expect(canSendMessage(args)).toBe(false)
    })

    it("returns false when terminal reason is set", () => {
      const args = makeArgs({ blocking: false, terminalReason: "timeout" })
      expect(canSendMessage(args)).toBe(false)
    })

    it("returns false when both blocking and terminal reason are set", () => {
      const args = makeArgs({ blocking: true, terminalReason: "exited" })
      expect(canSendMessage(args)).toBe(false)
    })
  })

  describe("isHydratingTo", () => {
    it("returns true when event is HYDRATE with matching state", () => {
      const guard = isHydratingTo("labDecision" as VisitMachineState)
      const args = makeArgs({}, { type: "HYDRATE", state: "labDecision", session: {} as never })
      expect(guard(args)).toBe(true)
    })

    it("returns false when event is HYDRATE with a different state", () => {
      const guard = isHydratingTo("labDecision" as VisitMachineState)
      const args = makeArgs({}, { type: "HYDRATE", state: "chatting", session: {} as never })
      expect(guard(args)).toBe(false)
    })

    it("returns false when event is not HYDRATE", () => {
      const guard = isHydratingTo("labDecision" as VisitMachineState)
      const args = makeArgs({}, { type: "MESSAGE_SENT", content: "x", clientMessageId: "c" })
      expect(guard(args)).toBe(false)
    })
  })

  describe("isTreatmentPlan", () => {
    const plans = ["medication", "treatment", "advice_only", "referral"] as const

    it.each(plans)("returns true for matching plan '%s'", (plan) => {
      const guard = isTreatmentPlan(plan)
      const args = makeArgs({}, { type: "TREATMENT_DECIDED", cardId: "card-001", plan })
      expect(guard(args)).toBe(true)
    })

    it("returns false for a non-matching plan", () => {
      const guard = isTreatmentPlan("medication")
      const args = makeArgs({}, { type: "TREATMENT_DECIDED", cardId: "card-001", plan: "referral" })
      expect(guard(args)).toBe(false)
    })

    it("returns false when event is not TREATMENT_DECIDED", () => {
      const guard = isTreatmentPlan("medication")
      const args = makeArgs({}, { type: "MESSAGE_SENT", content: "x", clientMessageId: "c" })
      expect(guard(args)).toBe(false)
    })
  })

  describe("isPaymentPurpose", () => {
    it("returns true for PAYMENT_FAILED with matching purpose", () => {
      const guard = isPaymentPurpose("lab")
      const args = makeArgs({}, { type: "PAYMENT_FAILED", cardId: "card-001", purpose: "lab" })
      expect(guard(args)).toBe(true)
    })

    it("returns true for PAYMENT_DEFERRED with matching purpose", () => {
      const guard = isPaymentPurpose("medication")
      const args = makeArgs({}, { type: "PAYMENT_DEFERRED", cardId: "card-001", purpose: "medication" })
      expect(guard(args)).toBe(true)
    })

    it("returns false when purpose does not match", () => {
      const guard = isPaymentPurpose("lab")
      const args = makeArgs({}, { type: "PAYMENT_FAILED", cardId: "card-001", purpose: "medication" })
      expect(guard(args)).toBe(false)
    })

    it("returns false when event type is neither PAYMENT_FAILED nor PAYMENT_DEFERRED", () => {
      const guard = isPaymentPurpose("lab")
      const args = makeArgs({}, { type: "MESSAGE_SENT", content: "x", clientMessageId: "c" })
      expect(guard(args)).toBe(false)
    })
  })

  describe("hadPreviousOverlayState", () => {
    it("returns true when previousStateBeforeOverlay matches", () => {
      const guard = hadPreviousOverlayState("labPayment" as VisitMachineState)
      const args = makeArgs({ previousStateBeforeOverlay: "labPayment" })
      expect(guard(args)).toBe(true)
    })

    it("returns false when previousStateBeforeOverlay differs", () => {
      const guard = hadPreviousOverlayState("labPayment" as VisitMachineState)
      const args = makeArgs({ previousStateBeforeOverlay: "chatting" })
      expect(guard(args)).toBe(false)
    })

    it("returns false when previousStateBeforeOverlay is undefined", () => {
      const guard = hadPreviousOverlayState("labPayment" as VisitMachineState)
      const args = makeArgs({ previousStateBeforeOverlay: undefined })
      expect(guard(args)).toBe(false)
    })
  })
})
