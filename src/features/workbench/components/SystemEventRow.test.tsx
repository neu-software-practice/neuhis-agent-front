import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { SystemEventTimelineItem } from "@/features/workbench/api"
import { SystemEventRow } from "@/features/workbench/components/SystemEventRow"

function makeSystemEvent(
  overrides: Partial<SystemEventTimelineItem>,
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

describe("SystemEventRow", () => {
  it("renders the title text", () => {
    const item = makeSystemEvent({ title: "加载中" })
    render(<SystemEventRow item={item} />)

    expect(screen.getByText("加载中")).toBeInTheDocument()
  })

  it("renders description when provided", () => {
    const item = makeSystemEvent({
      title: "支付成功",
      description: "已支付 ¥100",
    })
    render(<SystemEventRow item={item} />)

    expect(screen.getByText("已支付 ¥100")).toBeInTheDocument()
  })

  it("does not render description when not provided", () => {
    const item = makeSystemEvent({
      title: "支付成功",
      description: undefined,
    })
    render(<SystemEventRow item={item} />)

    // Only the title should be present
    expect(screen.getByText("支付成功")).toBeInTheDocument()
    // The description span (text-[11px]) should not exist
    expect(document.querySelector(".text-\\[11px\\]")).not.toBeInTheDocument()
  })

  it("does not render description when it is an empty string", () => {
    const item = makeSystemEvent({
      title: "支付成功",
      description: "",
    })
    const { container } = render(<SystemEventRow item={item} />)

    // Empty string is falsy, so description should not render
    expect(container.querySelector(".text-\\[11px\\]")).not.toBeInTheDocument()
  })

  it("renders description when it is explicitly null", () => {
    const item = makeSystemEvent({
      title: "支付成功",
      description: null as unknown as undefined,
    })
    render(<SystemEventRow item={item} />)

    // Title should still be present
    expect(screen.getByText("支付成功")).toBeInTheDocument()
    expect(document.querySelector(".text-\\[11px\\]")).not.toBeInTheDocument()
  })

  it("renders icon for known event types", () => {
    const item = makeSystemEvent({ eventType: "payment_succeeded" })
    const { container } = render(<SystemEventRow item={item} />)

    // lucide icons render as svg
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("does not render icon for unknown event types", () => {
    const item = makeSystemEvent({
      eventType: "unknown_type" as SystemEventTimelineItem["eventType"],
    })
    const { container } = render(<SystemEventRow item={item} />)

    // Unknown event type has no mapping, so no icon should render
    expect(container.querySelector("svg")).not.toBeInTheDocument()
  })

  it("renders all supported event types without crashing", () => {
    const eventTypes: SystemEventTimelineItem["eventType"][] = [
      "context_loaded",
      "agent_thinking",
      "lab_result_received",
      "payment_succeeded",
      "drug_purchased",
      "follow_up_started",
      "emergency_dismissed",
      "exit_settled",
      "session_suspended",
    ]

    for (const eventType of eventTypes) {
      const { container, unmount } = render(
        <SystemEventRow
          item={makeSystemEvent({ eventType, title: eventType })}
        />,
      )
      expect(screen.getByText(eventType)).toBeInTheDocument()
      // Known event types should all render an SVG icon
      expect(container.querySelector("svg")).toBeInTheDocument()
      unmount()
    }
  })

  it("renders with empty string title", () => {
    const item = makeSystemEvent({ title: "" })
    render(<SystemEventRow item={item} />)

    // Should render the empty span without crashing
    const spans = screen.getAllByText("")
    expect(spans.length).toBeGreaterThan(0)
  })
})
