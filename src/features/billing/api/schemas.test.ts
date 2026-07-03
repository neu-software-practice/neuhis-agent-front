import { describe, expect, it } from "vitest"

import {
  billingRecordSchema,
  listBillingRecordsResultSchema,
  parseBillingRecord,
  parseListBillingRecordsResult,
} from "@/features/billing/api/schemas"

function validBillingRecord() {
  return {
    paymentId: "pay-1",
    sessionId: "visit-1",
    sessionTitle: "头痛问诊",
    purpose: "lab" as const,
    items: [
      { name: "血常规", amount: 50, quantity: 1 },
      { name: "尿常规", amount: 30 },
    ],
    totalAmount: 80,
    insuranceAmount: 60,
    selfPayAmount: 20,
    paymentStatus: "paid" as const,
    createdAt: "2025-01-01T00:00:00.000Z",
  }
}

describe("billingRecordSchema", () => {
  it("accepts a fully valid billing record", () => {
    expect(billingRecordSchema.safeParse(validBillingRecord()).success).toBe(true)
  })

  it("accepts a medication purpose record", () => {
    const result = billingRecordSchema.safeParse({
      ...validBillingRecord(),
      purpose: "medication",
      items: [{ name: "布洛芬", amount: 25.5, quantity: 2 }],
      totalAmount: 25.5,
      insuranceAmount: 0,
      selfPayAmount: 25.5,
      paymentStatus: "unpaid",
    })
    expect(result.success).toBe(true)
  })

  it("accepts items without optional quantity", () => {
    const data = validBillingRecord()
    data.items = [{ name: "血常规", amount: 50 }]
    expect(billingRecordSchema.safeParse(data).success).toBe(true)
  })

  it("rejects an invalid purpose enum", () => {
    const result = billingRecordSchema.safeParse({
      ...validBillingRecord(),
      purpose: "invalid",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid paymentStatus enum", () => {
    const result = billingRecordSchema.safeParse({
      ...validBillingRecord(),
      paymentStatus: "unknown",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a negative totalAmount", () => {
    const result = billingRecordSchema.safeParse({
      ...validBillingRecord(),
      totalAmount: -1,
    })
    expect(result.success).toBe(false)
  })

  it("rejects a negative item amount", () => {
    const data = validBillingRecord()
    data.items = [{ name: "血常规", amount: -10 }]
    expect(billingRecordSchema.safeParse(data).success).toBe(false)
  })

  it("rejects a non-positive item quantity", () => {
    const data = validBillingRecord()
    data.items = [{ name: "血常规", amount: 50, quantity: 0 }]
    expect(billingRecordSchema.safeParse(data).success).toBe(false)
  })

  it("rejects an empty paymentId", () => {
    const result = billingRecordSchema.safeParse({
      ...validBillingRecord(),
      paymentId: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid createdAt datetime", () => {
    const result = billingRecordSchema.safeParse({
      ...validBillingRecord(),
      createdAt: "not-a-date",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing required fields", () => {
    expect(billingRecordSchema.safeParse({}).success).toBe(false)
  })
})

describe("listBillingRecordsResultSchema", () => {
  it("accepts a valid list result", () => {
    const result = listBillingRecordsResultSchema.safeParse({
      items: [validBillingRecord()],
    })
    expect(result.success).toBe(true)
  })

  it("accepts an empty items array", () => {
    const result = listBillingRecordsResultSchema.safeParse({ items: [] })
    expect(result.success).toBe(true)
  })

  it("rejects missing items field", () => {
    expect(listBillingRecordsResultSchema.safeParse({}).success).toBe(false)
  })

  it("rejects an invalid record in items", () => {
    const result = listBillingRecordsResultSchema.safeParse({
      items: [{ ...validBillingRecord(), paymentStatus: "invalid" }],
    })
    expect(result.success).toBe(false)
  })
})

describe("parseBillingRecord / parseListBillingRecordsResult", () => {
  it("parseBillingRecord returns parsed data on valid input", () => {
    const result = parseBillingRecord(validBillingRecord())
    expect(result.paymentId).toBe("pay-1")
    expect(result.items).toHaveLength(2)
  })

  it("parseBillingRecord throws on invalid input", () => {
    expect(() => parseBillingRecord({})).toThrow()
  })

  it("parseListBillingRecordsResult returns parsed data on valid input", () => {
    const result = parseListBillingRecordsResult({ items: [validBillingRecord()] })
    expect(result.items).toHaveLength(1)
  })

  it("parseListBillingRecordsResult throws on invalid input", () => {
    expect(() => parseListBillingRecordsResult({})).toThrow()
  })
})
