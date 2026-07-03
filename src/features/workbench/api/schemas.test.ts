import { describe, expect, it } from "vitest"

import {
  ackAdviceInputSchema,
  askLockedQuestionInputSchema,
  classifyIntentInputSchema,
  classifyIntentResultSchema,
  consultationInputSchema,
  dismissEmergencyInputSchema,
  dismissEmergencyResultSchema,
  emergencyRecheckResultSchema,
  exitConsequenceSchema,
  exitSettlementResultSchema,
  exitVisitInputSchema,
  flowActionResultSchema,
  listTimelineInputSchema,
  listTimelineResultSchema,
  normalizeSendMessageResult,
  parseDismissEmergencyResult,
  parseExitSettlementResult,
  parseFlowActionResult,
  parseListTimelineResult,
  parseSendMessageResult,
  parseSuspendVisitResult,
  pauseVisitTimerInputSchema,
  reportVitalsInputSchema,
  resumeVisitTimerInputSchema,
  safeParseDismissEmergencyResult,
  safeParseExitSettlementResult,
  safeParseFlowActionResult,
  safeParseListTimelineResult,
  safeParseSendMessageResult,
  safeParseSuspendVisitResult,
  sendMessageInputSchema,
  sendMessageResultSchema,
  streamAssistantInputSchema,
  submitFulfillmentInputSchema,
  submitLabDecisionInputSchema,
  submitPaymentInputSchema,
  submitTreatmentExecutionInputSchema,
  suspendVisitInputSchema,
  suspendVisitResultSchema,
} from "@/features/workbench/api/schemas"

// ---------------------------------------------------------------------------
// Helper: produces a valid ISO‑8601 string used across multiple schemas
// ---------------------------------------------------------------------------
const iso = () => new Date("2026-06-15T10:00:00Z").toISOString()

// ---------------------------------------------------------------------------
// Valid session stub – matches visitSessionBaseSchema shape
// ---------------------------------------------------------------------------
function validSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "sess-1",
    patientId: "pat-1",
    patientName: "张三",
    entryType: "new" as const,
    status: "chatting" as const,
    startedAt: iso(),
    updatedAt: iso(),
    askRound: 0,
    askRoundLimit: 10,
    labRound: 0,
    labRoundLimit: 3,
    timerPaused: false,
    summary: {},
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Valid timeline-item stub – for "message" kind
// ---------------------------------------------------------------------------
function validMessageItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "tl-1",
    sessionId: "sess-1",
    createdAt: iso(),
    status: "done" as const,
    kind: "message" as const,
    role: "patient" as const,
    content: "hello",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// listTimelineInputSchema
// ---------------------------------------------------------------------------
describe("listTimelineInputSchema", () => {
  it("accepts minimal input", () => {
    const result = listTimelineInputSchema.safeParse({ sessionId: "sess-1" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pageSize).toBe(50) // default
    }
  })

  it("accepts full input with cursor and pageSize", () => {
    const result = listTimelineInputSchema.safeParse({
      sessionId: "sess-1",
      cursor: "cursor-abc",
      pageSize: 20,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pageSize).toBe(20)
      expect(result.data.cursor).toBe("cursor-abc")
    }
  })

  it("rejects invalid pageSize (0)", () => {
    const result = listTimelineInputSchema.safeParse({
      sessionId: "sess-1",
      pageSize: 0,
    })
    expect(result.success).toBe(false)
  })

  it("rejects pageSize > 100", () => {
    const result = listTimelineInputSchema.safeParse({
      sessionId: "sess-1",
      pageSize: 101,
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-integer pageSize", () => {
    const result = listTimelineInputSchema.safeParse({
      sessionId: "sess-1",
      pageSize: 5.5,
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing sessionId", () => {
    const result = listTimelineInputSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects empty sessionId (trimmed)", () => {
    const result = listTimelineInputSchema.safeParse({ sessionId: "" })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// listTimelineResultSchema (uses pageResultSchema + timelineItemSchema)
// ---------------------------------------------------------------------------
describe("listTimelineResultSchema", () => {
  it("accepts valid result with items", () => {
    const result = listTimelineResultSchema.safeParse({
      items: [validMessageItem()],
      hasMore: false,
    })
    expect(result.success).toBe(true)
  })

  it("accepts result with nextCursor and hasMore true", () => {
    const result = listTimelineResultSchema.safeParse({
      items: [validMessageItem()],
      nextCursor: "cursor-next",
      hasMore: true,
    })
    expect(result.success).toBe(true)
  })

  it("transforms null items to empty array", () => {
    const result = listTimelineResultSchema.parse({
      items: null,
      hasMore: false,
    })
    expect(result.items).toEqual([])
  })

  it("rejects invalid items", () => {
    const result = listTimelineResultSchema.safeParse({
      items: [{ id: "tl-1" }], // missing kind + other required fields
      hasMore: false,
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// sendMessageInputSchema
// ---------------------------------------------------------------------------
describe("sendMessageInputSchema", () => {
  it("accepts valid input", () => {
    const result = sendMessageInputSchema.safeParse({
      sessionId: "sess-1",
      content: "  hello  ",
      clientMessageId: "cm-1",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.content).toBe("hello") // trimmed
    }
  })

  it("rejects empty content after trim", () => {
    const result = sendMessageInputSchema.safeParse({
      sessionId: "sess-1",
      content: "   ",
      clientMessageId: "cm-1",
    })
    expect(result.success).toBe(false)
  })

  it("rejects content over 2000 chars", () => {
    const result = sendMessageInputSchema.safeParse({
      sessionId: "sess-1",
      content: "x".repeat(2001),
      clientMessageId: "cm-1",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing clientMessageId", () => {
    const result = sendMessageInputSchema.safeParse({
      sessionId: "sess-1",
      content: "hello",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// sendMessageResultSchema
// ---------------------------------------------------------------------------
describe("sendMessageResultSchema", () => {
  it("accepts valid result with assistantPlaceholder", () => {
    const result = sendMessageResultSchema.safeParse({
      session: validSession(),
      patientMessage: validMessageItem(),
      assistantPlaceholder: validMessageItem({
        role: "assistant",
        content: "",
        kind: "message",
      }),
    })
    expect(result.success).toBe(true)
  })

  it("accepts valid result without assistantPlaceholder", () => {
    const result = sendMessageResultSchema.safeParse({
      session: validSession(),
      patientMessage: validMessageItem(),
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid session", () => {
    const result = sendMessageResultSchema.safeParse({
      session: { id: "sess-1" }, // missing required fields
      patientMessage: validMessageItem(),
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// streamAssistantInputSchema
// ---------------------------------------------------------------------------
describe("streamAssistantInputSchema", () => {
  it("accepts valid input", () => {
    const result = streamAssistantInputSchema.safeParse({
      sessionId: "sess-1",
      requestId: "req-1",
      clientMessageId: "cm-1",
    })
    expect(result.success).toBe(true)
  })

  it("accepts input without clientMessageId", () => {
    const result = streamAssistantInputSchema.safeParse({
      sessionId: "sess-1",
      requestId: "req-1",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty requestId", () => {
    const result = streamAssistantInputSchema.safeParse({
      sessionId: "sess-1",
      requestId: "",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// flowActionResultSchema
// ---------------------------------------------------------------------------
describe("flowActionResultSchema", () => {
  it("accepts valid result", () => {
    const result = flowActionResultSchema.safeParse({
      sessionId: "sess-1",
      status: "chatting",
      timelineItems: [validMessageItem()],
      message: "ok",
    })
    expect(result.success).toBe(true)
  })

  it("accepts result with card and activeCardId", () => {
    const result = flowActionResultSchema.safeParse({
      sessionId: "sess-1",
      status: "blocked",
      activeCardId: "card-1",
      card: {
        id: "card-1",
        sessionId: "sess-1",
        status: "pending",
        blocking: true,
        title: "Lab Decision",
        createdAt: iso(),
        kind: "lab_decision",
        testItems: [{ code: "CBC", name: "血常规" }],
        estimatedFee: 50,
      },
      timelineItems: [validMessageItem()],
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid status", () => {
    const result = flowActionResultSchema.safeParse({
      sessionId: "sess-1",
      status: "invalid_status",
      timelineItems: [],
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// submitLabDecisionInputSchema
// ---------------------------------------------------------------------------
describe("submitLabDecisionInputSchema", () => {
  it.each(["accepted", "skipped", "vetoed"] as const)(
    "accepts decision %s",
    (decision) => {
      const result = submitLabDecisionInputSchema.safeParse({
        sessionId: "sess-1",
        cardId: "card-1",
        decision,
      })
      expect(result.success).toBe(true)
    },
  )

  it("rejects invalid decision", () => {
    const result = submitLabDecisionInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      decision: "invalid",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// submitPaymentInputSchema
// ---------------------------------------------------------------------------
describe("submitPaymentInputSchema", () => {
  it("accepts valid input with all optional fields", () => {
    const result = submitPaymentInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      purpose: "lab",
      paymentMethodId: "pm-1",
      simulateStatus: "paid",
      defer: false,
    })
    expect(result.success).toBe(true)
  })

  it("accepts minimal input", () => {
    const result = submitPaymentInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      purpose: "medication",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid purpose", () => {
    const result = submitPaymentInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      purpose: "invalid",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid simulateStatus", () => {
    const result = submitPaymentInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      purpose: "lab",
      simulateStatus: "invalid",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// submitFulfillmentInputSchema (has a .refine for delivery + addressId)
// ---------------------------------------------------------------------------
describe("submitFulfillmentInputSchema", () => {
  it("accepts pickup mode without addressId", () => {
    const result = submitFulfillmentInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      mode: "pickup",
    })
    expect(result.success).toBe(true)
  })

  it("accepts delivery mode with addressId", () => {
    const result = submitFulfillmentInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      mode: "delivery",
      addressId: "addr-1",
    })
    expect(result.success).toBe(true)
  })

  it("rejects delivery mode without addressId", () => {
    const result = submitFulfillmentInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      mode: "delivery",
    })
    expect(result.success).toBe(false)
  })

  it("accepts delivery mode with empty but present addressId", () => {
    // addressId must be min(1) after trim, so empty fails
    const result = submitFulfillmentInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      mode: "delivery",
      addressId: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid mode", () => {
    const result = submitFulfillmentInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      mode: "invalid",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// submitTreatmentExecutionInputSchema
// ---------------------------------------------------------------------------
describe("submitTreatmentExecutionInputSchema", () => {
  it.each(["schedule", "confirm_arrival", "start", "complete", "cancel"] as const)(
    "accepts action %s",
    (action) => {
      const result = submitTreatmentExecutionInputSchema.safeParse({
        sessionId: "sess-1",
        cardId: "card-1",
        action,
      })
      expect(result.success).toBe(true)
    },
  )

  it("rejects invalid action", () => {
    const result = submitTreatmentExecutionInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      action: "invalid",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// ackAdviceInputSchema
// ---------------------------------------------------------------------------
describe("ackAdviceInputSchema", () => {
  it("accepts valid input", () => {
    const result = ackAdviceInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing cardId", () => {
    const result = ackAdviceInputSchema.safeParse({ sessionId: "sess-1" })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// askLockedQuestionInputSchema
// ---------------------------------------------------------------------------
describe("askLockedQuestionInputSchema", () => {
  it("accepts valid input", () => {
    const result = askLockedQuestionInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      content: "  question  ",
      requestId: "req-1",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.content).toBe("question") // trimmed
    }
  })

  it("rejects content over 1000 chars", () => {
    const result = askLockedQuestionInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      content: "x".repeat(1001),
      requestId: "req-1",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty content", () => {
    const result = askLockedQuestionInputSchema.safeParse({
      sessionId: "sess-1",
      cardId: "card-1",
      content: "   ",
      requestId: "req-1",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// classifyIntentInputSchema
// ---------------------------------------------------------------------------
describe("classifyIntentInputSchema", () => {
  it("accepts valid input", () => {
    const result = classifyIntentInputSchema.safeParse({
      sessionId: "sess-1",
      content: "  hello  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.content).toBe("hello")
    }
  })

  it("rejects empty content", () => {
    const result = classifyIntentInputSchema.safeParse({
      sessionId: "sess-1",
      content: "   ",
    })
    expect(result.success).toBe(false)
  })

  it("rejects content over 1000", () => {
    const result = classifyIntentInputSchema.safeParse({
      sessionId: "sess-1",
      content: "x".repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// classifyIntentResultSchema
// ---------------------------------------------------------------------------
describe("classifyIntentResultSchema", () => {
  it("accepts valid result", () => {
    const result = classifyIntentResultSchema.safeParse({
      intent: "consultation",
      confidence: 0.95,
      reason: "user describes symptoms",
    })
    expect(result.success).toBe(true)
  })

  it("accepts result without reason", () => {
    const result = classifyIntentResultSchema.safeParse({
      intent: "follow_up",
      confidence: 0.8,
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid intent", () => {
    const result = classifyIntentResultSchema.safeParse({
      intent: "invalid",
      confidence: 0.5,
    })
    expect(result.success).toBe(false)
  })

  it("rejects confidence > 1", () => {
    const result = classifyIntentResultSchema.safeParse({
      intent: "uncertain",
      confidence: 1.5,
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative confidence", () => {
    const result = classifyIntentResultSchema.safeParse({
      intent: "uncertain",
      confidence: -0.1,
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// consultationInputSchema
// ---------------------------------------------------------------------------
describe("consultationInputSchema", () => {
  it("accepts valid input", () => {
    const result = consultationInputSchema.safeParse({
      sessionId: "sess-1",
      content: "  I have a headache  ",
      requestId: "req-1",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.content).toBe("I have a headache")
    }
  })
})

// ---------------------------------------------------------------------------
// reportVitalsInputSchema
// ---------------------------------------------------------------------------
describe("reportVitalsInputSchema", () => {
  it("accepts patient_report with symptoms only", () => {
    const result = reportVitalsInputSchema.safeParse({
      sessionId: "sess-1",
      source: "patient_report",
      symptoms: ["  headache  "],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.symptoms[0]).toBe("headache") // trimmed
    }
  })

  it("accepts full vitals", () => {
    const result = reportVitalsInputSchema.safeParse({
      sessionId: "sess-1",
      source: "device",
      symptoms: ["pain"],
      vitals: {
        temperature: 37.5,
        heartRate: 80,
        systolicPressure: 120,
        diastolicPressure: 80,
        spo2: 98,
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid spo2 > 100", () => {
    const result = reportVitalsInputSchema.safeParse({
      sessionId: "sess-1",
      source: "manual",
      symptoms: ["pain"],
      vitals: { spo2: 101 },
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative heartRate", () => {
    const result = reportVitalsInputSchema.safeParse({
      sessionId: "sess-1",
      source: "device",
      symptoms: [],
      vitals: { heartRate: -5 },
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid source", () => {
    const result = reportVitalsInputSchema.safeParse({
      sessionId: "sess-1",
      source: "invalid",
      symptoms: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty symptoms array", () => {
    // empty array is allowed itself, but each item must be min(1) after trim
    const result = reportVitalsInputSchema.safeParse({
      sessionId: "sess-1",
      source: "patient_report",
      symptoms: [""],
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// emergencyRecheckResultSchema
// ---------------------------------------------------------------------------
describe("emergencyRecheckResultSchema", () => {
  it("accepts non-emergency result", () => {
    const result = emergencyRecheckResultSchema.safeParse({
      emergency: false,
    })
    expect(result.success).toBe(true)
  })

  it("accepts critical emergency", () => {
    const result = emergencyRecheckResultSchema.safeParse({
      emergency: true,
      severity: "critical",
      message: "Immediate attention required",
    })
    expect(result.success).toBe(true)
  })

  it("accepts suspected emergency", () => {
    const result = emergencyRecheckResultSchema.safeParse({
      emergency: true,
      severity: "suspected",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid severity", () => {
    const result = emergencyRecheckResultSchema.safeParse({
      emergency: true,
      severity: "invalid",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// exitVisitInputSchema
// ---------------------------------------------------------------------------
describe("exitVisitInputSchema", () => {
  it.each(["patient_request", "timeout", "emergency", "other"] as const)(
    "accepts reason %s",
    (reason) => {
      const result = exitVisitInputSchema.safeParse({
        sessionId: "sess-1",
        reason,
      })
      expect(result.success).toBe(true)
    },
  )

  it("rejects invalid reason", () => {
    const result = exitVisitInputSchema.safeParse({
      sessionId: "sess-1",
      reason: "invalid",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// exitConsequenceSchema
// ---------------------------------------------------------------------------
describe("exitConsequenceSchema", () => {
  it.each(["no_fee", "refundable", "executed_no_refund", "medication_dispensed"] as const)(
    "accepts kind %s",
    (kind) => {
      const result = exitConsequenceSchema.safeParse({
        kind,
        amount: 100,
        text: "some consequence",
      })
      expect(result.success).toBe(true)
    },
  )

  it("accepts consequence without amount", () => {
    const result = exitConsequenceSchema.safeParse({
      kind: "no_fee",
      text: "no fee",
    })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// exitSettlementResultSchema
// ---------------------------------------------------------------------------
describe("exitSettlementResultSchema", () => {
  it("accepts valid settlement result", () => {
    const result = exitSettlementResultSchema.safeParse({
      sessionId: "sess-1",
      terminalReason: "exited",
      refundAmount: 0,
      payableAmount: 50,
      timelineItem: validMessageItem(),
      consequence: {
        kind: "refundable",
        amount: 50,
        text: "refund",
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts settlement without consequence", () => {
    const result = exitSettlementResultSchema.safeParse({
      sessionId: "sess-1",
      terminalReason: "patient_request",
      refundAmount: 0,
      payableAmount: 0,
      timelineItem: validMessageItem({ kind: "terminal", reason: "patient_request", title: "Visit ended" }),
    })
    expect(result.success).toBe(true)
  })

  it("rejects negative refundAmount", () => {
    const result = exitSettlementResultSchema.safeParse({
      sessionId: "sess-1",
      terminalReason: "exited",
      refundAmount: -1,
      payableAmount: 0,
      timelineItem: validMessageItem(),
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// pauseVisitTimerInputSchema & resumeVisitTimerInputSchema
// ---------------------------------------------------------------------------
describe("pauseVisitTimerInputSchema", () => {
  it("accepts valid input", () => {
    const result = pauseVisitTimerInputSchema.safeParse({ sessionId: "sess-1" })
    expect(result.success).toBe(true)
  })
})

describe("resumeVisitTimerInputSchema", () => {
  it("accepts valid input", () => {
    const result = resumeVisitTimerInputSchema.safeParse({ sessionId: "sess-1" })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// dismissEmergencyInputSchema & dismissEmergencyResultSchema
// ---------------------------------------------------------------------------
describe("dismissEmergencyInputSchema", () => {
  it("accepts valid input", () => {
    const result = dismissEmergencyInputSchema.safeParse({ sessionId: "sess-1" })
    expect(result.success).toBe(true)
  })
})

describe("dismissEmergencyResultSchema", () => {
  it("accepts valid result", () => {
    const result = dismissEmergencyResultSchema.safeParse({
      session: validSession(),
      timelineItem: validMessageItem(),
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid session", () => {
    const result = dismissEmergencyResultSchema.safeParse({
      session: { id: "sess-1" },
      timelineItem: validMessageItem(),
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// suspendVisitInputSchema & suspendVisitResultSchema
// ---------------------------------------------------------------------------
describe("suspendVisitInputSchema", () => {
  it("accepts valid input", () => {
    const result = suspendVisitInputSchema.safeParse({ sessionId: "sess-1" })
    expect(result.success).toBe(true)
  })
})

describe("suspendVisitResultSchema", () => {
  it("accepts valid result", () => {
    const result = suspendVisitResultSchema.safeParse({
      session: validSession(),
      timelineItem: validMessageItem(),
    })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// normalizeSendMessageResult
// ---------------------------------------------------------------------------
describe("normalizeSendMessageResult", () => {
  it("passes through non-object values", () => {
    expect(normalizeSendMessageResult(null)).toBe(null)
    expect(normalizeSendMessageResult("string")).toBe("string")
    expect(normalizeSendMessageResult(42)).toBe(42)
  })

  it("fixes null assistantPlaceholder content for message kind", () => {
    const raw = {
      session: validSession(),
      patientMessage: validMessageItem(),
      assistantPlaceholder: {
        id: "tl-2",
        sessionId: "sess-1",
        createdAt: iso(),
        status: "streaming",
        kind: "message",
        role: "assistant",
        content: null,
      },
    }
    const result = normalizeSendMessageResult(raw) as Record<string, unknown>
    const ap = result.assistantPlaceholder as Record<string, unknown>
    expect(ap.content).toBe("")
  })

  it("converts non-string assistantPlaceholder content to string", () => {
    const raw = {
      session: validSession(),
      patientMessage: validMessageItem(),
      assistantPlaceholder: {
        id: "tl-2",
        sessionId: "sess-1",
        createdAt: iso(),
        status: "streaming",
        kind: "message",
        role: "assistant",
        content: 123,
      },
    }
    const result = normalizeSendMessageResult(raw) as Record<string, unknown>
    const ap = result.assistantPlaceholder as Record<string, unknown>
    expect(ap.content).toBe("123")
  })

  it("does not modify non-message assistantPlaceholder", () => {
    const raw = {
      session: validSession(),
      patientMessage: validMessageItem(),
      assistantPlaceholder: {
        id: "tl-2",
        sessionId: "sess-1",
        createdAt: iso(),
        status: "done",
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
      },
    }
    const result = normalizeSendMessageResult(raw) as Record<string, unknown>
    const ap = result.assistantPlaceholder as Record<string, unknown>
    expect((ap as any).kind).toBe("flow_card")
  })

  it("does not modify assistantPlaceholder that is not an object", () => {
    const raw = {
      session: validSession(),
      patientMessage: validMessageItem(),
      assistantPlaceholder: "string_placeholder",
    }
    const result = normalizeSendMessageResult(raw) as Record<string, unknown>
    expect(result.assistantPlaceholder).toBe("string_placeholder")
  })
})

// ---------------------------------------------------------------------------
// parse / safeParse helper functions
// ---------------------------------------------------------------------------
describe("parseSuspendVisitResult", () => {
  it("returns parsed result on valid input", () => {
    const result = parseSuspendVisitResult({
      session: validSession(),
      timelineItem: validMessageItem(),
    })
    expect(result.session.id).toBe("sess-1")
  })

  it("throws on invalid input", () => {
    expect(() =>
      parseSuspendVisitResult({ session: { id: "sess-1" }, timelineItem: {} }),
    ).toThrow()
  })
})

describe("safeParseSuspendVisitResult", () => {
  it("returns success on valid input", () => {
    const result = safeParseSuspendVisitResult({
      session: validSession(),
      timelineItem: validMessageItem(),
    })
    expect(result.success).toBe(true)
  })

  it("returns failure on invalid input", () => {
    const result = safeParseSuspendVisitResult({
      session: { id: "sess-1" },
      timelineItem: {},
    })
    expect(result.success).toBe(false)
  })
})

describe("parseDismissEmergencyResult", () => {
  it("parses valid input", () => {
    const result = parseDismissEmergencyResult({
      session: validSession(),
      timelineItem: validMessageItem(),
    })
    expect(result.session.id).toBe("sess-1")
  })
})

describe("safeParseDismissEmergencyResult", () => {
  it("returns success on valid input", () => {
    const result = safeParseDismissEmergencyResult({
      session: validSession(),
      timelineItem: validMessageItem(),
    })
    expect(result.success).toBe(true)
  })
})

describe("parseListTimelineResult", () => {
  it("parses valid input", () => {
    const result = parseListTimelineResult({
      items: [validMessageItem()],
      hasMore: false,
    })
    expect(result.items).toHaveLength(1)
  })
})

describe("safeParseListTimelineResult", () => {
  it("returns success on valid input", () => {
    const result = safeParseListTimelineResult({
      items: [validMessageItem()],
      hasMore: false,
    })
    expect(result.success).toBe(true)
  })
})

describe("parseSendMessageResult", () => {
  it("parses valid input (includes normalize)", () => {
    const result = parseSendMessageResult({
      session: validSession(),
      patientMessage: validMessageItem(),
    })
    expect(result.session.id).toBe("sess-1")
  })

  it("normalizes null assistantPlaceholder content before parsing", () => {
    const result = parseSendMessageResult({
      session: validSession(),
      patientMessage: validMessageItem(),
      assistantPlaceholder: validMessageItem({
        role: "assistant",
        content: null,
        kind: "message",
      }),
    })
    expect(result.assistantPlaceholder?.content).toBe("")
  })
})

describe("safeParseSendMessageResult", () => {
  it("returns success on valid input", () => {
    const result = safeParseSendMessageResult({
      session: validSession(),
      patientMessage: validMessageItem(),
    })
    expect(result.success).toBe(true)
  })

  it("normalizes before parsing", () => {
    const result = safeParseSendMessageResult({
      session: validSession(),
      patientMessage: validMessageItem(),
      assistantPlaceholder: validMessageItem({
        role: "assistant",
        content: undefined,
        kind: "message",
      }),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.assistantPlaceholder?.content).toBe("")
    }
  })
})

describe("parseFlowActionResult", () => {
  it("parses valid input", () => {
    const result = parseFlowActionResult({
      sessionId: "sess-1",
      status: "chatting",
      timelineItems: [],
    })
    expect(result.sessionId).toBe("sess-1")
  })
})

describe("safeParseFlowActionResult", () => {
  it("returns success on valid input", () => {
    const result = safeParseFlowActionResult({
      sessionId: "sess-1",
      status: "chatting",
      timelineItems: [],
    })
    expect(result.success).toBe(true)
  })
})

describe("parseExitSettlementResult", () => {
  it("parses valid input", () => {
    const result = parseExitSettlementResult({
      sessionId: "sess-1",
      terminalReason: "exited",
      refundAmount: 0,
      payableAmount: 0,
      timelineItem: validMessageItem({ kind: "terminal", reason: "exited", title: "End" }),
    })
    expect(result.sessionId).toBe("sess-1")
  })
})

describe("safeParseExitSettlementResult", () => {
  it("returns success on valid input", () => {
    const result = safeParseExitSettlementResult({
      sessionId: "sess-1",
      terminalReason: "exited",
      refundAmount: 0,
      payableAmount: 0,
      timelineItem: validMessageItem({ kind: "terminal", reason: "exited", title: "End" }),
    })
    expect(result.success).toBe(true)
  })
})
