import { assign } from "xstate"

import type {
  VisitMachineContext,
  VisitMachineEvent,
} from "@/features/workbench/machine/visit-machine.types"
import type { VisitMachineState } from "@/lib/api/types"

interface AssignArgs {
  context: VisitMachineContext
  event: VisitMachineEvent
  self: {
    getSnapshot: () => {
      value: unknown
    }
  }
}

function snapshotValueToMachineState(value: unknown): VisitMachineState | undefined {
  return typeof value === "string" ? (value as VisitMachineState) : undefined
}

function visitAssign(
  assignment: (args: AssignArgs) => Partial<VisitMachineContext>,
) {
  return assign<
    VisitMachineContext,
    VisitMachineEvent,
    undefined,
    VisitMachineEvent,
    never
  >(assignment as never)
}

export const visitMachineActions = {
  assignHydratedSession: visitAssign(({ event }) => {
    if (event.type !== "HYDRATE") {
      return {}
    }

    return {
      sessionId: event.session.id,
      currentCardId: event.currentCardId ?? event.session.activeCardId,
      terminalReason: event.terminalReason ?? event.session.terminalReason,
      askRound: event.session.askRound,
      labRound: event.session.labRound,
      blocking: event.state !== "chatting" && event.state !== "completed",
      timerPaused: event.session.timerPaused,
      streamRequestId: undefined,
      previousStateBeforeOverlay: undefined,
      emergencySource: undefined,
      interruptedBy: undefined,
    }
  }),

  assignLoadedContext: visitAssign(({ event }) => {
    if (event.type !== "CONTEXT_LOADED") {
      return {}
    }

    return {
      sessionId: event.session.id,
      currentCardId: event.session.activeCardId,
      terminalReason: event.session.terminalReason,
      askRound: event.session.askRound,
      labRound: event.session.labRound,
      blocking: Boolean(event.session.activeCardId),
      timerPaused: event.session.timerPaused,
    }
  }),

  assignStreamRequest: visitAssign(({ event }) => {
    if (event.type !== "AGENT_ANALYSIS_STARTED") {
      return {}
    }

    return {
      streamRequestId: event.requestId,
      blocking: false,
    }
  }),

  incrementAskRound: visitAssign(({ context }) => {
    return {
      askRound: context.askRound + 1,
      blocking: false,
    }
  }),

  assignCurrentCard: visitAssign(({ event }) => {
    if (!("cardId" in event) || !event.cardId) {
      return {}
    }

    return {
      currentCardId: event.cardId,
      blocking: true,
    }
  }),

  markLabAccepted: visitAssign(({ context }) => {
    return {
      labRound: context.labRound + 1,
      blocking: true,
    }
  }),

  clearBlocking: visitAssign(() => {
    return {
      currentCardId: undefined,
      blocking: false,
      streamRequestId: undefined,
    }
  }),

  markCompleted: visitAssign(() => {
    return {
      currentCardId: undefined,
      blocking: false,
      streamRequestId: undefined,
      terminalReason: undefined,
    }
  }),

  markTerminalReason: visitAssign(({ event }) => {
    if (event.type === "TRANSFER_REQUIRED") {
      return {
        terminalReason: event.reason,
        currentCardId: undefined,
        blocking: true,
        streamRequestId: undefined,
      }
    }

    if (event.type === "VISIT_TIMEOUT") {
      return {
        terminalReason: "timeout",
        currentCardId: undefined,
        blocking: true,
        streamRequestId: undefined,
        interruptedBy: "timeout",
      }
    }

    if (event.type === "EMERGENCY_CONFIRMED") {
      return {
        terminalReason: "emergency",
        currentCardId: undefined,
        blocking: true,
        previousStateBeforeOverlay: undefined,
        streamRequestId: undefined,
        interruptedBy: "emergency",
      }
    }

    if (event.type === "TREATMENT_DECIDED" && event.plan === "referral") {
      return {
        terminalReason: "referral",
        currentCardId: undefined,
        blocking: true,
        streamRequestId: undefined,
      }
    }

    return {}
  }),

  markExitRequested: visitAssign(() => {
    return {
      blocking: true,
      streamRequestId: undefined,
      interruptedBy: "exit",
    }
  }),

  markExited: visitAssign(() => {
    return {
      terminalReason: "exited",
      currentCardId: undefined,
      blocking: true,
      streamRequestId: undefined,
      previousStateBeforeOverlay: undefined,
      interruptedBy: "exit",
    }
  }),

  rememberEmergencyOverlay: visitAssign(({
    event,
    self,
  }) => {
    if (event.type !== "EMERGENCY_DETECTED") {
      return {}
    }

    return {
      previousStateBeforeOverlay: snapshotValueToMachineState(
        self.getSnapshot().value,
      ),
      emergencySource: event.source,
      streamRequestId: undefined,
      blocking: true,
      interruptedBy: "emergency",
    }
  }),

  clearEmergencyOverlay: visitAssign(() => {
    return {
      previousStateBeforeOverlay: undefined,
      emergencySource: undefined,
      interruptedBy: undefined,
    }
  }),

  // 急症复检：仅记录复检请求（保留来源/前态），真正的收口仍由
  // EMERGENCY_DISMISSED（误报恢复前态）/ EMERGENCY_CONFIRMED（确认急症→terminated）驱动。
  // 因此该 action 不改变 previousStateBeforeOverlay / interruptedBy，只在带 cardId 时
  // 记录待复检的卡片，自过渡停留在 emergencyPending。
  markEmergencyRecheck: visitAssign(({ event, context }) => {
    if (event.type !== "EMERGENCY_RECHECK_REQUESTED") {
      return {}
    }

    return {
      currentCardId: event.cardId ?? context.currentCardId,
    }
  }),

  markTimerPaused: visitAssign(() => {
    return {
      timerPaused: true,
    }
  }),

  markTimerResumed: visitAssign(() => {
    return {
      timerPaused: false,
    }
  }),
}
