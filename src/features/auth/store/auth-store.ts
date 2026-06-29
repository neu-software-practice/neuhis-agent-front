/**
 * Auth 状态管理（Zustand + persist）。
 *
 * - 持久化至 localStorage key "neuhis-auth"
 * - 可在 React 外通过 useAuthStore.getState() 访问（ky hooks 需要）
 * - login/logout 为同步 action，仅操作 client-side state
 */
import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { AuthUser, TokenPair } from "@/features/auth/api/types"

export interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean

  /** 登录成功后写入 tokens + user。 */
  login: (tokens: TokenPair, user: AuthUser) => void
  /** 退出登录，清空所有状态。 */
  logout: () => void
  /** Token 刷新后仅更新 tokens。 */
  updateTokens: (tokens: TokenPair) => void
}

export const useAuthStore = create<AuthState>()(
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
      name: "neuhis-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
