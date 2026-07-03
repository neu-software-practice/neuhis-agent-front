import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Address } from "@/features/patient/api"
import { AddressPickerModal } from "@/features/workbench/flow-cards/AddressPickerModal"

const PATIENT_ID = "patient-001"

/**
 * 用 vi.hoisted 暴露可控的 useQuery mock，
 * 让每个测试可以独立设置 loading / error / data 状态。
 */
const {
  useQueryMock,
  setIsLoading,
  setIsError,
  setError,
  setData,
  setRefetch,
} = vi.hoisted(() => {
  const state = {
    isLoading: false,
    isError: false,
    error: new Error("加载失败"),
    data: undefined as { addresses: Address[] } | undefined,
    refetch: vi.fn(),
  }
  return {
    useQueryMock: vi.fn((opts: { enabled?: boolean }) => {
      // enabled=false 时 react-query 返回 idle 状态
      if (opts.enabled === false) {
        return {
          data: undefined,
          isLoading: false,
          isError: false,
          error: null,
          refetch: state.refetch,
        }
      }
      return {
        data: state.data,
        isLoading: state.isLoading,
        isError: state.isError,
        error: state.error,
        refetch: state.refetch,
      }
    }),
    setIsLoading: (v: boolean) => {
      state.isLoading = v
    },
    setIsError: (v: boolean) => {
      state.isError = v
    },
    setError: (v: Error) => {
      state.error = v
    },
    setData: (v: { addresses: Address[] } | undefined) => {
      state.data = v
    },
    setRefetch: (v: ReturnType<typeof vi.fn>) => {
      state.refetch = v
    },
  }
})

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>()
  return {
    ...actual,
    useQuery: (opts: { enabled?: boolean }) => useQueryMock(opts),
  }
})

vi.mock("@/features/patient/components/AddressCard", () => ({
  AddressCard: ({
    address,
    selectable,
    selected,
    onSelect,
  }: {
    address: Address
    selectable?: boolean
    selected?: boolean
    onSelect?: (address: Address) => void
  }) => (
    <div data-testid={`address-card-${address.id}`}>
      <span>{address.name}</span>
      {selectable ? (
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => onSelect?.(address)}
        >
          选择-{address.id}
        </button>
      ) : null}
    </div>
  ),
}))

vi.mock("@/features/patient/components/AddressFormModal", () => ({
  AddressFormModal: () => null,
}))

const sampleAddresses: Address[] = [
  {
    id: "addr-1",
    patientId: PATIENT_ID,
    name: "张三",
    phone: "13800000000",
    fullAddress: "某市某区某街道 1 号",
    isDefault: true,
    tag: "home",
  },
  {
    id: "addr-2",
    patientId: PATIENT_ID,
    name: "李四",
    phone: "13900000000",
    fullAddress: "某市某区某街道 2 号",
    isDefault: false,
    tag: "company",
  },
]

afterEach(() => {
  useQueryMock.mockClear()
})

describe("AddressPickerModal", () => {
  let onClose: ReturnType<typeof vi.fn>
  let onConfirm: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onClose = vi.fn()
    onConfirm = vi.fn()
    setIsLoading(false)
    setIsError(false)
    setError(new Error("加载失败"))
    setData({ addresses: sampleAddresses })
    setRefetch(vi.fn())
  })

  it("isOpen=false 时 useQuery 不被启用", () => {
    render(
      <AddressPickerModal
        isOpen={false}
        onClose={onClose}
        onConfirm={onConfirm}
        patientId={PATIENT_ID}
      />,
    )

    // 至少有一次调用 enabled=false
    const disabledCall = useQueryMock.mock.calls.find(
      ([opts]) => opts?.enabled === false,
    )
    expect(disabledCall).toBeTruthy()
  })

  it("isOpen=true 且 loading 时显示加载提示", () => {
    setIsLoading(true)

    render(
      <AddressPickerModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        patientId={PATIENT_ID}
      />,
    )

    expect(screen.getByText("正在加载地址")).toBeInTheDocument()
  })

  it("isOpen=true 且 error 时显示错误信息和重试按钮", () => {
    setIsError(true)
    setError(new Error("网络异常"))

    render(
      <AddressPickerModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        patientId={PATIENT_ID}
      />,
    )

    expect(screen.getByText("网络异常")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /重试/ })).toBeInTheDocument()
  })

  it("error 时点击重试调用 refetch", async () => {
    setIsError(true)
    const refetch = vi.fn()
    setRefetch(refetch)

    render(
      <AddressPickerModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        patientId={PATIENT_ID}
      />,
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /重试/ }))

    await waitFor(() => {
      expect(refetch).toHaveBeenCalled()
    })
  })

  it("地址为空时显示「暂无收货地址」和新增按钮", () => {
    setData({ addresses: [] })

    render(
      <AddressPickerModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        patientId={PATIENT_ID}
      />,
    )

    expect(screen.getByText("暂无收货地址")).toBeInTheDocument()
    // 新增地址按钮在 body 和 footer 各有一个
    expect(
      screen.getAllByRole("button", { name: /新增地址/ }).length,
    ).toBeGreaterThanOrEqual(1)
  })

  it("有地址时渲染地址卡片列表", () => {
    render(
      <AddressPickerModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        patientId={PATIENT_ID}
      />,
    )

    expect(screen.getByTestId("address-card-addr-1")).toBeInTheDocument()
    expect(screen.getByTestId("address-card-addr-2")).toBeInTheDocument()
  })

  it("默认选中默认地址，确认按钮可用", () => {
    render(
      <AddressPickerModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        patientId={PATIENT_ID}
      />,
    )

    // addr-1 是默认地址，应被选中
    const selectBtn1 = screen.getByText("选择-addr-1")
    expect(selectBtn1).toHaveAttribute("aria-pressed", "true")
    expect(
      screen.getByRole("button", { name: /确认配送/ }),
    ).toBeEnabled()
  })

  it("点击地址卡片切换选中项", async () => {
    render(
      <AddressPickerModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        patientId={PATIENT_ID}
      />,
    )

    const user = userEvent.setup()
    await user.click(screen.getByText("选择-addr-2"))

    expect(screen.getByText("选择-addr-2")).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("点击「确认配送」触发 onConfirm 并关闭弹窗", async () => {
    render(
      <AddressPickerModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        patientId={PATIENT_ID}
      />,
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /确认配送/ }))

    expect(onConfirm).toHaveBeenCalledWith("addr-1")
    expect(onClose).toHaveBeenCalled()
  })

  it("点击「取消」触发 onClose", async () => {
    render(
      <AddressPickerModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        patientId={PATIENT_ID}
      />,
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /取消/ }))

    expect(onClose).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("地址数 >= 10 时底部新增地址按钮被禁用", () => {
    const manyAddresses: Address[] = Array.from({ length: 10 }, (_, i) => ({
      id: `addr-${i}`,
      patientId: PATIENT_ID,
      name: `用户${i}`,
      phone: "13800000000",
      fullAddress: `地址 ${i}`,
      isDefault: i === 0,
      tag: "home",
    }))
    setData({ addresses: manyAddresses })

    render(
      <AddressPickerModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        patientId={PATIENT_ID}
      />,
    )

    // 底部的新增地址按钮（footer 中）
    const addButtons = screen.getAllByRole("button", { name: /新增地址/ })
    // footer 按钮是最后一个
    const footerAdd = addButtons[addButtons.length - 1]
    expect(footerAdd).toBeDisabled()
  })
})
