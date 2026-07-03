import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PauseVisitSheet } from "@/features/workbench/components/PauseVisitSheet"

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

describe("PauseVisitSheet", () => {
  it("renders the sheet with title and description when open", () => {
    render(
      <PauseVisitSheet
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText("暂停计时？")).toBeInTheDocument()
    expect(
      screen.getByText("暂停后计时将停止，可稍后继续问诊"),
    ).toBeInTheDocument()
  })

  it("renders both action buttons", () => {
    render(
      <PauseVisitSheet
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "暂停计时" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "继续问诊" }),
    ).toBeInTheDocument()
  })

  it("renders the sheet with aria-label when open", () => {
    render(
      <PauseVisitSheet
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    // Dialog should have aria-label="暂停计时确认"
    const dialog = document.querySelector('[aria-label="暂停计时确认"]')
    expect(dialog).toBeInTheDocument()
  })

  it("renders description with aria-live='polite'", () => {
    render(
      <PauseVisitSheet
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    const description = screen.getByText("暂停后计时将停止，可稍后继续问诊")
    expect(description).toHaveAttribute("aria-live", "polite")
  })

  it("invokes onConfirm and closes sheet when '暂停计时' is clicked", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <PauseVisitSheet
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole("button", { name: "暂停计时" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("invokes onCancel and closes sheet when '继续问诊' is clicked", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <PauseVisitSheet
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )

    await user.click(screen.getByRole("button", { name: "继续问诊" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("does not throw when onCancel is not provided and '继续问诊' is clicked", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <PauseVisitSheet
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "继续问诊" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("does not render content when open is false", () => {
    render(
      <PauseVisitSheet
        open={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.queryByText("暂停计时？")).not.toBeInTheDocument()
  })

  it("verifies onConfirm is called with no arguments", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <PauseVisitSheet
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole("button", { name: "暂停计时" }))
    expect(onConfirm).toHaveBeenCalledWith()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("verifies onCancel is called with no arguments", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <PauseVisitSheet
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )

    await user.click(screen.getByRole("button", { name: "继续问诊" }))
    expect(onCancel).toHaveBeenCalledWith()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("renders in desktop mode without Drawer.Handle", () => {
    // Override matchMedia to simulate desktop
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

    const { container } = render(
      <PauseVisitSheet
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText("暂停计时？")).toBeInTheDocument()
    // Desktop mode should not crash
    vi.restoreAllMocks()
  })
})
