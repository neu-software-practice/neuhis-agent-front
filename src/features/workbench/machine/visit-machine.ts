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

// 终止态（terminated/exited）的全局打断屏蔽：进入终止态后，所有外部打断事件
// （急症 / 超时 / 转诊 / 退出）都被空过渡 shadow 掉，不再触发根 `on` 处理器，
// 防止已结束的会话被再次驱动。优先级 `急症 > 退出 > 超时 > 阻塞卡 > 普通消息`
// 在此已无意义（会话已终止），统一吞掉即可。
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
    previousExitSettlement: hadPreviousOverlayState("exitSettlement"),
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
  // ⚠️ 全局打断优先级（不可回归）：急症 > 退出 > 超时 > 阻塞卡 > 普通消息。
  // 根 `on` 处理器对所有未被状态节点 shadow 的事件生效。优先级靠两点保证：
  //  1) 各状态节点是否 shadow（屏蔽）某事件——下层状态空过渡会吃掉该事件，使其
  //     不冒泡到此根处理器（见 exitSettlement / emergencyPending / completed）。
  //  2) 进入态本身：EMERGENCY_DETECTED 在任意非终止态都能抢占进入 emergencyPending，
  //     因此急症永远最高优先级；EXIT_REQUESTED 进入 exitSettlement 后用空过渡屏蔽
  //     VISIT_TIMEOUT（退出 > 超时）；阻塞卡靠状态节点只接受本卡相关事件实现。
  // 改动此块或下方任一状态的 shadow 前，请先确认不会破坏该优先级。
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
        ADVICE_CARD_RAISED: {
          target: "adviceOnly",
          actions: "assignCurrentCard",
        },
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
        ADVICE_CARD_RAISED: {
          target: "adviceOnly",
          actions: "assignCurrentCard",
        },
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
        MEDICATION_PAYMENT_RAISED: {
          actions: "assignCurrentCard",
        },
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
        TREATMENT_EXECUTION_RAISED: {
          actions: "assignCurrentCard",
        },
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
        ADVICE_CARD_RAISED: {
          actions: "assignCurrentCard",
        },
        ADVICE_ACKNOWLEDGED: {
          target: "completed",
          actions: "markCompleted",
        },
      },
    },
    completed: {
      on: {
        // 完成态：停止计时，仅保留急症打断。
        // VISIT_TIMEOUT / EXIT_REQUESTED 用空过渡 shadow 掉根处理器——会话已正常
        // 完成，不应再被超时终止或进入退出结算。
        // 注意：故意不在此 shadow EMERGENCY_DETECTED，让它继续冒泡到根处理器，
        // 这样患者完成问诊后突发不适仍可上报急症（急症永远最高优先级）。
        VISIT_TIMEOUT: {},
        EXIT_REQUESTED: {},
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
        // 急症 Overlay 阻断态：急症已是最高优先级，进入后用空过渡 shadow 掉
        // 其余所有外部打断（重复急症 / 超时 / 转诊 / 退出），防止 Overlay 期间被
        // 低优先级事件抢占或重复触发。最终只由 DISMISS（误报恢复）或
        // CONFIRMED（确认急症→terminated）收口。
        EMERGENCY_DETECTED: {},
        VISIT_TIMEOUT: {},
        TRANSFER_REQUIRED: {},
        EXIT_REQUESTED: {},
        // EMERGENCY_RECHECK_REQUESTED：保留事件（决策 a）。语义为「请求对急症做
        // 二次复检」，仅记录请求（自过渡，不离开 emergencyPending），真正的复检
        // 结果仍由 EMERGENCY_DISMISSED（误报→恢复前态）或 EMERGENCY_CONFIRMED
        // （确认→terminated）驱动。这样语义完整且不破坏既有恢复/确认转移。
        EMERGENCY_RECHECK_REQUESTED: {
          actions: "markEmergencyRecheck",
        },
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
          {
            // 退出结算页上报急症后误报恢复：必须回到 exitSettlement，
            // 否则患者会被静默踢出结算流程（fallback 到 chatting）。
            guard: "previousExitSettlement",
            target: "exitSettlement",
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
        // 退出结算阻断态：优先级 `急症 > 退出 > 超时`。进入退出结算后用空过渡
        // shadow 掉 VISIT_TIMEOUT（退出优先于超时，结算期间不应被超时抢占），
        // 同时也吞掉 TRANSFER_REQUIRED / 重复 EXIT_REQUESTED。
        // 注意：EMERGENCY_DETECTED 故意【不】在此 shadow——急症是绝对最高优先级，
        // 患者在结算/退费界面突发不适（如胸痛）必须仍能被接住。该事件冒泡到根
        // 处理器进入 emergencyPending；若为误报，dismiss 守卫链经 previousExitSettlement
        // 分支回退到 exitSettlement，结算上下文不丢失。
        // 这是安全保证，不得为「结算确定性收口」而牺牲。
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
