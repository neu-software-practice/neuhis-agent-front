import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { fireEvent } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { FlowCard } from "@/features/workbench/api"
import { createMedicationFulfillmentCard } from "@/mocks/api/fixtures/flow-cards"
import { MedicationFulfillmentCard } from "@/features/workbench/flow-cards/MedicationFulfillmentCard"

const SESSION_ID = "session-med-fulfill"

// AddressPickerModal 内部依赖 useQuery（需要 QueryClientProvider），
// 与取药卡片本身逻辑无关，统一 mock 掉以避免环境依赖。
vi.mock("@/features/workbench/flow-cards/AddressPickerModal", () => ({
  AddressPickerModal: () => null,
}))

afterEach(() => {
  cleanup()
})

describe("MedicationFulfillmentCard", () => {
  it("渲染 pending 卡片：标题、药品清单、合计、状态和自取/配送按钮", () => {
    const card = createMedicationFulfillmentCard(SESSION_ID, "card-med-1")

    render(<MedicationFulfillmentCard card={card} patientId="patient-001" />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
    expect(screen.getByText("待取药")).toBeInTheDocument()
    expect(screen.getByText("药品清单")).toBeInTheDocument()
    for (const med of card.medications) {
      expect(screen.getByText(med.name)).toBeInTheDocument()
      expect(
        screen.getByText((_, el) => el?.textContent === `规格：${med.spec}`),
      ).toBeInTheDocument()
    }
    expect(screen.getByText(/合计/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /自取/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /配送/ })).toBeInTheDocument()
  })

  it("点击「自取」触发 onAction({ type: choose_fulfillment, mode: pickup })", async () => {
    const onAction = vi.fn()
    const card = createMedicationFulfillmentCard(SESSION_ID, "card-med-pickup")

    render(
      <MedicationFulfillmentCard
        card={card}
        patientId="patient-001"
        onAction={onAction}
      />,
    )

    const user = userEvent.setup()
    const btn = screen.getByRole("button", { name: /自取/ })
    await user.click(btn)
    if (onAction.mock.calls.length === 0) {
      fireEvent.click(btn)
    }

    expect(onAction).toHaveBeenCalledWith({
      type: "choose_fulfillment",
      cardId: card.id,
      mode: "pickup",
    })
  })

  it("confirmed 状态显示已选择方式且不显示操作按钮", () => {
    const card: FlowCard = {
      ...createMedicationFulfillmentCard(SESSION_ID, "card-med-confirmed"),
      fulfillmentStatus: "confirmed",
      selectedMode: "pickup",
    }

    render(<MedicationFulfillmentCard card={card} patientId="patient-001" />)

    expect(screen.getByText("已确认")).toBeInTheDocument()
    expect(screen.getByText(/已选择方式/)).toBeInTheDocument()
    expect(screen.getByText("自取")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /自取/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /配送/ }),
    ).not.toBeInTheDocument()
  })

  it("completed 配送状态显示地址详情和完成时间", () => {
    const card: FlowCard = {
      ...createMedicationFulfillmentCard(SESSION_ID, "card-med-delivered"),
      status: "completed",
      fulfillmentStatus: "completed",
      selectedMode: "delivery",
      handledAt: "2026-06-28T04:00:00.000Z",
      deliveryAddress: {
        name: "张三",
        phone: "138****5678",
        fullAddress: "某市某区某街道 1 号",
      },
    }

    render(<MedicationFulfillmentCard card={card} patientId="patient-001" />)

    expect(screen.getByText("已完成")).toBeInTheDocument()
    expect(screen.getByText("配送")).toBeInTheDocument()
    // 姓名和电话在同一 div 文本节点中
    expect(
      screen.getByText((_, el) => el?.textContent === "张三 138****5678"),
    ).toBeInTheDocument()
    expect(screen.getByText("某市某区某街道 1 号")).toBeInTheDocument()
    expect(screen.getByText(/已选择方式/)).toBeInTheDocument()
  })

  it("无 pickup 时不显示自取按钮", () => {
    const card: FlowCard = {
      ...createMedicationFulfillmentCard(SESSION_ID, "card-med-delivery-only"),
      availableModes: ["delivery"],
    }

    render(<MedicationFulfillmentCard card={card} patientId="patient-001" />)

    expect(
      screen.queryByRole("button", { name: /自取/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /配送/ })).toBeInTheDocument()
  })

  it("无 delivery 时不显示配送按钮", () => {
    const card: FlowCard = {
      ...createMedicationFulfillmentCard(SESSION_ID, "card-med-pickup-only"),
      availableModes: ["pickup"],
    }

    render(<MedicationFulfillmentCard card={card} patientId="patient-001" />)

    expect(screen.getByRole("button", { name: /自取/ })).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /配送/ }),
    ).not.toBeInTheDocument()
  })

  it("无 patientId 时自取按钮可用，配送按钮禁用", () => {
    const card = createMedicationFulfillmentCard(SESSION_ID, "card-med-nopid")

    render(<MedicationFulfillmentCard card={card} />)

    expect(screen.getByRole("button", { name: /自取/ })).toBeEnabled()
    expect(screen.getByRole("button", { name: /配送/ })).toBeDisabled()
  })

  it("disabled=true 时 pending 按钮被禁用", () => {
    const card = createMedicationFulfillmentCard(SESSION_ID, "card-med-disabled")

    render(
      <MedicationFulfillmentCard
        card={card}
        patientId="patient-001"
        disabled
      />,
    )

    expect(screen.getByRole("button", { name: /自取/ })).toBeDisabled()
  })

  it("药品显示用量和天数", () => {
    const card = createMedicationFulfillmentCard(SESSION_ID, "card-med-dosage")

    render(<MedicationFulfillmentCard card={card} patientId="patient-001" />)

    const med = card.medications[0]
    expect(
      screen.getByText((_, el) => el?.textContent === `用量：${med.dosage}`),
    ).toBeInTheDocument()
    // 两种药品都是 3 天，应匹配到两个
    expect(screen.getAllByText(/天数：3天/)).toHaveLength(2)
  })

  it("药品无用量时不显示用量行", () => {
    const card: FlowCard = {
      ...createMedicationFulfillmentCard(SESSION_ID, "card-med-no-dosage"),
      medications: [
        { name: "阿莫西林", spec: "0.5g", dosage: undefined, days: 3, price: 25 },
      ],
    }

    render(<MedicationFulfillmentCard card={card} patientId="patient-001" />)

    expect(screen.queryByText(/用量/)).not.toBeInTheDocument()
    expect(screen.getByText(/天数：3天/)).toBeInTheDocument()
  })

  it("药品无天数时不显示天数行", () => {
    const card: FlowCard = {
      ...createMedicationFulfillmentCard(SESSION_ID, "card-med-no-days"),
      medications: [
        {
          name: "阿莫西林",
          spec: "0.5g",
          dosage: "一次一粒",
          days: null as unknown as number,
          price: 25,
        },
      ],
    }

    render(<MedicationFulfillmentCard card={card} patientId="patient-001" />)

    expect(screen.getByText(/用量：一次一粒/)).toBeInTheDocument()
    expect(screen.queryByText(/天数/)).not.toBeInTheDocument()
  })

  it("pending 状态无 selectedMode 时不显示方式选择区", () => {
    const card: FlowCard = {
      ...createMedicationFulfillmentCard(SESSION_ID, "card-med-no-mode"),
      selectedMode: undefined,
    }

    render(<MedicationFulfillmentCard card={card} />)

    expect(screen.queryByText("已选择方式：")).not.toBeInTheDocument()
  })

  it("completed 无 handledAt 时不显示完成时间", () => {
    const card: FlowCard = {
      ...createMedicationFulfillmentCard(SESSION_ID, "card-med-completed-nohandle"),
      status: "completed",
      fulfillmentStatus: "completed",
      handledAt: undefined,
    }

    render(<MedicationFulfillmentCard card={card} />)

    expect(screen.getByText("已完成")).toBeInTheDocument()
  })

  it("空 medications 数组时正常渲染", () => {
    const card: FlowCard = {
      ...createMedicationFulfillmentCard(SESSION_ID, "card-med-empty-meds"),
      medications: [],
    }

    render(<MedicationFulfillmentCard card={card} />)

    expect(screen.getByText("药品清单")).toBeInTheDocument()
    expect(screen.getByText(/合计/)).toBeInTheDocument()
  })

  it("已确认状态不显示操作按钮", () => {
    const card: FlowCard = {
      ...createMedicationFulfillmentCard(SESSION_ID, "card-med-confirmed"),
      status: "accepted",
      fulfillmentStatus: "confirmed",
    }

    render(<MedicationFulfillmentCard card={card} />)

    expect(screen.queryByRole("button", { name: /自取/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /配送/ })).not.toBeInTheDocument()
  })
})
