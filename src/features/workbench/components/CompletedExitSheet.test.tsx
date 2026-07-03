import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CompletedExitSheet } from "@/features/workbench/components/CompletedExitSheet"

// Mock window.matchMedia for useIsDesktop hook
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("CompletedExitSheet", () => {
  it("renders default title and description when open", () => {
    render(
      <CompletedExitSheet
        open={true}
        onOpenChange={vi.fn()}
        onNavigateHome={vi.fn()}
      />,
    )

    expect(screen.getByText("问诊已完成")).toBeInTheDocument()
    expect(
      screen.getByText(
        "本次问诊已正常完成，您可以返回首页查看历史记录或发起新的问诊。",
      ),
    ).toBeInTheDocument()
  })

  it("does not render content when open is false", () => {
    render(
      <CompletedExitSheet
        open={false}
        onOpenChange={vi.fn()}
        onNavigateHome={vi.fn()}
      />,
    )

    expect(screen.queryByText("问诊已完成")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "返回首页" }),
    ).not.toBeInTheDocument()
  })

  it("renders with aria-label='退出问诊'", () => {
    render(
      <CompletedExitSheet
        open={true}
        onOpenChange={vi.fn()}
        onNavigateHome={vi.fn()}
      />,
    )

    const dialog = document.querySelector('[aria-label="退出问诊"]')
    expect(dialog).toBeInTheDocument()
  })

  it("renders custom title and description", () => {
    render(
      <CompletedExitSheet
        open={true}
        onOpenChange={vi.fn()}
        onNavigateHome={vi.fn()}
        title="自定义标题"
        description="自定义描述"
      />,
    )

    expect(screen.getByText("自定义标题")).toBeInTheDocument()
    expect(screen.getByText("自定义描述")).toBeInTheDocument()
  })

  it("renders custom title with empty description", () => {
    render(
      <CompletedExitSheet
        open={true}
        onOpenChange={vi.fn()}
        onNavigateHome={vi.fn()}
        title="自定义标题"
        description=""
      />,
    )

    expect(screen.getByText("自定义标题")).toBeInTheDocument()
  })

  it("renders both action buttons", () => {
    render(
      <CompletedExitSheet
        open={true}
        onOpenChange={vi.fn()}
        onNavigateHome={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "返回首页" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "留在当前页" }),
    ).toBeInTheDocument()
  })

  it("invokes onNavigateHome and onOpenChange(false) when '返回首页' is clicked", async () => {
    const user = userEvent.setup()
    const onNavigateHome = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <CompletedExitSheet
        open={true}
        onOpenChange={onOpenChange}
        onNavigateHome={onNavigateHome}
      />,
    )

    await user.click(screen.getByRole("button", { name: "返回首页" }))
    expect(onNavigateHome).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("invokes onOpenChange(false) when '留在当前页' is clicked", async () => {
    const user = userEvent.setup()
    const onNavigateHome = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <CompletedExitSheet
        open={true}
        onOpenChange={onOpenChange}
        onNavigateHome={onNavigateHome}
      />,
    )

    await user.click(screen.getByRole("button", { name: "留在当前页" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onNavigateHome).not.toHaveBeenCalled()
  })

  it("renders in desktop mode without Drawer.Handle", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(
      <CompletedExitSheet
        open={true}
        onOpenChange={vi.fn()}
        onNavigateHome={vi.fn()}
      />,
    )

    // Desktop mode renders without crashing
    expect(screen.getByText("问诊已完成")).toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
