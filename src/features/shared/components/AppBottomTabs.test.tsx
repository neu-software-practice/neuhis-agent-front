import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import { AppBottomTabs } from "@/features/shared/components/AppBottomTabs"

describe("AppBottomTabs", () => {
  it("renders navigation with aria-label", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppBottomTabs />
      </MemoryRouter>,
    )
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument()
  })

  it("renders three tab items", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppBottomTabs />
      </MemoryRouter>,
    )
    expect(screen.getByText("首页")).toBeInTheDocument()
    expect(screen.getByText("历史")).toBeInTheDocument()
    expect(screen.getByText("我的")).toBeInTheDocument()
  })

  it("renders links with correct hrefs", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppBottomTabs />
      </MemoryRouter>,
    )
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(3)
    expect(links[0].getAttribute("href")).toBe("/")
    expect(links[1].getAttribute("href")).toBe("/history")
    expect(links[2].getAttribute("href")).toBe("/profile")
  })

  it("marks the active tab with text-primary class", () => {
    render(
      <MemoryRouter initialEntries={["/history"]}>
        <AppBottomTabs />
      </MemoryRouter>,
    )
    // The active link should have text-primary class
    const historyLink = screen.getByText("历史").closest("a")
    expect(historyLink?.className).toContain("text-primary")
  })

  it("applies inactive class to non-active tabs", () => {
    render(
      <MemoryRouter initialEntries={["/history"]}>
        <AppBottomTabs />
      </MemoryRouter>,
    )
    const homeLink = screen.getByText("首页").closest("a")
    expect(homeLink?.className).toContain("text-muted-foreground")
  })

  it("has md:hidden class for mobile-only display", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <AppBottomTabs />
      </MemoryRouter>,
    )
    const nav = container.querySelector("nav")
    expect(nav?.className).toContain("md:hidden")
  })
})
