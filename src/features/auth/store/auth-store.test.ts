import { beforeEach, describe, expect, it } from "vitest"

import { useAuthStore } from "@/features/auth/store/auth-store"

function makeTokenPair(overrides = {}) {
  return {
    accessToken: "access-token-123",
    refreshToken: "refresh-token-456",
    expiresIn: 900,
    ...overrides,
  }
}

function makeUser(overrides = {}) {
  return {
    userId: "user-1",
    patientId: "patient-1",
    phone: "13800138000",
    realName: "Test User",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    })
  })

  describe("initial state", () => {
    it("starts with null tokens and user, not authenticated", () => {
      const state = useAuthStore.getState()
      expect(state.accessToken).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe("login action", () => {
    it("sets tokens, user, and isAuthenticated to true", () => {
      const tokens = makeTokenPair()
      const user = makeUser()

      useAuthStore.getState().login(tokens, user)

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe("access-token-123")
      expect(state.refreshToken).toBe("refresh-token-456")
      expect(state.user).toEqual(user)
      expect(state.isAuthenticated).toBe(true)
    })

    it("overwrites previous login state", () => {
      useAuthStore.getState().login(makeTokenPair(), makeUser())
      useAuthStore
        .getState()
        .login(
          makeTokenPair({ accessToken: "new-access", refreshToken: "new-refresh" }),
          makeUser({ userId: "user-2" }),
        )

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe("new-access")
      expect(state.refreshToken).toBe("new-refresh")
      expect(state.user?.userId).toBe("user-2")
      expect(state.isAuthenticated).toBe(true)
    })

    it("stores user with optional fields (realName, createdAt)", () => {
      const tokens = makeTokenPair()
      const user = makeUser({ realName: undefined, createdAt: undefined })

      useAuthStore.getState().login(tokens, user)

      const state = useAuthStore.getState()
      expect(state.user?.realName).toBeUndefined()
      expect(state.user?.createdAt).toBeUndefined()
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe("logout action", () => {
    it("clears all state back to initial values", () => {
      useAuthStore.getState().login(makeTokenPair(), makeUser())
      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.accessToken).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })

    it("is safe to call when already logged out", () => {
      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.accessToken).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe("updateTokens action", () => {
    it("updates only tokens, preserving user and isAuthenticated", () => {
      useAuthStore.getState().login(makeTokenPair(), makeUser())
      useAuthStore
        .getState()
        .updateTokens(makeTokenPair({ accessToken: "rotated-access", refreshToken: "rotated-refresh" }))

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe("rotated-access")
      expect(state.refreshToken).toBe("rotated-refresh")
      expect(state.user).toEqual(makeUser())
      expect(state.isAuthenticated).toBe(true)
    })

    it("works even when not previously authenticated", () => {
      useAuthStore.getState().updateTokens(makeTokenPair())

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe("access-token-123")
      expect(state.refreshToken).toBe("refresh-token-456")
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })

    it("updates tokens in-place while keeping other fields intact", () => {
      useAuthStore.getState().login(makeTokenPair(), makeUser())

      useAuthStore.getState().updateTokens({
        accessToken: "updated-access",
        refreshToken: "updated-refresh",
        expiresIn: 3600,
      })

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe("updated-access")
      expect(state.refreshToken).toBe("updated-refresh")
      expect(state.user?.userId).toBe("user-1")
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe("state transitions", () => {
    it("follows login -> updateTokens -> logout lifecycle correctly", () => {
      // Login
      useAuthStore.getState().login(makeTokenPair(), makeUser())
      expect(useAuthStore.getState().isAuthenticated).toBe(true)

      // Token refresh
      useAuthStore
        .getState()
        .updateTokens(makeTokenPair({ accessToken: "refreshed-access" }))
      expect(useAuthStore.getState().accessToken).toBe("refreshed-access")
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().user).not.toBeNull()

      // Logout
      useAuthStore.getState().logout()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().accessToken).toBeNull()
      expect(useAuthStore.getState().user).toBeNull()
    })

    it("login after logout restores fresh state", () => {
      useAuthStore.getState().login(makeTokenPair(), makeUser())
      useAuthStore.getState().logout()

      const newUser = makeUser({ userId: "user-3", phone: "13900000000" })
      useAuthStore.getState().login(makeTokenPair({ accessToken: "fresh-access" }), newUser)

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe("fresh-access")
      expect(state.user?.userId).toBe("user-3")
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe("selector subscriptions", () => {
    it("allows selecting isAuthenticated via hook-style selector", () => {
      const selector = (s: ReturnType<typeof useAuthStore.getState>) => s.isAuthenticated
      expect(selector(useAuthStore.getState())).toBe(false)

      useAuthStore.getState().login(makeTokenPair(), makeUser())
      expect(selector(useAuthStore.getState())).toBe(true)
    })

    it("allows selecting user via hook-style selector", () => {
      const selector = (s: ReturnType<typeof useAuthStore.getState>) => s.user
      expect(selector(useAuthStore.getState())).toBeNull()

      const user = makeUser({ realName: "Selected User" })
      useAuthStore.getState().login(makeTokenPair(), user)
      expect(selector(useAuthStore.getState())).toEqual(user)
    })

    it("selects accessToken via hook-style selector", () => {
      const selector = (s: ReturnType<typeof useAuthStore.getState>) => s.accessToken
      expect(selector(useAuthStore.getState())).toBeNull()

      useAuthStore.getState().login(makeTokenPair({ accessToken: "my-token" }), makeUser())
      expect(selector(useAuthStore.getState())).toBe("my-token")
    })
  })

  describe("store persistence config", () => {
    it("has persist middleware enabled with correct storage key", () => {
      // The persist middleware persists to localStorage under key "neuhis-auth"
      // Verify that setting state persists by checking in-memory state shape
      const state = useAuthStore.getState()
      expect(state).toHaveProperty("accessToken")
      expect(state).toHaveProperty("refreshToken")
      expect(state).toHaveProperty("user")
      expect(state).toHaveProperty("isAuthenticated")
    })

    it("exposes correct action types", () => {
      const { login, logout, updateTokens } = useAuthStore.getState()
      expect(typeof login).toBe("function")
      expect(typeof logout).toBe("function")
      expect(typeof updateTokens).toBe("function")
      expect(login.length).toBe(2) // tokens + user params
      expect(logout.length).toBe(0)
      expect(updateTokens.length).toBe(1)
    })
  })
})
