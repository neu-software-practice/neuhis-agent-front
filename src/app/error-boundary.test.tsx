import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AppErrorBoundary } from "@/app/error-boundary"

// Mock react-router's useRouteError and isRouteErrorResponse
const mockUseRouteError = vi.fn()
const mockIsRouteErrorResponse = vi.fn()

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return {
    ...actual,
    useRouteError: () => mockUseRouteError(),
    isRouteErrorResponse: (error: unknown) => mockIsRouteErrorResponse(error),
  }
})

describe("AppErrorBoundary", () => {
  const originalConsoleError = console.error
  beforeEach(() => {
    console.error = vi.fn()
    mockUseRouteError.mockReset()
    mockIsRouteErrorResponse.mockReset()
  })
  afterEach(() => {
    console.error = originalConsoleError
  })

  it("renders generic error fallback for non-404 errors", () => {
    mockUseRouteError.mockReturnValue(new Error("Something went wrong"))
    mockIsRouteErrorResponse.mockReturnValue(false)

    render(<AppErrorBoundary />)

    expect(screen.getByText("页面出了点问题")).toBeInTheDocument()
    expect(screen.getByText("请稍后重试，或返回首页重新开始。")).toBeInTheDocument()
  })

  it("renders 404 fallback for 404 route errors", () => {
    const error404 = { status: 404, data: "Not Found" }
    mockUseRouteError.mockReturnValue(error404)
    mockIsRouteErrorResponse.mockReturnValue(true)

    render(<AppErrorBoundary />)

    expect(screen.getByText("找不到这个页面")).toBeInTheDocument()
    expect(screen.getByText("链接可能已失效，返回首页继续使用。")).toBeInTheDocument()
  })

  it("renders a '返回首页' button", () => {
    mockUseRouteError.mockReturnValue(new Error("Test error"))
    mockIsRouteErrorResponse.mockReturnValue(false)

    render(<AppErrorBoundary />)

    const homeLink = screen.getByText("返回首页")
    expect(homeLink).toBeInTheDocument()
    expect(homeLink.closest("a")?.getAttribute("href")).toBe("/")
  })

  it("renders within a PageShell", () => {
    mockUseRouteError.mockReturnValue(new Error("Test error"))
    mockIsRouteErrorResponse.mockReturnValue(false)

    const { container } = render(<AppErrorBoundary />)
    // PageShell renders a flex column layout
    expect(container.querySelector(".flex.h-full")).not.toBeNull()
  })
})
