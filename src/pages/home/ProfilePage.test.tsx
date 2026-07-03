import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const navigate = vi.fn()
const logoutMock = vi.fn()
const contextQueryFn = vi.fn()
const addressesQueryFn = vi.fn()

vi.mock("react-router", () => ({
  useNavigate: () => navigate,
}))

vi.mock("@/features/auth/store/auth-store", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      user: { patientId: "patient-mock-001" },
      logout: logoutMock,
      login: vi.fn(),
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      updateTokens: vi.fn(),
    }),
}))

vi.mock("@/features/patient/api/queries", () => ({
  patientQueries: {
    context: () => ({
      queryKey: ["patient", "context", "patient-mock-001"],
      queryFn: contextQueryFn,
    }),
    addresses: () => ({
      queryKey: ["patient", "addresses", "patient-mock-001"],
      queryFn: addressesQueryFn,
    }),
  },
  patientMutations: {
    updateProfile: () => ({ mutationFn: vi.fn() }),
  },
  patientQueryKeys: {
    context: () => ["patient", "context", "patient-mock-001"],
    addresses: () => ["patient", "addresses", "patient-mock-001"],
  },
}))

import ProfilePage from "@/pages/home/ProfilePage"

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWith(ui: ReactNode) {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  )
}

function mockPatientContext(overrides: Record<string, unknown> = {}) {
  const { priorVisit, ...patientOverrides } = overrides
  return {
    patient: {
      id: "patient-mock-001",
      name: "李明",
      gender: "male",
      age: 34,
      allergies: [],
      chronicDiseases: [],
      longTermMedications: [],
      phoneMasked: "138****1111",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...patientOverrides,
    },
    medicalHistory: [],
    ...(priorVisit ? { priorVisit } : {}),
  }
}

describe("ProfilePage", () => {
  beforeEach(() => {
    navigate.mockReset()
    logoutMock.mockReset()
    contextQueryFn.mockReset()
    addressesQueryFn.mockReset()
  })

  it("renders loading state", () => {
    contextQueryFn.mockReturnValue(new Promise(() => {}))
    addressesQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<ProfilePage />)
    // Loading state has aria-label="加载中"
    expect(screen.getByLabelText("加载中")).toBeInTheDocument()
  })

  it("renders error state with retry", async () => {
    contextQueryFn.mockRejectedValue(new Error("加载失败"))
    addressesQueryFn.mockResolvedValue({ addresses: [] })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("资料加载失败")).toBeInTheDocument()
    })
    expect(screen.getByText("重试")).toBeInTheDocument()
  })

  it("renders patient info when data is available", async () => {
    contextQueryFn.mockResolvedValue(
      mockPatientContext({ allergies: ["青霉素"] }),
    )
    addressesQueryFn.mockResolvedValue({ addresses: [] })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("李明")).toBeInTheDocument()
    })
    // PatientSummaryCard renders the name
    expect(screen.getByText("男")).toBeInTheDocument()
    // EditableChipList renders section labels
    expect(screen.getByText("过敏史")).toBeInTheDocument()
    expect(screen.getByText("慢性病")).toBeInTheDocument()
    expect(screen.getByText("长期用药")).toBeInTheDocument()
  })

  it("renders navigation entries when data available", async () => {
    contextQueryFn.mockResolvedValue(mockPatientContext())
    addressesQueryFn.mockResolvedValue({ addresses: [] })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("账单记录")).toBeInTheDocument()
    })
    expect(screen.getByText("医嘱记录")).toBeInTheDocument()
    expect(screen.getByText("收货地址")).toBeInTheDocument()
  })

  it("renders logout button", async () => {
    contextQueryFn.mockResolvedValue(mockPatientContext())
    addressesQueryFn.mockResolvedValue({ addresses: [] })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("退出登录")).toBeInTheDocument()
    })
  })

  it("calls logout and navigates to /login on logout click", async () => {
    contextQueryFn.mockResolvedValue(mockPatientContext())
    addressesQueryFn.mockResolvedValue({ addresses: [] })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("退出登录")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText("退出登录"))
    expect(logoutMock).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith("/login", { replace: true })
  })

  it("navigates to /billing when billing entry is clicked", async () => {
    contextQueryFn.mockResolvedValue(mockPatientContext())
    addressesQueryFn.mockResolvedValue({ addresses: [] })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("账单记录")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText("账单记录"))
    expect(navigate).toHaveBeenCalledWith("/billing")
  })

  it("navigates to /medical-orders when medical orders entry is clicked", async () => {
    contextQueryFn.mockResolvedValue(mockPatientContext())
    addressesQueryFn.mockResolvedValue({ addresses: [] })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("医嘱记录")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText("医嘱记录"))
    expect(navigate).toHaveBeenCalledWith("/medical-orders")
  })

  it("navigates to /addresses when address entry is clicked", async () => {
    contextQueryFn.mockResolvedValue(mockPatientContext())
    addressesQueryFn.mockResolvedValue({ addresses: [] })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("收货地址")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText("收货地址"))
    expect(navigate).toHaveBeenCalledWith("/addresses")
  })

  it("shows default address when one is set", async () => {
    contextQueryFn.mockResolvedValue(mockPatientContext())
    addressesQueryFn.mockResolvedValue({
      addresses: [
        {
          id: "addr-1",
          name: "张三",
          phone: "13800138000",
          province: "辽宁省",
          city: "沈阳市",
          district: "和平区",
          detail: "南京南街100号",
          isDefault: true,
        },
      ],
    })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("张三")).toBeInTheDocument()
    })
    expect(screen.getByText("13800138000")).toBeInTheDocument()
  })

  it("shows prompt to set default address when addresses exist but none default", async () => {
    contextQueryFn.mockResolvedValue(mockPatientContext())
    addressesQueryFn.mockResolvedValue({
      addresses: [
        {
          id: "addr-2",
          name: "李四",
          phone: "13900139000",
          province: "辽宁省",
          city: "大连市",
          district: "中山区",
          detail: "中山路200号",
          isDefault: false,
        },
      ],
    })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("暂无默认地址，点击设置")).toBeInTheDocument()
    })
  })

  it("shows prompt to add address when none exist", async () => {
    contextQueryFn.mockResolvedValue(mockPatientContext())
    addressesQueryFn.mockResolvedValue({ addresses: [] })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("暂无收货地址，点击添加")).toBeInTheDocument()
    })
  })

  it("renders prior visit section when present", async () => {
    contextQueryFn.mockResolvedValue(
      mockPatientContext({
        priorVisit: {
          diagnosis: "上呼吸道感染",
          labResultSummary: "血常规正常",
          treatmentSummary: "口服抗生素",
        },
      }),
    )
    addressesQueryFn.mockResolvedValue({ addresses: [] })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("上次就诊")).toBeInTheDocument()
    })
    expect(screen.getByText(/上呼吸道感染/)).toBeInTheDocument()
    expect(screen.getByText(/血常规正常/)).toBeInTheDocument()
    expect(screen.getByText(/口服抗生素/)).toBeInTheDocument()
  })

  it("does not render prior visit section when absent", async () => {
    contextQueryFn.mockResolvedValue(mockPatientContext())
    addressesQueryFn.mockResolvedValue({ addresses: [] })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("账单记录")).toBeInTheDocument()
    })
    expect(screen.queryByText("上次就诊")).not.toBeInTheDocument()
  })

  it("shows generic error description when error is not Error instance", async () => {
    contextQueryFn.mockRejectedValue("string error")
    addressesQueryFn.mockResolvedValue({ addresses: [] })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("无法获取患者信息，请稍后重试。")).toBeInTheDocument()
    })
  })

  it("shows error message from Error instance", async () => {
    contextQueryFn.mockRejectedValue(new Error("自定义错误"))
    addressesQueryFn.mockResolvedValue({ addresses: [] })
    renderWith(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByText("自定义错误")).toBeInTheDocument()
    })
  })
})
