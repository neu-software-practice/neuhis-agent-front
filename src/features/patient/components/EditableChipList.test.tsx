import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EditableChipList } from "@/features/patient/components/EditableChipList"

describe("EditableChipList", () => {
  it("renders the label", () => {
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素"]}
        editing={false}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText("过敏史")).toBeInTheDocument()
  })

  it("renders chips for each item in display mode", () => {
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素", "花粉"]}
        editing={false}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText("青霉素")).toBeInTheDocument()
    expect(screen.getByText("花粉")).toBeInTheDocument()
  })

  it("renders empty hint when items is empty in display mode", () => {
    render(
      <EditableChipList
        label="过敏史"
        items={[]}
        editing={false}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText("暂无记录，点击编辑添加")).toBeInTheDocument()
  })

  it("renders an edit button in display mode", () => {
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素"]}
        editing={false}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole("button", { name: "编辑过敏史" })).toBeInTheDocument()
  })

  it("calls onEdit when edit button is clicked", async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素"]}
        editing={false}
        onEdit={onEdit}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    await user.click(screen.getByRole("button", { name: "编辑过敏史" }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it("renders input and add button in editing mode", () => {
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素"]}
        editing
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByPlaceholderText("输入后按回车或点击添加")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "添加" })).toBeInTheDocument()
  })

  it("renders save and cancel buttons in editing mode", () => {
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素"]}
        editing
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText("保存")).toBeInTheDocument()
    expect(screen.getByText("取消")).toBeInTheDocument()
  })

  it("disables add button when input is empty", () => {
    render(
      <EditableChipList
        label="过敏史"
        items={[]}
        editing
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole("button", { name: "添加" })).toBeDisabled()
  })

  it("adds a new item when typing and clicking add", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素"]}
        editing
        onEdit={vi.fn()}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByPlaceholderText("输入后按回车或点击添加")
    await user.type(input, "花粉")
    await user.click(screen.getByRole("button", { name: "添加" }))
    expect(screen.getByText("花粉")).toBeInTheDocument()
  })

  it("adds a new item when pressing Enter", async () => {
    const user = userEvent.setup()
    render(
      <EditableChipList
        label="过敏史"
        items={[]}
        editing
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByPlaceholderText("输入后按回车或点击添加")
    await user.type(input, "花粉{Enter}")
    expect(screen.getByText("花粉")).toBeInTheDocument()
  })

  it("does not add duplicate items", async () => {
    const user = userEvent.setup()
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素"]}
        editing
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByPlaceholderText("输入后按回车或点击添加")
    await user.type(input, "青霉素{Enter}")
    const chips = screen.getAllByText("青霉素")
    expect(chips).toHaveLength(1)
  })

  it("does not add empty or whitespace-only items", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <EditableChipList
        label="过敏史"
        items={[]}
        editing
        onEdit={vi.fn()}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByPlaceholderText("输入后按回车或点击添加")
    await user.type(input, "   {Enter}")
    expect(onSave).not.toHaveBeenCalled()
  })

  it("removes an item when the remove button is clicked", async () => {
    const user = userEvent.setup()
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素", "花粉"]}
        editing
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const removeButtons = screen.getAllByRole("button", { name: /删除/ })
    await user.click(removeButtons[0])
    expect(screen.queryByText("青霉素")).not.toBeInTheDocument()
    expect(screen.getByText("花粉")).toBeInTheDocument()
  })

  it("calls onSave with updated items when save is clicked", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素"]}
        editing
        onEdit={vi.fn()}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )
    await user.click(screen.getByText("保存"))
    expect(onSave).toHaveBeenCalledWith(["青霉素"])
  })

  it("auto-appends input value on save if not yet added", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素"]}
        editing
        onEdit={vi.fn()}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByPlaceholderText("输入后按回车或点击添加")
    await user.type(input, "花粉")
    await user.click(screen.getByText("保存"))
    expect(onSave).toHaveBeenCalledWith(["青霉素", "花粉"])
  })

  it("calls onCancel and resets items when cancel is clicked", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素"]}
        editing
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={onCancel}
      />,
    )
    const input = screen.getByPlaceholderText("输入后按回车或点击添加")
    await user.type(input, "花粉")
    await user.click(screen.getByRole("button", { name: "添加" }))
    await user.click(screen.getByText("取消"))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("花粉")).not.toBeInTheDocument()
    expect(screen.getByText("青霉素")).toBeInTheDocument()
  })

  it("shows saving state on the save button when saving is true", () => {
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素"]}
        editing
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        saving
      />,
    )
    expect(screen.getByText("保存中…")).toBeInTheDocument()
  })

  it("disables input and buttons when saving", () => {
    render(
      <EditableChipList
        label="过敏史"
        items={[]}
        editing
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        saving
      />,
    )
    expect(screen.getByPlaceholderText("输入后按回车或点击添加")).toBeDisabled()
    expect(screen.getByRole("button", { name: "添加" })).toBeDisabled()
    expect(screen.getByText("保存中…").closest("button")).toBeDisabled()
    expect(screen.getByText("取消").closest("button")).toBeDisabled()
  })

  it("renders '列表为空' when editing with no items", () => {
    render(
      <EditableChipList
        label="过敏史"
        items={[]}
        editing
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText("列表为空")).toBeInTheDocument()
  })

  it("renders with danger color", () => {
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素"]}
        color="danger"
        editing={false}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText("青霉素")).toBeInTheDocument()
    expect(screen.getByText("过敏史")).toBeInTheDocument()
  })

  it("renders with an icon", () => {
    render(
      <EditableChipList
        label="过敏史"
        items={["青霉素"]}
        icon={<span data-testid="test-icon">*</span>}
        editing={false}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByTestId("test-icon")).toBeInTheDocument()
  })
})
