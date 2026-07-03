import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AssistantThinkingRow } from "@/features/workbench/components/AssistantThinkingRow"

describe("AssistantThinkingRow", () => {
  it("renders nothing when visible is false", () => {
    const { container } = render(<AssistantThinkingRow visible={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when visible is omitted (default false)", () => {
    const { container } = render(<AssistantThinkingRow />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders Brain icon and 'AI 正在分析...' text when visible is true", () => {
    const { container } = render(<AssistantThinkingRow visible={true} />)

    expect(screen.getByText("AI 正在分析...")).toBeInTheDocument()
    // Assert Brain icon renders as an SVG
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("renders a container with flex layout when visible", () => {
    const { container } = render(<AssistantThinkingRow visible={true} />)
    const wrapper = container.firstChild as HTMLElement

    expect(wrapper.className).toContain("flex")
    expect(wrapper.className).toContain("items-center")
    expect(wrapper.className).toContain("justify-center")
    expect(wrapper.className).toContain("gap-2")
    expect(wrapper.className).toContain("py-4")
  })

  it("applies animate-pulse to icon and text when visible", () => {
    const { container } = render(<AssistantThinkingRow visible={true} />)

    const icon = container.querySelector("svg")
    // Lucide SVG icons use SVGAnimatedString for className, check by attribute
    expect(icon?.getAttribute("class")).toContain("animate-pulse")

    const text = screen.getByText("AI 正在分析...")
    expect(text.className).toContain("animate-pulse")
    expect(text.className).toContain("text-sm")
    expect(text.className).toContain("text-muted-foreground")
  })

  it("renders exactly one icon and one text element when visible", () => {
    const { container } = render(<AssistantThinkingRow visible={true} />)

    const icons = container.querySelectorAll("svg")
    expect(icons).toHaveLength(1)

    const textElements = screen.getAllByText("AI 正在分析...")
    expect(textElements).toHaveLength(1)
  })
})
