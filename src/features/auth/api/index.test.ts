import { describe, expect, it } from "vitest"

import {
  authApi,
  loginInputSchema,
  registerInputSchema,
  refreshInputSchema,
} from "@/features/auth/api"

describe("auth/api barrel exports", () => {
  it("exports authApi", () => {
    expect(authApi).toBeDefined()
    expect(typeof authApi.login).toBe("function")
    expect(typeof authApi.register).toBe("function")
    expect(typeof authApi.refresh).toBe("function")
    expect(typeof authApi.logout).toBe("function")
  })

  it("exports loginInputSchema", () => {
    expect(loginInputSchema).toBeDefined()
    expect(loginInputSchema.safeParse).toBeTypeOf("function")
  })

  it("exports registerInputSchema", () => {
    expect(registerInputSchema).toBeDefined()
    expect(registerInputSchema.safeParse).toBeTypeOf("function")
  })

  it("exports refreshInputSchema", () => {
    expect(refreshInputSchema).toBeDefined()
    expect(refreshInputSchema.safeParse).toBeTypeOf("function")
  })
})
