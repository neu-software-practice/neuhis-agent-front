import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import HomeLayout from "@/layouts/HomeLayout"

describe("HomeLayout", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <HomeLayout />
      </MemoryRouter>,
    )
    expect(container).toBeInTheDocument()
  })

  it("renders the DesktopShell with sidebar", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <HomeLayout />
      </MemoryRouter>,
    )
    expect(screen.getByText("东软云脑智能医疗")).toBeInTheDocument()
  })

  it("renders bottom tabs", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <HomeLayout />
      </MemoryRouter>,
    )
    expect(screen.getAllByText("首页").length).toBeGreaterThan(0)
  })

  it("has flex layout", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <HomeLayout />
      </MemoryRouter>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("flex")
  })
})
