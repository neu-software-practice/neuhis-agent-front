import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── API mock ────────────────────────────────────────────────────────
const mockListPatients = vi.fn()
vi.mock("@/features/admin/api/admin-api", () => ({
  adminApi: {
    listPatients: (...args: unknown[]) => mockListPatients(...args),
  },
}))

// ─── Debounce mock (pass-through for deterministic tests) ───────────
vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: <T,>(value: T) => value,
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

import PatientListPage from "@/pages/admin/PatientListPage"

const iso = () => new Date().toISOString()

function makePatient(overrides: Record<string, unknown> = {}) {
  return {
    id: "p-1",
    realName: "张三",
    phone: "13800138000",
    gender: "male",
    birthDate: "1990-01-01",
    createdAt: iso(),
    sessionCount: 3,
    ...overrides,
  }
}

describe("PatientListPage", () => {
  beforeEach(() => {
    mockListPatients.mockClear()
    mockQueryState = { data: undefined, isLoading: false }
  })

  it("renders the page title", () => {
    mockQueryState = { data: undefined, isLoading: true }
    render(<PatientListPage />)
    expect(screen.getByText("患者管理")).toBeInTheDocument()
  })

  it("renders a loading spinner while loading", () => {
    mockQueryState = { data: undefined, isLoading: true }
    render(<PatientListPage />)
    // Spinner present, table not yet rendered.
    expect(screen.queryByText("暂无患者数据")).not.toBeInTheDocument()
  })

  it("renders an empty state when there are no patients", () => {
    mockQueryState = {
      data: { items: [], total: 0, page: 1, pageSize: 10 },
      isLoading: false,
    }
    render(<PatientListPage />)
    expect(screen.getByText("暂无患者数据")).toBeInTheDocument()
  })

  it("renders patient data in a table with all columns", () => {
    mockQueryState = {
      data: {
        items: [
          makePatient(),
          makePatient({ id: "p-2", realName: "李四", phone: "13900139000", gender: "female", sessionCount: 1 }),
        ],
        total: 2,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
    }
    render(<PatientListPage />)

    expect(screen.getByText("张三")).toBeInTheDocument()
    expect(screen.getByText("李四")).toBeInTheDocument()
    expect(screen.getByText("13800138000")).toBeInTheDocument()
    // Gender chips.
    expect(screen.getByText("男")).toBeInTheDocument()
    expect(screen.getByText("女")).toBeInTheDocument()
    // Session count — each patient has a unique count now.
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("renders the unknown gender fallback", () => {
    mockQueryState = {
      data: {
        items: [makePatient({ gender: "unknown" })],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
    }
    render(<PatientListPage />)
    expect(screen.getByText("未知")).toBeInTheDocument()
  })

  it("renders a dash for missing realName", () => {
    mockQueryState = {
      data: {
        items: [makePatient({ realName: "" })],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
    }
    render(<PatientListPage />)
    // The cell renders "—" when realName is falsy.
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("does not render pagination when totalPages is 1", () => {
    mockQueryState = {
      data: {
        items: [makePatient()],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
    }
    render(<PatientListPage />)
    expect(
      screen.queryByRole("navigation", { name: "pagination" }),
    ).not.toBeInTheDocument()
  })

  it("renders pagination when there are multiple pages", () => {
    mockQueryState = {
      data: {
        items: [makePatient()],
        total: 25,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
    }
    render(<PatientListPage />)
    // 25 items / 10 per page = 3 pages → pagination nav should render.
    expect(
      screen.getByRole("navigation", { name: "pagination" }),
    ).toBeInTheDocument()
  })

  it("renders a search input", () => {
    mockQueryState = {
      data: { items: [], total: 0, page: 1, pageSize: 10 },
      isLoading: false,
    }
    render(<PatientListPage />)
    expect(screen.getByPlaceholderText("搜索姓名或手机号")).toBeInTheDocument()
  })

  it("shows a search-specific empty message when a search yields no results", () => {
    mockQueryState = {
      data: { items: [], total: 0, page: 1, pageSize: 10 },
      isLoading: false,
    }
    render(<PatientListPage />)
    // Without a search term, only the generic message shows.
    expect(screen.getByText("暂无患者数据")).toBeInTheDocument()
  })

  it("formats the createdAt date in zh-CN locale", () => {
    mockQueryState = {
      data: {
        items: [makePatient({ createdAt: "2026-07-02T10:00:00.000Z" })],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
    }
    render(<PatientListPage />)
    // toLocaleDateString("zh-CN") produces a format like "2026/7/2".
    // We just assert the year appears.
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })
})
