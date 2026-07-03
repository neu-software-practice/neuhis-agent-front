import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Address } from "@/features/patient/api"
import { AddressCard } from "@/features/patient/components/AddressCard"

function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: "addr-1",
    patientId: "patient-1",
    name: "张三",
    phone: "13800138000",
    province: "北京市",
    city: "北京市",
    district: "海淀区",
    detail: "中关村大街1号",
    isDefault: false,
    tag: "家",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("AddressCard", () => {
  it("renders the recipient name and phone", () => {
    render(<AddressCard address={makeAddress()} />)
    expect(screen.getByText("张三")).toBeInTheDocument()
    expect(screen.getByText("13800138000")).toBeInTheDocument()
  })

  it("renders the full address", () => {
    render(<AddressCard address={makeAddress()} />)
    // full address = province + city + district + detail
    expect(screen.getByText("北京市北京市海淀区中关村大街1号")).toBeInTheDocument()
  })

  it("renders the tag chip when tag is present", () => {
    render(<AddressCard address={makeAddress({ tag: "公司" })} />)
    expect(screen.getByText("公司")).toBeInTheDocument()
  })

  it("does not render tag chip when tag is absent", () => {
    render(<AddressCard address={makeAddress({ tag: undefined })} />)
    expect(screen.queryByText("家")).not.toBeInTheDocument()
  })

  it("renders default chip when isDefault is true", () => {
    render(<AddressCard address={makeAddress({ isDefault: true })} />)
    expect(screen.getByText("默认")).toBeInTheDocument()
  })

  it("does not render default chip when isDefault is false", () => {
    render(<AddressCard address={makeAddress({ isDefault: false })} />)
    expect(screen.queryByText("默认")).not.toBeInTheDocument()
  })

  it("renders edit and delete buttons in non-selectable mode", () => {
    render(<AddressCard address={makeAddress()} />)
    expect(screen.getByText("编辑")).toBeInTheDocument()
    expect(screen.getByText("删除")).toBeInTheDocument()
  })

  it("renders set-default button with correct label for non-default address", () => {
    render(<AddressCard address={makeAddress({ isDefault: false })} />)
    expect(screen.getByText("设为默认")).toBeInTheDocument()
  })

  it("renders set-default button with '默认地址' label for default address", () => {
    render(<AddressCard address={makeAddress({ isDefault: true })} />)
    expect(screen.getByText("默认地址")).toBeInTheDocument()
  })

  it("disables set-default button when address is default", () => {
    render(<AddressCard address={makeAddress({ isDefault: true })} />)
    const setDefaultButton = screen.getByText("默认地址").closest("button")
    expect(setDefaultButton).toBeDisabled()
  })

  it("calls onEdit when edit button is clicked", async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const address = makeAddress()
    render(<AddressCard address={address} onEdit={onEdit} />)
    await user.click(screen.getByText("编辑"))
    expect(onEdit).toHaveBeenCalledWith(address)
  })

  it("calls onDelete when delete button is clicked", async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const address = makeAddress()
    render(<AddressCard address={address} onDelete={onDelete} />)
    await user.click(screen.getByText("删除"))
    expect(onDelete).toHaveBeenCalledWith(address)
  })

  it("calls onSetDefault when set-default button is clicked", async () => {
    const user = userEvent.setup()
    const onSetDefault = vi.fn()
    const address = makeAddress({ isDefault: false })
    render(<AddressCard address={address} onSetDefault={onSetDefault} />)
    await user.click(screen.getByText("设为默认"))
    expect(onSetDefault).toHaveBeenCalledWith(address)
  })

  it("renders as a button in selectable mode", () => {
    render(<AddressCard address={makeAddress()} selectable selected={false} />)
    const button = screen.getByRole("button")
    expect(button).toHaveAttribute("aria-pressed", "false")
  })

  it("reflects selected state via aria-pressed", () => {
    render(<AddressCard address={makeAddress()} selectable selected />)
    const button = screen.getByRole("button")
    expect(button).toHaveAttribute("aria-pressed", "true")
  })

  it("calls onSelect when clicked in selectable mode", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const address = makeAddress()
    render(
      <AddressCard
        address={address}
        selectable
        selected={false}
        onSelect={onSelect}
      />,
    )
    await user.click(screen.getByRole("button"))
    expect(onSelect).toHaveBeenCalledWith(address)
  })

  it("does not render footer buttons in selectable mode", () => {
    render(<AddressCard address={makeAddress()} selectable selected={false} />)
    expect(screen.queryByText("编辑")).not.toBeInTheDocument()
    expect(screen.queryByText("删除")).not.toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <AddressCard address={makeAddress()} className="custom-cls" />,
    )
    expect(container.querySelector(".custom-cls")).toBeInTheDocument()
  })
})
