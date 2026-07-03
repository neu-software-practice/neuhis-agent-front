import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import { AppSidebar } from "@/features/shared/components/AppSidebar"

describe("AppSidebar", () => {
  it("renders product name", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppSidebar />
      </MemoryRouter>,
    )
    expect(screen.getByText("东软云脑智能医疗")).toBeInTheDocument()
  })

  it("renders navigation with aria-label", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppSidebar />
      </MemoryRouter>,
    )
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument()
  })

  it("renders three nav items", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppSidebar />
      </MemoryRouter>,
    )
    expect(screen.getByText("首页")).toBeInTheDocument()
    expect(screen.getByText("历史")).toBeInTheDocument()
    expect(screen.getByText("我的")).toBeInTheDocument()
  })

  it("renders links with correct hrefs", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppSidebar />
      </MemoryRouter>,
    )
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(3)
    expect(links[0].getAttribute("href")).toBe("/")
    expect(links[1].getAttribute("href")).toBe("/history")
    expect(links[2].getAttribute("href")).toBe("/profile")
  })

  it("marks the active nav item", () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <AppSidebar />
      </MemoryRouter>,
    )
    const profileLink = screen.getByText("我的").closest("a")
    expect(profileLink?.className).toContain("bg-sidebar-accent")
  })

  it("applies inactive class to non-active items", () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <AppSidebar />
      </MemoryRouter>,
    )
    const homeLink = screen.getByText("首页").closest("a")
    expect(homeLink?.className).toContain("text-sidebar-foreground/70")
  })

  it("renders patient-side footer label", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppSidebar />
      </MemoryRouter>,
    )
    expect(screen.getByText("患者端")).toBeInTheDocument()
  })

  it("has hidden md:flex classes for desktop-only display", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <AppSidebar />
      </MemoryRouter>,
    )
    const aside = container.querySelector("aside")
    expect(aside?.className).toContain("hidden")
    expect(aside?.className).toContain("md:flex")
  })
})
