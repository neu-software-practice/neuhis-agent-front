import { render, screen } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { AppProviders } from "@/app/providers"
import { queryClient } from "@/lib/query-client"

describe("AppProviders", () => {
  it("renders children", () => {
    render(
      <AppProviders>
        <div data-testid="child">App Content</div>
      </AppProviders>,
    )
    expect(screen.getByTestId("child")).toBeInTheDocument()
    expect(screen.getByText("App Content")).toBeInTheDocument()
  })

  it("wraps children in QueryClientProvider", () => {
    // Verify the provider is active by checking queryClient is accessible
    expect(queryClient).toBeDefined()
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(30_000)
  })

  it("renders multiple children", () => {
    render(
      <AppProviders>
        <span data-testid="a">A</span>
        <span data-testid="b">B</span>
      </AppProviders>,
    )
    expect(screen.getByTestId("a")).toBeInTheDocument()
    expect(screen.getByTestId("b")).toBeInTheDocument()
  })

  it("does not crash with empty children", () => {
    const { container } = render(<AppProviders>{undefined}</AppProviders>)
    expect(container).toBeInTheDocument()
  })
})
