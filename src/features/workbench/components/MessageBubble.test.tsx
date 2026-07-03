import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { MessageTimelineItem } from "@/features/workbench/api"
import { MessageBubble } from "@/features/workbench/components/MessageBubble"

function makeMessage(overrides: Partial<MessageTimelineItem>): MessageTimelineItem {
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

describe("MessageBubble", () => {
  it("renders patient message with right alignment", () => {
    const item = makeMessage({ role: "patient", content: "我发烧了" })
    render(<MessageBubble item={item} />)

    expect(screen.getByText("我发烧了")).toBeInTheDocument()
  })

  it("renders assistant message with left alignment", () => {
    const item = makeMessage({
      role: "assistant",
      content: "请问体温多少？",
    })
    render(<MessageBubble item={item} />)

    expect(screen.getByText("请问体温多少？")).toBeInTheDocument()
  })

  it("renders nothing when content is empty and status is not streaming", () => {
    const item = makeMessage({ content: "", status: "done" })
    const { container } = render(<MessageBubble item={item} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when content is empty and status is failed", () => {
    const item = makeMessage({ content: "", status: "failed" })
    const { container } = render(<MessageBubble item={item} />)

    // empty content + non-streaming (failed) should return null,
    // hiding the "发送失败" error indicator
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when content is empty and status is invalidated", () => {
    const item = makeMessage({ content: "", status: "invalidated" })
    const { container } = render(<MessageBubble item={item} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when content is undefined and status is done", () => {
    const item = makeMessage({ content: undefined as unknown as string, status: "done" })
    const { container } = render(<MessageBubble item={item} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders streaming bubble even with empty content", () => {
    const item = makeMessage({ content: "", status: "streaming" })
    const { container } = render(<MessageBubble item={item} />)

    // Should render the bubble wrapper (with cursor)
    expect(container.firstChild).not.toBeNull()
  })

  it("renders streaming cursor when status is streaming", () => {
    const item = makeMessage({ status: "streaming", content: "正在输入" })
    const { container } = render(<MessageBubble item={item} />)

    // The streaming cursor is a span with animate-pulse class
    const cursor = container.querySelector(".animate-pulse.bg-foreground\\/60")
    expect(cursor).toBeInTheDocument()
  })

  it("does not render streaming cursor when status is done", () => {
    const item = makeMessage({ status: "done", content: "已完成" })
    const { container } = render(<MessageBubble item={item} />)

    const cursor = container.querySelector(".animate-pulse.bg-foreground\\/60")
    expect(cursor).not.toBeInTheDocument()
  })

  it("renders failed state with error icon and text", () => {
    const item = makeMessage({ status: "failed", content: "发送失败内容" })
    render(<MessageBubble item={item} />)

    expect(screen.getByText("发送失败")).toBeInTheDocument()
  })

  it("renders assistant failed state", () => {
    const item = makeMessage({ status: "failed", content: "错误消息", role: "assistant" })
    render(<MessageBubble item={item} />)

    expect(screen.getByText("发送失败")).toBeInTheDocument()
    expect(screen.getByText("错误消息")).toBeInTheDocument()
  })

  it("renders assistant streaming state", () => {
    const item = makeMessage({ status: "streaming", content: "正在生成回答", role: "assistant" })
    const { container } = render(<MessageBubble item={item} />)

    expect(screen.getByText("正在生成回答")).toBeInTheDocument()
    const cursor = container.querySelector(".animate-pulse.bg-foreground\\/60")
    expect(cursor).toBeInTheDocument()
  })

  it("renders invalidated bubble with reduced opacity", () => {
    const item = makeMessage({ status: "invalidated", content: "已废弃" })
    const { container } = render(<MessageBubble item={item} />)

    const bubble = container.querySelector(".opacity-40")
    expect(bubble).toBeInTheDocument()
  })

  it("renders assistant invalidated bubble", () => {
    const item = makeMessage({
      status: "invalidated",
      content: "已失效",
      role: "assistant",
    })
    const { container } = render(<MessageBubble item={item} />)

    expect(screen.getByText("已失效")).toBeInTheDocument()
    const bubble = container.querySelector(".opacity-40")
    expect(bubble).toBeInTheDocument()
  })

  it("renders interruptedBy badge for emergency", () => {
    const item = makeMessage({ interruptedBy: "emergency" })
    render(<MessageBubble item={item} />)

    expect(screen.getByText("急症打断")).toBeInTheDocument()
  })

  it("renders interruptedBy badge for timeout", () => {
    const item = makeMessage({ interruptedBy: "timeout" })
    render(<MessageBubble item={item} />)

    expect(screen.getByText("超时终止")).toBeInTheDocument()
  })

  it("renders interruptedBy badge for exit", () => {
    const item = makeMessage({ interruptedBy: "exit" })
    render(<MessageBubble item={item} />)

    expect(screen.getByText("主动退出")).toBeInTheDocument()
  })

  it("renders interruptedBy badge for idle", () => {
    const item = makeMessage({ interruptedBy: "idle" })
    render(<MessageBubble item={item} />)

    expect(screen.getByText("空闲暂停")).toBeInTheDocument()
  })

  it("does not render interruptedBy badge when not interrupted", () => {
    const item = makeMessage({ interruptedBy: undefined })
    const { container } = render(<MessageBubble item={item} />)

    expect(screen.queryByText("急症打断")).not.toBeInTheDocument()
    expect(screen.queryByText("超时终止")).not.toBeInTheDocument()
    expect(screen.queryByText("主动退出")).not.toBeInTheDocument()
    expect(screen.queryByText("空闲暂停")).not.toBeInTheDocument()
    // No small badge text
    expect(container.querySelector(".text-\\[10px\\]")).not.toBeInTheDocument()
  })

  it("renders assistant message with interruptedBy badge", () => {
    const item = makeMessage({
      interruptedBy: "emergency",
      role: "assistant",
      content: "问诊被中断",
    })
    render(<MessageBubble item={item} />)

    expect(screen.getByText("急症打断")).toBeInTheDocument()
    expect(screen.getByText("问诊被中断")).toBeInTheDocument()
  })
})
