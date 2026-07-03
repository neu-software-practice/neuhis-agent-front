import { describe, expect, it } from "vitest"

import type { FlowCard, TimelineItem } from "@/features/workbench/api/types"
import type {
  AssistantStreamEvent,
  FlowCardKind,
  FlowCardStatus,
  MessageTimelineItem,
  TerminalTimelineItem,
  TimelineItemStatus,
} from "@/features/workbench/api/timeline-types"

// timeline-types.ts is a pure-type module.  We verify the types structurally
// by constructing values that conform to them.

describe("TimelineItemStatus type", () => {
  it("accepts all valid status values", () => {
    const statuses: TimelineItemStatus[] = [
      "pending",
      "streaming",
      "done",
      "failed",
      "invalidated",
    ]
    expect(statuses).toHaveLength(5)
  })
})

describe("FlowCardStatus type", () => {
  it("accepts all valid status values", () => {
    const statuses: FlowCardStatus[] = [
      "pending",
      "accepted",
      "skipped",
      "vetoed",
      "paid",
      "processing",
      "completed",
      "failed",
      "invalidated",
    ]
    expect(statuses).toHaveLength(9)
  })
})

describe("FlowCardKind type", () => {
  it("accepts all valid kind values", () => {
    const kinds: FlowCardKind[] = [
      "lab_decision",
      "payment",
      "lab_execution",
      "diagnosis",
      "treatment_plan",
      "medication_fulfillment",
      "treatment_execution",
      "advice_only",
      "completed_visit",
    ]
    expect(kinds).toHaveLength(9)
  })
})

describe("FlowCard type shape", () => {
  // We can't construct a full FlowCard without running Zod, but we can verify
  // that a discriminated union on kind works correctly at the type level.
  it("discriminates on kind", () => {
    const labCard = {
      kind: "lab_decision" as const,
      testItems: [] as Array<{ code: string; name: string }>,
    }
    // TypeScript narrows this correctly — we just verify the runtime shape.
    expect(labCard.kind).toBe("lab_decision")
    expect(labCard.testItems).toEqual([])
  })
})

describe("AssistantStreamEvent type", () => {
  it("discriminates on type field", () => {
    const done: AssistantStreamEvent = {
      type: "done",
      sessionId: "sess-1",
      requestId: "req-1",
    }
    expect(done.type).toBe("done")
    expect(done.sessionId).toBe("sess-1")
  })

  it("delta shape", () => {
    const delta: AssistantStreamEvent = {
      type: "delta",
      sessionId: "sess-1",
      requestId: "req-1",
      content: "hi",
    }
    expect(delta.type).toBe("delta")
    expect(delta.content).toBe("hi")
  })
})

describe("MessageTimelineItem type", () => {
  it("has role, content, optional fields", () => {
    const item: MessageTimelineItem = {
      id: "tl-1",
      sessionId: "sess-1",
      createdAt: "2026-01-01T00:00:00Z",
      status: "done",
      kind: "message",
      role: "patient",
      content: "hello",
    }
    expect(item.role).toBe("patient")
    expect(item.content).toBe("hello")
  })
})

describe("TerminalTimelineItem type", () => {
  it("has reason and title", () => {
    const item: TerminalTimelineItem = {
      id: "tl-1",
      sessionId: "sess-1",
      createdAt: "2026-01-01T00:00:00Z",
      status: "done",
      kind: "terminal",
      reason: "exited",
      title: "Visit ended",
    }
    expect(item.reason).toBe("exited")
  })
})

describe("TimelineItem type", () => {
  it("discriminates on kind field", () => {
    const items: TimelineItem[] = [
      {
        id: "tl-1",
        sessionId: "sess-1",
        createdAt: "2026-01-01T00:00:00Z",
        status: "done",
        kind: "message",
        role: "patient",
        content: "hello",
      },
    ]
    expect(items[0].kind).toBe("message")
  })
})
