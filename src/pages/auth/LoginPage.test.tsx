import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const navigate = vi.fn()
const loginMock = vi.fn()

vi.mock("react-router", () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [new URLSearchParams()],
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

vi.mock("@/features/auth/api/auth-api", () => ({
  authApi: {
    login: vi.fn(),
  },
}))

vi.mock("@/features/auth/store/auth-store", () => ({
  useAuthStore: (selector: (state: { login: typeof loginMock }) => unknown) =>
    selector({
      login: loginMock,
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      logout: vi.fn(),
      updateTokens: vi.fn(),
    }),
}))

import { authApi } from "@/features/auth/api/auth-api"
import LoginPage from "@/pages/auth/LoginPage"

describe("LoginPage", () => {
  beforeEach(() => {
    navigate.mockReset()
    loginMock.mockReset()
    vi.mocked(authApi.login).mockReset()
  })

  it("renders the login form with phone and password fields, submit button, and register link", () => {
    render(<LoginPage />)

    expect(screen.getByPlaceholderText("请输入手机号")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("请输入密码")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /登录/ })).toBeInTheDocument()
    expect(screen.getByText("立即注册")).toBeInTheDocument()
  })

  it("shows validation errors when submitting empty form", async () => {
    render(<LoginPage />)

    fireEvent.click(screen.getByRole("button", { name: /登录/ }))

    await waitFor(() => {
      expect(screen.getByText("请输入正确的手机号")).toBeInTheDocument()
    })
    expect(screen.getByText("请输入密码")).toBeInTheDocument()
  })

  it("logs in and navigates to redirectTo on successful login", async () => {
    const fakeResponse = {
      accessToken: "access-token-123",
      refreshToken: "refresh-token-456",
      expiresIn: 3600,
      user: {
        userId: "user-001",
        patientId: "patient-001",
        phone: "13800001111",
      },
    }
    vi.mocked(authApi.login).mockResolvedValue(fakeResponse)

    render(<LoginPage />)

    fireEvent.change(screen.getByPlaceholderText("请输入手机号"), {
      target: { value: "13800001111" },
    })
    fireEvent.change(screen.getByPlaceholderText("请输入密码"), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /登录/ }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith(fakeResponse, fakeResponse.user)
    })
    expect(navigate).toHaveBeenCalledWith("/", { replace: true })
  })

  it("shows server error message on failed login", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error("账号或密码错误"))

    render(<LoginPage />)

    fireEvent.change(screen.getByPlaceholderText("请输入手机号"), {
      target: { value: "13800001111" },
    })
    fireEvent.change(screen.getByPlaceholderText("请输入密码"), {
      target: { value: "wrongpassword" },
    })
    fireEvent.click(screen.getByRole("button", { name: /登录/ }))

    await waitFor(() => {
      expect(screen.getByText("账号或密码错误")).toBeInTheDocument()
    })
    expect(loginMock).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
