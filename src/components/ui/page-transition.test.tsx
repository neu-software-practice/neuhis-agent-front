import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import { PageTransition } from "@/components/ui/page-transition"

describe("PageTransition", () => {
  it("renders children content", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PageTransition>
          <div data-testid="page-content">Hello Page</div>
        </PageTransition>
      </MemoryRouter>,
    )
    expect(screen.getByTestId("page-content")).toBeInTheDocument()
    expect(screen.getByText("Hello Page")).toBeInTheDocument()
  })

  it("wraps children in a motion container", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PageTransition>
          <span>Content</span>
        </PageTransition>
      </MemoryRouter>,
    )
    // motion.div renders a div wrapper
    const content = screen.getByText("Content")
    expect(content).toBeInTheDocument()
  })

  it("renders multiple children", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PageTransition>
          <h1>Title</h1>
          <p>Body text</p>
        </PageTransition>
      </MemoryRouter>,
    )
    expect(screen.getByText("Title")).toBeInTheDocument()
    expect(screen.getByText("Body text")).toBeInTheDocument()
  })
})
