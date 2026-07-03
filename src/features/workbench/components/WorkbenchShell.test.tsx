import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { WorkbenchShell } from "@/features/workbench/components/WorkbenchShell"

describe("WorkbenchShell", () => {
  it("renders header content", () => {
    render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
      />,
    )

    expect(screen.getByTestId("header")).toBeInTheDocument()
  })

  it("renders timeline content", () => {
    render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
      />,
    )

    expect(screen.getByTestId("timeline")).toBeInTheDocument()
  })

  it("renders input content", () => {
    render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
      />,
    )

    expect(screen.getByTestId("input")).toBeInTheDocument()
  })

  it("renders sidebar content when provided", () => {
    render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
        sidebar={<div data-testid="sidebar">Sidebar</div>}
      />,
    )

    expect(screen.getByTestId("sidebar")).toBeInTheDocument()
  })

  it("does not render sidebar content when not provided", () => {
    render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
      />,
    )

    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument()
  })

  it("renders overlays content when provided", () => {
    render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
        overlays={<div data-testid="overlays">Overlays</div>}
      />,
    )

    expect(screen.getByTestId("overlays")).toBeInTheDocument()
  })

  it("does not render overlays content when not provided", () => {
    render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
      />,
    )

    expect(screen.queryByTestId("overlays")).not.toBeInTheDocument()
  })

  it("renders header as <header> element", () => {
    const { container } = render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
      />,
    )

    expect(container.querySelector("header")).toBeInTheDocument()
  })

  it("renders footer as <footer> element", () => {
    const { container } = render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
      />,
    )

    expect(container.querySelector("footer")).toBeInTheDocument()
  })

  it("renders sidebar as <aside> element when provided", () => {
    const { container } = render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
        sidebar={<div data-testid="sidebar">Sidebar</div>}
      />,
    )

    expect(container.querySelector("aside")).toBeInTheDocument()
  })

  it("renders header before timeline in DOM order", () => {
    const { container } = render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
      />,
    )

    const mainColumn = container.querySelector(".flex-1.flex-col")
    const children = mainColumn?.querySelector(".min-h-0")?.children
    expect(children).toBeDefined()
    if (children) {
      // First child should be header element
      expect(children[0].tagName).toBe("HEADER")
    }
  })

  it("renders all three optional props simultaneously (sidebar, overlays, className)", () => {
    render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
        sidebar={<div data-testid="sidebar">Sidebar</div>}
        overlays={<div data-testid="overlays">Overlays</div>}
        className="all-props"
      />,
    )

    expect(screen.getByTestId("header")).toBeInTheDocument()
    expect(screen.getByTestId("timeline")).toBeInTheDocument()
    expect(screen.getByTestId("input")).toBeInTheDocument()
    expect(screen.getByTestId("sidebar")).toBeInTheDocument()
    expect(screen.getByTestId("overlays")).toBeInTheDocument()
  })

  it("applies custom className to root element", () => {
    const { container } = render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
        className="custom-shell"
      />,
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain("custom-shell")
  })

  it("applies base layout classes to root element", () => {
    const { container } = render(
      <WorkbenchShell
        header={<div data-testid="header">Header</div>}
        timeline={<div data-testid="timeline">Timeline</div>}
        input={<div data-testid="input">Input</div>}
      />,
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain("h-dvh")
    expect(root.className).toContain("flex-col")
    expect(root.className).toContain("overflow-hidden")
    expect(root.className).toContain("mx-auto")
    expect(root.className).toContain("md:flex-row")
  })
})
