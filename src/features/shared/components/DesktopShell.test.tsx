import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import { DesktopShell } from "@/features/shared/components/DesktopShell"

describe("DesktopShell", () => {
  it("renders children content", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <DesktopShell>
          <div data-testid="shell-content">Main content</div>
        </DesktopShell>
      </MemoryRouter>,
    )
    expect(screen.getByTestId("shell-content")).toBeInTheDocument()
    expect(screen.getByText("Main content")).toBeInTheDocument()
  })

  it("renders sidebar with product name", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <DesktopShell>
          <span>Content</span>
        </DesktopShell>
      </MemoryRouter>,
    )
    expect(screen.getByText("东软云脑智能医疗")).toBeInTheDocument()
  })

  it("renders bottom tabs", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <DesktopShell>
          <span>Content</span>
        </DesktopShell>
      </MemoryRouter>,
    )
    // Bottom tabs render nav items
    expect(screen.getAllByText("首页").length).toBeGreaterThan(0)
  })

  it("has flex layout on root", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <DesktopShell>
          <span>Content</span>
        </DesktopShell>
      </MemoryRouter>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("flex")
    expect(root.className).toContain("h-dvh")
  })

  it("renders children alongside navigation", () => {
    render(
      <MemoryRouter initialEntries={["/history"]}>
        <DesktopShell>
          <h1 data-testid="page-title">History Page</h1>
        </DesktopShell>
      </MemoryRouter>,
    )
    expect(screen.getByTestId("page-title")).toBeInTheDocument()
    expect(screen.getByText("东软云脑智能医疗")).toBeInTheDocument()
  })
})
