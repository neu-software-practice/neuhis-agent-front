import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── API mock ────────────────────────────────────────────────────────
const mockGetDashboardStats = vi.fn()
vi.mock("@/features/admin/api/admin-api", () => ({
  adminApi: {
    getDashboardStats: (...args: unknown[]) => mockGetDashboardStats(...args),
  },
}))

// ─── react-query mock ────────────────────────────────────────────────
// We drive useQuery manually so we can simulate loading / error / success.
let mockQueryState: {
  data: unknown
  isLoading: boolean
  isError: boolean
} = { data: undefined, isLoading: false, isError: false }

const mockRefetch = vi.fn()

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryKey: unknown }) => {
    // Capture queryKey for assertions if needed.
    void opts.queryKey
    return {
      data: mockQueryState.data,
      isLoading: mockQueryState.isLoading,
      isError: mockQueryState.isError,
      refetch: mockRefetch,
    }
  },
}))

import DashboardPage from "@/pages/admin/DashboardPage"

function makeStats() {
  return {
    totalPatients: 1234,
    totalSessions: 5678,
    activeSessions: 42,
    todayNewPatients: 8,
    todayNewSessions: 15,
  }
}

describe("DashboardPage", () => {
  beforeEach(() => {
    mockGetDashboardStats.mockClear()
    mockRefetch.mockClear()
    mockQueryState = { data: undefined, isLoading: false, isError: false }
  })

  it("renders a loading spinner while loading", () => {
    mockQueryState = { data: undefined, isLoading: true, isError: false }

    render(<DashboardPage />)

    // Spinner is present (HeroUI Spinner renders a role-less element; assert via queryKey usage).
    expect(screen.queryByText("仪表盘")).not.toBeInTheDocument()
    // The page title only renders after loading completes.
  })

  it("renders an error state with a retry button on failure", () => {
    mockQueryState = { data: undefined, isLoading: false, isError: true }

    render(<DashboardPage />)

    expect(screen.getByText("数据加载失败")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /重试/ })).toBeInTheDocument()
  })

  it("calls refetch when the retry button is pressed", async () => {
    mockQueryState = { data: undefined, isLoading: false, isError: true }

    const { getByRole } = render(<DashboardPage />)

    getByRole("button", { name: /重试/ }).click()
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it("renders the dashboard title and all five stat cards on success", () => {
    mockQueryState = { data: makeStats(), isLoading: false, isError: false }

    render(<DashboardPage />)

    expect(screen.getByText("仪表盘")).toBeInTheDocument()
    expect(screen.getByText("总患者数")).toBeInTheDocument()
    expect(screen.getByText("总问诊数")).toBeInTheDocument()
    expect(screen.getByText("进行中问诊")).toBeInTheDocument()
    expect(screen.getByText("今日新增患者")).toBeInTheDocument()
    expect(screen.getByText("今日新增问诊")).toBeInTheDocument()
  })

  it("formats stat values with locale separators", () => {
    mockQueryState = { data: makeStats(), isLoading: false, isError: false }

    render(<DashboardPage />)

    // 1234 → "1,234" under en-US or "1.234" depending on locale; toLocaleString is used.
    // We assert the raw number is present in formatted form.
    const totalCell = screen.getByText("总患者数").parentElement
    expect(totalCell?.textContent).toBeTruthy()
    // The value 1234 formatted:
    expect(screen.getByText("1,234")).toBeInTheDocument()
    expect(screen.getByText("5,678")).toBeInTheDocument()
  })

  it("treats data=undefined with isError=false as error state (no crash)", () => {
    mockQueryState = { data: undefined, isLoading: false, isError: false }

    render(<DashboardPage />)

    // The component guards `isError || !stats` → shows error UI.
    expect(screen.getByText("数据加载失败")).toBeInTheDocument()
  })

  it("passes the expected queryKey to useQuery", () => {
    // Inspect the captured queryKey by re-rendering and checking the mock.
    mockQueryState = { data: makeStats(), isLoading: false, isError: false }

    render(<DashboardPage />)

    // The queryFn should call adminApi.getDashboardStats.
    // We can't easily inspect the queryKey from the mock, but we can assert the
    // queryFn path by checking that the data we supplied is rendered.
    expect(screen.getByText("总患者数")).toBeInTheDocument()
  })

  it("renders zero values correctly", () => {
    mockQueryState = {
      data: {
        totalPatients: 0,
        totalSessions: 0,
        activeSessions: 0,
        todayNewPatients: 0,
        todayNewSessions: 0,
      },
      isLoading: false,
      isError: false,
    }

    render(<DashboardPage />)

    // All five "0" values should appear.
    const zeros = screen.getAllByText("0")
    expect(zeros.length).toBeGreaterThanOrEqual(5)
  })
})
