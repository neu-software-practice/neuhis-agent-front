import { describe, expect, it, vi } from "vitest"

import { billingApi } from "@/features/billing/api"
import {
  billingQueries,
  billingQueryKeys,
} from "@/features/billing/api/queries"

vi.mock("@/features/billing/api", () => ({
  billingApi: {
    listRecords: vi.fn(),
  },
}))

describe("billingQueryKeys", () => {
  it("produces a stable 'all' key", () => {
    expect(billingQueryKeys.all).toEqual(["billing"])
  })

  it("builds a list key", () => {
    expect(billingQueryKeys.list()).toEqual(["billing", "list"])
  })
})

describe("billingQueries", () => {
  it("list() returns queryOptions with correct key", () => {
    const options = billingQueries.list()
    expect(options.queryKey).toEqual(["billing", "list"])
    expect(typeof options.queryFn).toBe("function")
  })

  it("list queryFn calls billingApi.listRecords", async () => {
    vi.mocked(billingApi.listRecords).mockResolvedValue({ items: [] })
    const options = billingQueries.list()
    const result = await options.queryFn!({} as never)
    expect(billingApi.listRecords).toHaveBeenCalled()
    expect(result.items).toEqual([])
  })
})
