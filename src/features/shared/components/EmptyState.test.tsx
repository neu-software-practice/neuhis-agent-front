import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { EmptyState } from "@/features/shared/components/EmptyState"

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="暂无数据" />)
    expect(screen.getByText("暂无数据")).toBeInTheDocument()
  })

  it("renders description when provided", () => {
    render(<EmptyState title="空" description="没有找到任何记录" />)
    expect(screen.getByText("没有找到任何记录")).toBeInTheDocument()
  })

  it("does not render description when not provided", () => {
    const { container } = render(<EmptyState title="空" />)
    // Title is a <p>, but there should be no second <p> for description
    const paragraphs = container.querySelectorAll("p")
    expect(paragraphs.length).toBe(1)
    expect(paragraphs[0].textContent).toBe("空")
  })

  it("renders icon when provided", () => {
    render(
      <EmptyState
        title="空"
        icon={<span data-testid="empty-icon">📋</span>}
      />,
    )
    expect(screen.getByTestId("empty-icon")).toBeInTheDocument()
  })

  it("does not render icon container when icon not provided", () => {
    const { container } = render(<EmptyState title="空" />)
    // The icon div should not exist
    const iconDiv = container.querySelector(".text-muted-foreground")
    expect(iconDiv).toBeNull()
  })

  it("renders action when provided", () => {
    render(
      <EmptyState
        title="空"
        action={<button data-testid="retry-btn">重试</button>}
      />,
    )
    expect(screen.getByTestId("retry-btn")).toBeInTheDocument()
    expect(screen.getByText("重试")).toBeInTheDocument()
  })

  it("does not render action container when action not provided", () => {
    render(<EmptyState title="空" />)
    // No action div with mt-2 class
    const actionDiv = document.querySelector(".mt-2")
    expect(actionDiv).toBeNull()
  })

  it("applies custom className", () => {
    const { container } = render(
      <EmptyState title="空" className="custom-empty" />,
    )
    expect(container.querySelector(".custom-empty")).not.toBeNull()
  })

  it("renders all props together", () => {
    render(
      <EmptyState
        title="加载失败"
        description="请检查网络后重试"
        icon={<span data-testid="icon">⚠️</span>}
        action={<button data-testid="action">刷新</button>}
      />,
    )
    expect(screen.getByText("加载失败")).toBeInTheDocument()
    expect(screen.getByText("请检查网络后重试")).toBeInTheDocument()
    expect(screen.getByTestId("icon")).toBeInTheDocument()
    expect(screen.getByTestId("action")).toBeInTheDocument()
  })
})
