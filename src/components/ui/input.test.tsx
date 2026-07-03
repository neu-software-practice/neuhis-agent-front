import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Input } from "@/components/ui/input"

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input />)
    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("forwards placeholder", () => {
    render(<Input placeholder="Enter name" />)
    expect(screen.getByPlaceholderText("Enter name")).toBeInTheDocument()
  })

  it("forwards disabled state", () => {
    render(<Input disabled />)
    expect(screen.getByRole("textbox")).toBeDisabled()
  })

  it("forwards aria-label", () => {
    render(<Input aria-label="Username" />)
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-label", "Username")
  })

  it("passes through custom className", () => {
    render(<Input className="custom-input" />)
    const input = screen.getByRole("textbox")
    expect(input.className).toContain("custom-input")
  })

  it("forwards type attribute", () => {
    render(<Input type="password" />)
    // password inputs don't have textbox role, query differently
    const input = document.querySelector("input[type='password']")
    expect(input).not.toBeNull()
  })

  it("forwards name attribute", () => {
    render(<Input name="email" />)
    expect(screen.getByRole("textbox")).toHaveAttribute("name", "email")
  })

  it("forwards value attribute", () => {
    render(<Input value="hello" readOnly />)
    expect(screen.getByRole("textbox")).toHaveValue("hello")
  })

  it("forwards readOnly attribute", () => {
    render(<Input readOnly />)
    expect(screen.getByRole("textbox")).toHaveAttribute("readonly")
  })

  it("forwards autoComplete attribute", () => {
    render(<Input autoComplete="email" />)
    expect(screen.getByRole("textbox")).toHaveAttribute("autocomplete", "email")
  })

  it("renders without crashing with onChange callback", () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)
    const input = screen.getByRole("textbox")
    expect(input).toBeInTheDocument()
  })
})
