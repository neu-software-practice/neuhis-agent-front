import { describe, expect, it } from "vitest"

import { queryClient } from "@/lib/query-client"

describe("queryClient default configuration", () => {
  it("sets query staleTime to 30 seconds", () => {
    const options = queryClient.getDefaultOptions()
    expect(options.queries?.staleTime).toBe(30_000)
  })

  it("sets query gcTime to 5 minutes", () => {
    const options = queryClient.getDefaultOptions()
    expect(options.queries?.gcTime).toBe(5 * 60_000)
  })

  it("sets query retry to 1", () => {
    const options = queryClient.getDefaultOptions()
    expect(options.queries?.retry).toBe(1)
  })

  it("disables refetchOnWindowFocus for queries", () => {
    const options = queryClient.getDefaultOptions()
    expect(options.queries?.refetchOnWindowFocus).toBe(false)
  })

  it("sets mutation retry to 0", () => {
    const options = queryClient.getDefaultOptions()
    expect(options.mutations?.retry).toBe(0)
  })
})
