import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createAdviceOnlyCard,
} from "@/mocks/api/fixtures/flow-cards"
import type { FlowCard } from "@/features/workbench/api"
import { AdviceOnlyCard } from "@/features/workbench/flow-cards/AdviceOnlyCard"

const SESSION_ID = "session-advice-only"

afterEach(() => {
  cleanup()
})

describe("AdviceOnlyCard", () => {
  it("渲染 pending 卡片：标题、建议列表、注意事项、复诊建议和「已知晓」按钮", () => {
    const card: FlowCard = {
      ...createAdviceOnlyCard(SESSION_ID, "card-advice-1"),
      title: "健康医嘱",
    }

    render(<AdviceOnlyCard card={card} />)

    expect(screen.getByText("健康医嘱")).toBeInTheDocument()
    // 渲染全部建议条目
    for (const advice of card.advices) {
      expect(screen.getByText(advice)).toBeInTheDocument()
    }
    expect(screen.getByText("注意事项")).toBeInTheDocument()
    for (const item of card.watchItems) {
      expect(screen.getByText(item)).toBeInTheDocument()
    }
    // 复诊建议
    expect(screen.getByText(card.followUpRecommendation)).toBeInTheDocument()
    // 按钮
    expect(
      screen.getByRole("button", { name: /已知晓/ }),
    ).toBeEnabled()
  })

  it("点击「已知晓」触发 onAction({ type: ack_advice, cardId })", async () => {
    const onAction = vi.fn()
    const card = createAdviceOnlyCard(SESSION_ID, "card-advice-ack")

    render(<AdviceOnlyCard card={card} onAction={onAction} />)

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /已知晓/ }))

    expect(onAction).toHaveBeenCalledWith({
      type: "ack_advice",
      cardId: card.id,
    })
  })

  it("acknowledged 状态不显示按钮，显示确认时间和已确认标记", () => {
    const card: FlowCard = {
      ...createAdviceOnlyCard(SESSION_ID, "card-advice-handled"),
      status: "accepted",
      handledAt: "2026-06-28T03:00:00.000Z",
    }

    render(<AdviceOnlyCard card={card} />)

    expect(
      screen.queryByRole("button", { name: /已知晓/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/已于.*确认/)).toBeInTheDocument()
  })

  it("disabled=true 时按钮被禁用", () => {
    const card = createAdviceOnlyCard(SESSION_ID, "card-advice-disabled")

    render(<AdviceOnlyCard card={card} disabled />)

    expect(screen.getByRole("button", { name: /已知晓/ })).toBeDisabled()
  })

  it("建议与注意事项为空时不渲染对应区块", () => {
    const card: FlowCard = {
      ...createAdviceOnlyCard(SESSION_ID, "card-advice-empty"),
      title: "健康医嘱",
      advices: [],
      watchItems: [],
    }

    render(<AdviceOnlyCard card={card} />)

    expect(screen.queryByText("健康建议")).not.toBeInTheDocument()
    expect(screen.queryByText("注意事项")).not.toBeInTheDocument()
  })

  it("acknowledged 无 handledAt 时仍然显示确认标记", () => {
    const card: FlowCard = {
      ...createAdviceOnlyCard(SESSION_ID, "card-advice-no-handled"),
      status: "accepted",
      handledAt: undefined,
    }

    render(<AdviceOnlyCard card={card} />)

    // Should still show "已于  确认" (handledAt is empty, but text still renders)
    expect(screen.getByText(/确认/)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /已知晓/ }),
    ).not.toBeInTheDocument()
  })

  it("disabled=true + status=pending 时按钮禁用", () => {
    const card = createAdviceOnlyCard(SESSION_ID, "card-disabled-pending")

    render(<AdviceOnlyCard card={card} disabled />)

    expect(screen.getByRole("button", { name: /已知晓/ })).toBeDisabled()
  })

  it("onAction 未定义时点击按钮不崩溃", async () => {
    const user = userEvent.setup()
    const card = createAdviceOnlyCard(SESSION_ID, "card-no-onaction")

    render(<AdviceOnlyCard card={card} />)

    const button = screen.getByRole("button", { name: /已知晓/ })
    await user.click(button)
    // Should not throw - "健康建议" appears both as title header and section label
    expect(screen.getAllByText(/健康建议/).length).toBeGreaterThanOrEqual(1)
  })

  it("handledAt 为 null 时确认文本显示", () => {
    const card: FlowCard = {
      ...createAdviceOnlyCard(SESSION_ID, "card-null-handled"),
      status: "accepted",
      handledAt: null as unknown as undefined,
    }

    render(<AdviceOnlyCard card={card} />)

    expect(screen.getByText(/确认/)).toBeInTheDocument()
  })

  it("渲染 FileText 图标", () => {
    const card = createAdviceOnlyCard(SESSION_ID, "card-icon")

    const { container } = render(<AdviceOnlyCard card={card} />)

    // FileText icon renders as SVG
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("复诊建议区块始终渲染", () => {
    const card = createAdviceOnlyCard(SESSION_ID, "card-followup")

    render(<AdviceOnlyCard card={card} />)

    expect(screen.getByText("复诊建议")).toBeInTheDocument()
  })
})
