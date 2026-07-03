import { beforeEach, describe, expect, it, vi } from "vitest"

import { getTransport } from "@/lib/api"

import { medicalOrdersApi } from "@/features/medical-orders/api"

vi.mock("@/lib/api", () => ({
  getTransport: vi.fn(),
}))

describe("medicalOrdersApi", () => {
  const mockTransport = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    stream: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getTransport as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockTransport,
    )
  })

  describe("listRecords", () => {
    it("calls GET /medical-orders and returns parsed result", async () => {
      const response = {
        items: [
          {
            recordId: "mo-1",
            sessionId: "session-1",
            sessionTitle: "头痛问诊",
            kind: "medication" as const,
            medications: [
              {
                name: "布洛芬",
                spec: "0.3g*24片",
                quantity: 1,
                dosage: "1片/次",
                days: 3,
                price: 15.5,
              },
            ],
            fulfillmentStatus: "confirmed" as const,
            handledAt: "2026-01-01T01:00:00Z",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
      }
      mockTransport.get.mockResolvedValue(response)

      const result = await medicalOrdersApi.listRecords()

      expect(mockTransport.get).toHaveBeenCalledWith("/medical-orders")
      expect(mockTransport.get).toHaveBeenCalledTimes(1)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].recordId).toBe("mo-1")
    })

    it("returns empty items array when no records", async () => {
      const response = { items: [] }
      mockTransport.get.mockResolvedValue(response)

      const result = await medicalOrdersApi.listRecords()

      expect(result.items).toEqual([])
    })

    it("propagates transport errors", async () => {
      mockTransport.get.mockRejectedValue(new Error("Server error"))

      await expect(
        medicalOrdersApi.listRecords(),
      ).rejects.toThrow("Server error")
    })
  })
})
