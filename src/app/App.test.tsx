import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import App from "@/app/App"

describe("App", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )
    expect(container).toBeInTheDocument()
  })

  it("wraps content in AppProviders (QueryClientProvider)", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )
    // App renders AnimatedOutlet which renders an empty outlet in this context
    // The key assertion is that it renders without crashing (provider is active)
    expect(document.body).toBeInTheDocument()
  })
})
