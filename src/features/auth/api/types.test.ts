import { describe, expect, it } from "vitest"

/**
 * Auth API types are pure TypeScript type definitions.
 * At runtime, they are erased — these tests verify the module
 * can be imported without error and that any re-exported runtime
 * values are accessible.
 */

describe("auth API types", () => {
  it("exports AuthUser interface shape via runtime module", async () => {
    const mod = await import("@/features/auth/api/types")
    // Pure type exports — the module object exists but has no runtime keys
    expect(mod).toBeDefined()
    expect(typeof mod).toBe("object")
  })

  it("can be imported alongside auth-api module", async () => {
    // This verifies there is no import cycle or syntax error
    const [authApiMod, typesMod] = await Promise.all([
      import("@/features/auth/api/auth-api"),
      import("@/features/auth/api/types"),
    ])
    expect(authApiMod).toBeDefined()
    expect(typesMod).toBeDefined()
  })
})
