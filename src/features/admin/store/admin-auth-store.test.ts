import { beforeEach, describe, expect, it } from "vitest"

import { useAdminAuthStore } from "@/features/admin/store/admin-auth-store"
import type { AdminUser, AdminTokenPair } from "@/features/admin/api/types"

function buildTokens(overrides: Partial<AdminTokenPair> = {}): AdminTokenPair {
  return {
    accessToken: "access-token-123",
    refreshToken: "refresh-token-456",
    expiresIn: 3600,
    ...overrides,
  }
}

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

describe("useAdminAuthStore", () => {
  beforeEach(() => {
    useAdminAuthStore.getState().logout()
    // Clear persisted storage to avoid cross-test contamination.
    localStorage.removeItem("neuhis-admin-auth")
  })

  it("initializes with unauthenticated state and null tokens/user", () => {
    const state = useAdminAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it("login sets tokens, user, and isAuthenticated = true", () => {
    const tokens = buildTokens()
    const user = buildUser()

    useAdminAuthStore.getState().login(tokens, user)

    const state = useAdminAuthStore.getState()
    expect(state.accessToken).toBe(tokens.accessToken)
    expect(state.refreshToken).toBe(tokens.refreshToken)
    expect(state.user).toEqual(user)
    expect(state.isAuthenticated).toBe(true)
  })

  it("logout resets all auth fields back to initial state", () => {
    // First login.
    useAdminAuthStore.getState().login(buildTokens(), buildUser())
    expect(useAdminAuthStore.getState().isAuthenticated).toBe(true)

    // Then logout.
    useAdminAuthStore.getState().logout()

    const state = useAdminAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it("updateTokens replaces only the token pair, leaving user and isAuthenticated intact", () => {
    const user = buildUser()
    useAdminAuthStore.getState().login(buildTokens(), user)

    const newTokens = buildTokens({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresIn: 7200,
    })
    useAdminAuthStore.getState().updateTokens(newTokens)

    const state = useAdminAuthStore.getState()
    expect(state.accessToken).toBe("new-access")
    expect(state.refreshToken).toBe("new-refresh")
    expect(state.user).toEqual(user)
    expect(state.isAuthenticated).toBe(true)
  })

  it("updateTokens does not flip isAuthenticated to false when not previously logged in", () => {
    // Not logged in, but a token refresh could still write tokens.
    useAdminAuthStore.getState().updateTokens(buildTokens())

    const state = useAdminAuthStore.getState()
    expect(state.accessToken).toBe("access-token-123")
    // isAuthenticated was never set to true by updateTokens — it stays false.
    expect(state.isAuthenticated).toBe(false)
  })

  it("supports three distinct roles via the user object", () => {
    for (const role of ["super_admin", "admin", "operator"] as const) {
      useAdminAuthStore.getState().login(buildTokens(), buildUser({ role }))
      expect(useAdminAuthStore.getState().user?.role).toBe(role)
      useAdminAuthStore.getState().logout()
    }
  })

  it("persist middleware writes to localStorage under the configured name", () => {
    useAdminAuthStore.getState().login(buildTokens(), buildUser())

    const raw = localStorage.getItem("neuhis-admin-auth")
    expect(raw).not.toBeNull()

    const parsed = JSON.parse(raw!)
    // The persist middleware stores state under a `state` key.
    expect(parsed.state.accessToken).toBe("access-token-123")
    expect(parsed.state.user?.username).toBe("admin")
    expect(parsed.state.isAuthenticated).toBe(true)
  })

  it("partialize persists only the intended fields", () => {
    useAdminAuthStore.getState().login(buildTokens(), buildUser())

    const raw = localStorage.getItem("neuhis-admin-auth")!
    const parsed = JSON.parse(raw)

    // Actions (login/logout/updateTokens) should not appear in the persisted snapshot.
    expect(parsed.state.login).toBeUndefined()
    expect(parsed.state.logout).toBeUndefined()
    expect(parsed.state.updateTokens).toBeUndefined()

    // Expected persisted keys are present.
    expect(parsed.state).toHaveProperty("accessToken")
    expect(parsed.state).toHaveProperty("refreshToken")
    expect(parsed.state).toHaveProperty("user")
    expect(parsed.state).toHaveProperty("isAuthenticated")
  })
})
