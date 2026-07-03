import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── react-router mock ──────────────────────────────────────────────
const navigate = vi.fn()
vi.mock("react-router", () => ({
  useNavigate: () => navigate,
}))

// ─── queries mock ──────────────────────────────────────────────────
// Mock the visitsQueries module directly so we control what list() returns.
const listQueryFn = vi.fn()
vi.mock("@/features/visits/api/queries", () => ({
  visitsQueries: {
    list: () => ({
      queryKey: ["visits", "list", {}],
      queryFn: listQueryFn,
    }),
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
}))

import HistoryPage from "@/pages/home/HistoryPage"

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "visit-1",
    patientId: "patient-mock-001",
    patientName: "李明",
    entryType: "new",
    status: "chatting",
    startedAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T01:00:00.000Z",
    summary: {
      chiefComplaint: "发热",
      lastMessage: "请描述症状",
    },
    ...overrides,
  }
}

describe("HistoryPage", () => {
  beforeEach(() => {
    navigate.mockReset()
    listQueryFn.mockReset()
    mockQueryState = { data: undefined, isLoading: false }
  })

  it("renders filter tabs", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    mockQueryState = { data: undefined, isLoading: true }
    render(<HistoryPage />)
    expect(screen.getByText("全部")).toBeInTheDocument()
    expect(screen.getByText("进行中")).toBeInTheDocument()
    expect(screen.getByText("已完成")).toBeInTheDocument()
    expect(screen.getByText("已终止")).toBeInTheDocument()
  })

  it("renders loading state (spinner)", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    mockQueryState = { data: undefined, isLoading: true }
    render(<HistoryPage />)
    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("renders session cards when data is available", async () => {
    listQueryFn.mockResolvedValue({
      items: [makeSession({ status: "chatting" })],
    })
    mockQueryState = {
      data: { items: [makeSession({ status: "chatting" })] },
      isLoading: false,
    }
    render(<HistoryPage />)
    await waitFor(() => {
      expect(screen.getByText("继续就诊")).toBeInTheDocument()
    })
  })

  it("renders empty state when no sessions", async () => {
    listQueryFn.mockResolvedValue({ items: [] })
    mockQueryState = {
      data: { items: [] },
      isLoading: false,
    }
    render(<HistoryPage />)
    await waitFor(() => {
      expect(
        screen.getByText("还没有就诊记录，开始你的第一次问诊吧"),
      ).toBeInTheDocument()
    })
  })

  it("renders filtered empty state when filter has no results", async () => {
    // All sessions are "chatting" but we filter by "completed"
    listQueryFn.mockResolvedValue({
      items: [makeSession({ status: "chatting" })],
    })
    mockQueryState = {
      data: { items: [makeSession({ status: "chatting" })] },
      isLoading: false,
    }
    render(<HistoryPage />)
    await waitFor(() => {
      expect(screen.getByText("全部")).toBeInTheDocument()
    })
    // Click "已完成" tab
    fireEvent.click(screen.getByText("已完成"))
    await waitFor(() => {
      expect(screen.getByText("没有找到匹配的记录")).toBeInTheDocument()
    })
  })

  it("completed session shows follow-up and view-record buttons", async () => {
    listQueryFn.mockResolvedValue({
      items: [
        makeSession({
          id: "visit-completed",
          status: "completed",
          endedAt: "2026-06-01T01:00:00.000Z",
          summary: { chiefComplaint: "咽痛", lastMessage: "已完成" },
        }),
      ],
    })
    mockQueryState = {
      data: {
        items: [
          makeSession({
            id: "visit-completed",
            status: "completed",
            endedAt: "2026-06-01T01:00:00.000Z",
            summary: { chiefComplaint: "咽痛", lastMessage: "已完成" },
          }),
        ],
      },
      isLoading: false,
    }
    render(<HistoryPage />)
    await waitFor(() => {
      expect(screen.getByText("发起复诊")).toBeInTheDocument()
    })
    expect(screen.getByText("回看记录")).toBeInTheDocument()
  })

  it("terminated session shows only view-record button", async () => {
    listQueryFn.mockResolvedValue({
      items: [
        makeSession({
          id: "visit-transferred",
          status: "transferred",
          endedAt: "2026-06-01T01:00:00.000Z",
          summary: { chiefComplaint: "疑难杂症", lastMessage: "已转诊" },
        }),
      ],
    })
    mockQueryState = {
      data: {
        items: [
          makeSession({
            id: "visit-transferred",
            status: "transferred",
            endedAt: "2026-06-01T01:00:00.000Z",
            summary: { chiefComplaint: "疑难杂症", lastMessage: "已转诊" },
          }),
        ],
      },
      isLoading: false,
    }
    render(<HistoryPage />)
    await waitFor(() => {
      expect(screen.getByText("回看记录")).toBeInTheDocument()
    })
    // Terminated sessions should NOT show "继续就诊" or "发起复诊"
    expect(screen.queryByText("继续就诊")).not.toBeInTheDocument()
    expect(screen.queryByText("发起复诊")).not.toBeInTheDocument()
  })

  it("navigates to workbench when continue button is clicked", async () => {
    listQueryFn.mockResolvedValue({
      items: [makeSession({ id: "visit-continue", status: "chatting" })],
    })
    mockQueryState = {
      data: {
        items: [makeSession({ id: "visit-continue", status: "chatting" })],
      },
      isLoading: false,
    }
    render(<HistoryPage />)
    await waitFor(() => {
      expect(screen.getByText("继续就诊")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText("继续就诊"))
    expect(navigate).toHaveBeenCalledWith("/workbench/visit-continue")
  })

  it("navigates to follow-up page when follow-up button is clicked", async () => {
    listQueryFn.mockResolvedValue({
      items: [
        makeSession({
          id: "visit-followup",
          status: "completed",
          endedAt: "2026-06-01T01:00:00.000Z",
          summary: { chiefComplaint: "咽痛", lastMessage: "已完成" },
        }),
      ],
    })
    mockQueryState = {
      data: {
        items: [
          makeSession({
            id: "visit-followup",
            status: "completed",
            endedAt: "2026-06-01T01:00:00.000Z",
            summary: { chiefComplaint: "咽痛", lastMessage: "已完成" },
          }),
        ],
      },
      isLoading: false,
    }
    render(<HistoryPage />)
    await waitFor(() => {
      expect(screen.getByText("发起复诊")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText("发起复诊"))
    expect(navigate).toHaveBeenCalledWith(
      "/workbench/new?followUpFrom=visit-followup&draft=%E5%92%BD%E7%97%9B",
    )
  })

  it("navigates to history detail when view-record button is clicked", async () => {
    listQueryFn.mockResolvedValue({
      items: [
        makeSession({
          id: "visit-record",
          status: "completed",
          endedAt: "2026-06-01T01:00:00.000Z",
          summary: { chiefComplaint: "咽痛", lastMessage: "已完成" },
        }),
      ],
    })
    mockQueryState = {
      data: {
        items: [
          makeSession({
            id: "visit-record",
            status: "completed",
            endedAt: "2026-06-01T01:00:00.000Z",
            summary: { chiefComplaint: "咽痛", lastMessage: "已完成" },
          }),
        ],
      },
      isLoading: false,
    }
    render(<HistoryPage />)
    await waitFor(() => {
      expect(screen.getByText("回看记录")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText("回看记录"))
    expect(navigate).toHaveBeenCalledWith("/history/visit-record")
  })
})
