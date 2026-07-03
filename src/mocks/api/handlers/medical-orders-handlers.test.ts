import { beforeEach, describe, expect, it } from "vitest"

import { mockDb } from "@/mocks/api/mock-db"
import { handleListMedicalOrders } from "@/mocks/api/handlers/medical-orders-handlers"

describe("medical-orders handlers", () => {
  beforeEach(() => {
    mockDb.reset()
  })

  describe("handleListMedicalOrders", () => {
    it("returns medical orders", () => {
      const result = handleListMedicalOrders()
      expect(result.items).toBeDefined()
    })

    it("returns orders with valid kind", () => {
      const result = handleListMedicalOrders()
      for (const record of result.items) {
        expect(record.kind).toMatch(/^(advice|medication)$/)
      }
    })
  })
})
