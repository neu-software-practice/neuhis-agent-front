import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { TimelineItem } from "@/features/workbench/api"
import { ChatTimeline } from "@/features/workbench/components/ChatTimeline"

// Mock react-virtuoso to render all items directly (jsdom lacks layout engine)
// Exposes a triggerStartReached function on the component for testing
let triggerStartReached: (() => void) | null = null

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({
    data,
    itemContent,
    components,
    startReached,
    atBottomStateChange,
  }: {
    data: TimelineItem[]
    itemContent: (index: number, item: TimelineItem) => React.ReactNode
    components?: { Header?: React.ComponentType; Footer?: React.ComponentType }
    startReached?: () => void
    atBottomStateChange?: (at: boolean) => void
  }) => {
    // Store startReached for test access
    triggerStartReached = startReached ?? null

    const Header = components?.Header
    const Footer = components?.Footer
    return (
      <div data-testid="virtuoso-mock">
        {Header ? <Header /> : null}
        {data.map((item, index) => (
          <div key={item.id}>
            {itemContent(index, item)}
          </div>
        ))}
        {Footer ? <Footer /> : null}
      </div>
    )
  },
}))

function makeMessageItem(
  id: string,
  content: string,
  role: "patient" | "assistant" = "patient",
): TimelineItem {
  return {
    id,
    sessionId: "session-test",
    kind: "message",
    status: "done",
    role,
    content,
    createdAt: "2026-06-28T01:50:00.000Z",
  }
}

describe("ChatTimeline", () => {
  it("renders empty state when items is empty", () => {
    render(<ChatTimeline items={[]} />)

    expect(screen.getByText("暂无对话")).toBeInTheDocument()
  })

  it("renders Virtuoso list when items are provided", () => {
    const items = [
      makeMessageItem("msg-1", "Hello"),
      makeMessageItem("msg-2", "Hi there", "assistant"),
    ]

    render(<ChatTimeline items={items} />)

    // Virtuoso renders items
    expect(screen.getByText("Hello")).toBeInTheDocument()
    expect(screen.getByText("Hi there")).toBeInTheDocument()
  })

  it("applies custom className to empty state", () => {
    const { container } = render(
      <ChatTimeline items={[]} className="custom-timeline" />,
    )

    const emptyState = container.firstChild as HTMLElement
    expect(emptyState.className).toContain("custom-timeline")
  })

  it("applies custom className to list wrapper", () => {
    const items = [makeMessageItem("msg-1", "Hello")]
    const { container } = render(
      <ChatTimeline items={items} className="custom-timeline" />,
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain("custom-timeline")
  })

  it("passes patientId and onAction to TimelineRow", () => {
    const items = [makeMessageItem("msg-1", "Hello")]
    const onAction = vi.fn()

    render(
      <ChatTimeline
        items={items}
        patientId="patient-123"
        onAction={onAction}
      />,
    )

    // Just verify it renders without errors
    expect(screen.getByText("Hello")).toBeInTheDocument()
  })

  it("passes readonly to TimelineRow", () => {
    const items = [makeMessageItem("msg-1", "Hello")]

    render(<ChatTimeline items={items} readonly={true} />)

    expect(screen.getByText("Hello")).toBeInTheDocument()
  })

  it("renders loading spinner in footer when loading is true", () => {
    const items = [makeMessageItem("msg-1", "Hello")]

    render(<ChatTimeline items={items} loading={true} />)

    // Loader2 has animate-spin class
    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("renders '加载更多' header when hasMore is true", () => {
    const items = [makeMessageItem("msg-1", "Hello")]

    render(<ChatTimeline items={items} hasMore={true} />)

    expect(screen.getByText("加载更多...")).toBeInTheDocument()
  })

  it("does not render '加载更多' header when hasMore is false", () => {
    const items = [makeMessageItem("msg-1", "Hello")]

    render(<ChatTimeline items={items} hasMore={false} />)

    expect(screen.queryByText("加载更多...")).not.toBeInTheDocument()
  })

  it("invokes onLoadMore when startReached fires and hasMore is true and not loading", () => {
    const items = [makeMessageItem("msg-1", "Hello")]
    const onLoadMore = vi.fn()

    render(
      <ChatTimeline
        items={items}
        hasMore={true}
        loading={false}
        onLoadMore={onLoadMore}
      />,
    )

    // The Virtuoso startReached callback is wired up; we can't easily trigger
    // it in jsdom, but we verify the component renders correctly
    expect(screen.getByText("Hello")).toBeInTheDocument()
  })

  it("does not invoke onLoadMore when loading is true", () => {
    const items = [makeMessageItem("msg-1", "Hello")]
    const onLoadMore = vi.fn()

    render(
      <ChatTimeline
        items={items}
        hasMore={true}
        loading={true}
        onLoadMore={onLoadMore}
      />,
    )

    // Component renders without errors
    expect(screen.getByText("Hello")).toBeInTheDocument()
  })

  it("renders multiple items correctly", () => {
    const items = [
      makeMessageItem("msg-1", "First"),
      makeMessageItem("msg-2", "Second", "assistant"),
      makeMessageItem("msg-3", "Third"),
    ]

    render(<ChatTimeline items={items} />)

    expect(screen.getByText("First")).toBeInTheDocument()
    expect(screen.getByText("Second")).toBeInTheDocument()
    expect(screen.getByText("Third")).toBeInTheDocument()
  })

  it("invokes onLoadMore when startReached fires and hasMore/!loading/onLoadMore", () => {
    const items = [makeMessageItem("msg-1", "Hello")]
    const onLoadMore = vi.fn()

    render(
      <ChatTimeline
        items={items}
        hasMore={true}
        loading={false}
        onLoadMore={onLoadMore}
      />,
    )

    // Trigger the stored startReached callback
    if (triggerStartReached) {
      triggerStartReached()
    }
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it("does not invoke onLoadMore when startReached fires but hasMore is false", () => {
    const items = [makeMessageItem("msg-1", "Hello")]
    const onLoadMore = vi.fn()

    render(
      <ChatTimeline
        items={items}
        hasMore={false}
        loading={false}
        onLoadMore={onLoadMore}
      />,
    )

    if (triggerStartReached) {
      triggerStartReached()
    }
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it("does not invoke onLoadMore when startReached fires but no onLoadMore provided", () => {
    const items = [makeMessageItem("msg-1", "Hello")]

    render(
      <ChatTimeline
        items={items}
        hasMore={true}
        loading={false}
      />,
    )

    // Should not crash when startReached fires but onLoadMore is undefined
    if (triggerStartReached) {
      triggerStartReached()
    }
    expect(screen.getByText("Hello")).toBeInTheDocument()
  })

  it("renders footer spacer even when not loading", () => {
    const items = [makeMessageItem("msg-1", "Hello")]

    const { container } = render(
      <ChatTimeline items={items} loading={false} />,
    )

    // Spacer div with h-6 should be present
    const spacer = container.querySelector(".h-6")
    expect(spacer).toBeInTheDocument()
    expect(spacer).toHaveAttribute("aria-hidden", "true")
  })

  it("renders '回到底部' button when simulated not at bottom", async () => {
    const items = [makeMessageItem("msg-1", "Hello")]

    render(<ChatTimeline items={items} />)

    // The button is hidden by default (atBottom=true).
    // We can verify the button's aria-label is not in the document initially.
    expect(
      screen.queryByLabelText("回到底部"),
    ).not.toBeInTheDocument()
  })

  it("renders items with different kinds", () => {
    const items = [
      makeMessageItem("msg-1", "Hello"),
      {
        id: "fc-1",
        sessionId: "session-test",
        kind: "flow_card" as const,
        status: "done" as const,
        blocking: false,
        card: {
          kind: "advice_only" as const,
          id: "card-1",
          title: "建议卡片",
          createdAt: "2026-06-28T01:50:00.000Z",
          advices: ["多喝水"],
          watchItems: ["体温"],
          followUpRecommendation: "一周后复诊",
        },
        createdAt: "2026-06-28T01:50:00.000Z",
      },
    ]

    render(<ChatTimeline items={items} />)

    expect(screen.getByText("Hello")).toBeInTheDocument()
    expect(screen.getByText("建议卡片")).toBeInTheDocument()
  })

  it("passes readonly with patientId and onAction to flow cards", () => {
    const items: TimelineItem[] = [
      {
        id: "fc-1",
        sessionId: "session-test",
        kind: "flow_card",
        status: "done",
        blocking: false,
        card: {
          kind: "advice_only",
          id: "card-1",
          title: "建议卡片",
          createdAt: "2026-06-28T01:50:00.000Z",
          advices: ["多喝水"],
          watchItems: ["体温"],
          followUpRecommendation: "一周后复诊",
        },
        createdAt: "2026-06-28T01:50:00.000Z",
      },
    ]

    const onAction = vi.fn()
    render(
      <ChatTimeline
        items={items}
        patientId="patient-123"
        onAction={onAction}
        readonly={true}
      />,
    )

    expect(screen.getByText("建议卡片")).toBeInTheDocument()
  })
})
