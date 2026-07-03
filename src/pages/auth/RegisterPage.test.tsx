import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"

const navigate = vi.fn()

vi.mock("react-router", () => ({
  useNavigate: () => navigate,
  Link: ({ children, to }: { children: unknown; to: string }) => (
    <a href={to}>{children as React.ReactNode}</a>
  ),
}))

vi.mock("@/features/auth/api/auth-api", () => ({
  authApi: {
    register: vi.fn(),
  },
}))

const loginMock = vi.fn()

vi.mock("@/features/auth/store/auth-store", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
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

vi.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({
    value,
    onChange,
    label,
  }: {
    value?: string
    onChange?: (v: string) => void
    label?: string
  }) => (
    <div>
      <label>{label}</label>
      <input
        data-testid="birth-date-input"
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  ),
}))

import RegisterPage from "@/pages/auth/RegisterPage"
import { authApi } from "@/features/auth/api/auth-api"

describe("RegisterPage", () => {
  it("renders the registration form with all fields and the back-to-login link", () => {
    render(<RegisterPage />)

    expect(screen.getByPlaceholderText("请输入手机号")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("至少 6 位，含字母和数字")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("请再次输入密码")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("真实姓名，用于就诊记录")).toBeInTheDocument()
    expect(screen.getByText("性别")).toBeInTheDocument()
    expect(screen.getByTestId("birth-date-input")).toBeInTheDocument()
    expect(screen.getByText("返回登录")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /注册/ })).toBeInTheDocument()
  })

  it("shows validation errors when submitting an empty form", async () => {
    render(<RegisterPage />)

    fireEvent.click(screen.getByRole("button", { name: /注册/ }))

    await waitFor(() => {
      expect(screen.getByText("请输入正确的手机号")).toBeInTheDocument()
    })
    // Password and confirm-password both have min(1) so they show required errors
    expect(screen.getAllByText("密码至少 8 位").length).toBeGreaterThan(0)
  })

  it("gender preset button sets the gender value", async () => {
    render(<RegisterPage />)

    fireEvent.click(screen.getByText("男"))

    // After clicking, the button should be marked as selected via class
    const maleButton = screen.getByText("男")
    expect(maleButton.className).toContain("bg-primary/10")
  })

  it("successful registration calls login and navigates to /", async () => {
    const fakeResponse = {
      accessToken: "access-token-123",
      refreshToken: "refresh-token-456",
      expiresIn: 3600,
      user: {
        userId: "u-1",
        patientId: "p-1",
        phone: "13800001111",
        realName: "张三",
      },
    }

    ;(authApi.register as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      fakeResponse,
    )

    render(<RegisterPage />)

    fireEvent.change(screen.getByPlaceholderText("请输入手机号"), {
      target: { value: "13800001111" },
    })
    fireEvent.change(screen.getByPlaceholderText("至少 6 位，含字母和数字"), {
      target: { value: "Pass1234" },
    })
    fireEvent.change(screen.getByPlaceholderText("请再次输入密码"), {
      target: { value: "Pass1234" },
    })
    fireEvent.change(screen.getByPlaceholderText("真实姓名，用于就诊记录"), {
      target: { value: "张三" },
    })
    fireEvent.click(screen.getByText("男"))
    fireEvent.change(screen.getByTestId("birth-date-input"), {
      target: { value: "1990-01-01" },
    })

    fireEvent.click(screen.getByRole("button", { name: /注册/ }))

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        phone: "13800001111",
        password: "Pass1234",
        realName: "张三",
        gender: "male",
        birthDate: "1990-01-01",
      })
    })

    expect(loginMock).toHaveBeenCalledWith(fakeResponse, fakeResponse.user)
    expect(navigate).toHaveBeenCalledWith("/", { replace: true })
  })
})
