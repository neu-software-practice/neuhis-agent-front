import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { TerminalTimelineItem } from "@/features/workbench/api"
import { TerminalEventRow } from "@/features/workbench/components/TerminalEventRow"

function makeTerminalEvent(
  overrides: Partial<TerminalTimelineItem>,
): TerminalTimelineItem {
  return {
    id: "te-001",
    sessionId: "session-test",
    kind: "terminal",
    status: "done",
    createdAt: "2026-06-28T01:50:00.000Z",
    reason: "exited",
    title: "问诊已结束",
    ...overrides,
  }
}

describe("TerminalEventRow", () => {
  it("renders the title text", () => {
    const item = makeTerminalEvent({ title: "问诊终止" })
    render(<TerminalEventRow item={item} />)

    expect(screen.getByText("问诊终止")).toBeInTheDocument()
  })

  it("renders description when provided", () => {
    const item = makeTerminalEvent({
      title: "问诊终止",
      description: "因超时自动终止",
    })
    render(<TerminalEventRow item={item} />)

    expect(screen.getByText("因超时自动终止")).toBeInTheDocument()
  })

  it("does not render description when not provided", () => {
    const item = makeTerminalEvent({
      title: "问诊终止",
      description: undefined,
    })
    render(<TerminalEventRow item={item} />)

    expect(screen.getByText("问诊终止")).toBeInTheDocument()
  })

  it("renders suggestedDepartment for referral", () => {
    const item = makeTerminalEvent({
      reason: "referral",
      title: "建议转诊",
      suggestedDepartment: "心血管内科",
    })
    render(<TerminalEventRow item={item} />)

    expect(screen.getByText("建议转至：心血管内科")).toBeInTheDocument()
  })

  it("does not render suggestedDepartment when not provided", () => {
    const item = makeTerminalEvent({
      reason: "exited",
      title: "已退出",
    })
    render(<TerminalEventRow item={item} />)

    expect(screen.queryByText(/建议转至/)).not.toBeInTheDocument()
  })

  it("renders all supported reasons without crashing", () => {
    const reasons: TerminalTimelineItem["reason"][] = [
      "emergency",
      "timeout",
      "ask_limit_reached",
      "lab_limit_reached",
      "referral",
      "capability_insufficient",
      "exited",
      "patient_request",
    ]

    for (const reason of reasons) {
      const { unmount } = render(
        <TerminalEventRow
          item={makeTerminalEvent({ reason, title: reason })}
        />,
      )
      expect(screen.getByText(reason)).toBeInTheDocument()
      unmount()
    }
  })

  it("renders icon for each reason type", () => {
    const item = makeTerminalEvent({ reason: "emergency" })
    const { container } = render(<TerminalEventRow item={item} />)

    expect(container.querySelector("svg")).toBeInTheDocument()
  })
})
