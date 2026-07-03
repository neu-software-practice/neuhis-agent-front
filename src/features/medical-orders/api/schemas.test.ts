import { describe, expect, it } from "vitest"

import {
  medicalOrderKindSchema,
  medicationItemSchema,
  medicalOrderRecordSchema,
  deliveryAddressSummarySchema,
  listMedicalOrdersResultSchema,
  parseMedicalOrderRecord,
  parseListMedicalOrdersResult,
} from "@/features/medical-orders/api/schemas"

describe("medicalOrderKindSchema", () => {
  it("accepts 'advice'", () => {
    expect(medicalOrderKindSchema.safeParse("advice").success).toBe(true)
  })

  it("accepts 'medication'", () => {
    expect(medicalOrderKindSchema.safeParse("medication").success).toBe(true)
  })

  it("rejects an invalid kind", () => {
    expect(medicalOrderKindSchema.safeParse("surgery").success).toBe(false)
  })
})

describe("medicationItemSchema", () => {
  function validMedication() {
    return {
      name: "布洛芬",
      spec: "0.2g*24片",
      quantity: 1,
      dosage: "每次1片，每日3次",
      days: 3,
      price: 25.5,
    }
  }

  it("accepts a valid medication item", () => {
    expect(medicationItemSchema.safeParse(validMedication()).success).toBe(true)
  })

  it("rejects a non-positive quantity", () => {
    const result = medicationItemSchema.safeParse({ ...validMedication(), quantity: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects a non-integer quantity", () => {
    const result = medicationItemSchema.safeParse({ ...validMedication(), quantity: 1.5 })
    expect(result.success).toBe(false)
  })

  it("rejects a negative days", () => {
    const result = medicationItemSchema.safeParse({ ...validMedication(), days: -1 })
    expect(result.success).toBe(false)
  })

  it("rejects a negative price", () => {
    const result = medicationItemSchema.safeParse({ ...validMedication(), price: -5 })
    expect(result.success).toBe(false)
  })

  it("rejects an empty name", () => {
    const result = medicationItemSchema.safeParse({ ...validMedication(), name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects an empty spec", () => {
    const result = medicationItemSchema.safeParse({ ...validMedication(), spec: "" })
    expect(result.success).toBe(false)
  })

  it("rejects an empty dosage", () => {
    const result = medicationItemSchema.safeParse({ ...validMedication(), dosage: "" })
    expect(result.success).toBe(false)
  })
})

describe("deliveryAddressSummarySchema", () => {
  it("accepts a valid delivery address", () => {
    const result = deliveryAddressSummarySchema.safeParse({
      name: "张三",
      phone: "13800138000",
      fullAddress: "北京市海淀区中关村大街1号",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an empty fullAddress", () => {
    const result = deliveryAddressSummarySchema.safeParse({
      name: "张三",
      phone: "13800138000",
      fullAddress: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing required fields", () => {
    expect(deliveryAddressSummarySchema.safeParse({ name: "张三" }).success).toBe(false)
  })
})

describe("medicalOrderRecordSchema", () => {
  function validAdviceRecord() {
    return {
      recordId: "order-1",
      sessionId: "visit-1",
      sessionTitle: "头痛问诊",
      kind: "advice" as const,
      advices: ["多休息", "避免劳累"],
      watchItems: ["若头痛加重及时就医"],
      followUpRecommendation: "一周后复诊",
      handledAt: "2025-01-01T00:00:00.000Z",
      createdAt: "2025-01-01T00:00:00.000Z",
    }
  }

  function validMedicationRecord() {
    return {
      recordId: "order-2",
      sessionId: "visit-1",
      sessionTitle: "头痛问诊",
      kind: "medication" as const,
      medications: [
        {
          name: "布洛芬",
          spec: "0.2g*24片",
          quantity: 1,
          dosage: "每次1片",
          days: 3,
          price: 25.5,
        },
      ],
      fulfillmentStatus: "pending" as const,
      deliveryAddress: {
        name: "张三",
        phone: "13800138000",
        fullAddress: "北京市海淀区中关村大街1号",
      },
      handledAt: "2025-01-01T00:00:00.000Z",
      createdAt: "2025-01-01T00:00:00.000Z",
    }
  }

  it("accepts a valid advice record", () => {
    expect(medicalOrderRecordSchema.safeParse(validAdviceRecord()).success).toBe(true)
  })

  it("accepts a valid medication record", () => {
    expect(medicalOrderRecordSchema.safeParse(validMedicationRecord()).success).toBe(true)
  })

  it("accepts a record with only required fields", () => {
    const result = medicalOrderRecordSchema.safeParse({
      recordId: "order-3",
      sessionId: "visit-1",
      sessionTitle: "问诊",
      kind: "advice",
      handledAt: "2025-01-01T00:00:00.000Z",
      createdAt: "2025-01-01T00:00:00.000Z",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a medication record without optional fulfillmentStatus", () => {
    const data = validMedicationRecord()
    delete (data as Record<string, unknown>).fulfillmentStatus
    expect(medicalOrderRecordSchema.safeParse(data).success).toBe(true)
  })

  it("accepts a medication record without optional deliveryAddress", () => {
    const data = validMedicationRecord()
    delete (data as Record<string, unknown>).deliveryAddress
    expect(medicalOrderRecordSchema.safeParse(data).success).toBe(true)
  })

  it("rejects an invalid kind", () => {
    const result = medicalOrderRecordSchema.safeParse({
      ...validAdviceRecord(),
      kind: "invalid",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an empty advices string in array", () => {
    const result = medicalOrderRecordSchema.safeParse({
      ...validAdviceRecord(),
      advices: [""],
    })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid fulfillmentStatus enum", () => {
    const result = medicalOrderRecordSchema.safeParse({
      ...validMedicationRecord(),
      fulfillmentStatus: "shipped",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid handledAt datetime", () => {
    const result = medicalOrderRecordSchema.safeParse({
      ...validAdviceRecord(),
      handledAt: "not-a-date",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing required recordId", () => {
    const data = validAdviceRecord()
    delete (data as Record<string, unknown>).recordId
    expect(medicalOrderRecordSchema.safeParse(data).success).toBe(false)
  })
})

describe("listMedicalOrdersResultSchema", () => {
  it("accepts a valid list result", () => {
    const result = listMedicalOrdersResultSchema.safeParse({
      items: [
        {
          recordId: "order-1",
          sessionId: "visit-1",
          sessionTitle: "问诊",
          kind: "advice",
          handledAt: "2025-01-01T00:00:00.000Z",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("accepts an empty items array", () => {
    const result = listMedicalOrdersResultSchema.safeParse({ items: [] })
    expect(result.success).toBe(true)
  })

  it("rejects missing items field", () => {
    expect(listMedicalOrdersResultSchema.safeParse({}).success).toBe(false)
  })

  it("rejects an invalid record in items", () => {
    const result = listMedicalOrdersResultSchema.safeParse({
      items: [{ kind: "invalid" }],
    })
    expect(result.success).toBe(false)
  })
})

describe("parse / safeParse helpers", () => {
  it("parseMedicalOrderRecord returns parsed data on valid input", () => {
    const result = parseMedicalOrderRecord({
      recordId: "order-1",
      sessionId: "visit-1",
      sessionTitle: "问诊",
      kind: "advice",
      handledAt: "2025-01-01T00:00:00.000Z",
      createdAt: "2025-01-01T00:00:00.000Z",
    })
    expect(result.recordId).toBe("order-1")
  })

  it("parseMedicalOrderRecord throws on invalid input", () => {
    expect(() => parseMedicalOrderRecord({})).toThrow()
  })

  it("parseListMedicalOrdersResult returns parsed data on valid input", () => {
    const result = parseListMedicalOrdersResult({ items: [] })
    expect(result.items).toEqual([])
  })

  it("parseListMedicalOrdersResult throws on invalid input", () => {
    expect(() => parseListMedicalOrdersResult({})).toThrow()
  })
})
