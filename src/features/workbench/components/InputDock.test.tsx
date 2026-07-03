import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { InputDock } from "@/features/workbench/components/InputDock"

describe("InputDock", () => {
  it("renders textarea with default placeholder", () => {
    render(
      <InputDock value="" onValueChange={vi.fn()} onSend={vi.fn()} />,
    )

    expect(screen.getByPlaceholderText("输入消息...")).toBeInTheDocument()
  })

  it("renders textarea with custom placeholder", () => {
    render(
      <InputDock
        value=""
        placeholder="请输入症状..."
        onValueChange={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    expect(screen.getByPlaceholderText("请输入症状...")).toBeInTheDocument()
  })

  it("renders current value in textarea", () => {
    render(
      <InputDock
        value="Hello world"
        onValueChange={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    expect(screen.getByDisplayValue("Hello world")).toBeInTheDocument()
  })

  it("invokes onValueChange when typing", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(
      <InputDock
        value=""
        onValueChange={onValueChange}
        onSend={vi.fn()}
      />,
    )

    await user.type(screen.getByRole("textbox"), "a")
    expect(onValueChange).toHaveBeenCalled()
  })

  it("invokes onSend when send button is clicked with non-empty value", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(
      <InputDock
        value="Hello"
        onValueChange={vi.fn()}
        onSend={onSend}
      />,
    )

    await user.click(screen.getByRole("button", { name: "发送" }))
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it("does not invoke onSend when value is empty", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(
      <InputDock value="" onValueChange={vi.fn()} onSend={onSend} />,
    )

    await user.click(screen.getByRole("button", { name: "发送" }))
    expect(onSend).not.toHaveBeenCalled()
  })

  it("does not invoke onSend when value is only whitespace", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(
      <InputDock value="   " onValueChange={vi.fn()} onSend={onSend} />,
    )

    await user.click(screen.getByRole("button", { name: "发送" }))
    expect(onSend).not.toHaveBeenCalled()
  })

  it("invokes onSend on Enter key (without Shift)", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(
      <InputDock value="Hi" onValueChange={vi.fn()} onSend={onSend} />,
    )

    const textbox = screen.getByRole("textbox")
    await user.click(textbox)
    await user.keyboard("{Enter}")
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it("does not invoke onSend on Shift+Enter", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(
      <InputDock value="Hi" onValueChange={vi.fn()} onSend={onSend} />,
    )

    const textbox = screen.getByRole("textbox")
    await user.click(textbox)
    await user.keyboard("{Shift>}{Enter}{/Shift}")
    expect(onSend).not.toHaveBeenCalled()
  })

  it("does not invoke onSend when disabled", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(
      <InputDock
        value="Hi"
        disabled={true}
        onValueChange={vi.fn()}
        onSend={onSend}
      />,
    )

    await user.click(screen.getByRole("button", { name: "发送" }))
    expect(onSend).not.toHaveBeenCalled()
  })

  it("does not invoke onSend when sending", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(
      <InputDock
        value="Hi"
        sending={true}
        onValueChange={vi.fn()}
        onSend={onSend}
      />,
    )

    await user.click(screen.getByRole("button", { name: "发送" }))
    expect(onSend).not.toHaveBeenCalled()
  })

  it("shows spinner icon when sending is true", () => {
    const { container } = render(
      <InputDock
        value="Hi"
        sending={true}
        onValueChange={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    // Loader2 has animate-spin class
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("shows send icon when not sending", () => {
    const { container } = render(
      <InputDock
        value="Hi"
        sending={false}
        onValueChange={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    // Send icon should be present (svg)
    const button = container.querySelector("button[aria-label='发送']")
    expect(button?.querySelector("svg")).toBeInTheDocument()
    // No spinner
    expect(container.querySelector(".animate-spin")).not.toBeInTheDocument()
  })

  it("renders nothing when blocked is true", () => {
    const { container } = render(
      <InputDock
        value=""
        blocked={true}
        onValueChange={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("shows disabled placeholder when disabled", () => {
    render(
      <InputDock
        value=""
        disabled={true}
        onValueChange={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    expect(screen.getByPlaceholderText("输入已禁用")).toBeInTheDocument()
  })

  it("overrides custom placeholder with disabled placeholder", () => {
    render(
      <InputDock
        value=""
        disabled={true}
        placeholder="自定义占位符"
        onValueChange={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    // When disabled, should show "输入已禁用" regardless of custom placeholder
    expect(screen.getByPlaceholderText("输入已禁用")).toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText("自定义占位符"),
    ).not.toBeInTheDocument()
  })

  it("disables send button when value is empty", () => {
    render(
      <InputDock value="" onValueChange={vi.fn()} onSend={vi.fn()} />,
    )

    const button = screen.getByRole("button", { name: "发送" })
    expect(button).toBeDisabled()
  })

  it("disables send button when sending is true", () => {
    render(
      <InputDock value="Hi" sending={true} onValueChange={vi.fn()} onSend={vi.fn()} />,
    )

    const button = screen.getByRole("button", { name: "发送" })
    expect(button).toBeDisabled()
  })

  it("disables send button when disabled is true", () => {
    render(
      <InputDock value="Hi" disabled={true} onValueChange={vi.fn()} onSend={vi.fn()} />,
    )

    const button = screen.getByRole("button", { name: "发送" })
    expect(button).toBeDisabled()
  })

  it("enables send button when value is non-empty", () => {
    render(
      <InputDock value="Hi" onValueChange={vi.fn()} onSend={vi.fn()} />,
    )

    const button = screen.getByRole("button", { name: "发送" })
    expect(button).toBeEnabled()
  })

  it("does not invoke onSend on Enter when value is empty", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(
      <InputDock value="" onValueChange={vi.fn()} onSend={onSend} />,
    )

    const textbox = screen.getByRole("textbox")
    await user.click(textbox)
    await user.keyboard("{Enter}")
    expect(onSend).not.toHaveBeenCalled()
  })

  it("does not invoke onSend on Enter when value is only whitespace", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(
      <InputDock value="   " onValueChange={vi.fn()} onSend={onSend} />,
    )

    const textbox = screen.getByRole("textbox")
    await user.click(textbox)
    await user.keyboard("{Enter}")
    expect(onSend).not.toHaveBeenCalled()
  })

  it("does not invoke onSend on Enter when disabled", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(
      <InputDock value="Hi" disabled={true} onValueChange={vi.fn()} onSend={onSend} />,
    )

    const textbox = screen.getByRole("textbox")
    await user.click(textbox)
    await user.keyboard("{Enter}")
    expect(onSend).not.toHaveBeenCalled()
  })

  it("does not invoke onSend on Enter when sending", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(
      <InputDock value="Hi" sending={true} onValueChange={vi.fn()} onSend={onSend} />,
    )

    const textbox = screen.getByRole("textbox")
    await user.click(textbox)
    await user.keyboard("{Enter}")
    expect(onSend).not.toHaveBeenCalled()
  })

  it("does not invoke onSend on non-Enter key press", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(
      <InputDock value="Hi" onValueChange={vi.fn()} onSend={onSend} />,
    )

    const textbox = screen.getByRole("textbox")
    await user.click(textbox)
    await user.keyboard("a")
    expect(onSend).not.toHaveBeenCalled()
  })

  it("shows spinner and disables button when both disabled and sending", () => {
    const { container } = render(
      <InputDock
        value="Hi"
        disabled={true}
        sending={true}
        onValueChange={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    // Button should be disabled
    const button = screen.getByRole("button", { name: "发送" })
    expect(button).toBeDisabled()
    // Spinner should be visible
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
    // Placeholder should show disabled text
    expect(screen.getByPlaceholderText("输入已禁用")).toBeInTheDocument()
  })
})
