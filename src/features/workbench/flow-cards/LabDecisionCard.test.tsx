import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { fireEvent } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { FlowCard } from "@/features/workbench/api"
import { createLabDecisionCard } from "@/mocks/api/fixtures/flow-cards"
import { LabDecisionCard } from "@/features/workbench/flow-cards/LabDecisionCard"

const SESSION_ID = "session-lab-decision"

afterEach(() => {
  cleanup()
})

describe("LabDecisionCard", () => {
  it("渲染 pending 卡片：标题、检验项目、原因、鉴别目标、预估费用和三个操作按钮", () => {
    const card = createLabDecisionCard(SESSION_ID, "card-lab-dec-1")

    render(<LabDecisionCard card={card} />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
    expect(screen.getByText("检验项目")).toBeInTheDocument()
    for (const item of card.testItems) {
      expect(screen.getByText(item.name)).toBeInTheDocument()
    }
    // sampleType 以 (静脉血) 形式展示
    expect(screen.getByText("(静脉血)")).toBeInTheDocument()
    expect(screen.getByText("检验原因")).toBeInTheDocument()
    expect(screen.getByText(card.reason)).toBeInTheDocument()
    expect(screen.getByText("鉴别目标")).toBeInTheDocument()
    for (const target of card.differentialTargets) {
      expect(screen.getByText(target)).toBeInTheDocument()
    }
    expect(screen.getByText(/预估费用/)).toBeInTheDocument()
    // 三个按钮
    expect(screen.getByRole("button", { name: /同意检验/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /暂不决定/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /不查/ })).toBeInTheDocument()
  })

  it("blocking 且 pending 时显示「请先处理」标签", () => {
    const card = createLabDecisionCard(SESSION_ID, "card-lab-blocking")

    render(<LabDecisionCard card={card} />)

    expect(screen.getByText("请先处理")).toBeInTheDocument()
  })

  it("点击「同意检验」触发 onAction({ type: accept_lab })", async () => {
    const onAction = vi.fn()
    const card = createLabDecisionCard(SESSION_ID, "card-lab-accept")

    render(<LabDecisionCard card={card} onAction={onAction} />)

    const user = userEvent.setup()
    const btn = screen.getByRole("button", { name: /同意检验/ })
    await user.click(btn)
    if (onAction.mock.calls.length === 0) {
      fireEvent.click(btn)
    }

    expect(onAction).toHaveBeenCalledWith({
      type: "accept_lab",
      cardId: card.id,
    })
  })

  it("点击「暂不决定」触发 onAction({ type: veto_lab })", async () => {
    const onAction = vi.fn()
    const card = createLabDecisionCard(SESSION_ID, "card-lab-veto")

    render(<LabDecisionCard card={card} onAction={onAction} />)

    const user = userEvent.setup()
    const btn = screen.getByRole("button", { name: /暂不决定/ })
    await user.click(btn)
    if (onAction.mock.calls.length === 0) {
      fireEvent.click(btn)
    }

    expect(onAction).toHaveBeenCalledWith({
      type: "veto_lab",
      cardId: card.id,
    })
  })

  it("点击「不查」触发 onAction({ type: skip_lab })", async () => {
    const onAction = vi.fn()
    const card = createLabDecisionCard(SESSION_ID, "card-lab-skip")

    render(<LabDecisionCard card={card} onAction={onAction} />)

    const user = userEvent.setup()
    const btn = screen.getByRole("button", { name: /不查/ })
    await user.click(btn)
    if (onAction.mock.calls.length === 0) {
      fireEvent.click(btn)
    }

    expect(onAction).toHaveBeenCalledWith({
      type: "skip_lab",
      cardId: card.id,
    })
  })

  it("accepted 状态显示「已同意检验」且不显示操作按钮", () => {
    const card: FlowCard = {
      ...createLabDecisionCard(SESSION_ID, "card-lab-accepted"),
      status: "accepted",
      handledAt: "2026-06-28T03:00:00.000Z",
    }

    render(<LabDecisionCard card={card} />)

    expect(screen.getByText("已同意检验")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /同意检验/ })).not.toBeInTheDocument()
  })

  it("skipped 状态显示「已跳过检验」", () => {
    const card: FlowCard = {
      ...createLabDecisionCard(SESSION_ID, "card-lab-skipped"),
      status: "skipped",
    }

    render(<LabDecisionCard card={card} />)

    expect(screen.getByText("已跳过检验")).toBeInTheDocument()
  })

  it("vetoed 状态显示「暂不决定」", () => {
    const card: FlowCard = {
      ...createLabDecisionCard(SESSION_ID, "card-lab-vetoed"),
      status: "vetoed",
    }

    render(<LabDecisionCard card={card} />)

    expect(screen.getByText("暂不决定")).toBeInTheDocument()
  })

  it("disabled=true 时所有按钮被禁用", () => {
    const card = createLabDecisionCard(SESSION_ID, "card-lab-disabled")

    render(<LabDecisionCard card={card} disabled />)

    expect(screen.getByRole("button", { name: /同意检验/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /暂不决定/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /不查/ })).toBeDisabled()
  })

  it("blocking 且 pending 且有 lockReason 时显示锁提示", () => {
    const card = createLabDecisionCard(SESSION_ID, "card-lab-lock")

    render(<LabDecisionCard card={card} />)

    expect(screen.getByText(card.lockReason)).toBeInTheDocument()
  })

  it("无 reason 时不显示「检验原因」区块", () => {
    const card: FlowCard = {
      ...createLabDecisionCard(SESSION_ID, "card-lab-no-reason"),
      reason: undefined,
    }

    render(<LabDecisionCard card={card} />)

    expect(screen.queryByText("检验原因")).not.toBeInTheDocument()
  })

  it("无 differentialTargets 时不显示「鉴别目标」区块", () => {
    const card: FlowCard = {
      ...createLabDecisionCard(SESSION_ID, "card-lab-no-targets"),
      differentialTargets: undefined,
    }

    render(<LabDecisionCard card={card} />)

    expect(screen.queryByText("鉴别目标")).not.toBeInTheDocument()
  })

  it("空 differentialTargets 数组时不显示「鉴别目标」区块", () => {
    const card: FlowCard = {
      ...createLabDecisionCard(SESSION_ID, "card-lab-empty-targets"),
      differentialTargets: [],
    }

    render(<LabDecisionCard card={card} />)

    expect(screen.queryByText("鉴别目标")).not.toBeInTheDocument()
  })

  it("non-blocking pending 卡片不显示「请先处理」标签", () => {
    const card: FlowCard = {
      ...createLabDecisionCard(SESSION_ID, "card-lab-nonblocking"),
      blocking: false,
    }

    render(<LabDecisionCard card={card} />)

    expect(screen.queryByText("请先处理")).not.toBeInTheDocument()
    // But action buttons should still be present
    expect(
      screen.getByRole("button", { name: /同意检验/ }),
    ).toBeInTheDocument()
  })

  it("testItems 中某项不含 sampleType 时不显示括号注解", () => {
    const card: FlowCard = {
      ...createLabDecisionCard(SESSION_ID, "card-lab-no-sampletype"),
      testItems: [
        {
          name: "血常规",
          sampleType: "静脉血",
        },
        {
          name: "尿常规",
          sampleType: undefined,
        },
      ],
    }

    render(<LabDecisionCard card={card} />)

    expect(screen.getByText("血常规")).toBeInTheDocument()
    expect(screen.getByText("尿常规")).toBeInTheDocument()
    expect(screen.getByText("(静脉血)")).toBeInTheDocument()
  })

  it("多个 testItems 渲染", () => {
    const card: FlowCard = {
      ...createLabDecisionCard(SESSION_ID, "card-lab-multi-items"),
      testItems: [
        { name: "血常规", sampleType: "静脉血" },
        { name: "尿常规", sampleType: "尿液" },
        { name: "粪便常规", sampleType: "粪便" },
      ],
    }

    render(<LabDecisionCard card={card} />)

    expect(screen.getByText("血常规")).toBeInTheDocument()
    expect(screen.getByText("尿常规")).toBeInTheDocument()
    expect(screen.getByText("粪便常规")).toBeInTheDocument()
  })

  it("blocking + pending 但无 lockReason 时不显示锁提示", () => {
    const card: FlowCard = {
      ...createLabDecisionCard(SESSION_ID, "card-lab-no-lockreason"),
      lockReason: undefined,
    }

    render(<LabDecisionCard card={card} />)

    expect(
      screen.getByRole("button", { name: /同意检验/ }),
    ).toBeInTheDocument()
  })

  it("received 状态不显示操作按钮", () => {
    const card: FlowCard = {
      ...createLabDecisionCard(SESSION_ID, "card-lab-received"),
      status: "received" as "pending",
    }

    render(<LabDecisionCard card={card} />)

    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })
})
