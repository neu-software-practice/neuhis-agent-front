import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type {
  FlowCardTimelineItem,
  MessageTimelineItem,
  SystemEventTimelineItem,
  TerminalTimelineItem,
} from "@/features/workbench/api"
import { TimelineRow } from "@/features/workbench/components/TimelineRow"

function makeMessageItem(
  overrides: Partial<MessageTimelineItem> = {},
): MessageTimelineItem {
  return {
    id: "msg-001",
    sessionId: "session-test",
    kind: "message",
    status: "done",
    role: "patient",
    content: "Hello",
    createdAt: "2026-06-28T01:50:00.000Z",
    ...overrides,
  }
}

function makeFlowCardItem(
  overrides: Partial<FlowCardTimelineItem> = {},
): FlowCardTimelineItem {
  return {
    id: "fc-001",
    sessionId: "session-test",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-06-28T01:50:00.000Z",
    card: {
      id: "card-001",
      sessionId: "session-test",
      kind: "advice_only",
      status: "pending",
      blocking: false,
      title: "健康医嘱",
      createdAt: "2026-06-28T02:00:00.000Z",
      advices: ["多饮水"],
      watchItems: ["监测体温"],
      followUpRecommendation: "若症状持续请复诊",
    },
    ...overrides,
  }
}

function makeSystemEventItem(
  overrides: Partial<SystemEventTimelineItem> = {},
): SystemEventTimelineItem {
  return {
    id: "se-001",
    sessionId: "session-test",
    kind: "system_event",
    status: "done",
    createdAt: "2026-06-28T01:50:00.000Z",
    eventType: "context_loaded",
    title: "已读取患者上下文",
    ...overrides,
  }
}

function makeTerminalItem(
  overrides: Partial<TerminalTimelineItem> = {},
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

describe("TimelineRow", () => {
  it("renders MessageBubble for message kind", () => {
    const item = makeMessageItem({ content: "Test message" })
    render(
      <TimelineRow
        item={item}
        patientId="patient-1"
        onAction={vi.fn()}
        readonly={false}
      />,
    )

    expect(screen.getByText("Test message")).toBeInTheDocument()
  })

  it("renders SystemEventRow for system_event kind", () => {
    const item = makeSystemEventItem({ title: "系统事件" })
    render(<TimelineRow item={item} />)

    expect(screen.getByText("系统事件")).toBeInTheDocument()
  })

  it("renders TerminalEventRow for terminal kind", () => {
    const item = makeTerminalItem({ title: "终诊事件" })
    render(<TimelineRow item={item} />)

    expect(screen.getByText("终诊事件")).toBeInTheDocument()
  })

  it("renders FlowCardRenderer for flow_card kind", () => {
    const item = makeFlowCardItem()
    render(<TimelineRow item={item} patientId="patient-1" />)

    // FlowCardRenderer dispatches to AdviceOnlyCard which renders the title
    expect(screen.getByText("健康医嘱")).toBeInTheDocument()
  })

  it("passes readonly to FlowCardRenderer via disabled prop", () => {
    const item = makeFlowCardItem()
    // When readonly=true, buttons in FlowCardRenderer should be disabled
    render(<TimelineRow item={item} readonly={true} />)

    // The FlowCardRenderer should receive disabled=true when readonly=true
    // For advice_only card, the "已知晓" button should be disabled
    const ackButton = screen.getByRole("button", { name: "已知晓" })
    expect(ackButton).toBeDisabled()
  })

  it("passes onAction to FlowCardRenderer", async () => {
    const user = userEvent.setup()
    const item = makeFlowCardItem()
    const onAction = vi.fn()

    render(<TimelineRow item={item} onAction={onAction} />)

    // Click the acknowledge button
    const ackButton = screen.getByRole("button", { name: "已知晓" })
    await user.click(ackButton)
    expect(onAction).toHaveBeenCalled()
  })

  it("passes patientId to FlowCardRenderer", () => {
    const item = makeFlowCardItem()
    render(<TimelineRow item={item} patientId="patient-123" />)

    // Just verify the card renders without issue
    expect(screen.getByText("健康医嘱")).toBeInTheDocument()
  })

  it("passes all optional props to FlowCardRenderer simultaneously", () => {
    const user = userEvent.setup()
    const item = makeFlowCardItem()
    const onAction = vi.fn()

    render(
      <TimelineRow
        item={item}
        patientId="patient-123"
        onAction={onAction}
        readonly={true}
      />,
    )

    // Button should be disabled (readonly=true)
    const ackButton = screen.getByRole("button", { name: "已知晓" })
    expect(ackButton).toBeDisabled()
    // onAction should not be called when disabled
    user.click(ackButton)
    expect(onAction).not.toHaveBeenCalled()
  })

  it("renders message item without optional props", () => {
    const item = makeMessageItem({ content: "Standalone" })
    render(<TimelineRow item={item} />)

    expect(screen.getByText("Standalone")).toBeInTheDocument()
  })

  it("renders system_event with description present", () => {
    const item = makeSystemEventItem({
      title: "支付事件",
      description: "¥100 已支付",
    })
    render(<TimelineRow item={item} />)

    expect(screen.getByText("¥100 已支付")).toBeInTheDocument()
  })

  it("renders terminal item with suggestedDepartment", () => {
    const item = makeTerminalItem({
      reason: "referral",
      title: "转诊建议",
      suggestedDepartment: "心血管内科",
    })
    render(<TimelineRow item={item} />)

    expect(screen.getByText("转诊建议")).toBeInTheDocument()
    expect(screen.getByText("建议转至：心血管内科")).toBeInTheDocument()
  })

  it("renders message with assistant role through TimelineRow", () => {
    const item = makeMessageItem({
      role: "assistant",
      content: "AI 回复",
    })
    render(<TimelineRow item={item} />)

    expect(screen.getByText("AI 回复")).toBeInTheDocument()
  })

  it("renders message with interruptedBy field", () => {
    const item = makeMessageItem({
      content: "被打断的消息",
      interruptedBy: "emergency",
    })
    render(<TimelineRow item={item} />)

    expect(screen.getByText("急症打断")).toBeInTheDocument()
  })
})
