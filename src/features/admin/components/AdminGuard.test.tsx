import { render, screen } from "@testing-library/react"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useAdminAuthStore } from "@/features/admin/store/admin-auth-store"

// Mock react-router so we can observe Navigate calls and control location.
const mockNavigateTarget = vi.fn()
const mockLocation = { pathname: "/admin/dashboard", search: "" }

vi.mock("react-router", () => ({
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => {
    mockNavigateTarget({ to, replace })
    return <div data-testid="navigate">redirecting to {to}</div>
  },
  Outlet: () => <div data-testid="outlet">protected content</div>,
  useLocation: () => mockLocation,
}))

// Import after mock.
import { AdminGuard } from "@/features/admin/components/AdminGuard"

describe("AdminGuard", () => {
  beforeEach(() => {
    mockNavigateTarget.mockClear()
    mockLocation.pathname = "/admin/dashboard"
    mockLocation.search = ""
    act(() => {
      useAdminAuthStore.getState().logout()
    })
    localStorage.removeItem("neuhis-admin-auth")
  })

  it("redirects to /admin/login with redirectTo param when not authenticated", () => {
    render(<AdminGuard />)

    expect(mockNavigateTarget).toHaveBeenCalledWith({
      to: "/admin/login?redirectTo=%2Fadmin%2Fdashboard",
      replace: true,
    })
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument()
  })

  it("encodes the full pathname + search into the redirectTo param", () => {
    mockLocation.pathname = "/admin/patients"
    mockLocation.search = "?page=2&search=zhang"

    render(<AdminGuard />)

    const call = mockNavigateTarget.mock.calls[0][0]
    expect(call.to).toContain("/admin/login?redirectTo=")
    const encoded = call.to.split("redirectTo=")[1]
    const decoded = decodeURIComponent(encoded)
    expect(decoded).toBe("/admin/patients?page=2&search=zhang")
  })

  it("renders the Outlet (protected content) when authenticated", () => {
    act(() => {
      useAdminAuthStore.getState().login(
        { accessToken: "a", refreshToken: "r", expiresIn: 60 },
        {
          id: "u-1",
          username: "admin",
          role: "super_admin",
          displayName: "管理员",
          createdAt: new Date().toISOString(),
        },
      )
    })

    render(<AdminGuard />)

    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(mockNavigateTarget).not.toHaveBeenCalled()
  })

  it("re-redirects after logout even if previously authenticated", () => {
    // Login.
    act(() => {
      useAdminAuthStore.getState().login(
        { accessToken: "a", refreshToken: "r", expiresIn: 60 },
        {
          id: "u-1",
          username: "admin",
          role: "admin",
          displayName: "管理员",
          createdAt: new Date().toISOString(),
        },
      )
    })

    // First render while authenticated.
    const { rerender } = render(<AdminGuard />)
    expect(screen.getByTestId("outlet")).toBeInTheDocument()

    // Logout.
    act(() => {
      useAdminAuthStore.getState().logout()
    })

    rerender(<AdminGuard />)
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument()
    expect(mockNavigateTarget).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: expect.stringContaining("/admin/login") }),
    )
  })

  it("uses replace navigation (does not push a history entry)", () => {
    render(<AdminGuard />)
    expect(mockNavigateTarget).toHaveBeenCalledWith(
      expect.objectContaining({ replace: true }),
    )
  })

  // Sanity check: the hook the guard relies on reports auth state correctly.
  it("useAdminAuthStore drives the guard decision", () => {
    expect(useAdminAuthStore.getState().isAuthenticated).toBe(false)
    const { result } = renderHook(() =>
      useAdminAuthStore((s) => s.isAuthenticated),
    )
    expect(result.current).toBe(false)
  })
})
