import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const navigate = vi.fn()
const listQueryFn = vi.fn()

vi.mock("react-router", () => ({
  useNavigate: () => navigate,
}))

vi.mock("@/features/billing/api/queries", () => ({
  billingQueries: {
    list: () => ({
      queryKey: ["billing", "list"],
      queryFn: listQueryFn,
    }),
  },
}))

import BillingPage from "@/pages/home/BillingPage"

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

describe("BillingPage", () => {
  beforeEach(() => {
    navigate.mockReset()
    listQueryFn.mockReset()
  })

  it("renders filter tabs", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<BillingPage />)
    expect(screen.getByText("全部")).toBeInTheDocument()
    expect(screen.getByText("已支付")).toBeInTheDocument()
    expect(screen.getByText("待支付")).toBeInTheDocument()
    expect(screen.getByText("已退款")).toBeInTheDocument()
  })

  it("renders loading state", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<BillingPage />)
    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("renders error state with retry", async () => {
    listQueryFn.mockRejectedValue(new Error("加载失败"))
    renderWith(<BillingPage />)
    await waitFor(() => {
      expect(screen.getByText("账单加载失败")).toBeInTheDocument()
    })
    expect(screen.getByText("重试")).toBeInTheDocument()
  })

  it("renders billing records when data available", async () => {
    listQueryFn.mockResolvedValue({
      items: [
        {
          paymentId: "pay-1",
          sessionId: "visit-1",
          sessionTitle: "发热问诊",
          purpose: "lab",
          items: [{ name: "血常规", amount: 50 }],
          totalAmount: 50,
          insuranceAmount: 30,
          selfPayAmount: 20,
          paymentStatus: "paid",
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    })
    renderWith(<BillingPage />)
    await waitFor(() => {
      expect(screen.getByText("发热问诊")).toBeInTheDocument()
    })
  })

  it("renders empty state when no records", async () => {
    listQueryFn.mockResolvedValue({ items: [] })
    renderWith(<BillingPage />)
    await waitFor(() => {
      expect(screen.getByText("暂无账单记录")).toBeInTheDocument()
    })
  })

  it("back button navigates to /profile", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<BillingPage />)
    const backButton = screen.getByLabelText("返回个人中心")
    backButton.click()
    expect(navigate).toHaveBeenCalledWith("/profile")
  })
})
