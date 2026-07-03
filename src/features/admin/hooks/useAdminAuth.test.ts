import { cleanup } from "@testing-library/react"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// The real store uses zustand's persist middleware, whose async rehydration
// races with synchronous test resets and leaks state across tests. We therefore
// mock the store with a real (non-persisted) zustand store that mirrors the
// auth slice. A genuine store gives us correct reactivity through the hook's
// useShallow selector, so re-renders propagate state changes as they would
// against the production store.
//
// vi.mock is hoisted above imports, so the store must be declared in a
// vi.hoisted scope to be visible inside the factory.
type AuthUser = {
  id: string
  username: string
  role: "super_admin" | "admin" | "operator"
  displayName: string
  createdAt: string
}
type AuthSlice = {
  isAuthenticated: boolean
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
}

const { mockStore } = vi.hoisted(() => {
  // Import inside the hoisted scope so it runs during mock setup, not before.
  const { create } = require("zustand")
  const mockStore = create<AuthSlice>((set) => ({
    isAuthenticated: false,
    user: null,
    login: (user) => set({ isAuthenticated: true, user }),
    logout: () => set({ isAuthenticated: false, user: null }),
  }))
  return { mockStore }
})

vi.mock("@/features/admin/store/admin-auth-store", () => ({
  useAdminAuthStore: mockStore,
}))

import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth"
import type { AdminUser } from "@/features/admin/api/types"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: "admin-1",
    username: "admin",
    role: "super_admin",
    displayName: "系统管理员",
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe("useAdminAuth", () => {
  beforeEach(() => {
    // Reset the mock store to its initial logged-out state.
    act(() => {
      mockStore.getState().logout()
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("returns isAuthenticated=false and user=null when not logged in", () => {
    const { result } = renderHook(() => useAdminAuth())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it("returns isAuthenticated=true and the user after login", () => {
    const user = buildUser()
    act(() => {
      mockStore.getState().login(user)
    })

    const { result } = renderHook(() => useAdminAuth())

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(user)
  })

  it("reflects logout by resetting isAuthenticated and user", () => {
    // Login first.
    act(() => {
      mockStore.getState().login(buildUser())
    })

    const { result } = renderHook(() => useAdminAuth())
    expect(result.current.isAuthenticated).toBe(true)

    // Logout.
    act(() => {
      mockStore.getState().logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it("exposes the user's role and displayName", () => {
    console.log("BEFORE login:", mockStore.getState().user?.role, mockStore.getState().isAuthenticated)
    const operator = buildUser({ role: "operator", displayName: "运营小李" })
    act(() => {
      mockStore.getState().login(operator)
    })
    console.log("AFTER login:", mockStore.getState().user?.role, mockStore.getState().isAuthenticated)

    const { result } = renderHook(() => useAdminAuth())
    console.log("HOOK RESULT:", result.current.user?.role)
    expect(result.current.user?.role).toBe("operator")
    expect(result.current.user?.displayName).toBe("运营小李")
  })

  it("does not expose token fields (only isAuthenticated + user)", () => {
    act(() => {
      mockStore.getState().login(buildUser())
    })

    const { result } = renderHook(() => useAdminAuth())
    const keys = Object.keys(result.current)
    expect(keys).toContain("isAuthenticated")
    expect(keys).toContain("user")
    expect(keys).not.toContain("accessToken")
    expect(keys).not.toContain("refreshToken")
  })
})
