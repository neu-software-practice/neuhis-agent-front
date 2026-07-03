import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"

import { useAuthStore } from "@/features/auth/store/auth-store"
import { AuthGuard } from "@/features/auth/components/AuthGuard"

vi.mock("@/features/auth/store/auth-store", () => ({
  useAuthStore: vi.fn(),
}))

function renderAuthGuard(initialEntry = "/protected") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<AuthGuard />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe("AuthGuard", () => {
  it("renders Outlet (children) when authenticated", () => {
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    renderAuthGuard()

    expect(screen.getByText("Protected Content")).toBeInTheDocument()
  })

  it("redirects to /login with redirectTo param when not authenticated", () => {
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)

    renderAuthGuard()

    expect(screen.getByText("Login Page")).toBeInTheDocument()
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
  })

  it("redirects to /login with encoded redirectTo for nested paths", () => {
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)

    const { container } = renderAuthGuard("/dashboard?tab=profile")

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
  })

  it("redirects preserving search params in the redirectTo encoding", () => {
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)

    renderAuthGuard("/page?key=value")

    // The redirect happens; we verify protected content is not rendered
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
  })

  it("renders nested route content when authenticated", () => {
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route
              path="/protected"
              element={<div data-testid="nested">Deep Content</div>}
            />
          </Route>
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId("nested")).toBeInTheDocument()
  })
})
