import { describe, expect, it } from "vitest"

import {
  useAuthStore,
  AuthGuard,
  useAuthGuard,
  authApi,
} from "@/features/auth"

describe("auth feature barrel exports", () => {
  it("exports useAuthStore", () => {
    expect(useAuthStore).toBeDefined()
    expect(typeof useAuthStore).toBe("function")
  })

  it("exports AuthGuard component", () => {
    expect(AuthGuard).toBeDefined()
    expect(typeof AuthGuard).toBe("function")
  })

  it("exports useAuthGuard hook", () => {
    expect(useAuthGuard).toBeDefined()
    expect(typeof useAuthGuard).toBe("function")
  })

  it("exports authApi", () => {
    expect(authApi).toBeDefined()
    expect(typeof authApi).toBe("object")
    expect(typeof authApi.login).toBe("function")
  })
})
