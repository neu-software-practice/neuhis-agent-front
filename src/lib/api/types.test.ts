import { describe, expect, it } from "vitest"

import {
  apiErrorSchema,
  patientIdSchema,
  sessionIdSchema,
  timelineItemIdSchema,
  flowCardIdSchema,
  visitEntryTypeSchema,
  visitStatusSchema,
  visitMachineStateSchema,
  terminalReasonSchema,
  paymentStatusSchema,
  pageResultSchema,
} from "@/lib/api/types"
import { z } from "zod"

describe("apiErrorSchema", () => {
  it("accepts a minimal valid error (code + message)", () => {
    const result = apiErrorSchema.safeParse({
      code: "SOME_ERROR",
      message: "Something went wrong",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a full error with all optional fields", () => {
    const result = apiErrorSchema.safeParse({
      code: "HTTP_500",
      message: "Server error",
      status: 500,
      details: { field: "value" },
      retriable: true,
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty code", () => {
    const result = apiErrorSchema.safeParse({
      code: "",
      message: "msg",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty message", () => {
    const result = apiErrorSchema.safeParse({
      code: "CODE",
      message: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-integer status", () => {
    const result = apiErrorSchema.safeParse({
      code: "CODE",
      message: "msg",
      status: 500.5,
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-positive status", () => {
    const result = apiErrorSchema.safeParse({
      code: "CODE",
      message: "msg",
      status: 0,
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing code", () => {
    const result = apiErrorSchema.safeParse({ message: "msg" })
    expect(result.success).toBe(false)
  })

  it("rejects missing message", () => {
    const result = apiErrorSchema.safeParse({ code: "CODE" })
    expect(result.success).toBe(false)
  })
})

describe("patientIdSchema", () => {
  it("accepts a non-empty string", () => {
    expect(patientIdSchema.safeParse("patient-123").success).toBe(true)
  })

  it("rejects an empty string", () => {
    expect(patientIdSchema.safeParse("").success).toBe(false)
  })

  it("trims whitespace before validation", () => {
    expect(patientIdSchema.safeParse("   ").success).toBe(false)
  })

  it("accepts a string with content after trimming", () => {
    expect(patientIdSchema.safeParse("  abc  ").success).toBe(true)
  })
})

describe("sessionIdSchema", () => {
  it("accepts a non-empty string", () => {
    expect(sessionIdSchema.safeParse("session-abc").success).toBe(true)
  })

  it("rejects an empty string", () => {
    expect(sessionIdSchema.safeParse("").success).toBe(false)
  })
})

describe("timelineItemIdSchema", () => {
  it("accepts a non-empty string", () => {
    expect(timelineItemIdSchema.safeParse("tl-1").success).toBe(true)
  })

  it("rejects an empty string", () => {
    expect(timelineItemIdSchema.safeParse("").success).toBe(false)
  })
})

describe("flowCardIdSchema", () => {
  it("accepts a non-empty string", () => {
    expect(flowCardIdSchema.safeParse("card-1").success).toBe(true)
  })

  it("rejects an empty string", () => {
    expect(flowCardIdSchema.safeParse("").success).toBe(false)
  })
})

describe("visitEntryTypeSchema", () => {
  it("accepts 'new'", () => {
    expect(visitEntryTypeSchema.safeParse("new").success).toBe(true)
  })

  it("accepts 'follow_up'", () => {
    expect(visitEntryTypeSchema.safeParse("follow_up").success).toBe(true)
  })

  it("rejects an invalid value", () => {
    expect(visitEntryTypeSchema.safeParse("invalid").success).toBe(false)
  })
})

describe("visitStatusSchema", () => {
  const validStatuses = [
    "loading_context",
    "chatting",
    "analyzing",
    "blocked",
    "diagnosis",
    "treatment",
    "completed",
    "suspended",
    "transferred",
    "emergency_terminated",
    "exited",
  ]

  it.each(validStatuses)("accepts '%s'", (status) => {
    expect(visitStatusSchema.safeParse(status).success).toBe(true)
  })

  it("rejects an unknown status", () => {
    expect(visitStatusSchema.safeParse("unknown_status").success).toBe(false)
  })
})

describe("visitMachineStateSchema", () => {
  const validStates = [
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
    "suspended",
    "emergencyPending",
    "terminated",
    "exitSettlement",
    "exited",
  ]

  it.each(validStates)("accepts '%s'", (state) => {
    expect(visitMachineStateSchema.safeParse(state).success).toBe(true)
  })

  it("rejects an unknown state", () => {
    expect(visitMachineStateSchema.safeParse("unknownState").success).toBe(false)
  })
})

describe("terminalReasonSchema", () => {
  const validReasons = [
    "emergency",
    "timeout",
    "ask_limit_reached",
    "lab_limit_reached",
    "referral",
    "capability_insufficient",
    "exited",
    "patient_request",
  ]

  it.each(validReasons)("accepts '%s'", (reason) => {
    expect(terminalReasonSchema.safeParse(reason).success).toBe(true)
  })

  it("rejects an unknown reason", () => {
    expect(terminalReasonSchema.safeParse("unknown_reason").success).toBe(false)
  })
})

describe("paymentStatusSchema", () => {
  const validStatuses = ["unpaid", "pending", "paid", "failed", "refunded"]

  it.each(validStatuses)("accepts '%s'", (status) => {
    expect(paymentStatusSchema.safeParse(status).success).toBe(true)
  })

  it("rejects an unknown status", () => {
    expect(paymentStatusSchema.safeParse("unknown").success).toBe(false)
  })
})

describe("pageResultSchema", () => {
  const stringPageSchema = pageResultSchema(z.string())

  it("accepts a valid page result with items", () => {
    const result = stringPageSchema.safeParse({
      items: ["a", "b"],
      hasMore: true,
      nextCursor: "cursor-1",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a page result without nextCursor", () => {
    const result = stringPageSchema.safeParse({
      items: ["a"],
      hasMore: false,
    })
    expect(result.success).toBe(true)
  })

  it("defaults null items to empty array", () => {
    const result = stringPageSchema.safeParse({
      items: null,
      hasMore: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toEqual([])
    }
  })

  it("defaults missing items to empty array", () => {
    const result = stringPageSchema.safeParse({
      hasMore: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toEqual([])
    }
  })

  it("rejects non-boolean hasMore", () => {
    const result = stringPageSchema.safeParse({
      items: [],
      hasMore: "yes",
    })
    expect(result.success).toBe(false)
  })

  it("rejects items with wrong element type", () => {
    const result = stringPageSchema.safeParse({
      items: [123, 456],
      hasMore: false,
    })
    expect(result.success).toBe(false)
  })

  it("works with object item schemas", () => {
    const objSchema = z.object({ id: z.string() })
    const objPageSchema = pageResultSchema(objSchema)

    const result = objPageSchema.safeParse({
      items: [{ id: "1" }, { id: "2" }],
      hasMore: false,
    })
    expect(result.success).toBe(true)
  })
})
