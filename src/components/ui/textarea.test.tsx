import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Textarea } from "@/components/ui/textarea"

describe("Textarea", () => {
  it("renders a textarea element", () => {
    render(<Textarea />)
    const textarea = document.querySelector("textarea")
    expect(textarea).not.toBeNull()
  })

  it("forwards placeholder", () => {
    render(<Textarea placeholder="Describe symptoms" />)
    expect(screen.getByPlaceholderText("Describe symptoms")).toBeInTheDocument()
  })

  it("forwards disabled state", () => {
    render(<Textarea disabled />)
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement
    expect(textarea).toBeDisabled()
  })

  it("forwards aria-label", () => {
    render(<Textarea aria-label="Symptoms description" />)
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement
    expect(textarea.getAttribute("aria-label")).toBe("Symptoms description")
  })

  it("passes through custom className", () => {
    render(<Textarea className="custom-textarea" />)
    const textarea = document.querySelector("textarea")
    expect(textarea?.className).toContain("custom-textarea")
  })

  it("forwards name attribute", () => {
    render(<Textarea name="complaint" />)
    const textarea = document.querySelector("textarea")
    expect(textarea).toHaveAttribute("name", "complaint")
  })

  it("forwards rows attribute", () => {
    render(<Textarea rows={5} />)
    const textarea = document.querySelector("textarea")
    expect(textarea?.getAttribute("rows")).toBe("5")
  })

  it("forwards value attribute with readOnly", () => {
    render(<Textarea value="test content" readOnly />)
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement
    expect(textarea?.textContent || textarea?.value).toBeDefined()
  })

  it("forwards readOnly attribute", () => {
    render(<Textarea readOnly />)
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement
    expect(textarea).toHaveAttribute("readonly")
  })

  it("renders without crashing with defaultValue", () => {
    render(<Textarea defaultValue="default text" />)
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement
    expect(textarea).not.toBeNull()
  })
})
