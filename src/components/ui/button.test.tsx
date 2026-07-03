import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Button } from "@/components/ui/button"

describe("Button", () => {
  it("renders a button element by default", () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole("button", { name: "Click me" })
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe("BUTTON")
  })

  it("renders children content", () => {
    render(<Button>Submit</Button>)
    expect(screen.getByText("Submit")).toBeInTheDocument()
  })

  it("sets data-slot attribute", () => {
    render(<Button>Test</Button>)
    const button = screen.getByRole("button")
    expect(button.getAttribute("data-slot")).toBe("button")
  })

  it("sets data-variant attribute reflecting the variant prop", () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole("button")
    expect(button.getAttribute("data-variant")).toBe("destructive")
  })

  it("defaults data-variant to 'default'", () => {
    render(<Button>Default</Button>)
    const button = screen.getByRole("button")
    expect(button.getAttribute("data-variant")).toBe("default")
  })

  it("sets data-size attribute reflecting the size prop", () => {
    render(<Button size="lg">Large</Button>)
    const button = screen.getByRole("button")
    expect(button.getAttribute("data-size")).toBe("lg")
  })

  it("defaults data-size to 'default'", () => {
    render(<Button>Default Size</Button>)
    const button = screen.getByRole("button")
    expect(button.getAttribute("data-size")).toBe("default")
  })

  it("forwards onClick handler", async () => {
    const user = (await import("@testing-library/user-event")).default
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    await user.click(screen.getByRole("button"))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("supports disabled state", () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
  })

  it("forwards additional HTML attributes", () => {
    render(<Button type="submit">Submit</Button>)
    const button = screen.getByRole("button")
    expect(button.getAttribute("type")).toBe("submit")
  })

  it("applies aria-label", () => {
    render(<Button aria-label="Close dialog">X</Button>)
    expect(screen.getByLabelText("Close dialog")).toBeInTheDocument()
  })

  it("passes through custom className", () => {
    render(<Button className="extra-class">Styled</Button>)
    const button = screen.getByRole("button")
    expect(button.className).toContain("extra-class")
  })
})
