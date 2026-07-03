import { describe, expect, it, vi } from "vitest"

const { mockStore } = vi.hoisted(() => {
  const { create } = require("zustand")
  const mockStore = create((set: any) => ({
    isAuthenticated: false,
    user: null as any,
    login: (user: any) => {
      console.log("LOGIN CALLED WITH:", user.role)
      set({ isAuthenticated: true, user })
    },
    logout: () => set({ isAuthenticated: false, user: null }),
  }))
  return { mockStore }
})

vi.mock("@/features/admin/store/admin-auth-store", () => ({
  useAdminAuthStore: mockStore,
}))

import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth"
import type { AdminUser } from "@/features/admin/api/types"

function buildUser(): AdminUser {
  return { id: "admin-1", username: "admin", role: "super_admin", displayName: "系统管理员", createdAt: new Date().toISOString() }
}

describe("debug", () => {
  it("prev: login super_admin", () => {
    mockStore.getState().login(buildUser())
    console.log("prev store:", mockStore.getState().user?.role)
  })
  it("curr: login operator", () => {
    const operator = buildUser({ role: "operator", displayName: "运营小李" })
    console.log("operator obj role:", operator.role)
    mockStore.getState().login(operator)
    console.log("curr store:", mockStore.getState().user?.role)
  })
})
