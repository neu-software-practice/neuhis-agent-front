import { describe, expect, it } from "vitest"

import type { FlowCard } from "@/features/workbench/api/types"
import type {
  HydrateVisitMachineInput,
  InterruptedBy,
  PaymentPurpose,
  TreatmentPlan,
  VisitMachineContext,
  VisitMachineEvent,
} from "@/features/workbench/machine/visit-machine.types"

// visit-machine.types.ts is a pure-type module.  We verify the types
// structurally by constructing values that conform to them.

describe("TreatmentPlan type", () => {
  it("accepts all valid plan values", () => {
    const plans: TreatmentPlan[] = [
      "medication",
      "treatment",
      "advice_only",
      "referral",
    ]
    expect(plans).toHaveLength(4)
  })
})

describe("PaymentPurpose type", () => {
  it("accepts all valid purpose values", () => {
    const purposes: PaymentPurpose[] = ["lab", "medication"]
    expect(purposes).toHaveLength(2)
  })
})

describe("InterruptedBy type", () => {
  it("accepts all valid interruption reasons", () => {
    const reasons: InterruptedBy[] = [
      "emergency",
      "timeout",
      "exit",
      "idle",
    ]
    expect(reasons).toHaveLength(4)
  })
})

describe("VisitMachineContext interface", () => {
  it("constructs a valid context", () => {
    const ctx: VisitMachineContext = {
      sessionId: "sess-1",
      currentCardId: "card-1",
      previousStateBeforeOverlay: "chatting",
      terminalReason: "exited",
      askRound: 0,
      labRound: 1,
      blocking: true,
      timerPaused: false,
      streamRequestId: "req-1",
      emergencySource: "patient",
      interruptedBy: "emergency",
    }
    expect(ctx.sessionId).toBe("sess-1")
    expect(ctx.blocking).toBe(true)
    expect(ctx.askRound).toBe(0)
    expect(ctx.labRound).toBe(1)
  })

  it("all fields are optional except sessionId, askRound, labRound, blocking, timerPaused", () => {
    const minimal: VisitMachineContext = {
      sessionId: "sess-1",
      askRound: 0,
      labRound: 0,
      blocking: false,
      timerPaused: false,
    }
    expect(minimal.sessionId).toBe("sess-1")
  })
})

describe("VisitMachineEvent union", () => {
  it("HYDRATE event", () => {
    const evt: VisitMachineEvent = {
      type: "HYDRATE",
      state: "chatting",
      session: {
        id: "sess-1",
        patientId: "pat-1",
        patientName: "张三",
        entryType: "new",
        status: "chatting",
        startedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        askRound: 0,
        askRoundLimit: 10,
        labRound: 0,
        labRoundLimit: 3,
        timerPaused: false,
        summary: {},
      },
    }
    expect(evt.type).toBe("HYDRATE")
    expect(evt.state).toBe("chatting")
  })

  it("MESSAGE_SENT event", () => {
    const evt: VisitMachineEvent = {
      type: "MESSAGE_SENT",
      content: "hello",
      clientMessageId: "cm-1",
    }
    expect(evt.type).toBe("MESSAGE_SENT")
  })

  it("LAB_CARD_RAISED event", () => {
    const evt: VisitMachineEvent = {
      type: "LAB_CARD_RAISED",
      cardId: "card-1",
    }
    expect(evt.type).toBe("LAB_CARD_RAISED")
  })

  // Spot-check a few more events from the large union.
  it("EMERGENCY_RECHECK_REQUESTED event", () => {
    const evt: VisitMachineEvent = {
      type: "EMERGENCY_RECHECK_REQUESTED",
      cardId: "card-1",
    }
    expect(evt.type).toBe("EMERGENCY_RECHECK_REQUESTED")
  })

  it("VISIT_TIMEOUT event", () => {
    const evt: VisitMachineEvent = { type: "VISIT_TIMEOUT" }
    expect(evt.type).toBe("VISIT_TIMEOUT")
  })

  it("EXIT_CONFIRMED event", () => {
    const evt: VisitMachineEvent = { type: "EXIT_CONFIRMED" }
    expect(evt.type).toBe("EXIT_CONFIRMED")
  })

  it("FOLLOW_UP_MESSAGE_SENT event", () => {
    const evt: VisitMachineEvent = {
      type: "FOLLOW_UP_MESSAGE_SENT",
      content: "I'm feeling better",
    }
    expect(evt.type).toBe("FOLLOW_UP_MESSAGE_SENT")
  })
})

describe("HydrateVisitMachineInput interface", () => {
  it("constructs with session and optional currentCard", () => {
    const input: HydrateVisitMachineInput = {
      session: {
        id: "sess-1",
        patientId: "pat-1",
        patientName: "张三",
        entryType: "new",
        status: "chatting",
        startedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        askRound: 0,
        askRoundLimit: 10,
        labRound: 0,
        labRoundLimit: 3,
        timerPaused: false,
        summary: {},
      },
    }
    expect(input.session.id).toBe("sess-1")
  })

  it("accepts optional currentCard", () => {
    const card: FlowCard = {
      id: "card-1",
      sessionId: "sess-1",
      status: "pending",
      blocking: true,
      title: "Lab",
      createdAt: "2026-01-01T00:00:00Z",
      kind: "lab_decision",
      testItems: [{ code: "CBC", name: "血常规" }],
      estimatedFee: 50,
    }
    const input: HydrateVisitMachineInput = {
      session: {
        id: "sess-1",
        patientId: "pat-1",
        patientName: "张三",
        entryType: "new",
        status: "chatting",
        startedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        askRound: 0,
        askRoundLimit: 10,
        labRound: 0,
        labRoundLimit: 3,
        timerPaused: false,
        summary: {},
      },
      currentCard: card,
    }
    expect(input.currentCard?.kind).toBe("lab_decision")
  })
})
