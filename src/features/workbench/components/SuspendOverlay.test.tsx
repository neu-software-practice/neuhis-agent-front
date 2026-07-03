import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SuspendOverlay } from "@/features/workbench/components/SuspendOverlay"

describe("SuspendOverlay", () => {
  it("renders the modal with title when open", () => {
    render(<SuspendOverlay open={true} onContinue={vi.fn()} />)

    expect(screen.getByText("会话已暂停")).toBeInTheDocument()
  })

  it("renders description text when open", () => {
    render(<SuspendOverlay open={true} onContinue={vi.fn()} />)

    expect(
      screen.getByText("因长时间未操作，本次问诊已自动暂停。"),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "需要的话可以继续问诊，我们会基于本次记录帮你接着看。",
      ),
    ).toBeInTheDocument()
  })

  it("does not render modal content when open is false", () => {
    render(<SuspendOverlay open={false} onContinue={vi.fn()} />)

    expect(screen.queryByText("会话已暂停")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "继续问诊" }),
    ).not.toBeInTheDocument()
  })

  it("renders continue button when open", () => {
    render(<SuspendOverlay open={true} onContinue={vi.fn()} />)

    expect(
      screen.getByRole("button", { name: "继续问诊" }),
    ).toBeInTheDocument()
  })

  it("invokes onContinue when '继续问诊' is clicked", async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()

    render(<SuspendOverlay open={true} onContinue={onContinue} />)

    await user.click(screen.getByRole("button", { name: "继续问诊" }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it("renders with role='alertdialog' for accessibility", () => {
    render(<SuspendOverlay open={true} onContinue={vi.fn()} />)

    const dialog = document.querySelector('[role="alertdialog"]')
    expect(dialog).toBeInTheDocument()
  })

  it("renders PauseCircle icon with aria-hidden='true'", () => {
    render(<SuspendOverlay open={true} onContinue={vi.fn()} />)

    // HeroUI Modal renders in a portal - the PauseCircle SVG should have aria-hidden
    const svgWithAriaHidden = document.querySelector(
      'svg[aria-hidden="true"]',
    )
    expect(svgWithAriaHidden).toBeInTheDocument()
  })

  it("does not dismiss on Escape key (isDismissable=false)", async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()

    render(<SuspendOverlay open={true} onContinue={onContinue} />)

    // Press Escape - should not call onContinue since isDismissable=false
    await user.keyboard("{Escape}")
    expect(onContinue).not.toHaveBeenCalled()
  })

  it("applies custom className", () => {
    render(
      <SuspendOverlay
        open={true}
        onContinue={vi.fn()}
        className="custom-overlay"
      />,
    )

    // The className is applied to the Modal.Dialog element (rendered in portal)
    const dialog = document.querySelector(".custom-overlay")
    expect(dialog).toBeInTheDocument()
  })
})
