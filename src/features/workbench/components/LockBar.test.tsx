import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { LockBar } from "@/features/workbench/components/LockBar"

describe("LockBar", () => {
  it("renders nothing when visible is false", () => {
    const { container } = render(
      <LockBar
        visible={false}
        onReportEmergency={vi.fn()}
        onAskQuestion={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when visible is omitted (default false)", () => {
    const { container } = render(
      <LockBar onReportEmergency={vi.fn()} onAskQuestion={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("renders default lock reason when visible without lockReason", () => {
    render(
      <LockBar
        visible={true}
        onReportEmergency={vi.fn()}
        onAskQuestion={vi.fn()}
      />,
    )

    expect(screen.getByText("有操作待处理")).toBeInTheDocument()
  })

  it("renders custom lock reason when provided", () => {
    render(
      <LockBar
        visible={true}
        lockReason="请确认检验方案"
        onReportEmergency={vi.fn()}
        onAskQuestion={vi.fn()}
      />,
    )

    expect(screen.getByText("请确认检验方案")).toBeInTheDocument()
  })

  it("renders default lock reason when lockReason is null", () => {
    render(
      <LockBar
        visible={true}
        lockReason={null as unknown as undefined}
        onReportEmergency={vi.fn()}
        onAskQuestion={vi.fn()}
      />,
    )

    expect(screen.getByText("有操作待处理")).toBeInTheDocument()
  })

  it("renders lock icon when visible", () => {
    render(
      <LockBar
        visible={true}
        onReportEmergency={vi.fn()}
        onAskQuestion={vi.fn()}
      />,
    )

    // Lock icon renders as an SVG
    const container = document.querySelector(".sticky")
    expect(container?.querySelector("svg")).toBeInTheDocument()
  })

  it("renders both action buttons when visible", () => {
    render(
      <LockBar
        visible={true}
        onReportEmergency={vi.fn()}
        onAskQuestion={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "我现在很不舒服" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "我有疑问" }),
    ).toBeInTheDocument()
  })

  it("invokes onReportEmergency when emergency button is clicked", async () => {
    const user = userEvent.setup()
    const onReportEmergency = vi.fn()
    const onAskQuestion = vi.fn()

    render(
      <LockBar
        visible={true}
        onReportEmergency={onReportEmergency}
        onAskQuestion={onAskQuestion}
      />,
    )

    await user.click(screen.getByRole("button", { name: "我现在很不舒服" }))
    expect(onReportEmergency).toHaveBeenCalledTimes(1)
    expect(onAskQuestion).not.toHaveBeenCalled()
  })

  it("invokes onAskQuestion when question button is clicked", async () => {
    const user = userEvent.setup()
    const onReportEmergency = vi.fn()
    const onAskQuestion = vi.fn()

    render(
      <LockBar
        visible={true}
        onReportEmergency={onReportEmergency}
        onAskQuestion={onAskQuestion}
      />,
    )

    await user.click(screen.getByRole("button", { name: "我有疑问" }))
    expect(onAskQuestion).toHaveBeenCalledTimes(1)
    expect(onReportEmergency).not.toHaveBeenCalled()
  })

  it("applies custom className", () => {
    const { container } = render(
      <LockBar
        visible={true}
        onReportEmergency={vi.fn()}
        onAskQuestion={vi.fn()}
        className="custom-lock"
      />,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain("custom-lock")
    expect(wrapper.className).toContain("sticky")
    expect(wrapper.className).toContain("bottom-0")
  })

  it("renders buttons with type='button' attribute", () => {
    render(
      <LockBar
        visible={true}
        onReportEmergency={vi.fn()}
        onAskQuestion={vi.fn()}
      />,
    )

    const buttons = screen.getAllByRole("button")
    buttons.forEach((button) => {
      expect(button).toHaveAttribute("type", "button")
    })
  })

  it("clicks both buttons without state collision", async () => {
    const user = userEvent.setup()
    const onReportEmergency = vi.fn()
    const onAskQuestion = vi.fn()

    render(
      <LockBar
        visible={true}
        onReportEmergency={onReportEmergency}
        onAskQuestion={onAskQuestion}
      />,
    )

    await user.click(screen.getByRole("button", { name: "我现在很不舒服" }))
    expect(onReportEmergency).toHaveBeenCalledTimes(1)
    expect(onAskQuestion).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "我有疑问" }))
    expect(onAskQuestion).toHaveBeenCalledTimes(1)
    expect(onReportEmergency).toHaveBeenCalledTimes(1)
  })
})
