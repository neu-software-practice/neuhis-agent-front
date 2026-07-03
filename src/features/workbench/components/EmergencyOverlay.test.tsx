import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EmergencyOverlay } from "@/features/workbench/components/EmergencyOverlay"

describe("EmergencyOverlay", () => {
  it("renders the modal with title when open", () => {
    render(
      <EmergencyOverlay
        open={true}
        onConfirmEmergency={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText("检测到紧急情况")).toBeInTheDocument()
  })

  it("renders description text when open", () => {
    render(
      <EmergencyOverlay
        open={true}
        onConfirmEmergency={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(
      screen.getByText(
        "根据您描述的情况，建议立即前往急诊就医。请优先保障您的安全。",
      ),
    ).toBeInTheDocument()
  })

  it("renders both action buttons when open", () => {
    render(
      <EmergencyOverlay
        open={true}
        onConfirmEmergency={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "前往急诊" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "误报，继续问诊" }),
    ).toBeInTheDocument()
  })

  it("renders source text when provided", () => {
    render(
      <EmergencyOverlay
        open={true}
        source="胸痛症状"
        onConfirmEmergency={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText("触发原因：胸痛症状")).toBeInTheDocument()
  })

  it("does not render source text when not provided", () => {
    render(
      <EmergencyOverlay
        open={true}
        onConfirmEmergency={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.queryByText(/触发原因/)).not.toBeInTheDocument()
  })

  it("invokes onConfirmEmergency when '前往急诊' is clicked", async () => {
    const user = userEvent.setup()
    const onConfirmEmergency = vi.fn()
    const onDismiss = vi.fn()

    render(
      <EmergencyOverlay
        open={true}
        onConfirmEmergency={onConfirmEmergency}
        onDismiss={onDismiss}
      />,
    )

    await user.click(screen.getByRole("button", { name: "前往急诊" }))
    expect(onConfirmEmergency).toHaveBeenCalledTimes(1)
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it("invokes onDismiss when '误报，继续问诊' is clicked", async () => {
    const user = userEvent.setup()
    const onConfirmEmergency = vi.fn()
    const onDismiss = vi.fn()

    render(
      <EmergencyOverlay
        open={true}
        onConfirmEmergency={onConfirmEmergency}
        onDismiss={onDismiss}
      />,
    )

    await user.click(screen.getByRole("button", { name: "误报，继续问诊" }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onConfirmEmergency).not.toHaveBeenCalled()
  })

  it("does not render modal content when open is false", () => {
    render(
      <EmergencyOverlay
        open={false}
        onConfirmEmergency={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.queryByText("检测到紧急情况")).not.toBeInTheDocument()
    expect(screen.queryByText(/根据您描述的情况/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "前往急诊" }),
    ).not.toBeInTheDocument()
  })

  it("does not render source text when source is empty string", () => {
    render(
      <EmergencyOverlay
        open={true}
        source=""
        onConfirmEmergency={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.queryByText(/触发原因/)).not.toBeInTheDocument()
  })

  it("calls onDismiss when backdrop closes via ESC (openChange sent false)", async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()

    render(
      <EmergencyOverlay
        open={true}
        onConfirmEmergency={vi.fn()}
        onDismiss={onDismiss}
      />,
    )

    // Press Escape to trigger onOpenChange(false) path
    await user.keyboard("{Escape}")
    expect(onDismiss).toHaveBeenCalled()
  })

  it("applies custom className", () => {
    render(
      <EmergencyOverlay
        open={true}
        onConfirmEmergency={vi.fn()}
        onDismiss={vi.fn()}
        className="custom-emergency"
      />,
    )

    // Modal.Dialog is rendered in a portal, query from document
    const dialog = document.querySelector(".custom-emergency")
    expect(dialog).toBeInTheDocument()
  })
})
