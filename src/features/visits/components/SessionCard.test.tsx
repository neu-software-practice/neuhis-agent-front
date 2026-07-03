import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { VisitSessionSummary } from "@/features/visits/api"
import { SessionCard } from "@/features/visits/components/SessionCard"

function makeSession(overrides: Partial<VisitSessionSummary> = {}): VisitSessionSummary {
  return {
    id: "visit-1",
    patientId: "patient-1",
    patientName: "张三",
    entryType: "new",
    status: "chatting",
    startedAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    summary: {
      title: "头痛问诊",
      chiefComplaint: "头痛三天",
      lastMessage: "最近休息如何？",
    },
    ...overrides,
  }
}

describe("SessionCard", () => {
  it("renders the session title", () => {
    render(<SessionCard session={makeSession()} />)
    expect(screen.getByText("头痛问诊")).toBeInTheDocument()
  })

  it("falls back to chiefComplaint when title is absent", () => {
    render(
      <SessionCard
        session={makeSession({ summary: { chiefComplaint: "咳嗽一周" } })}
      />,
    )
    expect(screen.getByText("咳嗽一周")).toBeInTheDocument()
  })

  it("falls back to '未命名问诊' when both title and chiefComplaint are absent", () => {
    render(<SessionCard session={makeSession({ summary: {} })} />)
    expect(screen.getByText("未命名问诊")).toBeInTheDocument()
  })

  it("renders the last message when present", () => {
    render(<SessionCard session={makeSession()} />)
    expect(screen.getByText("最近休息如何？")).toBeInTheDocument()
  })

  it("does not render last message section when absent", () => {
    render(
      <SessionCard session={makeSession({ summary: { title: "问诊" } })} />,
    )
    expect(screen.queryByText("最近休息如何？")).not.toBeInTheDocument()
  })

  it("renders a VisitStatusBadge", () => {
    render(<SessionCard session={makeSession({ status: "chatting" })} />)
    expect(screen.getByText("问诊中")).toBeInTheDocument()
  })

  it("renders '继续就诊' button for active statuses", () => {
    render(<SessionCard session={makeSession({ status: "chatting" })} />)
    expect(screen.getByText("继续就诊")).toBeInTheDocument()
  })

  it("renders '继续就诊' for analyzing status", () => {
    render(<SessionCard session={makeSession({ status: "analyzing" })} />)
    expect(screen.getByText("继续就诊")).toBeInTheDocument()
  })

  it("renders '继续就诊' for blocked status", () => {
    render(
      <SessionCard
        session={makeSession({ status: "blocked", activeCardId: "card-1" })}
      />,
    )
    expect(screen.getByText("继续就诊")).toBeInTheDocument()
  })

  it("renders '发起复诊' and '回看记录' for completed status", () => {
    render(<SessionCard session={makeSession({ status: "completed" })} />)
    expect(screen.getByText("发起复诊")).toBeInTheDocument()
    expect(screen.getByText("回看记录")).toBeInTheDocument()
  })

  it("renders '继续问诊' for suspended status", () => {
    render(<SessionCard session={makeSession({ status: "suspended" })} />)
    expect(screen.getByText("继续问诊")).toBeInTheDocument()
  })

  it("renders '回看记录' for terminal statuses", () => {
    render(<SessionCard session={makeSession({ status: "exited" })} />)
    expect(screen.getByText("回看记录")).toBeInTheDocument()
  })

  it("renders '回看记录' for transferred status", () => {
    render(<SessionCard session={makeSession({ status: "transferred" })} />)
    expect(screen.getByText("回看记录")).toBeInTheDocument()
  })

  it("calls onContinue when '继续就诊' is clicked for active status", async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(
      <SessionCard
        session={makeSession({ status: "chatting" })}
        onContinue={onContinue}
      />,
    )
    await user.click(screen.getByText("继续就诊"))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it("calls onFollowUp when '发起复诊' is clicked for completed status", async () => {
    const user = userEvent.setup()
    const onFollowUp = vi.fn()
    render(
      <SessionCard
        session={makeSession({ status: "completed" })}
        onFollowUp={onFollowUp}
      />,
    )
    await user.click(screen.getByText("发起复诊"))
    expect(onFollowUp).toHaveBeenCalledTimes(1)
  })

  it("calls onViewRecord when '回看记录' is clicked for completed status", async () => {
    const user = userEvent.setup()
    const onViewRecord = vi.fn()
    render(
      <SessionCard
        session={makeSession({ status: "completed" })}
        onViewRecord={onViewRecord}
      />,
    )
    await user.click(screen.getByText("回看记录"))
    expect(onViewRecord).toHaveBeenCalledTimes(1)
  })

  it("calls onViewRecord when '回看记录' is clicked for terminal status", async () => {
    const user = userEvent.setup()
    const onViewRecord = vi.fn()
    render(
      <SessionCard
        session={makeSession({ status: "exited" })}
        onViewRecord={onViewRecord}
      />,
    )
    await user.click(screen.getByText("回看记录"))
    expect(onViewRecord).toHaveBeenCalledTimes(1)
  })

  it("calls onContinue when '继续问诊' is clicked for suspended status", async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(
      <SessionCard
        session={makeSession({ status: "suspended" })}
        onContinue={onContinue}
      />,
    )
    await user.click(screen.getByText("继续问诊"))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it("applies custom className", () => {
    const { container } = render(
      <SessionCard session={makeSession()} className="custom-cls" />,
    )
    expect(container.querySelector(".custom-cls")).toBeInTheDocument()
  })
})
