import { beforeEach, describe, expect, it } from "vitest"

import { mockDb } from "@/mocks/api/mock-db"
import { handleListBillingRecords } from "@/mocks/api/handlers/billing-handlers"

describe("billing handlers", () => {
  beforeEach(() => {
    mockDb.reset()
  })

  describe("handleListBillingRecords", () => {
    it("returns billing records", () => {
      const result = handleListBillingRecords()
      expect(result.items).toBeDefined()
    })

    it("returns records with payment purpose", () => {
      const result = handleListBillingRecords()
      for (const record of result.items) {
        expect(record.purpose).toMatch(/^(lab|medication)$/)
        expect(record.totalAmount).toBeGreaterThan(0)
      }
    })
  })
})
