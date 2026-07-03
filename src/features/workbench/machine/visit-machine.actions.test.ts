import { describe, expect, it } from "vitest"

import type {
  VisitMachineContext,
  VisitMachineEvent,
} from "@/features/workbench/machine/visit-machine.types"
import { visitMachineActions } from "@/features/workbench/machine/visit-machine.actions"

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

function makeSelf(value: unknown = "chatting") {
  return {
    getSnapshot: () => ({ value }),
  }
}

/** Invoke a visitMachine action's assign function with the given args. */
function invoke(
  action: { assignment: (args: unknown) => Partial<VisitMachineContext> },
  args: { context?: Partial<VisitMachineContext>; event: VisitMachineEvent; self?: unknown },
): Partial<VisitMachineContext> {
  return action.assignment({
    context: makeContext(args.context ?? {}),
    event: args.event,
    self: args.self ?? makeSelf(),
  }) as Partial<VisitMachineContext>
}

describe("visit-machine actions", () => {
  describe("assignHydratedSession", () => {
    const session = {
      id: "visit-hydrate-001",
      activeCardId: "card-001",
      terminalReason: undefined,
      askRound: 3,
      labRound: 1,
      timerPaused: false,
    } as unknown as import("@/features/visits/api/types").VisitSession

    it("maps all fields from a HYDRATE event with currentCardId override", () => {
      const result = invoke(visitMachineActions.assignHydratedSession, {
        event: {
          type: "HYDRATE",
          state: "labDecision",
          session,
          currentCardId: "card-override",
          terminalReason: "timeout",
        },
      })

      expect(result).toEqual({
        sessionId: "visit-hydrate-001",
        currentCardId: "card-override",
        terminalReason: "timeout",
        askRound: 3,
        labRound: 1,
        blocking: true,
        timerPaused: false,
        streamRequestId: undefined,
        previousStateBeforeOverlay: undefined,
        emergencySource: undefined,
        interruptedBy: undefined,
      })
    })

    it("falls back to session.activeCardId and session.terminalReason when overrides absent", () => {
      const result = invoke(visitMachineActions.assignHydratedSession, {
        event: { type: "HYDRATE", state: "chatting", session },
      })

      expect(result.currentCardId).toBe("card-001")
      expect(result.terminalReason).toBeUndefined()
      // chatting is non-blocking
      expect(result.blocking).toBe(false)
    })

    it("sets blocking=false for completed state", () => {
      const result = invoke(visitMachineActions.assignHydratedSession, {
        event: { type: "HYDRATE", state: "completed", session },
      })
      expect(result.blocking).toBe(false)
    })

    it("sets blocking=false for suspended state", () => {
      const result = invoke(visitMachineActions.assignHydratedSession, {
        event: { type: "HYDRATE", state: "suspended", session },
      })
      expect(result.blocking).toBe(false)
    })

    it("returns {} for non-HYDRATE events", () => {
      const result = invoke(visitMachineActions.assignHydratedSession, {
        event: { type: "MESSAGE_SENT", content: "x", clientMessageId: "c" },
      })
      expect(result).toEqual({})
    })
  })

  describe("assignLoadedContext", () => {
    const session = {
      id: "visit-load-001",
      activeCardId: "card-002",
      terminalReason: "timeout",
      askRound: 2,
      labRound: 0,
      timerPaused: true,
    } as unknown as import("@/features/visits/api/types").VisitSession

    it("maps fields from a CONTEXT_LOADED event", () => {
      const result = invoke(visitMachineActions.assignLoadedContext, {
        event: { type: "CONTEXT_LOADED", session },
      })

      expect(result).toEqual({
        sessionId: "visit-load-001",
        currentCardId: "card-002",
        terminalReason: "timeout",
        askRound: 2,
        labRound: 0,
        blocking: true,
        timerPaused: true,
      })
    })

    it("sets blocking=false when no activeCardId", () => {
      const noCardSession = { ...session, activeCardId: undefined }
      const result = invoke(visitMachineActions.assignLoadedContext, {
        event: { type: "CONTEXT_LOADED", session: noCardSession as never },
      })
      expect(result.blocking).toBe(false)
    })

    it("returns {} for non-CONTEXT_LOADED events", () => {
      const result = invoke(visitMachineActions.assignLoadedContext, {
        event: { type: "HYDRATE", state: "chatting", session },
      })
      expect(result).toEqual({})
    })
  })

  describe("assignStreamRequest", () => {
    it("sets streamRequestId and clears blocking", () => {
      const result = invoke(visitMachineActions.assignStreamRequest, {
        event: { type: "AGENT_ANALYSIS_STARTED", requestId: "req-123" },
      })
      expect(result).toEqual({ streamRequestId: "req-123", blocking: false })
    })

    it("handles AGENT_ANALYSIS_STARTED without requestId", () => {
      const result = invoke(visitMachineActions.assignStreamRequest, {
        event: { type: "AGENT_ANALYSIS_STARTED" },
      })
      expect(result.streamRequestId).toBeUndefined()
      expect(result.blocking).toBe(false)
    })

    it("returns {} for non-matching events", () => {
      const result = invoke(visitMachineActions.assignStreamRequest, {
        event: { type: "MESSAGE_SENT", content: "x", clientMessageId: "c" },
      })
      expect(result).toEqual({})
    })
  })

  describe("incrementAskRound", () => {
    it("increments askRound and clears blocking", () => {
      const result = invoke(visitMachineActions.incrementAskRound, {
        context: { askRound: 4 },
        event: { type: "MESSAGE_SENT", content: "x", clientMessageId: "c" },
      })
      expect(result).toEqual({ askRound: 5, blocking: false })
    })
  })

  describe("assignCurrentCard", () => {
    it("sets currentCardId and blocking when cardId present", () => {
      const result = invoke(visitMachineActions.assignCurrentCard, {
        event: { type: "LAB_CARD_RAISED", cardId: "card-lab-001" },
      })
      expect(result).toEqual({ currentCardId: "card-lab-001", blocking: true })
    })

    it("returns {} when cardId is missing", () => {
      const result = invoke(visitMachineActions.assignCurrentCard, {
        event: { type: "LAB_ACCEPTED", cardId: "" },
      })
      expect(result).toEqual({})
    })

    it("returns {} for events without cardId", () => {
      const result = invoke(visitMachineActions.assignCurrentCard, {
        event: { type: "VISIT_COMPLETED" },
      })
      expect(result).toEqual({})
    })
  })

  describe("markLabAccepted", () => {
    it("increments labRound and sets blocking", () => {
      const result = invoke(visitMachineActions.markLabAccepted, {
        context: { labRound: 1 },
        event: { type: "LAB_ACCEPTED", cardId: "card-lab-001" },
      })
      expect(result).toEqual({ labRound: 2, blocking: true })
    })
  })

  describe("clearBlocking", () => {
    it("clears currentCardId, blocking, and streamRequestId", () => {
      const result = invoke(visitMachineActions.clearBlocking, {
        event: { type: "VISIT_COMPLETED" },
      })
      expect(result).toEqual({
        currentCardId: undefined,
        blocking: false,
        streamRequestId: undefined,
      })
    })
  })

  describe("markCompleted", () => {
    it("clears card, blocking, stream, and terminal reason", () => {
      const result = invoke(visitMachineActions.markCompleted, {
        event: { type: "VISIT_COMPLETED" },
      })
      expect(result).toEqual({
        currentCardId: undefined,
        blocking: false,
        streamRequestId: undefined,
        terminalReason: undefined,
      })
    })
  })

  describe("markTerminalReason", () => {
    it("handles TRANSFER_REQUIRED", () => {
      const result = invoke(visitMachineActions.markTerminalReason, {
        event: { type: "TRANSFER_REQUIRED", reason: "referral" },
      })
      expect(result).toEqual({
        terminalReason: "referral",
        currentCardId: undefined,
        blocking: true,
        streamRequestId: undefined,
      })
    })

    it("handles VISIT_TIMEOUT with interruptedBy='timeout'", () => {
      const result = invoke(visitMachineActions.markTerminalReason, {
        event: { type: "VISIT_TIMEOUT" },
      })
      expect(result).toEqual({
        terminalReason: "timeout",
        currentCardId: undefined,
        blocking: true,
        streamRequestId: undefined,
        interruptedBy: "timeout",
      })
    })

    it("handles EMERGENCY_CONFIRMED with interruptedBy='emergency'", () => {
      const result = invoke(visitMachineActions.markTerminalReason, {
        event: { type: "EMERGENCY_CONFIRMED" },
      })
      expect(result).toEqual({
        terminalReason: "emergency",
        currentCardId: undefined,
        blocking: true,
        previousStateBeforeOverlay: undefined,
        streamRequestId: undefined,
        interruptedBy: "emergency",
      })
    })

    it("handles TREATMENT_DECIDED with plan=referral", () => {
      const result = invoke(visitMachineActions.markTerminalReason, {
        event: { type: "TREATMENT_DECIDED", cardId: "card-plan-001", plan: "referral" },
      })
      expect(result).toEqual({
        terminalReason: "referral",
        currentCardId: undefined,
        blocking: true,
        streamRequestId: undefined,
      })
    })

    it("returns {} for TREATMENT_DECIDED with non-referral plan", () => {
      const result = invoke(visitMachineActions.markTerminalReason, {
        event: { type: "TREATMENT_DECIDED", cardId: "card-plan-001", plan: "medication" },
      })
      expect(result).toEqual({})
    })

    it("returns {} for unhandled event types", () => {
      const result = invoke(visitMachineActions.markTerminalReason, {
        event: { type: "MESSAGE_SENT", content: "x", clientMessageId: "c" },
      })
      expect(result).toEqual({})
    })
  })

  describe("markExitRequested", () => {
    it("sets blocking, clears stream, and records interruptedBy='exit'", () => {
      const result = invoke(visitMachineActions.markExitRequested, {
        event: { type: "EXIT_REQUESTED" },
      })
      expect(result).toEqual({
        blocking: true,
        streamRequestId: undefined,
        interruptedBy: "exit",
      })
    })
  })

  describe("markExited", () => {
    it("writes terminalReason exited and clears overlay/interrupted state", () => {
      const result = invoke(visitMachineActions.markExited, {
        event: { type: "EXIT_CONFIRMED" },
      })
      expect(result).toEqual({
        terminalReason: "exited",
        currentCardId: undefined,
        blocking: true,
        streamRequestId: undefined,
        previousStateBeforeOverlay: undefined,
        interruptedBy: "exit",
      })
    })
  })

  describe("rememberEmergencyOverlay", () => {
    it("snapshots current state, records source, and sets blocking", () => {
      const self = makeSelf("labPayment")
      const result = invoke(visitMachineActions.rememberEmergencyOverlay, {
        self,
        event: { type: "EMERGENCY_DETECTED", source: "vitals" },
      })
      expect(result).toEqual({
        previousStateBeforeOverlay: "labPayment",
        emergencySource: "vitals",
        streamRequestId: undefined,
        blocking: true,
        interruptedBy: "emergency",
      })
    })

    it("handles non-string snapshot value (returns undefined)", () => {
      const self = makeSelf({ nested: "object" })
      const result = invoke(visitMachineActions.rememberEmergencyOverlay, {
        self,
        event: { type: "EMERGENCY_DETECTED", source: "stream" },
      })
      expect(result.previousStateBeforeOverlay).toBeUndefined()
    })

    it("returns {} for non-EMERGENCY_DETECTED events", () => {
      const result = invoke(visitMachineActions.rememberEmergencyOverlay, {
        event: { type: "MESSAGE_SENT", content: "x", clientMessageId: "c" },
      })
      expect(result).toEqual({})
    })
  })

  describe("clearEmergencyOverlay", () => {
    it("clears overlay and emergency tracking fields", () => {
      const result = invoke(visitMachineActions.clearEmergencyOverlay, {
        event: { type: "EMERGENCY_DISMISSED" },
      })
      expect(result).toEqual({
        previousStateBeforeOverlay: undefined,
        emergencySource: undefined,
        interruptedBy: undefined,
      })
    })
  })

  describe("markEmergencyRecheck", () => {
    it("sets currentCardId from event.cardId", () => {
      const result = invoke(visitMachineActions.markEmergencyRecheck, {
        event: { type: "EMERGENCY_RECHECK_REQUESTED", cardId: "card-recheck-001" },
      })
      expect(result).toEqual({ currentCardId: "card-recheck-001" })
    })

    it("falls back to context.currentCardId when event has no cardId", () => {
      const result = invoke(visitMachineActions.markEmergencyRecheck, {
        context: { currentCardId: "card-existing" },
        event: { type: "EMERGENCY_RECHECK_REQUESTED" },
      })
      expect(result).toEqual({ currentCardId: "card-existing" })
    })

    it("returns {} for non-matching events", () => {
      const result = invoke(visitMachineActions.markEmergencyRecheck, {
        event: { type: "MESSAGE_SENT", content: "x", clientMessageId: "c" },
      })
      expect(result).toEqual({})
    })
  })

  describe("markTimerPaused", () => {
    it("sets timerPaused to true", () => {
      const result = invoke(visitMachineActions.markTimerPaused, {
        event: { type: "TIMER_PAUSED" },
      })
      expect(result).toEqual({ timerPaused: true })
    })
  })

  describe("markTimerResumed", () => {
    it("sets timerPaused to false", () => {
      const result = invoke(visitMachineActions.markTimerResumed, {
        event: { type: "TIMER_RESUMED" },
      })
      expect(result).toEqual({ timerPaused: false })
    })
  })

  describe("markSuspended", () => {
    it("clears card/stream, sets non-blocking, records interruptedBy='idle'", () => {
      const result = invoke(visitMachineActions.markSuspended, {
        event: { type: "VISIT_SUSPENDED" },
      })
      expect(result).toEqual({
        currentCardId: undefined,
        blocking: false,
        streamRequestId: undefined,
        interruptedBy: "idle",
      })
    })
  })
})
