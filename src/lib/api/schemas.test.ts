import { describe, expect, it } from "vitest"

import { safeParseVisitSession } from "@/features/visits/api/schemas"
import {
  assistantStreamEventSchema,
  flowCardSchema,
  safeParseAssistantStreamEvent,
  safeParseFlowCard,
  safeParseTimelineItem,
  timelineItemSchema,
} from "@/features/workbench/api/timeline-schemas"
import {
  createDiagnosisCard,
  createLabDecisionCard,
  createLabPaymentCard,
} from "@/mocks/api/fixtures/flow-cards"

const iso = () => new Date().toISOString()

function buildValidSession() {
  return {
    id: "sess-1",
    patientId: "pat-1",
    entryType: "new" as const,
    status: "chatting" as const,
    startedAt: iso(),
    updatedAt: iso(),
    askRound: 0,
    askRoundLimit: 5,
    labRound: 0,
    labRoundLimit: 2,
    timerPaused: false,
    summary: {},
  }
}

describe("visitSessionSchema", () => {
  it("parses a valid chatting session", () => {
    expect(safeParseVisitSession(buildValidSession()).success).toBe(true)
  })

  it("rejects entryType 'new' carrying a parentSessionId (superRefine)", () => {
    expect(
      safeParseVisitSession({
        ...buildValidSession(),
        entryType: "new",
        parentSessionId: "sess-parent",
      }).success,
    ).toBe(false)
  })

  it("rejects status 'blocked' without activeCardId (superRefine)", () => {
    expect(
      safeParseVisitSession({
        ...buildValidSession(),
        status: "blocked",
      }).success,
    ).toBe(false)
  })

  it("accepts status 'blocked' once activeCardId is present", () => {
    expect(
      safeParseVisitSession({
        ...buildValidSession(),
        status: "blocked",
        activeCardId: "card-1",
      }).success,
    ).toBe(true)
  })

  it("rejects an out-of-range visit status enum", () => {
    expect(
      safeParseVisitSession({
        ...buildValidSession(),
        status: "not_a_status",
      }).success,
    ).toBe(false)
  })
})

describe("flowCardSchema (discriminated union on kind)", () => {
  it("parses valid cards across several kinds", () => {
    expect(safeParseFlowCard(createLabDecisionCard("sess-1", "card-1")).success).toBe(
      true,
    )
    expect(safeParseFlowCard(createLabPaymentCard("sess-1", "card-2")).success).toBe(
      true,
    )
    expect(safeParseFlowCard(createDiagnosisCard("sess-1", "card-3")).success).toBe(
      true,
    )
  })

  it("fails on an unknown kind", () => {
    expect(
      flowCardSchema.safeParse({
        ...createLabDecisionCard("sess-1", "card-1"),
        kind: "mystery_kind",
      }).success,
    ).toBe(false)
  })

  it("fails when a required field is missing", () => {
    const card = createLabDecisionCard("sess-1", "card-1") as Record<string, unknown>
    delete card.reason
    expect(flowCardSchema.safeParse(card).success).toBe(false)
  })
})

describe("timelineItemSchema (discriminated union on kind)", () => {
  const base = {
    sessionId: "sess-1",
    createdAt: iso(),
    status: "done" as const,
  }

  it("parses a message item", () => {
    expect(
      safeParseTimelineItem({
        ...base,
        id: "ti-1",
        kind: "message",
        role: "patient",
        content: "你好",
      }).success,
    ).toBe(true)
  })

  it("parses a flow_card item", () => {
    expect(
      safeParseTimelineItem({
        ...base,
        id: "ti-2",
        kind: "flow_card",
        card: createLabDecisionCard("sess-1", "card-1"),
      }).success,
    ).toBe(true)
  })

  it("parses a system_event item", () => {
    expect(
      safeParseTimelineItem({
        ...base,
        id: "ti-3",
        kind: "system_event",
        eventType: "context_loaded",
        title: "已加载就诊上下文",
      }).success,
    ).toBe(true)
  })

  it("parses a terminal item", () => {
    expect(
      safeParseTimelineItem({
        ...base,
        id: "ti-4",
        kind: "terminal",
        reason: "emergency",
        title: "已转急诊",
      }).success,
    ).toBe(true)
  })

  it("fails on an unknown kind", () => {
    expect(
      timelineItemSchema.safeParse({ ...base, id: "ti-5", kind: "nope" }).success,
    ).toBe(false)
  })
})

describe("assistantStreamEventSchema (discriminated union on type)", () => {
  it("parses a delta event", () => {
    expect(
      safeParseAssistantStreamEvent({
        type: "delta",
        sessionId: "sess-1",
        requestId: "req-1",
        content: "片段",
      }).success,
    ).toBe(true)
  })

  it("parses a card event", () => {
    expect(
      safeParseAssistantStreamEvent({
        type: "card",
        sessionId: "sess-1",
        requestId: "req-1",
        card: createLabDecisionCard("sess-1", "card-1"),
      }).success,
    ).toBe(true)
  })

  it("parses a state event", () => {
    expect(
      safeParseAssistantStreamEvent({
        type: "state",
        sessionId: "sess-1",
        state: "chatting",
      }).success,
    ).toBe(true)
  })

  it("parses a done event", () => {
    expect(
      safeParseAssistantStreamEvent({
        type: "done",
        sessionId: "sess-1",
        requestId: "req-1",
      }).success,
    ).toBe(true)
  })

  it("parses an error event", () => {
    expect(
      safeParseAssistantStreamEvent({
        type: "error",
        sessionId: "sess-1",
        error: { code: "UNKNOWN_ERROR", message: "失败" },
      }).success,
    ).toBe(true)
  })

  it("fails on an unknown type", () => {
    expect(
      assistantStreamEventSchema.safeParse({
        type: "mystery",
        sessionId: "sess-1",
      }).success,
    ).toBe(false)
  })
})
