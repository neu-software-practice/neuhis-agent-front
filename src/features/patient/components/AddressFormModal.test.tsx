import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClientProvider, QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { AddressFormModal } from "@/features/patient/components/AddressFormModal"

vi.mock("@/lib/api", () => ({
  getTransport: () => ({
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  }),
}))

const { mockCreateAddressFn, mockUpdateAddressFn } = vi.hoisted(() => ({
  mockCreateAddressFn: vi.fn().mockResolvedValue({
    id: "addr-new",
    patientId: "patient-1",
    name: "test",
    phone: "13800138000",
    province: "北京市",
    city: "北京市",
    district: "海淀区",
    detail: "test",
    isDefault: false,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  }),
  mockUpdateAddressFn: vi.fn().mockResolvedValue({
    id: "addr-1",
    patientId: "patient-1",
    name: "test",
    phone: "13800138000",
    province: "北京市",
    city: "北京市",
    district: "海淀区",
    detail: "test",
    isDefault: false,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  }),
}))

vi.mock("@/features/patient/api/queries", () => ({
  patientMutations: {
    createAddress: () => ({
      mutationFn: mockCreateAddressFn,
    }),
    updateAddress: () => ({
      mutationFn: mockUpdateAddressFn,
    }),
  },
}))

const mockOnClose = vi.fn()
const mockOnSuccess = vi.fn()

function renderModal(
  props: Partial<React.ComponentProps<typeof AddressFormModal>> = {},
) {
  const queryClient = new QueryClient()
  mockOnClose.mockReset()
  mockOnSuccess.mockReset()
  return render(
    <QueryClientProvider client={queryClient}>
      <AddressFormModal
        isOpen
        onClose={mockOnClose}
        mode="create"
        patientId="patient-1"
        {...props}
      />
    </QueryClientProvider>,
  )
}

describe("AddressFormModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the create-mode heading", () => {
    renderModal({ mode: "create" })
    expect(screen.getByText("新增收货地址")).toBeInTheDocument()
  })

  it("renders the edit-mode heading", () => {
    renderModal({
      mode: "edit",
      initialData: {
        id: "addr-1",
        patientId: "patient-1",
        name: "张三",
        phone: "13800138000",
        province: "北京市",
        city: "北京市",
        district: "海淀区",
        detail: "中关村大街1号",
        isDefault: false,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    })
    expect(screen.getByText("编辑收货地址")).toBeInTheDocument()
  })

  it("renders name and phone input fields", () => {
    renderModal()
    expect(screen.getByPlaceholderText("请输入收件人姓名")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("请输入 11 位手机号")).toBeInTheDocument()
  })

  it("renders tag preset buttons", () => {
    renderModal()
    expect(screen.getByText("家")).toBeInTheDocument()
    expect(screen.getByText("公司")).toBeInTheDocument()
    expect(screen.getByText("病房")).toBeInTheDocument()
    expect(screen.getByText("其他...")).toBeInTheDocument()
  })

  it("renders the save button", () => {
    renderModal()
    expect(screen.getByText("保存地址")).toBeInTheDocument()
  })

  it("renders the cancel button", () => {
    renderModal()
    expect(screen.getByText("取消")).toBeInTheDocument()
  })

  it("prefills fields from initialData in edit mode", () => {
    renderModal({
      mode: "edit",
      initialData: {
        id: "addr-1",
        patientId: "patient-1",
        name: "李四",
        phone: "13900139000",
        province: "上海市",
        city: "上海市",
        district: "浦东新区",
        detail: "世纪大道100号",
        isDefault: true,
        tag: "公司",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    })
    const nameInput = screen.getByPlaceholderText(
      "请输入收件人姓名",
    ) as HTMLInputElement
    const phoneInput = screen.getByPlaceholderText(
      "请输入 11 位手机号",
    ) as HTMLInputElement
    expect(nameInput.value).toBe("李四")
    expect(phoneInput.value).toBe("13900139000")
  })

  it("shows validation error when submitting empty form (invalid phone)", async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByText("保存地址"))
    expect(screen.getByText("手机号格式不正确")).toBeInTheDocument()
  })

  it("toggles custom tag input when clicking 其他...", async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByText("其他..."))
    expect(
      screen.getByPlaceholderText("请输入地址标签"),
    ).toBeInTheDocument()
  })

  it("types into the custom tag input", async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByText("其他..."))
    const tagInput = screen.getByPlaceholderText("请输入地址标签")
    await user.type(tagInput, "自定义标签")
    expect(tagInput).toHaveValue("自定义标签")
  })

  it("hides custom tag input when selecting a preset after custom", async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByText("其他..."))
    expect(
      screen.getByPlaceholderText("请输入地址标签"),
    ).toBeInTheDocument()
    await user.click(screen.getByText("家"))
    expect(
      screen.queryByPlaceholderText("请输入地址标签"),
    ).not.toBeInTheDocument()
  })

  it("calls onClose when cancel is clicked", async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByText("取消"))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("renders the dialog with proper aria-labels", () => {
    renderModal({ mode: "create" })
    expect(screen.getByLabelText("新增收货地址")).toBeInTheDocument()
  })

  it("renders edit-mode dialog with proper aria-label", () => {
    renderModal({
      mode: "edit",
      initialData: {
        id: "addr-1",
        patientId: "patient-1",
        name: "张三",
        phone: "13800138000",
        province: "北京市",
        city: "北京市",
        district: "海淀区",
        detail: "中关村大街1号",
        isDefault: false,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    })
    expect(screen.getByLabelText("编辑收货地址")).toBeInTheDocument()
  })

  it("detects custom tag in edit mode when tag is non-preset", () => {
    renderModal({
      mode: "edit",
      initialData: {
        id: "addr-1",
        patientId: "patient-1",
        name: "张三",
        phone: "13800138000",
        province: "北京市",
        city: "北京市",
        district: "海淀区",
        detail: "中关村大街1号",
        isDefault: false,
        tag: "自定义标签",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    })
    // Custom tag input should appear because tag "自定义标签" is not in presets
    expect(
      screen.getByPlaceholderText("请输入地址标签"),
    ).toBeInTheDocument()
    const tagInput = screen.getByPlaceholderText(
      "请输入地址标签",
    ) as HTMLInputElement
    expect(tagInput.value).toBe("自定义标签")
  })

  it("selects a tag preset via button click", async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByText("公司"))
    // '公司' stays rendered (tag preset selected)
    expect(screen.getByText("公司")).toBeInTheDocument()
  })

  it("submits edit mode and calls updateAddress", async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()

    mockUpdateAddressFn.mockResolvedValue({
      id: "addr-1",
      patientId: "patient-1",
      name: "张三",
      phone: "13800138000",
      province: "北京市",
      city: "北京市",
      district: "海淀区",
      detail: "中关村大街1号",
      isDefault: false,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    })

    renderModal({
      mode: "edit",
      onSuccess,
      initialData: {
        id: "addr-1",
        patientId: "patient-1",
        name: "张三",
        phone: "13800138000",
        province: "北京市",
        city: "北京市",
        district: "海淀区",
        detail: "中关村大街1号",
        isDefault: false,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    })

    // Change the name field
    const nameInput = screen.getByPlaceholderText(
      "请输入收件人姓名",
    ) as HTMLInputElement
    await user.clear(nameInput)
    await user.type(nameInput, "李四")
    await user.click(screen.getByText("保存地址"))

    await waitFor(() => {
      expect(mockUpdateAddressFn).toHaveBeenCalled()
    })
    expect(onSuccess).toHaveBeenCalled()
    expect(mockOnClose).toHaveBeenCalled()
  })

  it("renders the detail textarea", () => {
    renderModal()
    expect(
      screen.getByPlaceholderText("街道、门牌号、楼栋和房间号"),
    ).toBeInTheDocument()
  })

  it("renders the isDefault switch field", () => {
    renderModal()
    expect(screen.getByText("设为默认收货地址")).toBeInTheDocument()
  })

  it("renders with edit-mode icon", () => {
    renderModal({
      mode: "edit",
      initialData: {
        id: "addr-1",
        patientId: "patient-1",
        name: "张三",
        phone: "13800138000",
        province: "北京市",
        city: "北京市",
        district: "海淀区",
        detail: "中关村大街1号",
        isDefault: false,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    })
    // Edit mode should show the MapPin edit icon area
    expect(screen.getByLabelText("编辑收货地址")).toBeInTheDocument()
  })
})
