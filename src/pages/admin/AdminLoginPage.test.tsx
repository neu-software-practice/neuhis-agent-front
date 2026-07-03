import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── Router mocks ────────────────────────────────────────────────────
const mockNavigate = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, vi.fn()],
}))

// ─── API + store mocks ──────────────────────────────────────────────
const mockLoginApi = vi.fn()
const mockStoreLogin = vi.fn()

vi.mock("@/features/admin/api/admin-api", () => ({
  adminApi: {
    login: (...args: unknown[]) => mockLoginApi(...args),
  },
}))

vi.mock("@/features/admin/store/admin-auth-store", () => ({
  useAdminAuthStore: {
    getState: () => ({
      login: mockStoreLogin,
      logout: vi.fn(),
    }),
  },
}))

import AdminLoginPage from "@/pages/admin/AdminLoginPage"

function setSearchParams(params: Record<string, string>) {
  mockSearchParams = new URLSearchParams(params)
}

describe("AdminLoginPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockLoginApi.mockClear()
    mockStoreLogin.mockClear()
    setSearchParams({})
  })

  it("renders the product name and login heading", () => {
    render(<AdminLoginPage />)
    expect(screen.getByText("东软云脑智能医疗")).toBeInTheDocument()
    expect(screen.getByText("管理后台")).toBeInTheDocument()
  })

  it("renders username and password inputs with labels", () => {
    render(<AdminLoginPage />)
    expect(screen.getByLabelText(/用户名/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText("请输入密码")).toBeInTheDocument()
  })

  it("renders a submit button in idle state", () => {
    render(<AdminLoginPage />)
    expect(screen.getByRole("button", { name: /登录/ })).toBeEnabled()
  })

  it("toggles password visibility when the eye icon is clicked", async () => {
    const user = userEvent.setup()
    render(<AdminLoginPage />)

    const passwordInput = screen.getByPlaceholderText("请输入密码") as HTMLInputElement
    expect(passwordInput.type).toBe("password")

    const toggle = screen.getByRole("button", { name: /显示密码/ })
    await user.click(toggle)

    // After toggle, the aria-label changes to "隐藏密码".
    expect(screen.getByRole("button", { name: /隐藏密码/ })).toBeInTheDocument()
  })

  it("shows a validation error when submitting an empty form", async () => {
    const user = userEvent.setup()
    render(<AdminLoginPage />)

    await user.click(screen.getByRole("button", { name: /登录/ }))

    // Zod resolver should surface field errors.
    await waitFor(() => {
      expect(screen.getByText(/用户名不能为空/)).toBeInTheDocument()
    })
    expect(screen.getByText(/密码不能为空/)).toBeInTheDocument()
    expect(mockLoginApi).not.toHaveBeenCalled()
  })

  it("logs in and navigates to /admin/dashboard on success (no redirectTo)", async () => {
    const user = userEvent.setup()
    mockLoginApi.mockResolvedValueOnce({
      tokens: { accessToken: "a", refreshToken: "r", expiresIn: 60 },
      user: {
        id: "u-1",
        username: "admin",
        role: "super_admin",
        displayName: "管理员",
        createdAt: new Date().toISOString(),
      },
    })

    render(<AdminLoginPage />)

    await user.type(screen.getByLabelText(/用户名/), "admin")
    await user.type(screen.getByPlaceholderText("请输入密码"), "secret")
    await user.click(screen.getByRole("button", { name: /登录/ }))

    await waitFor(() => {
      expect(mockLoginApi).toHaveBeenCalledWith({
        username: "admin",
        password: "secret",
      })
    })
    expect(mockStoreLogin).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith("/admin/dashboard", {
      replace: true,
    })
  })

  it("navigates to the redirectTo path from the query string on success", async () => {
    const user = userEvent.setup()
    setSearchParams({ redirectTo: "/admin/patients?page=2" })

    mockLoginApi.mockResolvedValueOnce({
      tokens: { accessToken: "a", refreshToken: "r", expiresIn: 60 },
      user: {
        id: "u-1",
        username: "admin",
        role: "admin",
        displayName: "管理员",
        createdAt: new Date().toISOString(),
      },
    })

    render(<AdminLoginPage />)

    await user.type(screen.getByLabelText(/用户名/), "admin")
    await user.type(screen.getByPlaceholderText("请输入密码"), "secret")
    await user.click(screen.getByRole("button", { name: /登录/ }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin/patients?page=2", {
        replace: true,
      })
    })
  })

  it("falls back to /admin/dashboard when redirectTo is outside /admin/", async () => {
    const user = userEvent.setup()
    // Open-redirect attempt: should be sanitized.
    setSearchParams({ redirectTo: "https://evil.com/steal" })

    mockLoginApi.mockResolvedValueOnce({
      tokens: { accessToken: "a", refreshToken: "r", expiresIn: 60 },
      user: {
        id: "u-1",
        username: "admin",
        role: "admin",
        displayName: "管理员",
        createdAt: new Date().toISOString(),
      },
    })

    render(<AdminLoginPage />)

    await user.type(screen.getByLabelText(/用户名/), "admin")
    await user.type(screen.getByPlaceholderText("请输入密码"), "secret")
    await user.click(screen.getByRole("button", { name: /登录/ }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin/dashboard", {
        replace: true,
      })
    })
  })

  it("displays a server error message when login fails", async () => {
    const user = userEvent.setup()
    mockLoginApi.mockRejectedValueOnce(new Error("用户名或密码错误"))

    render(<AdminLoginPage />)

    await user.type(screen.getByLabelText(/用户名/), "admin")
    await user.type(screen.getByPlaceholderText("请输入密码"), "wrong")
    await user.click(screen.getByRole("button", { name: /登录/ }))

    await waitFor(() => {
      expect(screen.getByText("用户名或密码错误")).toBeInTheDocument()
    })
    expect(mockStoreLogin).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("displays a generic error message when the error is not an Error instance", async () => {
    const user = userEvent.setup()
    mockLoginApi.mockRejectedValueOnce("string-error")

    render(<AdminLoginPage />)

    await user.type(screen.getByLabelText(/用户名/), "admin")
    await user.type(screen.getByPlaceholderText("请输入密码"), "secret")
    await user.click(screen.getByRole("button", { name: /登录/ }))

    await waitFor(() => {
      expect(screen.getByText("登录失败，请稍后重试")).toBeInTheDocument()
    })
  })

  it("disables the submit button while submitting", async () => {
    const user = userEvent.setup()
    // Delay the API resolution so we can observe the submitting state.
    let resolveLogin: (val: unknown) => void
    mockLoginApi.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve
        }),
    )

    render(<AdminLoginPage />)

    await user.type(screen.getByLabelText(/用户名/), "admin")
    await user.type(screen.getByPlaceholderText("请输入密码"), "secret")
    await user.click(screen.getByRole("button", { name: /登录/ }))

    // The button should now show "登录中..." and be disabled.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /登录中/ })).toBeDisabled()
    })

    // Resolve the login to clean up.
    await act(async () => {
      resolveLogin!({
        tokens: { accessToken: "a", refreshToken: "r", expiresIn: 60 },
        user: {
          id: "u-1",
          username: "admin",
          role: "admin",
          displayName: "管理员",
          createdAt: new Date().toISOString(),
        },
      })
    })
  })
})
