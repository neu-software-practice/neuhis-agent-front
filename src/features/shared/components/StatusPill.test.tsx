import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatusPill, type StatusTone } from "@/features/shared/components/StatusPill"

describe("StatusPill", () => {
  it("renders label text", () => {
    render(<StatusPill label="进行中" />)
    expect(screen.getByText("进行中")).toBeInTheDocument()
  })

  it("applies default tone classes", () => {
    render(<StatusPill label="默认" />)
    const span = screen.getByText("默认").closest("span")
    expect(span?.className).toContain("bg-secondary")
  })

  it("applies success tone classes", () => {
    render(<StatusPill label="成功" tone="success" />)
    const span = screen.getByText("成功").closest("span")
    expect(span?.className).toContain("bg-success-foreground")
    expect(span?.className).toContain("text-success")
  })

  it("applies warning tone classes", () => {
    render(<StatusPill label="警告" tone="warning" />)
    const span = screen.getByText("警告").closest("span")
    expect(span?.className).toContain("bg-warning-foreground")
    expect(span?.className).toContain("text-warning")
  })

  it("applies danger tone classes", () => {
    render(<StatusPill label="危险" tone="danger" />)
    const span = screen.getByText("危险").closest("span")
    expect(span?.className).toContain("bg-danger-foreground")
    expect(span?.className).toContain("text-danger")
  })

  it("applies info tone classes", () => {
    render(<StatusPill label="信息" tone="info" />)
    const span = screen.getByText("信息").closest("span")
    expect(span?.className).toContain("bg-info-foreground")
    expect(span?.className).toContain("text-info")
  })

  it("applies muted tone classes", () => {
    render(<StatusPill label="静音" tone="muted" />)
    const span = screen.getByText("静音").closest("span")
    expect(span?.className).toContain("bg-muted")
    expect(span?.className).toContain("text-muted-foreground")
  })

  it("renders icon when provided", () => {
    render(
      <StatusPill
        label="带图标"
        icon={<span data-testid="pill-icon">●</span>}
      />,
    )
    expect(screen.getByTestId("pill-icon")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    render(<StatusPill label="自定义" className="custom-pill" />)
    const span = screen.getByText("自定义").closest("span")
    expect(span?.className).toContain("custom-pill")
  })

  it("has inline-flex base class", () => {
    render(<StatusPill label="基础" />)
    const span = screen.getByText("基础").closest("span")
    expect(span?.className).toContain("inline-flex")
    expect(span?.className).toContain("rounded-full")
  })

  const tones: StatusTone[] = ["default", "muted", "success", "warning", "danger", "info"]

  it.each(tones)("renders correctly with tone '%s'", (tone) => {
    render(<StatusPill label={`tone-${tone}`} tone={tone} />)
    expect(screen.getByText(`tone-${tone}`)).toBeInTheDocument()
  })

  it("renders without optional icon prop", () => {
    render(<StatusPill label="无图标" />)
    expect(screen.getByText("无图标")).toBeInTheDocument()
    // No extra child elements beyond the text
  })

  it("renders icon before the label text", () => {
    render(<StatusPill label="图标在前" icon={<span data-testid="status-icon">*</span>} />)
    const container = screen.getByText("图标在前").closest("span")
    const icon = screen.getByTestId("status-icon")
    expect(container).toContainElement(icon)
    expect(container?.textContent).toBe("*图标在前")
  })
})
