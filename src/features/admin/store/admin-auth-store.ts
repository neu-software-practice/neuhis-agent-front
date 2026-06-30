import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AdminUser, AdminTokenPair } from "@/features/admin/api/types"

export interface AdminAuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AdminUser | null
  isAuthenticated: boolean
  login: (tokens: AdminTokenPair, user: AdminUser) => void
  logout: () => void
  updateTokens: (tokens: AdminTokenPair) => void
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      login: (tokens, user) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
      updateTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
    }),
    {
      name: "neuhis-admin-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
