import { describe, expect, it } from "vitest"

import {
  adviceOnlyCardSchema,
  assistantStreamEventSchema,
  completedVisitCardSchema,
  deliveryAddressSummarySchema,
  diagnosisCardSchema,
  flowCardKindSchema,
  flowCardSchema,
  flowCardStatusSchema,
  flowCardTimelineItemSchema,
  labDecisionCardSchema,
  labExecutionCardSchema,
  medicationFulfillmentCardSchema,
  messageTimelineItemSchema,
  parseAssistantStreamEvent,
  parseFlowCard,
  parseTimelineItem,
  paymentCardSchema,
  safeParseAssistantStreamEvent,
  safeParseFlowCard,
  safeParseTimelineItem,
  systemEventTimelineItemSchema,
  terminalTimelineItemSchema,
  timelineItemSchema,
  timelineItemStatusSchema,
  treatmentExecutionCardSchema,
  treatmentPlanCardSchema,
} from "@/features/workbench/api/timeline-schemas"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const iso = () => new Date("2026-06-15T10:00:00Z").toISOString()

/** Base fields required by every flow card. */
function cardBase(overrides: Record<string, unknown> = {}) {
  return {
    id: "card-1",
    sessionId: "sess-1",
    status: "pending" as const,
    blocking: true,
    title: "Card Title",
    createdAt: iso(),
    ...overrides,
  }
}

/** Base fields required by every timeline item. */
function itemBase(overrides: Record<string, unknown> = {}) {
  return {
    id: "tl-1",
    sessionId: "sess-1",
    createdAt: iso(),
    status: "done" as const,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// flowCardStatusSchema
// ---------------------------------------------------------------------------
describe("flowCardStatusSchema", () => {
  const validStatuses = [
    "pending",
    "accepted",
    "skipped",
    "vetoed",
    "paid",
    "processing",
    "completed",
    "failed",
    "invalidated",
  ] as const

  it.each(validStatuses)("accepts %s", (s) => {
    expect(flowCardStatusSchema.safeParse(s).success).toBe(true)
  })

  it("rejects unknown status", () => {
    expect(flowCardStatusSchema.safeParse("unknown").success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// flowCardKindSchema
// ---------------------------------------------------------------------------
describe("flowCardKindSchema", () => {
  const validKinds = [
    "lab_decision",
    "payment",
    "lab_execution",
    "diagnosis",
    "treatment_plan",
    "medication_fulfillment",
    "treatment_execution",
    "advice_only",
    "completed_visit",
  ] as const

  it.each(validKinds)("accepts %s", (k) => {
    expect(flowCardKindSchema.safeParse(k).success).toBe(true)
  })

  it("rejects unknown kind", () => {
    expect(flowCardKindSchema.safeParse("unknown").success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// labDecisionCardSchema
// ---------------------------------------------------------------------------
describe("labDecisionCardSchema", () => {
  it("accepts valid card", () => {
    const result = labDecisionCardSchema.safeParse(
      cardBase({
        kind: "lab_decision",
        testItems: [{ code: "CBC", name: "血常规" }],
        estimatedFee: 50,
      }),
    )
    expect(result.success).toBe(true)
  })

  it("accepts optional fields", () => {
    const result = labDecisionCardSchema.safeParse(
      cardBase({
        kind: "lab_decision",
        testItems: [{ code: "CBC", name: "血常规", sampleType: "blood" }],
        reason: "fever",
        differentialTargets: ["infection", "inflammation"],
        estimatedFee: 0,
        handledAt: iso(),
      }),
    )
    expect(result.success).toBe(true)
  })

  it("rejects non-lab_decision kind", () => {
    const result = labDecisionCardSchema.safeParse(
      cardBase({ kind: "payment", testItems: [], estimatedFee: 0 }),
    )
    expect(result.success).toBe(false)
  })

  it("rejects negative estimatedFee", () => {
    const result = labDecisionCardSchema.safeParse(
      cardBase({
        kind: "lab_decision",
        testItems: [{ code: "CBC", name: "血常规" }],
        estimatedFee: -1,
      }),
    )
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// paymentCardSchema
// ---------------------------------------------------------------------------
describe("paymentCardSchema", () => {
  it("accepts valid card", () => {
    const result = paymentCardSchema.safeParse(
      cardBase({
        kind: "payment",
        purpose: "lab",
        items: [{ name: "血常规", amount: 50 }],
        totalAmount: 50,
        insuranceAmount: 20,
        selfPayAmount: 30,
        paymentStatus: "unpaid",
      }),
    )
    expect(result.success).toBe(true)
  })

  it("accepts card with paymentId and quantity", () => {
    const result = paymentCardSchema.safeParse(
      cardBase({
        kind: "payment",
        paymentId: "pay-1",
        purpose: "medication",
        items: [{ name: "药", amount: 100, quantity: 2 }],
        totalAmount: 100,
        insuranceAmount: 40,
        selfPayAmount: 60,
        paymentStatus: "paid",
      }),
    )
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// labExecutionCardSchema
// ---------------------------------------------------------------------------
describe("labExecutionCardSchema", () => {
  it("accepts valid card", () => {
    const result = labExecutionCardSchema.safeParse(
      cardBase({
        kind: "lab_execution",
        labOrderId: "lo-1",
        executionStatus: "queued",
      }),
    )
    expect(result.success).toBe(true)
  })

  it("accepts card with optional fields", () => {
    const result = labExecutionCardSchema.safeParse(
      cardBase({
        kind: "lab_execution",
        labOrderId: "lo-1",
        executionStatus: "result_ready",
        resultSummary: "All normal",
        resultReturnedAt: iso(),
      }),
    )
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// diagnosisCardSchema
// ---------------------------------------------------------------------------
describe("diagnosisCardSchema", () => {
  it("accepts valid card", () => {
    const result = diagnosisCardSchema.safeParse(
      cardBase({
        kind: "diagnosis",
        diagnosis: "Common cold",
        confidence: "medium",
        evidence: ["fever", "cough"],
        evidenceSources: ["history", "answer"],
        riskSignals: [],
      }),
    )
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// treatmentPlanCardSchema
// ---------------------------------------------------------------------------
describe("treatmentPlanCardSchema", () => {
  it("accepts valid card", () => {
    const result = treatmentPlanCardSchema.safeParse(
      cardBase({
        kind: "treatment_plan",
        plan: "medication",
        capability: "available",
        summary: "Take medicine",
        actions: ["prescribe"],
      }),
    )
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// deliveryAddressSummarySchema
// ---------------------------------------------------------------------------
describe("deliveryAddressSummarySchema", () => {
  it("accepts valid address", () => {
    const result = deliveryAddressSummarySchema.safeParse({
      name: "张三",
      phone: "13800138000",
      fullAddress: "北京市海淀区",
    })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// medicationFulfillmentCardSchema
// ---------------------------------------------------------------------------
describe("medicationFulfillmentCardSchema", () => {
  it("accepts valid card", () => {
    const result = medicationFulfillmentCardSchema.safeParse(
      cardBase({
        kind: "medication_fulfillment",
        medications: [
          {
            name: "阿莫西林",
            spec: "0.5g",
            quantity: 2,
            price: 10,
          },
        ],
        availableModes: ["pickup", "delivery"],
        fulfillmentStatus: "pending",
      }),
    )
    expect(result.success).toBe(true)
  })

  it("applies default values for dosage and days", () => {
    const result = medicationFulfillmentCardSchema.parse(
      cardBase({
        kind: "medication_fulfillment",
        medications: [
          {
            name: "阿莫西林",
            spec: "0.5g",
            quantity: 2,
            price: 10,
          },
        ],
        availableModes: ["pickup"],
        fulfillmentStatus: "pending",
      }),
    )
    expect(result.medications[0].dosage).toBe("")
    expect(result.medications[0].days).toBe(0)
  })

  it("accepts card with selectedMode and deliveryAddress", () => {
    const result = medicationFulfillmentCardSchema.safeParse(
      cardBase({
        kind: "medication_fulfillment",
        medications: [
          { name: "药", spec: "0.5g", quantity: 1, price: 10 },
        ],
        availableModes: ["delivery"],
        selectedMode: "delivery",
        fulfillmentStatus: "confirmed",
        deliveryAddress: {
          name: "张三",
          phone: "13800138000",
          fullAddress: "北京市海淀区",
        },
      }),
    )
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// treatmentExecutionCardSchema
// ---------------------------------------------------------------------------
describe("treatmentExecutionCardSchema", () => {
  it("accepts valid card", () => {
    const result = treatmentExecutionCardSchema.safeParse(
      cardBase({
        kind: "treatment_execution",
        treatmentName: "物理治疗",
        capability: "available",
        executionStatus: "pending",
        notices: [],
        availableActions: ["schedule"],
      }),
    )
    expect(result.success).toBe(true)
  })

  it("accepts card with optional fields", () => {
    const result = treatmentExecutionCardSchema.safeParse(
      cardBase({
        kind: "treatment_execution",
        treatmentName: "注射",
        capability: "limited",
        executionStatus: "scheduled",
        appointmentAt: iso(),
        queueNo: "A001",
        notices: ["空腹"],
        availableActions: ["confirm_arrival", "start", "complete", "cancel"],
      }),
    )
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// adviceOnlyCardSchema
// ---------------------------------------------------------------------------
describe("adviceOnlyCardSchema", () => {
  it("accepts valid card", () => {
    const result = adviceOnlyCardSchema.safeParse(
      cardBase({
        kind: "advice_only",
        advices: ["多喝水"],
        watchItems: ["体温"],
        followUpRecommendation: "如症状加重请复诊",
      }),
    )
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// completedVisitCardSchema
// ---------------------------------------------------------------------------
describe("completedVisitCardSchema", () => {
  it("accepts valid card", () => {
    const result = completedVisitCardSchema.safeParse(
      cardBase({
        kind: "completed_visit",
        diagnosis: "感冒",
        treatmentSummary: "已开药",
        followUpSuggestion: "一周后复诊",
        completedAt: iso(),
      }),
    )
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// flowCardSchema (discriminated union)
// ---------------------------------------------------------------------------
describe("flowCardSchema (discriminated union)", () => {
  it("parses a lab_decision card", () => {
    const card = {
      id: "card-1",
      sessionId: "sess-1",
      status: "pending",
      blocking: true,
      title: "检验建议",
      createdAt: iso(),
      kind: "lab_decision",
      testItems: [{ code: "CBC", name: "血常规" }],
      estimatedFee: 50,
    } as const
    const result = flowCardSchema.safeParse(card)
    expect(result.success).toBe(true)
  })

  it("parses a payment card", () => {
    const card = {
      id: "card-2",
      sessionId: "sess-1",
      status: "pending",
      blocking: false,
      title: "缴费",
      createdAt: iso(),
      kind: "payment",
      purpose: "lab",
      items: [{ name: "化验费", amount: 50 }],
      totalAmount: 50,
      insuranceAmount: 20,
      selfPayAmount: 30,
      paymentStatus: "unpaid",
    } as const
    const result = flowCardSchema.safeParse(card)
    expect(result.success).toBe(true)
  })

  it("parses a completed_visit card", () => {
    const card = {
      id: "card-9",
      sessionId: "sess-1",
      status: "completed",
      blocking: false,
      title: "问诊完成",
      createdAt: iso(),
      kind: "completed_visit",
      diagnosis: "感冒",
      treatmentSummary: "已处理",
      followUpSuggestion: "观察",
      completedAt: iso(),
    } as const
    const result = flowCardSchema.safeParse(card)
    expect(result.success).toBe(true)
  })

  it("rejects a card with unknown kind", () => {
    const result = flowCardSchema.safeParse(
      cardBase({ kind: "unknown_kind" }),
    )
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// timelineItemStatusSchema
// ---------------------------------------------------------------------------
describe("timelineItemStatusSchema", () => {
  const validStatuses = ["pending", "streaming", "done", "failed", "invalidated"] as const

  it.each(validStatuses)("accepts %s", (s) => {
    expect(timelineItemStatusSchema.safeParse(s).success).toBe(true)
  })

  it("rejects unknown status", () => {
    expect(timelineItemStatusSchema.safeParse("unknown").success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// messageTimelineItemSchema
// ---------------------------------------------------------------------------
describe("messageTimelineItemSchema", () => {
  it("accepts patient message", () => {
    const result = messageTimelineItemSchema.safeParse(
      itemBase({
        kind: "message",
        role: "patient",
        content: "I have a fever",
      }),
    )
    expect(result.success).toBe(true)
  })

  it("accepts assistant message with interruptedBy", () => {
    const result = messageTimelineItemSchema.safeParse(
      itemBase({
        kind: "message",
        role: "assistant",
        content: "Let me check",
        localKey: "lk-1",
        interruptedBy: "emergency",
      }),
    )
    expect(result.success).toBe(true)
  })

  it("rejects invalid role", () => {
    const result = messageTimelineItemSchema.safeParse(
      itemBase({ kind: "message", role: "doctor", content: "hi" }),
    )
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// flowCardTimelineItemSchema
// ---------------------------------------------------------------------------
describe("flowCardTimelineItemSchema", () => {
  it("accepts valid item", () => {
    const result = flowCardTimelineItemSchema.safeParse(
      itemBase({
        kind: "flow_card",
        card: {
          id: "card-1",
          sessionId: "sess-1",
          status: "pending",
          blocking: true,
          title: "Lab",
          createdAt: iso(),
          kind: "lab_decision",
          testItems: [{ code: "CBC", name: "血常规" }],
          estimatedFee: 50,
        },
      }),
    )
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// systemEventTimelineItemSchema
// ---------------------------------------------------------------------------
describe("systemEventTimelineItemSchema", () => {
  const validEventTypes = [
    "context_loaded",
    "agent_thinking",
    "lab_result_received",
    "lab_vetoed",
    "payment_succeeded",
    "drug_purchased",
    "follow_up_started",
    "emergency_dismissed",
    "exit_settled",
    "session_suspended",
  ] as const

  it.each(validEventTypes)("accepts eventType %s", (eventType) => {
    const result = systemEventTimelineItemSchema.safeParse(
      itemBase({
        kind: "system_event",
        eventType,
        title: "Event title",
      }),
    )
    expect(result.success).toBe(true)
  })

  it("accepts with description", () => {
    const result = systemEventTimelineItemSchema.safeParse(
      itemBase({
        kind: "system_event",
        eventType: "context_loaded",
        title: "Context loaded",
        description: "Loaded patient history",
      }),
    )
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// terminalTimelineItemSchema
// ---------------------------------------------------------------------------
describe("terminalTimelineItemSchema", () => {
  it("accepts valid item", () => {
    const result = terminalTimelineItemSchema.safeParse(
      itemBase({
        kind: "terminal",
        reason: "exited",
        title: "Visit ended",
        description: "Patient exited",
        suggestedDepartment: "Internal Medicine",
      }),
    )
    expect(result.success).toBe(true)
  })

  it("accepts minimal item", () => {
    const result = terminalTimelineItemSchema.safeParse(
      itemBase({
        kind: "terminal",
        reason: "emergency",
        title: "Emergency",
      }),
    )
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// timelineItemSchema (discriminated union)
// ---------------------------------------------------------------------------
describe("timelineItemSchema (discriminated union)", () => {
  it("parses a message item", () => {
    const item = itemBase({
      kind: "message",
      role: "patient",
      content: "hello",
    })
    expect(timelineItemSchema.safeParse(item).success).toBe(true)
  })

  it("parses a flow_card item", () => {
    const item = itemBase({
      kind: "flow_card",
      card: {
        id: "card-1",
        sessionId: "sess-1",
        status: "pending",
        blocking: true,
        title: "Card",
        createdAt: iso(),
        kind: "lab_decision",
        testItems: [{ code: "CBC", name: "血常规" }],
        estimatedFee: 50,
      },
    })
    expect(timelineItemSchema.safeParse(item).success).toBe(true)
  })

  it("parses a system_event item", () => {
    const item = itemBase({
      kind: "system_event",
      eventType: "agent_thinking",
      title: "Thinking",
    })
    expect(timelineItemSchema.safeParse(item).success).toBe(true)
  })

  it("parses a terminal item", () => {
    const item = itemBase({
      kind: "terminal",
      reason: "exited",
      title: "End",
    })
    expect(timelineItemSchema.safeParse(item).success).toBe(true)
  })

  it("rejects unknown kind", () => {
    const item = itemBase({ kind: "unknown" })
    expect(timelineItemSchema.safeParse(item).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// assistantStreamEventSchema (discriminated union on "type")
// ---------------------------------------------------------------------------
describe("assistantStreamEventSchema", () => {
  it("parses a delta event", () => {
    const result = assistantStreamEventSchema.safeParse({
      type: "delta",
      sessionId: "sess-1",
      requestId: "req-1",
      content: "Hello",
    })
    expect(result.success).toBe(true)
  })

  it("parses a message_final event", () => {
    const result = assistantStreamEventSchema.safeParse({
      type: "message_final",
      sessionId: "sess-1",
      requestId: "req-1",
      item: itemBase({ kind: "message", role: "assistant", content: "Hello" }),
    })
    expect(result.success).toBe(true)
  })

  it("parses a card event", () => {
    const result = assistantStreamEventSchema.safeParse({
      type: "card",
      sessionId: "sess-1",
      requestId: "req-1",
      card: {
        id: "card-1",
        sessionId: "sess-1",
        status: "pending",
        blocking: true,
        title: "Card",
        createdAt: iso(),
        kind: "lab_decision" as const,
        testItems: [{ code: "CBC", name: "血常规" }],
        estimatedFee: 50,
      },
      timelineItem: itemBase({
        kind: "flow_card",
        card: {
          id: "card-1",
          sessionId: "sess-1",
          status: "pending",
          blocking: true,
          title: "Card",
          createdAt: iso(),
          kind: "lab_decision" as const,
          testItems: [{ code: "CBC", name: "血常规" }],
          estimatedFee: 50,
        },
      }),
    })
    expect(result.success).toBe(true)
  })

  it("parses a card event without timelineItem", () => {
    const result = assistantStreamEventSchema.safeParse({
      type: "card",
      sessionId: "sess-1",
      requestId: "req-1",
      card: {
        id: "card-1",
        sessionId: "sess-1",
        status: "pending",
        blocking: true,
        title: "Card",
        createdAt: iso(),
        kind: "lab_decision" as const,
        testItems: [{ code: "CBC", name: "血常规" }],
        estimatedFee: 50,
      },
    })
    expect(result.success).toBe(true)
  })

  it("parses a state event", () => {
    const result = assistantStreamEventSchema.safeParse({
      type: "state",
      sessionId: "sess-1",
      state: "chatting",
      status: "chatting",
      activeCardId: "card-1",
    })
    expect(result.success).toBe(true)
  })

  it("parses a state event without status and activeCardId", () => {
    const result = assistantStreamEventSchema.safeParse({
      type: "state",
      sessionId: "sess-1",
      state: "analyzing",
    })
    expect(result.success).toBe(true)
  })

  it("parses an emergency event", () => {
    const result = assistantStreamEventSchema.safeParse({
      type: "emergency",
      sessionId: "sess-1",
      severity: "critical",
      message: "Patient in distress",
    })
    expect(result.success).toBe(true)
  })

  it("parses a done event", () => {
    const result = assistantStreamEventSchema.safeParse({
      type: "done",
      sessionId: "sess-1",
      requestId: "req-1",
    })
    expect(result.success).toBe(true)
  })

  it("parses an error event", () => {
    const result = assistantStreamEventSchema.safeParse({
      type: "error",
      error: { code: "ERR_1", message: "Something went wrong" },
    })
    expect(result.success).toBe(true)
  })

  it("parses an error event with full fields", () => {
    const result = assistantStreamEventSchema.safeParse({
      type: "error",
      sessionId: "sess-1",
      requestId: "req-1",
      error: { code: "ERR_1", message: "Error", status: 500, retriable: true },
    })
    expect(result.success).toBe(true)
  })

  it("rejects unknown type", () => {
    const result = assistantStreamEventSchema.safeParse({
      type: "unknown",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// parse / safeParse helper functions
// ---------------------------------------------------------------------------
describe("parseTimelineItem", () => {
  it("returns parsed result on valid input", () => {
    const result = parseTimelineItem(
      itemBase({ kind: "message", role: "patient", content: "hi" }),
    )
    expect(result.id).toBe("tl-1")
  })

  it("throws on invalid input", () => {
    expect(() => parseTimelineItem({})).toThrow()
  })
})

describe("safeParseTimelineItem", () => {
  it("returns success on valid input", () => {
    const result = safeParseTimelineItem(
      itemBase({ kind: "message", role: "patient", content: "hi" }),
    )
    expect(result.success).toBe(true)
  })

  it("returns failure on invalid input", () => {
    const result = safeParseTimelineItem({})
    expect(result.success).toBe(false)
  })
})

describe("parseFlowCard", () => {
  it("returns parsed result on valid card", () => {
    const card = {
      id: "card-1",
      sessionId: "sess-1",
      status: "pending" as const,
      blocking: true,
      title: "Card",
      createdAt: iso(),
      kind: "lab_decision" as const,
      testItems: [{ code: "CBC", name: "血常规" }],
      estimatedFee: 50,
    }
    const result = parseFlowCard(card)
    expect(result.id).toBe("card-1")
  })
})

describe("safeParseFlowCard", () => {
  it("returns success on valid card", () => {
    const card = {
      id: "card-1",
      sessionId: "sess-1",
      status: "pending" as const,
      blocking: true,
      title: "Card",
      createdAt: iso(),
      kind: "lab_decision" as const,
      testItems: [{ code: "CBC", name: "血常规" }],
      estimatedFee: 50,
    }
    expect(safeParseFlowCard(card).success).toBe(true)
  })
})

describe("parseAssistantStreamEvent", () => {
  it("returns parsed result on valid event", () => {
    const event = {
      type: "done" as const,
      sessionId: "sess-1",
      requestId: "req-1",
    }
    const result = parseAssistantStreamEvent(event)
    expect(result.type).toBe("done")
  })
})

describe("safeParseAssistantStreamEvent", () => {
  it("returns success on valid event", () => {
    const event = {
      type: "done" as const,
      sessionId: "sess-1",
      requestId: "req-1",
    }
    expect(safeParseAssistantStreamEvent(event).success).toBe(true)
  })
})
