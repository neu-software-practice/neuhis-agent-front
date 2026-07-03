import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const navigate = vi.fn()
const listQueryFn = vi.fn()

vi.mock("react-router", () => ({
  useNavigate: () => navigate,
}))

vi.mock("@/features/medical-orders/api/queries", () => ({
  medicalOrderQueries: {
    list: () => ({
      queryKey: ["medical-orders", "list"],
      queryFn: listQueryFn,
    }),
  },
}))

import MedicalOrdersPage from "@/pages/home/MedicalOrdersPage"

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

describe("MedicalOrdersPage", () => {
  beforeEach(() => {
    navigate.mockReset()
    listQueryFn.mockReset()
  })

  it("renders filter tabs", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<MedicalOrdersPage />)
    expect(screen.getByText("全部")).toBeInTheDocument()
    expect(screen.getByText("健康建议")).toBeInTheDocument()
    expect(screen.getByText("处方药品")).toBeInTheDocument()
  })

  it("renders loading state", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<MedicalOrdersPage />)
    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("renders error state with retry", async () => {
    listQueryFn.mockRejectedValue(new Error("加载失败"))
    renderWith(<MedicalOrdersPage />)
    await waitFor(() => {
      expect(screen.getByText("医嘱记录加载失败")).toBeInTheDocument()
    })
    expect(screen.getByText("重试")).toBeInTheDocument()
  })

  it("renders records when data available", async () => {
    listQueryFn.mockResolvedValue({
      items: [
        {
          recordId: "order-1",
          sessionId: "visit-1",
          sessionTitle: "发热问诊",
          kind: "advice",
          advices: ["多休息", "多饮水"],
          handledAt: "2026-06-01T00:00:00.000Z",
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    })
    renderWith(<MedicalOrdersPage />)
    await waitFor(() => {
      expect(screen.getByText("多休息")).toBeInTheDocument()
    })
  })

  it("renders empty state when no records", async () => {
    listQueryFn.mockResolvedValue({ items: [] })
    renderWith(<MedicalOrdersPage />)
    await waitFor(() => {
      expect(screen.getByText("暂无医嘱记录")).toBeInTheDocument()
    })
  })

  it("back button navigates to /profile", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<MedicalOrdersPage />)
    const backButton = screen.getByLabelText("返回个人中心")
    backButton.click()
    expect(navigate).toHaveBeenCalledWith("/profile")
  })
})
