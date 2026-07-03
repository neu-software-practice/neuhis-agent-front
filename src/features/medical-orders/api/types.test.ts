import { describe, expect, it } from "vitest"

/**
 * Medical orders API types are pure TypeScript type definitions derived from Zod schemas.
 * At runtime, they are erased — this test verifies the module can be
 * imported without error.
 */

describe("medical orders API types", () => {
  it("module can be imported without error", async () => {
    const mod = await import("@/features/medical-orders/api/types")
    expect(mod).toBeDefined()
    expect(typeof mod).toBe("object")
  })
})
