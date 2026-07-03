import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── jsdom polyfills ────────────────────────────────────────────────
// jsdom does not implement matchMedia; several hooks (useIsDesktop) rely on it.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList
}

// ─── Router mocks ────────────────────────────────────────────────────
const navigate = vi.fn()
let loaderData = { sessionId: "visit-mock-active" }

vi.mock("react-router", () => ({
  useLoaderData: () => loaderData,
  useNavigate: () => navigate,
}))

// ─── useWorkbenchSession mock ────────────────────────────────────────
const mockSuspendVisit = vi.fn()
const mockResumeVisit = vi.fn()
const mockSendMessage = vi.fn()
const mockSubmitFlowAction = vi.fn()
const mockReportVitals = vi.fn()
const mockConfirmEmergency = vi.fn()
const mockDismissEmergency = vi.fn()

vi.mock("@/features/workbench/hooks/useWorkbenchSession", () => ({
  useWorkbenchSession: vi.fn(),
}))

import WorkbenchPage from "@/pages/workbench/WorkbenchPage"
import { useWorkbenchSession } from "@/features/workbench/hooks/useWorkbenchSession"
import type { UseWorkbenchSessionResult } from "@/features/workbench/hooks/useWorkbenchSession"

function createMockSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "visit-mock-active",
    patientId: "patient-mock-001",
    patientName: "李明",
    entryType: "new",
    status: "chatting",
    startedAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T01:00:00.000Z",
    lastActivityAt: "2026-06-01T01:00:00.000Z",
    askRound: 1,
    askRoundLimit: 6,
    labRound: 0,
    labRoundLimit: 2,
    timerPaused: false,
    summary: { chiefComplaint: "发热", lastMessage: "请描述" },
    ...overrides,
  }
}

function createMockResult(overrides: Partial<UseWorkbenchSessionResult> = {}): UseWorkbenchSessionResult {
  return {
    session: createMockSession(),
    items: [],
    state: "chatting",
    context: { timerPaused: false, askRound: 1, labRound: 0, blocking: false },
    blockingCard: undefined,
    loading: false,
    error: undefined,
    hasMore: false,
    fetchMore: vi.fn(),
    isFetchingMore: false,
    isStreaming: false,
    actions: {
      sendMessage: mockSendMessage,
      askLockedQuestion: vi.fn(),
      submitFlowAction: mockSubmitFlowAction,
      requestExit: vi.fn(),
      confirmExit: vi.fn(),
      pauseVisit: vi.fn(),
      resumeVisit: mockResumeVisit,
      reportVitals: mockReportVitals,
      dismissEmergency: mockDismissEmergency,
      confirmEmergency: mockConfirmEmergency,
      triggerTimeout: vi.fn(),
      suspendVisit: mockSuspendVisit,
      resumeFromSuspended: vi.fn(),
    },
    ...overrides,
  }
}

describe("WorkbenchPage", () => {
  beforeEach(() => {
    navigate.mockReset()
    mockSuspendVisit.mockReset()
    mockResumeVisit.mockReset()
    mockSendMessage.mockReset()
    mockSubmitFlowAction.mockReset()
    mockReportVitals.mockReset()
    mockConfirmEmergency.mockReset()
    mockDismissEmergency.mockReset()
    vi.mocked(useWorkbenchSession).mockReset()
    loaderData = { sessionId: "visit-mock-active" }
  })

  it("renders loading state when session is loading", () => {
    vi.mocked(useWorkbenchSession).mockReturnValue(createMockResult({
      loading: true,
      session: undefined,
    }))
    render(<WorkbenchPage />)
    expect(screen.getByText("正在加载...")).toBeInTheDocument()
  })

  it("renders error state with '加载失败' and '返回首页' button when there is an error", () => {
    vi.mocked(useWorkbenchSession).mockReturnValue(createMockResult({
      loading: false,
      error: "会话不存在",
    }))
    render(<WorkbenchPage />)
    expect(screen.getByText("加载失败")).toBeInTheDocument()
    expect(screen.getByText("返回首页")).toBeInTheDocument()
  })

  it("renders the workbench (header, timeline, input) when data is ready", () => {
    vi.mocked(useWorkbenchSession).mockReturnValue(createMockResult({
      loading: false,
      error: undefined,
    }))
    render(<WorkbenchPage />)
    // WorkbenchShell renders - the patient name appears in the sidebar and summary bar
    expect(screen.getByText("患者: 李明")).toBeInTheDocument()
    // The InputDock renders when there's no blocking card
    expect(screen.getByPlaceholderText("输入消息...")).toBeInTheDocument()
  })

  it("back-to-home button navigates to /", () => {
    vi.mocked(useWorkbenchSession).mockReturnValue(createMockResult({
      loading: false,
      error: "会话不存在",
    }))
    render(<WorkbenchPage />)
    const backButton = screen.getByText("返回首页")
    backButton.click()
    expect(navigate).toHaveBeenCalledWith("/")
  })
})
