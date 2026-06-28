import type { VisitMachineContext, VisitMachineEvent } from "@/features/workbench/machine/visit-machine.types"
import type { VisitMachineState } from "@/lib/api/types"

type GuardArgs = {
  context: VisitMachineContext
  event: VisitMachineEvent
}

export function hasCurrentCard({ context }: GuardArgs) {
  return Boolean(context.currentCardId)
}

export function canSendMessage({ context }: GuardArgs) {
  return !context.blocking && !context.terminalReason
}

export function isHydratingTo(state: VisitMachineState) {
  return ({ event }: GuardArgs) => event.type === "HYDRATE" && event.state === state
}

export function isTreatmentPlan(plan: "medication" | "treatment" | "advice_only" | "referral") {
  return ({ event }: GuardArgs) =>
    event.type === "TREATMENT_DECIDED" && event.plan === plan
}

export function isPaymentPurpose(purpose: "lab" | "medication") {
  return ({ event }: GuardArgs) =>
    (event.type === "PAYMENT_FAILED" || event.type === "PAYMENT_DEFERRED") &&
    event.purpose === purpose
}

export function hadPreviousOverlayState(state: VisitMachineState) {
  return ({ context }: GuardArgs) => context.previousStateBeforeOverlay === state
}
