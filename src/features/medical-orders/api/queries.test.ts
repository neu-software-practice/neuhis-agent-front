import { describe, expect, it, vi } from "vitest"

import { medicalOrdersApi } from "@/features/medical-orders/api"
import {
  medicalOrderQueries,
  medicalOrderQueryKeys,
} from "@/features/medical-orders/api/queries"

vi.mock("@/features/medical-orders/api", () => ({
  medicalOrdersApi: {
    listRecords: vi.fn(),
  },
}))

describe("medicalOrderQueryKeys", () => {
  it("produces a stable 'all' key", () => {
    expect(medicalOrderQueryKeys.all).toEqual(["medical-orders"])
  })

  it("builds a list key", () => {
    expect(medicalOrderQueryKeys.list()).toEqual(["medical-orders", "list"])
  })
})

describe("medicalOrderQueries", () => {
  it("list() returns queryOptions with correct key", () => {
    const options = medicalOrderQueries.list()
    expect(options.queryKey).toEqual(["medical-orders", "list"])
    expect(typeof options.queryFn).toBe("function")
  })

  it("list queryFn calls medicalOrdersApi.listRecords", async () => {
    vi.mocked(medicalOrdersApi.listRecords).mockResolvedValue({ items: [] })
    const options = medicalOrderQueries.list()
    const result = await options.queryFn!({} as never)
    expect(medicalOrdersApi.listRecords).toHaveBeenCalled()
    expect(result.items).toEqual([])
  })
})
