import { describe, expect, it, vi } from "vitest"

import { createLocalId } from "@/lib/ids"

describe("createLocalId", () => {
  it("uses the default prefix 'local' when none is provided", () => {
    const id = createLocalId()
    expect(id.startsWith("local-")).toBe(true)
  })

  it("uses a custom prefix when provided", () => {
    const id = createLocalId("msg")
    expect(id.startsWith("msg-")).toBe(true)
  })

  it("generates unique IDs across many calls", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createLocalId()))
    expect(ids.size).toBe(1000)
  })

  it("produces a non-empty suffix after the prefix", () => {
    const id = createLocalId("test")
    const suffix = id.slice("test-".length)
    expect(suffix.length).toBeGreaterThan(0)
  })

  it("falls back to timestamp + random when crypto.randomUUID is unavailable", () => {
    const original = globalThis.crypto
    // Simulate an environment without randomUUID.
    vi.stubGlobal("crypto", { getRandomValues: original.getRandomValues })

    const id = createLocalId("fallback")
    expect(id.startsWith("fallback-")).toBe(true)
    const suffix = id.slice("fallback-".length)
    // Fallback format: "<timestamp36>-<random36>"
    expect(suffix).toMatch(/^[a-z0-9]+-[a-z0-9]+$/)

    vi.stubGlobal("crypto", original)
  })
})
