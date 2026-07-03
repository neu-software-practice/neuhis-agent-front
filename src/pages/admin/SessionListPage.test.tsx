import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── API mock ────────────────────────────────────────────────────────
const mockListSessions = vi.fn()
vi.mock("@/features/admin/api/admin-api", () => ({
  adminApi: {
    listSessions: (...args: unknown[]) => mockListSessions(...args),
  },
}))

// ─── react-query mock ────────────────────────────────────────────────
let mockQueryState: {
  data: unknown
  isLoading: boolean
} = { data: undefined, isLoading: false }

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryKey: unknown; queryFn: unknown }) => {
    void opts.queryKey
    void opts.queryFn
    return {
      data: mockQueryState.data,
      isLoading: mockQueryState.isLoading,
    }
  },
  keepPreviousData: Symbol("keepPreviousData"),
}))

import SessionListPage from "@/pages/admin/SessionListPage"

const iso = () => new Date().toISOString()

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "s-1",
    patientId: "p-1",
    patientName: "张三",
    title: "发热问诊",
    status: "active",
    createdAt: iso(),
    updatedAt: iso(),
    ...overrides,
  }
}

describe("SessionListPage", () => {
  beforeEach(() => {
    mockListSessions.mockClear()
    mockQueryState = { data: undefined, isLoading: false }
  })

  it("renders the page title", () => {
    mockQueryState = { data: undefined, isLoading: true }
    render(<SessionListPage />)
    expect(screen.getByText("问诊记录")).toBeInTheDocument()
  })

  it("renders a loading spinner while loading", () => {
    mockQueryState = { data: undefined, isLoading: true }
    render(<SessionListPage />)
    expect(screen.queryByText("暂无数据")).not.toBeInTheDocument()
  })

  it("renders an empty state when there are no sessions", () => {
    mockQueryState = {
      data: { items: [], total: 0, page: 1, pageSize: 10 },
      isLoading: false,
    }
    render(<SessionListPage />)
    expect(screen.getByText("暂无数据")).toBeInTheDocument()
  })

  it("renders session data in a table with status chips", () => {
    mockQueryState = {
      data: {
        items: [
          makeSession({ status: "active" }),
          makeSession({ id: "s-2", patientName: "李四", status: "completed" }),
          makeSession({ id: "s-3", status: "paused" }),
          makeSession({ id: "s-4", status: "terminated" }),
        ],
        total: 4,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
    }
    render(<SessionListPage />)

    expect(screen.getAllByText("张三").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText("李四")).toBeInTheDocument()
    expect(screen.getAllByText("发热问诊").length).toBeGreaterThanOrEqual(2)
    // Status labels.
    expect(screen.getByText("进行中")).toBeInTheDocument()
    expect(screen.getByText("已完成")).toBeInTheDocument()
    expect(screen.getByText("已暂停")).toBeInTheDocument()
    expect(screen.getByText("已终止")).toBeInTheDocument()
  })

  it("renders the raw status string when status is not in the label map", () => {
    mockQueryState = {
      data: {
        items: [makeSession({ status: "custom_status" })],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
    }
    render(<SessionListPage />)
    expect(screen.getByText("custom_status")).toBeInTheDocument()
  })

  it("renders a dash for missing patientName or title", () => {
    mockQueryState = {
      data: {
        items: [makeSession({ patientName: "", title: "" })],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
    }
    render(<SessionListPage />)
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2)
  })

  it("does not render pagination for a single page", () => {
    mockQueryState = {
      data: {
        items: [makeSession()],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
    }
    render(<SessionListPage />)
    expect(
      screen.queryByRole("navigation", { name: "pagination" }),
    ).not.toBeInTheDocument()
  })

  it("renders pagination when there are multiple pages", () => {
    mockQueryState = {
      data: {
        items: [makeSession()],
        total: 15,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
    }
    render(<SessionListPage />)
    expect(
      screen.getByRole("navigation", { name: "pagination" }),
    ).toBeInTheDocument()
  })

  it("renders a status filter select", () => {
    mockQueryState = {
      data: { items: [], total: 0, page: 1, pageSize: 10 },
      isLoading: false,
    }
    render(<SessionListPage />)
    expect(screen.getByText("状态筛选")).toBeInTheDocument()
  })

  it("formats createdAt and updatedAt as localized date-times", () => {
    mockQueryState = {
      data: {
        items: [
          makeSession({
            createdAt: "2026-07-02T10:30:00.000Z",
            updatedAt: "2026-07-02T11:00:00.000Z",
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
    }
    render(<SessionListPage />)
    // toLocaleString("zh-CN") includes the year.
    const yearMatches = screen.getAllByText(/2026/)
    expect(yearMatches.length).toBeGreaterThanOrEqual(2)
  })
})
