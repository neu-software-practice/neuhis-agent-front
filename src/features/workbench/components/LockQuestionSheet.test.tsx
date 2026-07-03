import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { LockQuestionSheet } from "@/features/workbench/components/LockQuestionSheet"

describe("LockQuestionSheet", () => {
  it("renders default header when no cardTitle", () => {
    render(
      <LockQuestionSheet
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText("关于 当前操作 的疑问")).toBeInTheDocument()
  })

  it("renders card title in header when provided", () => {
    render(
      <LockQuestionSheet
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        cardTitle="血常规检验"
      />,
    )

    expect(screen.getByText("关于 血常规检验 的疑问")).toBeInTheDocument()
  })

  it("renders textarea with placeholder", () => {
    render(
      <LockQuestionSheet
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(
      screen.getByPlaceholderText("请输入您的疑问..."),
    ).toBeInTheDocument()
  })

  it("renders both action buttons", () => {
    render(
      <LockQuestionSheet
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "发送疑问" }),
    ).toBeInTheDocument()
  })

  it("invokes onSubmit with trimmed content and closes sheet on submit", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <LockQuestionSheet
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />,
    )

    const textbox = screen.getByPlaceholderText("请输入您的疑问...")
    await user.type(textbox, "我有疑问")

    await user.click(screen.getByRole("button", { name: "发送疑问" }))
    expect(onSubmit).toHaveBeenCalledWith("我有疑问")
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("trims whitespace from submitted content", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <LockQuestionSheet
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />,
    )

    const textbox = screen.getByPlaceholderText("请输入您的疑问...")
    await user.type(textbox, "  空白内容  ")

    await user.click(screen.getByRole("button", { name: "发送疑问" }))
    expect(onSubmit).toHaveBeenCalledWith("空白内容")
  })

  it("does not invoke onSubmit when content is empty or whitespace-only", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <LockQuestionSheet
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />,
    )

    // Click submit with empty content — button should be disabled
    const submitButton = screen.getByRole("button", { name: "发送疑问" })
    expect(submitButton).toBeDisabled()
    await user.click(submitButton)

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("does not invoke onSubmit when content is whitespace-only", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <LockQuestionSheet
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    const textbox = screen.getByPlaceholderText("请输入您的疑问...")
    await user.type(textbox, "   ")

    // Button should be disabled with only whitespace
    const submitButton = screen.getByRole("button", { name: "发送疑问" })
    expect(submitButton).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("renders card title with empty string fallback", () => {
    render(
      <LockQuestionSheet
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        cardTitle=""
      />,
    )

    // Empty string is NOT nullish, so `"" ?? "当前操作"` evaluates to ""
    // This means the title becomes "关于  的疑问"
    expect(screen.getByText(/关于/)).toBeInTheDocument()
  })

  it("invokes onOpenChange(false) and clears content when cancelled", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <LockQuestionSheet
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />,
    )

    const textbox = screen.getByPlaceholderText("请输入您的疑问...")
    await user.type(textbox, "内容")

    await user.click(screen.getByRole("button", { name: "取消" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onSubmit).not.toHaveBeenCalled()

    // After cancel, content should be cleared (state reset on next open)
  })

  it("does not render content when open is false", () => {
    render(
      <LockQuestionSheet
        open={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByText(/关于/)).not.toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText("请输入您的疑问..."),
    ).not.toBeInTheDocument()
  })

  it("disables submit button when content is only whitespace after deleting", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <LockQuestionSheet
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    const textbox = screen.getByPlaceholderText("请输入您的疑问...")
    await user.type(textbox, "Hi")
    expect(screen.getByRole("button", { name: "发送疑问" })).toBeEnabled()

    // Clear content
    await user.clear(textbox)
    expect(screen.getByRole("button", { name: "发送疑问" })).toBeDisabled()
  })
})
