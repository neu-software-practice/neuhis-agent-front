import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiException } from "@/lib/api/errors"
import type { TimelineItem } from "@/features/workbench/api"

const navigate = vi.fn()
let loaderData = { sessionId: "visit-mock-completed" }
const snapshotQueryFn = vi.fn()

vi.mock("react-router", () => ({
  useLoaderData: () => loaderData,
  useNavigate: () => navigate,
}))

vi.mock("@/features/visits/api/queries", () => ({
  visitsQueries: {
    snapshot: () => ({
      queryKey: ["visits", "snapshot", "visit-mock-completed"],
      queryFn: snapshotQueryFn,
    }),
  },
}))

// Mock react-virtuoso to render all items directly (jsdom lacks layout engine)
vi.mock("react-virtuoso", () => ({
  Virtuoso: ({
    data,
    itemContent,
    components,
  }: {
    data: TimelineItem[]
    itemContent: (index: number, item: TimelineItem) => React.ReactNode
    components?: { Header?: React.ComponentType; Footer?: React.ComponentType }
  }) => {
    const Header = components?.Header
    const Footer = components?.Footer
    return (
      <div data-testid="virtuoso-mock">
        {Header ? <Header /> : null}
        {data.map((item, index) => (
          <div key={item.id}>{itemContent(index, item)}</div>
        ))}
        {Footer ? <Footer /> : null}
      </div>
    )
  },
}))

import ReadonlyVisitPage from "@/pages/workbench/ReadonlyVisitPage"

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

describe("ReadonlyVisitPage", () => {
  beforeEach(() => {
    navigate.mockReset()
    snapshotQueryFn.mockReset()
    loaderData = { sessionId: "visit-mock-completed" }
  })

  it("renders loading state (spinner) when query is loading", () => {
    snapshotQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<ReadonlyVisitPage />)
    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("renders error state with retry/back button on error", async () => {
    snapshotQueryFn.mockRejectedValue(
      new ApiException({
        code: "SESSION_NOT_FOUND",
        message: "找不到这次就诊记录",
        retriable: false,
      }),
    )
    renderWith(<ReadonlyVisitPage />)
    await waitFor(() => {
      expect(screen.getByText("返回历史记录")).toBeInTheDocument()
    })
  })

  it("renders empty state when timeline is empty", async () => {
    snapshotQueryFn.mockResolvedValue({
      session: {
        id: "visit-mock-completed",
        patientId: "patient-mock-001",
        patientName: "李明",
        entryType: "new",
        status: "completed",
        startedAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T01:00:00.000Z",
        askRound: 0,
        askRoundLimit: 6,
        labRound: 0,
        labRoundLimit: 2,
        timerPaused: false,
        summary: { chiefComplaint: "咽痛" },
      },
      timeline: [],
      readonly: true,
    })
    renderWith(<ReadonlyVisitPage />)
    await waitFor(() => {
      expect(screen.getByText("这次就诊没有可回看的记录")).toBeInTheDocument()
    })
  })

  it("renders the visit record (header + timeline) when data is available", async () => {
    snapshotQueryFn.mockResolvedValue({
      session: {
        id: "visit-mock-completed",
        patientId: "patient-mock-001",
        patientName: "李明",
        entryType: "new",
        status: "completed",
        startedAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T01:00:00.000Z",
        askRound: 0,
        askRoundLimit: 6,
        labRound: 0,
        labRoundLimit: 2,
        timerPaused: false,
        summary: { chiefComplaint: "咽痛" },
      },
      timeline: [
        {
          id: "tl-1",
          sessionId: "visit-mock-completed",
          kind: "message",
          status: "done",
          role: "patient",
          content: "我咽痛",
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      readonly: true,
    })
    renderWith(<ReadonlyVisitPage />)
    await waitFor(() => {
      expect(screen.getByText("就诊记录回看")).toBeInTheDocument()
    })
  })

  it("back button navigates to /history", () => {
    snapshotQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<ReadonlyVisitPage />)
    const backButton = screen.getByLabelText("返回历史记录")
    backButton.click()
    expect(navigate).toHaveBeenCalledWith("/history")
  })
})
