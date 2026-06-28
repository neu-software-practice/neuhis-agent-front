import type { VisitSession } from "@/features/visits/api/types"
import type { FlowCard } from "@/features/workbench/api/types"
import type {
  FlowCardId,
  SessionId,
  TerminalReason,
  VisitMachineState,
} from "@/lib/api/types"

export type TreatmentPlan = "medication" | "treatment" | "advice_only" | "referral"
export type PaymentPurpose = "lab" | "medication"
export type InterruptedBy = "emergency" | "timeout" | "exit"

export interface VisitMachineContext {
  sessionId: SessionId
  currentCardId?: FlowCardId
  previousStateBeforeOverlay?: VisitMachineState
  terminalReason?: TerminalReason
  askRound: number
  labRound: number
  blocking: boolean
  timerPaused: boolean
  streamRequestId?: string
  emergencySource?: string
  interruptedBy?: InterruptedBy
}

export type VisitMachineEvent =
  | {
      type: "HYDRATE"
      state: VisitMachineState
      session: VisitSession
      currentCardId?: FlowCardId
      terminalReason?: TerminalReason
    }
  | { type: "CONTEXT_LOADED"; session: VisitSession }
  | { type: "MESSAGE_SENT"; content: string; clientMessageId: string }
  | { type: "AGENT_ANALYSIS_STARTED"; requestId?: string }
  | { type: "LAB_CARD_RAISED"; cardId: FlowCardId }
  | { type: "PAYMENT_CARD_RAISED"; cardId: FlowCardId; purpose: PaymentPurpose }
  | { type: "LAB_EXECUTION_STARTED"; cardId: FlowCardId }
  | { type: "LAB_ACCEPTED"; cardId: FlowCardId }
  | { type: "LAB_SKIPPED"; cardId: FlowCardId }
  | { type: "LAB_VETOED"; cardId: FlowCardId }
  | { type: "LAB_PAYMENT_SUCCEEDED"; cardId: FlowCardId }
  | { type: "PAYMENT_FAILED"; cardId: FlowCardId; purpose: PaymentPurpose }
  | { type: "PAYMENT_DEFERRED"; cardId: FlowCardId; purpose: PaymentPurpose }
  | { type: "LAB_RESULT_RECEIVED" }
  | { type: "DIAGNOSIS_READY"; cardId: FlowCardId }
  | { type: "TREATMENT_DECIDED"; cardId: FlowCardId; plan: TreatmentPlan }
  | { type: "MEDICATION_PAYMENT_RAISED"; cardId: FlowCardId }
  | { type: "MEDICATION_PAID"; cardId: FlowCardId }
  | { type: "MEDICATION_FULFILLMENT_RAISED"; cardId: FlowCardId }
  | { type: "MEDICATION_FULFILLED"; cardId: FlowCardId }
  | { type: "TREATMENT_EXECUTION_RAISED"; cardId: FlowCardId }
  | { type: "TREATMENT_SCHEDULED"; cardId: FlowCardId }
  | { type: "TREATMENT_ARRIVED"; cardId: FlowCardId }
  | { type: "TREATMENT_STARTED"; cardId: FlowCardId }
  | { type: "TREATMENT_COMPLETED"; cardId: FlowCardId }
  | { type: "ADVICE_CARD_RAISED"; cardId: FlowCardId }
  | { type: "ADVICE_ACKNOWLEDGED"; cardId: FlowCardId }
  | { type: "VISIT_COMPLETED" }
  | { type: "FOLLOW_UP_MESSAGE_SENT"; content: string }
  | { type: "EMERGENCY_RECHECK_REQUESTED"; cardId?: FlowCardId }
  | { type: "EMERGENCY_DETECTED"; source: string }
  | { type: "EMERGENCY_CONFIRMED" }
  | { type: "EMERGENCY_DISMISSED" }
  | { type: "VISIT_TIMEOUT" }
  | { type: "TRANSFER_REQUIRED"; reason: TerminalReason }
  | { type: "EXIT_REQUESTED" }
  | { type: "EXIT_CONFIRMED" }
  | { type: "EXIT_SETTLED" }
  | { type: "TIMER_PAUSED" }
  | { type: "TIMER_RESUMED" }

export interface HydrateVisitMachineInput {
  session: VisitSession
  currentCard?: FlowCard
}
