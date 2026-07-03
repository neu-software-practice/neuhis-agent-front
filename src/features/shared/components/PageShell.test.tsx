import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PageShell } from "@/features/shared/components/PageShell"

describe("PageShell", () => {
  it("renders children content", () => {
    render(
      <PageShell>
        <div data-testid="page-content">Page body</div>
      </PageShell>,
    )
    expect(screen.getByTestId("page-content")).toBeInTheDocument()
    expect(screen.getByText("Page body")).toBeInTheDocument()
  })

  it("renders header when provided", () => {
    render(
      <PageShell header={<h1 data-testid="page-header">标题</h1>}>
        <span>Content</span>
      </PageShell>,
    )
    expect(screen.getByTestId("page-header")).toBeInTheDocument()
    expect(screen.getByText("标题")).toBeInTheDocument()
  })

  it("does not render header element when header not provided", () => {
    render(<PageShell><span>Content</span></PageShell>)
    expect(document.querySelector("header")).toBeNull()
  })

  it("renders footer when provided", () => {
    render(
      <PageShell footer={<nav data-testid="page-footer">底部导航</nav>}>
        <span>Content</span>
      </PageShell>,
    )
    expect(screen.getByTestId("page-footer")).toBeInTheDocument()
    expect(screen.getByText("底部导航")).toBeInTheDocument()
  })

  it("does not render footer element when footer not provided", () => {
    render(<PageShell><span>Content</span></PageShell>)
    expect(document.querySelector("footer")).toBeNull()
  })

  it("applies custom className to scroll container", () => {
    const { container } = render(
      <PageShell className="custom-scroll">
        <span>Content</span>
      </PageShell>,
    )
    expect(container.querySelector(".custom-scroll")).not.toBeNull()
  })

  it("renders header, children, and footer together", () => {
    render(
      <PageShell
        header={<span data-testid="hdr">H</span>}
        footer={<span data-testid="ftr">F</span>}
      >
        <span data-testid="body">B</span>
      </PageShell>,
    )
    expect(screen.getByTestId("hdr")).toBeInTheDocument()
    expect(screen.getByTestId("body")).toBeInTheDocument()
    expect(screen.getByTestId("ftr")).toBeInTheDocument()
  })

  it("has flex column layout class on root", () => {
    const { container } = render(
      <PageShell><span>Content</span></PageShell>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("flex")
    expect(root.className).toContain("h-full")
  })
})
