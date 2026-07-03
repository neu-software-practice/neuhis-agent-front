import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ContextSummaryBar } from "@/features/workbench/components/ContextSummaryBar"

describe("ContextSummaryBar", () => {
  it("renders nothing when patientName is undefined", () => {
    const { container } = render(<ContextSummaryBar />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when patientName is empty string", () => {
    const { container } = render(<ContextSummaryBar patientName="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders patient name when provided", () => {
    render(<ContextSummaryBar patientName="张三" />)

    expect(screen.getByText("患者: 张三")).toBeInTheDocument()
  })

  it("renders as a button with aria-label", () => {
    render(<ContextSummaryBar patientName="张三" />)

    const button = screen.getByRole("button", {
      name: "查看问诊上下文详情",
    })
    expect(button).toBeInTheDocument()
    // Button should have type="button" to prevent form submission
    expect(button).toHaveAttribute("type", "button")
  })

  it("renders ChevronDown icon when visible", () => {
    const { container } = render(<ContextSummaryBar patientName="张三" />)

    // ChevronDown renders as an SVG
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("does not crash when onClick is not provided", async () => {
    const user = userEvent.setup()
    render(<ContextSummaryBar patientName="张三" />)

    const button = screen.getByRole("button")
    await user.click(button)
    // No crash expected
  })

  it("renders nothing when onClick is provided but patientName is not", () => {
    const { container } = render(
      <ContextSummaryBar onClick={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("invokes onClick callback when clicked", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<ContextSummaryBar patientName="张三" onClick={onClick} />)

    await user.click(screen.getByRole("button"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("renders with truncated long patient name", () => {
    const longName = "张三四五六七八九十甲乙丙丁戊己庚辛壬癸"
    const { container } = render(
      <ContextSummaryBar patientName={longName} />,
    )

    expect(screen.getByText(`患者: ${longName}`)).toBeInTheDocument()
    const span = container.querySelector(".truncate")
    expect(span).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <ContextSummaryBar patientName="张三" className="custom-class" />,
    )
    const button = container.querySelector("button")
    expect(button?.className).toContain("custom-class")
  })
})
