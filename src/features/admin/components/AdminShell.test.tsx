import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// AdminShell renders AdminSidebar + AnimatedOutlet. We mock both to focus on
// the shell's own layout contract without pulling in routing/animation deps.
vi.mock("@/features/admin/components/AdminSidebar", () => ({
  AdminSidebar: () => <aside data-testid="admin-sidebar">sidebar</aside>,
}))

vi.mock("@/components/ui/page-transition", () => ({
  AnimatedOutlet: () => <div data-testid="animated-outlet">outlet</div>,
}))

import { AdminShell } from "@/features/admin/components/AdminShell"

describe("AdminShell", () => {
  it("renders within a full-height flex container", () => {
    const { container } = render(<AdminShell />)
    const root = container.firstElementChild as HTMLElement

    expect(root).toHaveClass("flex")
    expect(root).toHaveClass("h-dvh")
    expect(root).toHaveClass("overflow-hidden")
  })

  it("renders the AdminSidebar on the left", () => {
    render(<AdminShell />)
    expect(screen.getByTestId("admin-sidebar")).toBeInTheDocument()
  })

  it("renders the AnimatedOutlet (content area) beside the sidebar", () => {
    render(<AdminShell />)
    expect(screen.getByTestId("animated-outlet")).toBeInTheDocument()
  })

  it("places the sidebar before the content in DOM order", () => {
    const { container } = render(<AdminShell />)
    const root = container.firstElementChild as HTMLElement
    const sidebar = screen.getByTestId("admin-sidebar")
    const outlet = screen.getByTestId("animated-outlet")

    expect(root.contains(sidebar)).toBe(true)
    expect(root.contains(outlet)).toBe(true)
    // Sidebar comes before outlet in document order.
    expect(sidebar.compareDocumentPosition(outlet)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it("applies the main content area's scrollable styling", () => {
    render(<AdminShell />)
    const outlet = screen.getByTestId("animated-outlet")
    const main = outlet.parentElement as HTMLElement

    expect(main.tagName).toBe("MAIN")
    expect(main).toHaveClass("flex-1")
    expect(main).toHaveClass("overflow-y-auto")
    expect(main).toHaveClass("p-6")
  })

  it("sets background and foreground text color classes on the root", () => {
    const { container } = render(<AdminShell />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass("bg-background")
    expect(root).toHaveClass("text-foreground")
  })
})
