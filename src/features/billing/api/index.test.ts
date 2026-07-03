import { beforeEach, describe, expect, it, vi } from "vitest"

import { getTransport } from "@/lib/api"

import { billingApi } from "@/features/billing/api"

vi.mock("@/lib/api", () => ({
  getTransport: vi.fn(),
}))

describe("billingApi", () => {
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
    it("calls GET /billing/records and returns parsed result", async () => {
      const response = {
        items: [
          {
            paymentId: "pay-1",
            sessionId: "session-1",
            sessionTitle: "头痛问诊",
            purpose: "lab" as const,
            items: [
              { name: "血常规", amount: 50, quantity: 1 },
            ],
            totalAmount: 50,
            insuranceAmount: 25,
            selfPayAmount: 25,
            paymentStatus: "paid" as const,
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
      }
      mockTransport.get.mockResolvedValue(response)

      const result = await billingApi.listRecords()

      expect(mockTransport.get).toHaveBeenCalledWith("/billing/records")
      expect(mockTransport.get).toHaveBeenCalledTimes(1)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].paymentId).toBe("pay-1")
      expect(result.items[0].purpose).toBe("lab")
    })

    it("returns empty items array when no records", async () => {
      const response = { items: [] }
      mockTransport.get.mockResolvedValue(response)

      const result = await billingApi.listRecords()

      expect(result.items).toEqual([])
    })

    it("propagates transport errors", async () => {
      mockTransport.get.mockRejectedValue(new Error("Server error"))

      await expect(billingApi.listRecords()).rejects.toThrow("Server error")
    })
  })
})
