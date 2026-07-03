import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"

import { useAuthStore } from "@/features/auth/store/auth-store"
import { useAuthGuard } from "@/features/auth/hooks/useAuthGuard"

/**
 * Mock useAuthStore so the selector callbacks registered by useAuthGuard
 * actually get invoked.  This ensures V8 coverage tracks the arrow-function
 * bodies (`s.isAuthenticated` / `s.user`) as covered.
 */
vi.mock("@/features/auth/store/auth-store", () => ({
  useAuthStore: vi.fn(),
}))

describe("useAuthGuard", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns isAuthenticated=false and user=null when not authenticated", () => {
    ;(useAuthStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: any) => selector({ isAuthenticated: false, user: null }),
    )

    const { result } = renderHook(() => useAuthGuard())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it("returns isAuthenticated=true and user when authenticated", () => {
    const mockUser = {
      userId: "u1",
      patientId: "p1",
      phone: "13800138000",
      realName: "Test",
    }
    ;(useAuthStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: any) => selector({ isAuthenticated: true, user: mockUser }),
    )

    const { result } = renderHook(() => useAuthGuard())

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUser)
  })

  it("returns isAuthenticated=false with a user object if store is inconsistent", () => {
    const mockUser = {
      userId: "u1",
      patientId: "p1",
      phone: "13800138000",
    }
    ;(useAuthStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: any) => selector({ isAuthenticated: false, user: mockUser }),
    )

    const { result } = renderHook(() => useAuthGuard())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toEqual(mockUser)
  })

  it("returns isAuthenticated=true with null user if store is inconsistent", () => {
    ;(useAuthStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: any) => selector({ isAuthenticated: true, user: null }),
    )

    const { result } = renderHook(() => useAuthGuard())

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toBeNull()
  })
})
