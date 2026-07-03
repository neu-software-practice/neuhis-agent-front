import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import WorkbenchPage from "@/pages/workbench/WorkbenchPage"

vi.mock("react-router", () => ({
  useLoaderData: () => ({ sessionId: "visit-mock-active" }),
  useNavigate: () => vi.fn(),
}))

vi.mock("@/features/workbench/hooks/useWorkbenchSession", () => ({
  useWorkbenchSession: () => ({
    session: {
      id: "visit-mock-active",
      patientId: "patient-mock-001",
      patientName: "李明",
      status: "chatting",
      summary: {},
    },
    items: [],
    state: "chatting",
    context: {},
    blockingCard: undefined,
    loading: false,
    error: undefined,
    hasMore: false,
    fetchMore: vi.fn(),
    isFetchingMore: false,
    isStreaming: false,
    actions: {
      sendMessage: vi.fn(),
      askLockedQuestion: vi.fn(),
      submitFlowAction: vi.fn(),
      requestExit: vi.fn(),
      confirmExit: vi.fn(),
      pauseVisit: vi.fn(),
      resumeVisit: vi.fn(),
      reportVitals: vi.fn(),
      dismissEmergency: vi.fn(),
      confirmEmergency: vi.fn(),
      triggerTimeout: vi.fn(),
      suspendVisit: vi.fn(),
      resumeFromSuspended: vi.fn(),
    },
  }),
}))

vi.mock("@/features/workbench/components/ChatTimeline", () => ({
  ChatTimeline: ({ patientId }: { patientId?: string }) => (
    <div data-testid="chat-timeline" data-patient-id={patientId} />
  ),
}))

vi.mock("@/features/workbench/components/WorkbenchShell", () => ({
  WorkbenchShell: ({ timeline }: { timeline: ReactNode }) => (
    <main>{timeline}</main>
  ),
}))

vi.mock("@/features/workbench/components/ContextSummaryBar", () => ({
  ContextSummaryBar: () => <div />,
}))

vi.mock("@/features/workbench/components/WorkbenchHeader", () => ({
  WorkbenchHeader: () => <div />,
}))

vi.mock("@/features/workbench/components/WorkbenchSidebar", () => ({
  WorkbenchSidebar: () => <div />,
}))

vi.mock("@/features/workbench/components/InputDock", () => ({
  InputDock: () => <div />,
}))

vi.mock("@/features/workbench/components/LockBar", () => ({
  LockBar: () => <div />,
}))

vi.mock("@/features/workbench/components/ContextSummaryDrawer", () => ({
  ContextSummaryDrawer: () => null,
}))

vi.mock("@/features/workbench/components/EmergencyOverlay", () => ({
  EmergencyOverlay: () => null,
}))

vi.mock("@/features/workbench/components/CompletedExitSheet", () => ({
  CompletedExitSheet: () => null,
}))

vi.mock("@/features/workbench/components/ExitVisitSheet", () => ({
  ExitVisitSheet: () => null,
}))

vi.mock("@/features/workbench/components/PauseVisitSheet", () => ({
  PauseVisitSheet: () => null,
}))

vi.mock("@/features/workbench/components/LockQuestionSheet", () => ({
  LockQuestionSheet: () => null,
}))

vi.mock("@/features/workbench/components/SuspendOverlay", () => ({
  SuspendOverlay: () => null,
}))

vi.mock("@/features/workbench/hooks/useExitSettlement", () => ({
  useExitSettlement: () => ({ consequence: undefined }),
}))

vi.mock("@/features/workbench/hooks/useVisitCountdown", () => ({
  useVisitCountdown: () => ({ warningText: undefined }),
}))

vi.mock("@/features/workbench/utils/flow-progress", () => ({
  buildFlowProgressSteps: () => [],
}))

describe("WorkbenchPage", () => {
  it("passes the session patientId to the timeline for address lookups", () => {
    render(<WorkbenchPage />)

    expect(screen.getByTestId("chat-timeline")).toHaveAttribute(
      "data-patient-id",
      "patient-mock-001",
    )
  })
})
