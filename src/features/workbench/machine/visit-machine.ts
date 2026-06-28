import { setup } from "xstate"

import type {
  VisitMachineContext,
  VisitMachineEvent,
} from "@/features/workbench/machine/visit-machine.types"
import { visitMachineActions } from "@/features/workbench/machine/visit-machine.actions"
import {
  hadPreviousOverlayState,
  isHydratingTo,
  isPaymentPurpose,
  isTreatmentPlan,
} from "@/features/workbench/machine/visit-machine.guards"
import type { VisitMachineState } from "@/lib/api/types"

const visitMachineStates: VisitMachineState[] = [
  "loadingContext",
  "chatting",
  "analyzing",
  "labDecision",
  "labPayment",
  "labExecution",
  "diagnosis",
  "treatmentDecision",
  "medicationPayment",
  "medicationFulfillment",
  "treatmentExecution",
  "adviceOnly",
  "completed",
  "emergencyPending",
  "terminated",
  "exitSettlement",
  "exited",
]

const terminalNoop = {
  EMERGENCY_DETECTED: {},
  VISIT_TIMEOUT: {},
  TRANSFER_REQUIRED: {},
  EXIT_REQUESTED: {},
} satisfies Partial<Record<VisitMachineEvent["type"], object>>

const visitMachineSetup = setup({
  types: {} as {
    context: VisitMachineContext
    events: VisitMachineEvent
  },
  actions: visitMachineActions,
  guards: {
    hydrateToLoadingContext: isHydratingTo("loadingContext"),
    hydrateToChatting: isHydratingTo("chatting"),
    hydrateToAnalyzing: isHydratingTo("analyzing"),
    hydrateToLabDecision: isHydratingTo("labDecision"),
    hydrateToLabPayment: isHydratingTo("labPayment"),
    hydrateToLabExecution: isHydratingTo("labExecution"),
    hydrateToDiagnosis: isHydratingTo("diagnosis"),
    hydrateToTreatmentDecision: isHydratingTo("treatmentDecision"),
    hydrateToMedicationPayment: isHydratingTo("medicationPayment"),
    hydrateToMedicationFulfillment: isHydratingTo("medicationFulfillment"),
    hydrateToTreatmentExecution: isHydratingTo("treatmentExecution"),
    hydrateToAdviceOnly: isHydratingTo("adviceOnly"),
    hydrateToCompleted: isHydratingTo("completed"),
    hydrateToEmergencyPending: isHydratingTo("emergencyPending"),
    hydrateToTerminated: isHydratingTo("terminated"),
    hydrateToExitSettlement: isHydratingTo("exitSettlement"),
    hydrateToExited: isHydratingTo("exited"),
    previousLoadingContext: hadPreviousOverlayState("loadingContext"),
    previousChatting: hadPreviousOverlayState("chatting"),
    previousAnalyzing: hadPreviousOverlayState("analyzing"),
    previousLabDecision: hadPreviousOverlayState("labDecision"),
    previousLabPayment: hadPreviousOverlayState("labPayment"),
    previousLabExecution: hadPreviousOverlayState("labExecution"),
    previousDiagnosis: hadPreviousOverlayState("diagnosis"),
    previousTreatmentDecision: hadPreviousOverlayState("treatmentDecision"),
    previousMedicationPayment: hadPreviousOverlayState("medicationPayment"),
    previousMedicationFulfillment: hadPreviousOverlayState("medicationFulfillment"),
    previousTreatmentExecution: hadPreviousOverlayState("treatmentExecution"),
    previousAdviceOnly: hadPreviousOverlayState("adviceOnly"),
    previousCompleted: hadPreviousOverlayState("completed"),
    treatmentMedication: isTreatmentPlan("medication"),
    treatmentExecution: isTreatmentPlan("treatment"),
    treatmentAdviceOnly: isTreatmentPlan("advice_only"),
    treatmentReferral: isTreatmentPlan("referral"),
    labPaymentEvent: isPaymentPurpose("lab"),
    medicationPaymentEvent: isPaymentPurpose("medication"),
  },
})

export const visitMachine = visitMachineSetup.createMachine({
  id: "visit",
  initial: "loadingContext",
  context: {
    sessionId: "",
    askRound: 0,
    labRound: 0,
    blocking: false,
    timerPaused: false,
  },
  on: {
    HYDRATE: [
      {
        guard: "hydrateToLoadingContext",
        target: ".loadingContext",
        actions: "assignHydratedSession",
      },
      { guard: "hydrateToChatting", target: ".chatting", actions: "assignHydratedSession" },
      { guard: "hydrateToAnalyzing", target: ".analyzing", actions: "assignHydratedSession" },
      { guard: "hydrateToLabDecision", target: ".labDecision", actions: "assignHydratedSession" },
      { guard: "hydrateToLabPayment", target: ".labPayment", actions: "assignHydratedSession" },
      { guard: "hydrateToLabExecution", target: ".labExecution", actions: "assignHydratedSession" },
      { guard: "hydrateToDiagnosis", target: ".diagnosis", actions: "assignHydratedSession" },
      {
        guard: "hydrateToTreatmentDecision",
        target: ".treatmentDecision",
        actions: "assignHydratedSession",
      },
      {
        guard: "hydrateToMedicationPayment",
        target: ".medicationPayment",
        actions: "assignHydratedSession",
      },
      {
        guard: "hydrateToMedicationFulfillment",
        target: ".medicationFulfillment",
        actions: "assignHydratedSession",
      },
      {
        guard: "hydrateToTreatmentExecution",
        target: ".treatmentExecution",
        actions: "assignHydratedSession",
      },
      { guard: "hydrateToAdviceOnly", target: ".adviceOnly", actions: "assignHydratedSession" },
      { guard: "hydrateToCompleted", target: ".completed", actions: "assignHydratedSession" },
      {
        guard: "hydrateToEmergencyPending",
        target: ".emergencyPending",
        actions: "assignHydratedSession",
      },
      { guard: "hydrateToTerminated", target: ".terminated", actions: "assignHydratedSession" },
      {
        guard: "hydrateToExitSettlement",
        target: ".exitSettlement",
        actions: "assignHydratedSession",
      },
      { guard: "hydrateToExited", target: ".exited", actions: "assignHydratedSession" },
      { target: ".chatting", actions: "assignHydratedSession" },
    ],
    EMERGENCY_DETECTED: {
      target: ".emergencyPending",
      actions: "rememberEmergencyOverlay",
    },
    VISIT_TIMEOUT: {
      target: ".terminated",
      actions: "markTerminalReason",
    },
    TRANSFER_REQUIRED: {
      target: ".terminated",
      actions: "markTerminalReason",
    },
    EXIT_REQUESTED: {
      target: ".exitSettlement",
      actions: "markExitRequested",
    },
    TIMER_PAUSED: {
      actions: "markTimerPaused",
    },
    TIMER_RESUMED: {
      actions: "markTimerResumed",
    },
  },
  states: {
    loadingContext: {
      on: {
        CONTEXT_LOADED: {
          target: "chatting",
          actions: "assignLoadedContext",
        },
      },
    },
    chatting: {
      on: {
        MESSAGE_SENT: {
          target: "analyzing",
          actions: "incrementAskRound",
        },
        AGENT_ANALYSIS_STARTED: {
          target: "analyzing",
          actions: "assignStreamRequest",
        },
      },
    },
    analyzing: {
      on: {
        LAB_CARD_RAISED: {
          target: "labDecision",
          actions: "assignCurrentCard",
        },
        DIAGNOSIS_READY: {
          target: "diagnosis",
          actions: "assignCurrentCard",
        },
      },
    },
    labDecision: {
      on: {
        LAB_ACCEPTED: {
          target: "labPayment",
          actions: ["assignCurrentCard", "markLabAccepted"],
        },
        LAB_SKIPPED: {
          target: "analyzing",
          actions: "clearBlocking",
        },
        LAB_VETOED: {
          target: "chatting",
          actions: "clearBlocking",
        },
        PAYMENT_CARD_RAISED: {
          target: "labPayment",
          actions: "assignCurrentCard",
        },
      },
    },
    labPayment: {
      on: {
        LAB_PAYMENT_SUCCEEDED: {
          target: "labExecution",
          actions: "assignCurrentCard",
        },
        PAYMENT_FAILED: [
          {
            guard: "labPaymentEvent",
            target: "labPayment",
            actions: "assignCurrentCard",
          },
        ],
        PAYMENT_DEFERRED: [
          {
            guard: "labPaymentEvent",
            target: "chatting",
            actions: "clearBlocking",
          },
        ],
        LAB_EXECUTION_STARTED: {
          target: "labExecution",
          actions: "assignCurrentCard",
        },
      },
    },
    labExecution: {
      on: {
        LAB_RESULT_RECEIVED: {
          target: "analyzing",
          actions: "clearBlocking",
        },
        DIAGNOSIS_READY: {
          target: "diagnosis",
          actions: "assignCurrentCard",
        },
      },
    },
    diagnosis: {
      on: {
        TREATMENT_DECIDED: [
          {
            guard: "treatmentMedication",
            target: "medicationPayment",
            actions: "assignCurrentCard",
          },
          {
            guard: "treatmentExecution",
            target: "treatmentExecution",
            actions: "assignCurrentCard",
          },
          {
            guard: "treatmentAdviceOnly",
            target: "adviceOnly",
            actions: "assignCurrentCard",
          },
          {
            guard: "treatmentReferral",
            target: "terminated",
            actions: "markTerminalReason",
          },
        ],
      },
    },
    treatmentDecision: {
      on: {
        TREATMENT_DECIDED: [
          {
            guard: "treatmentMedication",
            target: "medicationPayment",
            actions: "assignCurrentCard",
          },
          {
            guard: "treatmentExecution",
            target: "treatmentExecution",
            actions: "assignCurrentCard",
          },
          {
            guard: "treatmentAdviceOnly",
            target: "adviceOnly",
            actions: "assignCurrentCard",
          },
          {
            guard: "treatmentReferral",
            target: "terminated",
            actions: "markTerminalReason",
          },
        ],
      },
    },
    medicationPayment: {
      on: {
        MEDICATION_PAID: {
          target: "medicationFulfillment",
          actions: "assignCurrentCard",
        },
        PAYMENT_FAILED: [
          {
            guard: "medicationPaymentEvent",
            target: "medicationPayment",
            actions: "assignCurrentCard",
          },
        ],
        PAYMENT_DEFERRED: [
          {
            guard: "medicationPaymentEvent",
            target: "chatting",
            actions: "clearBlocking",
          },
        ],
        MEDICATION_FULFILLMENT_RAISED: {
          target: "medicationFulfillment",
          actions: "assignCurrentCard",
        },
      },
    },
    medicationFulfillment: {
      on: {
        MEDICATION_FULFILLED: {
          target: "completed",
          actions: "markCompleted",
        },
      },
    },
    treatmentExecution: {
      on: {
        TREATMENT_SCHEDULED: {
          actions: "assignCurrentCard",
        },
        TREATMENT_ARRIVED: {
          actions: "assignCurrentCard",
        },
        TREATMENT_STARTED: {
          actions: "assignCurrentCard",
        },
        TREATMENT_COMPLETED: {
          target: "completed",
          actions: "markCompleted",
        },
      },
    },
    adviceOnly: {
      on: {
        ADVICE_ACKNOWLEDGED: {
          target: "completed",
          actions: "markCompleted",
        },
      },
    },
    completed: {
      on: {
        FOLLOW_UP_MESSAGE_SENT: {
          target: "completed",
        },
        MESSAGE_SENT: {
          target: "completed",
        },
      },
    },
    emergencyPending: {
      on: {
        EMERGENCY_DETECTED: {},
        VISIT_TIMEOUT: {},
        TRANSFER_REQUIRED: {},
        EXIT_REQUESTED: {},
        EMERGENCY_DISMISSED: [
          {
            guard: "previousLoadingContext",
            target: "loadingContext",
            actions: "clearEmergencyOverlay",
          },
          {
            guard: "previousChatting",
            target: "chatting",
            actions: "clearEmergencyOverlay",
          },
          {
            guard: "previousAnalyzing",
            target: "analyzing",
            actions: "clearEmergencyOverlay",
          },
          {
            guard: "previousLabDecision",
            target: "labDecision",
            actions: "clearEmergencyOverlay",
          },
          {
            guard: "previousLabPayment",
            target: "labPayment",
            actions: "clearEmergencyOverlay",
          },
          {
            guard: "previousLabExecution",
            target: "labExecution",
            actions: "clearEmergencyOverlay",
          },
          {
            guard: "previousDiagnosis",
            target: "diagnosis",
            actions: "clearEmergencyOverlay",
          },
          {
            guard: "previousTreatmentDecision",
            target: "treatmentDecision",
            actions: "clearEmergencyOverlay",
          },
          {
            guard: "previousMedicationPayment",
            target: "medicationPayment",
            actions: "clearEmergencyOverlay",
          },
          {
            guard: "previousMedicationFulfillment",
            target: "medicationFulfillment",
            actions: "clearEmergencyOverlay",
          },
          {
            guard: "previousTreatmentExecution",
            target: "treatmentExecution",
            actions: "clearEmergencyOverlay",
          },
          {
            guard: "previousAdviceOnly",
            target: "adviceOnly",
            actions: "clearEmergencyOverlay",
          },
          {
            guard: "previousCompleted",
            target: "completed",
            actions: "clearEmergencyOverlay",
          },
          { target: "chatting", actions: "clearEmergencyOverlay" },
        ],
        EMERGENCY_CONFIRMED: {
          target: "terminated",
          actions: "markTerminalReason",
        },
      },
    },
    terminated: {
      on: terminalNoop,
    },
    exitSettlement: {
      on: {
        EMERGENCY_DETECTED: {},
        VISIT_TIMEOUT: {},
        TRANSFER_REQUIRED: {},
        EXIT_REQUESTED: {},
        EXIT_CONFIRMED: {
          target: "exited",
          actions: "markExited",
        },
        EXIT_SETTLED: {
          target: "exited",
          actions: "markExited",
        },
      },
    },
    exited: {
      on: terminalNoop,
    },
  },
})

export { visitMachineStates }
export type VisitMachineActorSnapshot = ReturnType<typeof visitMachine.getInitialSnapshot>
