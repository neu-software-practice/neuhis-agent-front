import { describe, expect, it } from "vitest"

import {
  createFollowUpInputSchema,
  createSessionInputSchema,
  createSessionResultSchema,
  generateTitleInputSchema,
  generateTitleResultSchema,
  listSessionsInputSchema,
  listSessionsResultSchema,
  parseCreateSessionResult,
  parseGenerateTitleResult,
  parseListSessionsResult,
  parseVisitSession,
  parseVisitSnapshot,
  safeParseCreateSessionResult,
  safeParseGenerateTitleResult,
  safeParseListSessionsResult,
  safeParseVisitSession,
  safeParseVisitSnapshot,
  visitSessionSchema,
  visitSessionSummarySchema,
  visitSnapshotSchema,
  visitSummarySchema,
} from "@/features/visits/api/schemas"

function validSummary() {
  return {
    title: "头痛问诊",
    chiefComplaint: "头痛三天",
    diagnosis: "偏头痛",
    treatmentSummary: "药物治疗",
    lastMessage: "注意休息",
  }
}

function validSessionBase(overrides: Record<string, unknown> = {}) {
  return {
    id: "visit-1",
    patientId: "patient-1",
    patientName: "张三",
    entryType: "new" as const,
    status: "chatting" as const,
    startedAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    askRound: 1,
    askRoundLimit: 10,
    labRound: 0,
    labRoundLimit: 3,
    timerPaused: false,
    summary: validSummary(),
    ...overrides,
  }
}

describe("visitSummarySchema", () => {
  it("accepts a fully populated summary", () => {
    expect(visitSummarySchema.safeParse(validSummary()).success).toBe(true)
  })

  it("accepts an empty object since all fields are optional", () => {
    expect(visitSummarySchema.safeParse({}).success).toBe(true)
  })
})

describe("visitSessionSchema", () => {
  it("accepts a valid new session", () => {
    expect(visitSessionSchema.safeParse(validSessionBase()).success).toBe(true)
  })

  it("accepts a session with optional fields", () => {
    const result = visitSessionSchema.safeParse(
      validSessionBase({
        endedAt: "2025-01-02T00:00:00.000Z",
        timeoutAt: "2025-01-01T01:00:00.000Z",
        lastActivityAt: "2025-01-01T00:30:00.000Z",
        pausedAt: "2025-01-01T00:15:00.000Z",
        terminalReason: "exited",
        activeCardId: "card-1",
      }),
    )
    expect(result.success).toBe(true)
  })

  it("accepts a follow_up session with parentSessionId", () => {
    const result = visitSessionSchema.safeParse(
      validSessionBase({
        entryType: "follow_up",
        parentSessionId: "visit-0",
      }),
    )
    expect(result.success).toBe(true)
  })

  it("rejects a new entry session with a parentSessionId", () => {
    const result = visitSessionSchema.safeParse(
      validSessionBase({ parentSessionId: "visit-0" }),
    )
    expect(result.success).toBe(false)
  })

  it("rejects a blocked session without activeCardId", () => {
    const result = visitSessionSchema.safeParse(
      validSessionBase({ status: "blocked" }),
    )
    expect(result.success).toBe(false)
  })

  it("accepts a blocked session with activeCardId", () => {
    const result = visitSessionSchema.safeParse(
      validSessionBase({ status: "blocked", activeCardId: "card-1" }),
    )
    expect(result.success).toBe(true)
  })

  it("rejects a negative askRound", () => {
    const result = visitSessionSchema.safeParse(
      validSessionBase({ askRound: -1 }),
    )
    expect(result.success).toBe(false)
  })

  it("rejects a non-positive askRoundLimit", () => {
    const result = visitSessionSchema.safeParse(
      validSessionBase({ askRoundLimit: 0 }),
    )
    expect(result.success).toBe(false)
  })

  it("rejects an invalid status enum", () => {
    const result = visitSessionSchema.safeParse(
      validSessionBase({ status: "invalid_status" }),
    )
    expect(result.success).toBe(false)
  })

  it("rejects an invalid datetime for startedAt", () => {
    const result = visitSessionSchema.safeParse(
      validSessionBase({ startedAt: "not-a-date" }),
    )
    expect(result.success).toBe(false)
  })
})

describe("visitSessionSummarySchema", () => {
  it("accepts a valid summary session", () => {
    const result = visitSessionSummarySchema.safeParse(validSessionBase())
    expect(result.success).toBe(true)
  })

  it("picks only the expected fields", () => {
    const result = visitSessionSummarySchema.safeParse(validSessionBase())
    if (result.success) {
      expect(Object.keys(result.data)).toEqual(
        expect.arrayContaining([
          "id",
          "patientId",
          "patientName",
          "entryType",
          "status",
          "startedAt",
          "updatedAt",
          "summary",
        ]),
      )
      expect(result.data).not.toHaveProperty("timerPaused")
      expect(result.data).not.toHaveProperty("askRound")
    }
  })
})

describe("listSessionsInputSchema", () => {
  it("accepts an empty input with defaults", () => {
    const result = listSessionsInputSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pageSize).toBe(20)
    }
  })

  it("accepts a fully specified input", () => {
    const result = listSessionsInputSchema.safeParse({
      patientId: "patient-1",
      status: "completed",
      cursor: "cursor-token",
      pageSize: 10,
    })
    expect(result.success).toBe(true)
  })

  it("rejects pageSize below 1", () => {
    const result = listSessionsInputSchema.safeParse({ pageSize: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects pageSize above 50", () => {
    const result = listSessionsInputSchema.safeParse({ pageSize: 51 })
    expect(result.success).toBe(false)
  })
})

describe("listSessionsResultSchema", () => {
  it("accepts a valid page result", () => {
    const result = listSessionsResultSchema.safeParse({
      items: [validSessionBase()],
      nextCursor: "next",
      hasMore: true,
    })
    expect(result.success).toBe(true)
  })

  it("accepts null items and transforms to empty array", () => {
    const result = listSessionsResultSchema.safeParse({
      items: null,
      hasMore: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toEqual([])
    }
  })

  it("rejects missing hasMore", () => {
    expect(listSessionsResultSchema.safeParse({ items: [] }).success).toBe(false)
  })
})

describe("createSessionInputSchema", () => {
  it("accepts a valid new session input", () => {
    const result = createSessionInputSchema.safeParse({
      patientId: "patient-1",
      entryType: "new",
      chiefComplaint: "头痛",
    })
    expect(result.success).toBe(true)
  })

  it("accepts input without optional chiefComplaint", () => {
    const result = createSessionInputSchema.safeParse({
      patientId: "patient-1",
      entryType: "new",
    })
    expect(result.success).toBe(true)
  })

  it("rejects entryType other than 'new'", () => {
    const result = createSessionInputSchema.safeParse({
      patientId: "patient-1",
      entryType: "follow_up",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an empty chiefComplaint", () => {
    const result = createSessionInputSchema.safeParse({
      patientId: "patient-1",
      entryType: "new",
      chiefComplaint: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects chiefComplaint exceeding 2000 characters", () => {
    const result = createSessionInputSchema.safeParse({
      patientId: "patient-1",
      entryType: "new",
      chiefComplaint: "a".repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it("rejects unknown strict fields", () => {
    const result = createSessionInputSchema.safeParse({
      patientId: "patient-1",
      entryType: "new",
      extraField: "not-allowed",
    })
    expect(result.success).toBe(false)
  })
})

describe("createFollowUpInputSchema", () => {
  it("accepts a valid follow-up input", () => {
    const result = createFollowUpInputSchema.safeParse({
      patientId: "patient-1",
      parentSessionId: "visit-0",
      chiefComplaint: "复查",
    })
    expect(result.success).toBe(true)
  })

  it("accepts input without optional chiefComplaint", () => {
    const result = createFollowUpInputSchema.safeParse({
      patientId: "patient-1",
      parentSessionId: "visit-0",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing parentSessionId", () => {
    const result = createFollowUpInputSchema.safeParse({
      patientId: "patient-1",
    })
    expect(result.success).toBe(false)
  })
})

describe("createSessionResultSchema", () => {
  it("accepts a valid result", () => {
    const result = createSessionResultSchema.safeParse({
      session: validSessionBase(),
      initialTimeline: [],
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing session", () => {
    expect(createSessionResultSchema.safeParse({ initialTimeline: [] }).success).toBe(false)
  })
})

describe("visitSnapshotSchema", () => {
  it("accepts a valid snapshot", () => {
    const result = visitSnapshotSchema.safeParse({
      session: validSessionBase(),
      timeline: [],
      readonly: true,
      terminalReason: "exited",
    })
    expect(result.success).toBe(true)
  })

  it("rejects readonly value other than true", () => {
    const result = visitSnapshotSchema.safeParse({
      session: validSessionBase(),
      timeline: [],
      readonly: false,
    })
    expect(result.success).toBe(false)
  })

  it("accepts snapshot without optional terminalReason", () => {
    const result = visitSnapshotSchema.safeParse({
      session: validSessionBase(),
      timeline: [],
      readonly: true,
    })
    expect(result.success).toBe(true)
  })
})

describe("generateTitleInputSchema", () => {
  it("accepts a valid input", () => {
    expect(generateTitleInputSchema.safeParse({ sessionId: "visit-1" }).success).toBe(true)
  })

  it("rejects missing sessionId", () => {
    expect(generateTitleInputSchema.safeParse({}).success).toBe(false)
  })
})

describe("generateTitleResultSchema", () => {
  it("accepts a valid result", () => {
    const result = generateTitleResultSchema.safeParse({
      sessionId: "visit-1",
      title: "头痛问诊",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an empty title", () => {
    const result = generateTitleResultSchema.safeParse({
      sessionId: "visit-1",
      title: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a title longer than 50 characters", () => {
    const result = generateTitleResultSchema.safeParse({
      sessionId: "visit-1",
      title: "a".repeat(51),
    })
    expect(result.success).toBe(false)
  })
})

describe("parse / safeParse helpers", () => {
  it("parseVisitSession returns parsed data on valid input", () => {
    const result = parseVisitSession(validSessionBase())
    expect(result.id).toBe("visit-1")
  })

  it("parseVisitSession throws on invalid input", () => {
    expect(() => parseVisitSession({})).toThrow()
  })

  it("safeParseVisitSession returns success false on invalid input", () => {
    expect(safeParseVisitSession({}).success).toBe(false)
  })

  it("parseListSessionsResult returns parsed data on valid input", () => {
    const result = parseListSessionsResult({ items: [], hasMore: false })
    expect(result.items).toEqual([])
  })

  it("safeParseListSessionsResult returns success false on invalid input", () => {
    expect(safeParseListSessionsResult({}).success).toBe(false)
  })

  it("parseCreateSessionResult returns parsed data on valid input", () => {
    const result = parseCreateSessionResult({
      session: validSessionBase(),
      initialTimeline: [],
    })
    expect(result.session.id).toBe("visit-1")
  })

  it("safeParseCreateSessionResult returns success false on invalid input", () => {
    expect(safeParseCreateSessionResult({}).success).toBe(false)
  })

  it("parseVisitSnapshot returns parsed data on valid input", () => {
    const result = parseVisitSnapshot({
      session: validSessionBase(),
      timeline: [],
      readonly: true,
    })
    expect(result.readonly).toBe(true)
  })

  it("safeParseVisitSnapshot returns success false on invalid input", () => {
    expect(safeParseVisitSnapshot({}).success).toBe(false)
  })

  it("parseGenerateTitleResult returns parsed data on valid input", () => {
    const result = parseGenerateTitleResult({
      sessionId: "visit-1",
      title: "头痛",
    })
    expect(result.title).toBe("头痛")
  })

  it("safeParseGenerateTitleResult returns success false on invalid input", () => {
    expect(safeParseGenerateTitleResult({}).success).toBe(false)
  })
})
