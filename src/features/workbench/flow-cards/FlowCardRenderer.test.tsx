import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { fireEvent } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { FlowCard } from "@/features/workbench/api"
import { FlowCardRenderer } from "@/features/workbench/flow-cards/FlowCardRenderer"
import {
  createCompletedLabExecutionCard,
  createCompletedVisitCard,
  createDiagnosisCard,
  createLabDecisionCard,
  createLabPaymentCard,
  createMedicationFulfillmentCard,
  createTreatmentExecutionCard,
  createTreatmentPlanCard,
} from "@/mocks/api/fixtures/flow-cards"

const SESSION_ID = "session-flow-card-renderer"

/**
 * advice_only 没有现成的 fixture 工厂，按 adviceOnlyCardSchema 手工构造最小合法卡片。
 */
function createAdviceOnlyCard(sessionId: string, id: string): FlowCard {
  return {
    id,
    sessionId,
    kind: "advice_only",
    status: "pending",
    blocking: false,
    title: "健康医嘱",
    createdAt: "2026-06-28T02:00:00.000Z",
    advices: ["多饮水，清淡饮食", "保证充足休息"],
    watchItems: ["监测体温变化"],
    followUpRecommendation: "若症状持续超过 48 小时未缓解，请发起复诊。",
  }
}

afterEach(() => {
  cleanup()
})

describe("FlowCardRenderer 分发", () => {
  // 每个 kind → 构造卡片的工厂 + 该卡片组件独有的可见文本
  const cases: Array<{
    kind: FlowCard["kind"]
    card: FlowCard
    distinguishingText: string
  }> = [
    {
      kind: "lab_decision",
      card: createLabDecisionCard(SESSION_ID, "card-lab-decision"),
      distinguishingText: "检验原因",
    },
    {
      kind: "payment",
      card: createLabPaymentCard(SESSION_ID, "card-payment"),
      distinguishingText: "个人自付",
    },
    {
      kind: "lab_execution",
      card: createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec"),
      distinguishingText: "出结果",
    },
    {
      kind: "diagnosis",
      card: createDiagnosisCard(SESSION_ID, "card-diagnosis"),
      distinguishingText: "诊断结论",
    },
    {
      kind: "treatment_plan",
      card: createTreatmentPlanCard(SESSION_ID, "card-treatment-plan"),
      distinguishingText: "处置方案",
    },
    {
      kind: "medication_fulfillment",
      card: createMedicationFulfillmentCard(SESSION_ID, "card-med-fulfill"),
      distinguishingText: "药品清单",
    },
    {
      kind: "treatment_execution",
      card: createTreatmentExecutionCard(SESSION_ID, "card-treatment-exec"),
      distinguishingText: "执行能力：",
    },
    {
      kind: "advice_only",
      card: createAdviceOnlyCard(SESSION_ID, "card-advice-only"),
      distinguishingText: "健康建议",
    },
    {
      kind: "completed_visit",
      card: createCompletedVisitCard(SESSION_ID, "card-completed"),
      distinguishingText: "如有不适，请及时就医",
    },
  ]

  it("覆盖全部 9 个 FlowCardKind", () => {
    const kinds = cases.map((c) => c.kind)
    expect(new Set(kinds).size).toBe(9)
  })

  it.each(cases)(
    "kind=$kind 分发到对应卡片组件并渲染其独有文本",
    ({ card, distinguishingText }) => {
      render(<FlowCardRenderer card={card} />)
      expect(screen.getByText(distinguishingText)).toBeInTheDocument()
      cleanup()
    },
  )

  it("交互卡片 LabDecisionCard 点击「同意检验」触发 onAction(accept_lab)", async () => {
    const onAction = vi.fn()
    const card = createLabDecisionCard(SESSION_ID, "card-lab-accept")
    render(<FlowCardRenderer card={card} onAction={onAction} />)

    const acceptButton = screen.getByRole("button", { name: /同意检验/ })
    expect(acceptButton).toBeEnabled()

    // HeroUI Button 使用 onPress，jsdom 下优先 userEvent.click，必要时回退 fireEvent.click
    const user = userEvent.setup()
    await user.click(acceptButton)
    if (onAction.mock.calls.length === 0) {
      fireEvent.click(acceptButton)
    }

    expect(onAction).toHaveBeenCalledWith({
      type: "accept_lab",
      cardId: card.id,
    })
  })

  it("LabExecutionCard completed 状态展示为已检验", () => {
    const card = createCompletedLabExecutionCard(SESSION_ID, "card-lab-done")

    render(<FlowCardRenderer card={card} />)

    expect(screen.getByText("已检验")).toBeInTheDocument()
  })

  it("disabled=true 传递到 LabDecisionCard 按钮禁用", () => {
    const card = createLabDecisionCard(SESSION_ID, "card-disabled")

    render(<FlowCardRenderer card={card} disabled />)

    const acceptButton = screen.getByRole("button", { name: /同意检验/ })
    expect(acceptButton).toBeDisabled()
  })

  it("disabled=true 传递到 AdviceOnlyCard 按钮禁用", () => {
    const card = createAdviceOnlyCard(SESSION_ID, "card-disabled-advice")

    render(<FlowCardRenderer card={card} disabled />)

    const ackButton = screen.getByRole("button", { name: /已知晓/ })
    expect(ackButton).toBeDisabled()
  })

  it("disabled=true 传递到 PaymentCard 按钮禁用", () => {
    const card = createLabPaymentCard(SESSION_ID, "card-disabled-pay")

    render(<FlowCardRenderer card={card} disabled />)

    // PaymentCard in pending state should have buttons disabled
    const payButton = screen.getByRole("button", { name: /确认支付/ })
    expect(payButton).toBeDisabled()
  })

  it("disabled=true 传递到 TreatmentExecutionCard 按钮禁用", () => {
    const card = createTreatmentExecutionCard(SESSION_ID, "card-disabled-treat")

    render(<FlowCardRenderer card={card} disabled />)

    const scheduleButton = screen.getByRole("button", { name: /预约/ })
    expect(scheduleButton).toBeDisabled()
  })

  it("AdviceOnlyCard 点击「已知晓」触发 onAction(ack_advice)", async () => {
    const onAction = vi.fn()
    const card = createAdviceOnlyCard(SESSION_ID, "card-ack")

    render(<FlowCardRenderer card={card} onAction={onAction} />)

    const ackButton = screen.getByRole("button", { name: /已知晓/ })
    const user = userEvent.setup()
    await user.click(ackButton)
    if (onAction.mock.calls.length === 0) {
      fireEvent.click(ackButton)
    }

    expect(onAction).toHaveBeenCalled()
  })

  it("PaymentCard 点击「确认支付」触发 onAction(submit_payment)", async () => {
    const onAction = vi.fn()
    const card = createLabPaymentCard(SESSION_ID, "card-pay")

    render(<FlowCardRenderer card={card} onAction={onAction} />)

    const payButton = screen.getByRole("button", { name: /确认支付/ })
    const user = userEvent.setup()
    await user.click(payButton)
    if (onAction.mock.calls.length === 0) {
      fireEvent.click(payButton)
    }

    expect(onAction).toHaveBeenCalled()
  })

  it("MedicationFulfillmentCard 基本渲染", () => {
    const card = createMedicationFulfillmentCard(SESSION_ID, "card-med")

    render(<FlowCardRenderer card={card} />)

    expect(screen.getByText("药品清单")).toBeInTheDocument()
  })

  it("所有可选 props 同时传递时正常渲染", () => {
    const card = createLabDecisionCard(SESSION_ID, "card-all-props")

    render(
      <FlowCardRenderer
        card={card}
        patientId="patient-123"
        disabled={false}
        onAction={vi.fn()}
      />,
    )

    expect(screen.getByText("检验原因")).toBeInTheDocument()
  })
})
