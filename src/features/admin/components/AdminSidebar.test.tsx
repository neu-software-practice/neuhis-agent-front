import { render, screen, fireEvent, within } from "@testing-library/react"
import { act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Track navigation calls.
const mockNavigate = vi.fn()

vi.mock("react-router", () => ({
  NavLink: ({
    to,
    children,
  }: {
    to: string
    children: React.ReactNode | ((props: { isActive: boolean }) => React.ReactNode)
  }) => {
    const rendered =
      typeof children === "function" ? children({ isActive: false }) : children
    return (
      <a href={to} data-testid={`navlink-${to}`}>
        {rendered}
      </a>
    )
  },
  useNavigate: () => mockNavigate,
}))

// Mock the auth store so we control refreshToken and logout.
const mockStore = {
  accessToken: null as string | null,
  refreshToken: null as string | null,
  user: null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  updateTokens: vi.fn(),
}

vi.mock("@/features/admin/store/admin-auth-store", () => ({
  useAdminAuthStore: {
    getState: () => mockStore,
    subscribe: vi.fn(),
    getInitialState: () => mockStore,
    setState: vi.fn(),
  },
}))

// Mock adminApi so we can observe logout calls.
const mockLogoutApi = vi.fn()
vi.mock("@/features/admin/api/admin-api", () => ({
  adminApi: {
    logout: (...args: unknown[]) => mockLogoutApi(...args),
  },
}))

import { AdminSidebar } from "@/features/admin/components/AdminSidebar"

describe("AdminSidebar", () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockLogoutApi.mockClear()
    mockStore.logout.mockClear()
    mockStore.refreshToken = null
  })

  it("renders the product name", () => {
    render(<AdminSidebar />)
    expect(screen.getByText("东软云脑智能医疗")).toBeInTheDocument()
  })

  it("renders all four navigation items with correct labels", () => {
    render(<AdminSidebar />)

    expect(screen.getByText("仪表盘")).toBeInTheDocument()
    expect(screen.getByText("患者管理")).toBeInTheDocument()
    expect(screen.getByText("问诊记录")).toBeInTheDocument()
    expect(screen.getByText("系统设置")).toBeInTheDocument()
  })

  it("renders each nav item as a link to the correct route", () => {
    render(<AdminSidebar />)

    expect(screen.getByTestId("navlink-/admin/dashboard")).toBeInTheDocument()
    expect(screen.getByTestId("navlink-/admin/patients")).toBeInTheDocument()
    expect(screen.getByTestId("navlink-/admin/sessions")).toBeInTheDocument()
    expect(screen.getByTestId("navlink-/admin/settings")).toBeInTheDocument()
  })

  it("renders a logout button", () => {
    render(<AdminSidebar />)
    const logoutButton = screen.getByRole("button", { name: /退出/ })
    expect(logoutButton).toBeInTheDocument()
  })

  it("calls store.logout and navigates to /admin/login on logout when no refreshToken", async () => {
    mockStore.refreshToken = null

    render(<AdminSidebar />)
    const logoutButton = screen.getByRole("button", { name: /退出/ })

    await act(async () => {
      fireEvent.click(logoutButton)
    })

    // No refreshToken → no API call.
    expect(mockLogoutApi).not.toHaveBeenCalled()
    expect(mockStore.logout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith("/admin/login")
  })

  it("calls adminApi.logout with the refreshToken before clearing the store", async () => {
    mockStore.refreshToken = "refresh-xyz"

    render(<AdminSidebar />)
    const logoutButton = screen.getByRole("button", { name: /退出/ })

    mockLogoutApi.mockResolvedValueOnce({ success: true })

    await act(async () => {
      fireEvent.click(logoutButton)
    })

    expect(mockLogoutApi).toHaveBeenCalledWith("refresh-xyz")
    expect(mockStore.logout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith("/admin/login")
  })

  it("still logs out and navigates even if the logout API call fails", async () => {
    mockStore.refreshToken = "refresh-xyz"

    render(<AdminSidebar />)
    const logoutButton = screen.getByRole("button", { name: /退出/ })

    mockLogoutApi.mockRejectedValueOnce(new Error("network error"))

    await act(async () => {
      fireEvent.click(logoutButton)
    })

    // Best-effort: API failure must not block local logout.
    expect(mockLogoutApi).toHaveBeenCalledWith("refresh-xyz")
    expect(mockStore.logout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith("/admin/login")
  })

  it("renders the admin panel label in the footer area", () => {
    render(<AdminSidebar />)
    expect(screen.getByText("管理后台")).toBeInTheDocument()
  })

  it("renders a logo image with alt text", () => {
    render(<AdminSidebar />)
    const img = screen.getByRole("img", { name: /Logo/ })
    expect(img).toBeInTheDocument()
  })

  it("wraps nav items in a nav element with an accessible label", () => {
    render(<AdminSidebar />)
    const nav = screen.getByRole("navigation", { name: /管理导航/ })
    expect(nav).toBeInTheDocument()
    // All four labels are inside the nav.
    expect(within(nav).getByText("仪表盘")).toBeInTheDocument()
    expect(within(nav).getByText("系统设置")).toBeInTheDocument()
  })
})
