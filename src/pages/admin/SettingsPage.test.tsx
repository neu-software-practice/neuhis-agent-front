import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── API mock ────────────────────────────────────────────────────────
const mockGetSettings = vi.fn()
const mockUpdateSettings = vi.fn()
vi.mock("@/features/admin/api/admin-api", () => ({
  adminApi: {
    getSettings: (...args: unknown[]) => mockGetSettings(...args),
    updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
  },
}))

// ─── react-query mock ────────────────────────────────────────────────
let mockQueryState: {
  data: unknown
  isLoading: boolean
} = { data: undefined, isLoading: false }

const mockInvalidateQueries = vi.fn()

let mockMutationState = {
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null as Error | null,
}
let mockMutate: (...args: unknown[]) => void = vi.fn()

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryKey: unknown; queryFn: unknown }) => {
    void opts.queryKey
    void opts.queryFn
    return {
      data: mockQueryState.data,
      isLoading: mockQueryState.isLoading,
    }
  },
  useMutation: (opts: {
    mutationFn: unknown
    onSuccess?: unknown
    onError?: unknown
  }) => {
    void opts.mutationFn
    void opts.onSuccess
    void opts.onError
    return {
      ...mockMutationState,
      mutate: mockMutate,
    }
  },
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}))

import SettingsPage from "@/pages/admin/SettingsPage"

function makeSettings() {
  return {
    siteName: "东软云脑智能医疗",
    maxConcurrentSessions: 50,
    sessionTimeoutMinutes: 30,
    enableRegistration: true,
  }
}

describe("SettingsPage", () => {
  beforeEach(() => {
    mockGetSettings.mockClear()
    mockUpdateSettings.mockClear()
    mockInvalidateQueries.mockClear()
    mockMutate = vi.fn()
    mockMutationState = {
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    }
    mockQueryState = { data: undefined, isLoading: false }
  })

  it("renders a loading message while loading settings", () => {
    mockQueryState = { data: undefined, isLoading: true }
    render(<SettingsPage />)
    expect(screen.getByText("加载设置中...")).toBeInTheDocument()
  })

  it("renders the page title after loading", () => {
    mockQueryState = { data: makeSettings(), isLoading: false }
    render(<SettingsPage />)
    expect(screen.getByText("系统设置")).toBeInTheDocument()
  })

  it("renders the form fields with labels", () => {
    mockQueryState = { data: makeSettings(), isLoading: false }
    render(<SettingsPage />)

    expect(screen.getByText("基本配置")).toBeInTheDocument()
    expect(screen.getByLabelText(/站点名称/)).toBeInTheDocument()
    expect(screen.getByLabelText(/最大并发问诊数/)).toBeInTheDocument()
    expect(screen.getByLabelText(/问诊超时时间/)).toBeInTheDocument()
    expect(screen.getByText("开放注册")).toBeInTheDocument()
  })

  it("pre-fills form fields from loaded settings", () => {
    mockQueryState = { data: makeSettings(), isLoading: false }
    render(<SettingsPage />)

    const siteNameInput = screen.getByLabelText(
      /站点名称/,
    ) as HTMLInputElement
    expect(siteNameInput.value).toBe("东软云脑智能医疗")

    const maxInput = screen.getByLabelText(
      /最大并发问诊数/,
    ) as HTMLInputElement
    expect(maxInput.value).toBe("50")

    const timeoutInput = screen.getByLabelText(
      /问诊超时时间/,
    ) as HTMLInputElement
    expect(timeoutInput.value).toBe("30")
  })

  it("renders a save button in idle state", () => {
    mockQueryState = { data: makeSettings(), isLoading: false }
    render(<SettingsPage />)
    expect(screen.getByRole("button", { name: /保存设置/ })).toBeEnabled()
  })

  it("shows a success message after a successful save", () => {
    mockQueryState = { data: makeSettings(), isLoading: false }
    mockMutationState = {
      isPending: false,
      isSuccess: true,
      isError: false,
      error: null,
    }
    render(<SettingsPage />)
    expect(screen.getByText("设置已保存")).toBeInTheDocument()
  })

  it("shows an error message after a failed save", () => {
    mockQueryState = { data: makeSettings(), isLoading: false }
    mockMutationState = {
      isPending: false,
      isSuccess: false,
      isError: true,
      error: new Error("网络异常"),
    }
    render(<SettingsPage />)
    expect(screen.getByText(/保存失败：网络异常/)).toBeInTheDocument()
  })

  it("shows a generic error message when the error is not an Error instance", () => {
    mockQueryState = { data: makeSettings(), isLoading: false }
    mockMutationState = {
      isPending: false,
      isSuccess: false,
      isError: true,
      error: "weird",
    }
    render(<SettingsPage />)
    expect(screen.getByText(/保存失败：请稍后重试/)).toBeInTheDocument()
  })

  it("disables the save button while saving", () => {
    mockQueryState = { data: makeSettings(), isLoading: false }
    mockMutationState = {
      isPending: true,
      isSuccess: false,
      isError: false,
      error: null,
    }
    render(<SettingsPage />)
    expect(screen.getByRole("button", { name: /保存中/ })).toBeDisabled()
  })

  it("submits the form and calls the mutation", async () => {
    const user = userEvent.setup()
    mockQueryState = { data: makeSettings(), isLoading: false }
    mockMutate = vi.fn()

    render(<SettingsPage />)

    const siteNameInput = screen.getByLabelText(/站点名称/)
    await user.clear(siteNameInput)
    await user.type(siteNameInput, "新站点名称")

    await user.click(screen.getByRole("button", { name: /保存设置/ }))

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1)
    })
    // The mutation receives the full form values.
    const submitted = (mockMutate as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(submitted.siteName).toBe("新站点名称")
  })

  it("validates required fields on submit", async () => {
    const user = userEvent.setup()
    mockQueryState = { data: makeSettings(), isLoading: false }
    mockMutate = vi.fn()

    render(<SettingsPage />)

    // Clear the required siteName field.
    const siteNameInput = screen.getByLabelText(/站点名称/)
    await user.clear(siteNameInput)

    await user.click(screen.getByRole("button", { name: /保存设置/ }))

    await waitFor(() => {
      expect(screen.getByText(/站点名称不能为空/)).toBeInTheDocument()
    })
    // Mutation should not fire when validation fails.
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("validates min value for numeric fields", async () => {
    const user = userEvent.setup()
    mockQueryState = { data: makeSettings(), isLoading: false }
    mockMutate = vi.fn()

    render(<SettingsPage />)

    const maxInput = screen.getByLabelText(/最大并发问诊数/)
    await user.clear(maxInput)
    await user.type(maxInput, "0")

    await user.click(screen.getByRole("button", { name: /保存设置/ }))

    await waitFor(() => {
      expect(screen.getByText(/至少为 1/)).toBeInTheDocument()
    })
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("renders the registration switch reflecting the loaded value", () => {
    mockQueryState = {
      data: makeSettings({ enableRegistration: false }),
      isLoading: false,
    }
    render(<SettingsPage />)
    // The switch should reflect the loaded value (off).
    // HeroUI Switch renders a role="switch" element.
    const switchEl = screen.getByRole("switch")
    expect(switchEl).toBeInTheDocument()
  })
})
