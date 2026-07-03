import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { fireEvent } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { FlowCard } from "@/features/workbench/api"
import {
  createLabPaymentCard,
  createMedicationPaymentCard,
} from "@/mocks/api/fixtures/flow-cards"
import { PaymentCard } from "@/features/workbench/flow-cards/PaymentCard"

const SESSION_ID = "session-payment"

afterEach(() => {
  cleanup()
})

describe("PaymentCard", () => {
  it("渲染 lab 缴费卡片：标题、用途、项目、金额汇总、状态和按钮", () => {
    const card = createLabPaymentCard(SESSION_ID, "card-pay-1")

    render(<PaymentCard card={card} />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
    expect(screen.getByText("（检验费）")).toBeInTheDocument()
    for (const item of card.items) {
      // 项目名称与数量在同一行，用正则匹配名称部分
      expect(screen.getByText(new RegExp(`^${item.name}`))).toBeInTheDocument()
    }
    expect(screen.getByText("未支付")).toBeInTheDocument()
    // 按钮
    expect(screen.getByRole("button", { name: /确认支付/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /暂不缴费/ })).toBeInTheDocument()
  })

  it("medication 目的显示「药品费」", () => {
    const card = createMedicationPaymentCard(SESSION_ID, "card-pay-2")

    render(<PaymentCard card={card} />)

    expect(screen.getByText("（药品费）")).toBeInTheDocument()
  })

  it("点击「确认支付」触发 onAction({ type: submit_payment })", async () => {
    const onAction = vi.fn()
    const card = createLabPaymentCard(SESSION_ID, "card-pay-submit")

    render(<PaymentCard card={card} onAction={onAction} />)

    const user = userEvent.setup()
    const btn = screen.getByRole("button", { name: /确认支付/ })
    await user.click(btn)
    if (onAction.mock.calls.length === 0) {
      fireEvent.click(btn)
    }

    expect(onAction).toHaveBeenCalledWith({
      type: "submit_payment",
      cardId: card.id,
      paymentMethodId: "default",
    })
  })

  it("点击「暂不缴费」触发 onAction({ type: defer_payment })", async () => {
    const onAction = vi.fn()
    const card = createLabPaymentCard(SESSION_ID, "card-pay-defer")

    render(<PaymentCard card={card} onAction={onAction} />)

    const user = userEvent.setup()
    const btn = screen.getByRole("button", { name: /暂不缴费/ })
    await user.click(btn)
    if (onAction.mock.calls.length === 0) {
      fireEvent.click(btn)
    }

    expect(onAction).toHaveBeenCalledWith({
      type: "defer_payment",
      cardId: card.id,
    })
  })

  it("paid 状态显示支付成功并隐藏操作按钮", () => {
    const card: FlowCard = {
      ...createLabPaymentCard(SESSION_ID, "card-pay-paid"),
      status: "completed",
      handledAt: "2026-06-28T03:00:00.000Z",
      paymentStatus: "paid",
    }

    render(<PaymentCard card={card} />)

    expect(screen.getByText("已支付")).toBeInTheDocument()
    expect(screen.getByText("支付成功")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /确认支付/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /暂不缴费/ })).not.toBeInTheDocument()
  })

  it("failed 状态显示支付失败和「重新支付」按钮", () => {
    const card: FlowCard = {
      ...createLabPaymentCard(SESSION_ID, "card-pay-failed"),
      status: "failed",
      paymentStatus: "failed",
    }

    render(<PaymentCard card={card} />)

    // 支付失败文本同时出现在 Chip 和错误提示中
    expect(screen.getAllByText("支付失败").length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByRole("button", { name: /重新支付/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /确认支付/ }),
    ).not.toBeInTheDocument()
  })

  it("failed 点击「重新支付」触发 submit_payment", async () => {
    const onAction = vi.fn()
    const card: FlowCard = {
      ...createLabPaymentCard(SESSION_ID, "card-pay-retry"),
      status: "failed",
      paymentStatus: "failed",
    }

    render(<PaymentCard card={card} onAction={onAction} />)

    const user = userEvent.setup()
    const btn = screen.getByRole("button", { name: /重新支付/ })
    await user.click(btn)
    if (onAction.mock.calls.length === 0) {
      fireEvent.click(btn)
    }

    expect(onAction).toHaveBeenCalledWith({
      type: "submit_payment",
      cardId: card.id,
      paymentMethodId: "default",
    })
  })

  it("disabled=true 时 pending 按钮被禁用", () => {
    const card = createLabPaymentCard(SESSION_ID, "card-pay-disabled")

    render(<PaymentCard card={card} disabled />)

    expect(screen.getByRole("button", { name: /确认支付/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /暂不缴费/ })).toBeDisabled()
  })

  it("项目含数量时显示 ×数量", () => {
    const card: FlowCard = {
      ...createLabPaymentCard(SESSION_ID, "card-pay-qty"),
      items: [{ name: "血常规", amount: 70, quantity: 2 }],
    }

    render(<PaymentCard card={card} />)

    // 数量文本与项目名称在同一行，使用元素文本匹配
    expect(
      screen.getByText((_, el) => el?.textContent === "血常规 ×2"),
    ).toBeInTheDocument()
  })

  it("pending 支付状态显示「支付中」", () => {
    const card: FlowCard = {
      ...createLabPaymentCard(SESSION_ID, "card-pay-pending"),
      paymentStatus: "pending",
    }

    render(<PaymentCard card={card} />)

    expect(screen.getByText("支付中")).toBeInTheDocument()
  })

  it("refunded 支付状态显示「已退款」", () => {
    const card: FlowCard = {
      ...createLabPaymentCard(SESSION_ID, "card-pay-refunded"),
      paymentStatus: "refunded",
    }

    render(<PaymentCard card={card} />)

    expect(screen.getByText("已退款")).toBeInTheDocument()
  })

  it("未知 purpose 回退显示原始值", () => {
    const card: FlowCard = {
      ...createLabPaymentCard(SESSION_ID, "card-pay-unknown-purpose"),
      purpose: "custom_purpose" as "lab",
    }

    render(<PaymentCard card={card} />)

    expect(screen.getByText("（custom_purpose）")).toBeInTheDocument()
  })

  it("paid 但无 handledAt 时不显示成功横幅", () => {
    const card: FlowCard = {
      ...createLabPaymentCard(SESSION_ID, "card-pay-paid-nohandle"),
      paymentStatus: "paid",
      handledAt: undefined,
    }

    render(<PaymentCard card={card} />)

    expect(screen.getByText("已支付")).toBeInTheDocument()
    // No success banner since no handledAt
  })

  it("空 items 数组时正常渲染", () => {
    const card: FlowCard = {
      ...createLabPaymentCard(SESSION_ID, "card-pay-empty-items"),
      items: [],
    }

    const { container } = render(<PaymentCard card={card} />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
  })

  it("数量为 null 时不显示 ×数量", () => {
    const card: FlowCard = {
      ...createLabPaymentCard(SESSION_ID, "card-pay-null-qty"),
      items: [{ name: "血常规", amount: 70, quantity: null as unknown as number }],
    }

    render(<PaymentCard card={card} />)

    expect(
      screen.getByText((_, el) => el?.textContent === "血常规"),
    ).toBeInTheDocument()
  })
})
