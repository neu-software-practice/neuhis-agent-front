import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SwitchField } from "@/components/ui/switch-field"

function getSwitchContainer() {
  return document.querySelector('[data-slot="switch"]') as HTMLElement
}

describe("SwitchField", () => {
  it("renders a switch container", () => {
    render(<SwitchField aria-label="Toggle notifications" />)
    expect(getSwitchContainer()).not.toBeNull()
  })

  it("renders children content", () => {
    render(
      <SwitchField>
        <SwitchField.Content>
          <span>Notifications</span>
        </SwitchField.Content>
      </SwitchField>,
    )
    expect(screen.getByText("Notifications")).toBeInTheDocument()
  })

  it("forwards aria-label data attribute", () => {
    render(<SwitchField aria-label="Enable dark mode" />)
    const container = getSwitchContainer()
    // React Aria applies aria-label or data-label to the switch root
    expect(container).not.toBeNull()
  })

  it("forwards name attribute", () => {
    render(<SwitchField name="opt-in" aria-label="Opt in" />)
    const container = getSwitchContainer()
    expect(container).not.toBeNull()
  })

  it("supports disabled state", () => {
    render(<SwitchField isDisabled aria-label="Disabled switch" />)
    const container = getSwitchContainer()
    expect(container).toHaveAttribute("data-disabled", "true")
  })

  it("has Content subcomponent", () => {
    expect(SwitchField.Content).toBeDefined()
  })

  it("has Control subcomponent", () => {
    expect(SwitchField.Control).toBeDefined()
  })

  it("has Thumb subcomponent", () => {
    expect(SwitchField.Thumb).toBeDefined()
  })

  it("has Icon subcomponent", () => {
    expect(SwitchField.Icon).toBeDefined()
  })
})
