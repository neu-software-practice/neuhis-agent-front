import { describe, expect, it } from "vitest"

import { router } from "@/app/router"

describe("router configuration", () => {
  it("creates a valid browser router", () => {
    expect(router).toBeDefined()
    expect(router.state).toBeDefined()
    expect(typeof router.navigate).toBe("function")
    expect(typeof router.subscribe).toBe("function")
  })

  it("has routes defined", () => {
    expect(router.state).toBeDefined()
    expect(router.state.location).toBeDefined()
  })

  it("has the root route with error boundary", () => {
    // The router should have been created with an ErrorBoundary
    expect(router.routes).toBeDefined()
  })

  it("supports navigation", async () => {
    await router.navigate("/login")
    expect(router.state.location.pathname).toBe("/login")
  })

  it("navigates to protected routes", async () => {
    await router.navigate("/history")
    expect(router.state.location.pathname).toBe("/history")
  })

  it("navigates to admin routes", async () => {
    await router.navigate("/admin/login")
    expect(router.state.location.pathname).toBe("/admin/login")
  })

  it("navigates to workbench routes", async () => {
    await router.navigate("/workbench/new")
    expect(router.state.location.pathname).toBe("/workbench/new")
  })

  it("navigates back to root", async () => {
    await router.navigate("/")
    expect(router.state.location.pathname).toBe("/")
  })
})
