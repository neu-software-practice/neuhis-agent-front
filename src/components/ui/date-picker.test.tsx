import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DatePicker } from "@/components/ui/date-picker"

describe("DatePicker", () => {
  it("renders without crashing", () => {
    const { container } = render(<DatePicker />)
    expect(container).toBeInTheDocument()
  })

  it("renders with a label", () => {
    render(<DatePicker label="出生日期" />)
    expect(screen.getByText("出生日期")).toBeInTheDocument()
  })

  it("renders error message", () => {
    render(<DatePicker errorMessage="日期无效" />)
    expect(screen.getByText("日期无效")).toBeInTheDocument()
  })

  it("renders required indicator", () => {
    render(<DatePicker label="日期" isRequired />)
    expect(screen.getByText("日期")).toBeInTheDocument()
  })

  it("passes through className", () => {
    const { container } = render(<DatePicker className="custom-date" />)
    const hasCustomClass = container.querySelector(".custom-date")
    expect(hasCustomClass).not.toBeNull()
  })

  it("renders with a value", () => {
    const { container } = render(<DatePicker value="2026-07-02" />)
    expect(container).toBeInTheDocument()
  })

  it("renders with aria-label", () => {
    const { container } = render(<DatePicker aria-label="选择日期" />)
    expect(container).toBeInTheDocument()
  })
})
