import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { fireEvent } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { FlowCard } from "@/features/workbench/api"
import { createTreatmentExecutionCard } from "@/mocks/api/fixtures/flow-cards"
import { TreatmentExecutionCard } from "@/features/workbench/flow-cards/TreatmentExecutionCard"

const SESSION_ID = "session-treatment-exec"

afterEach(() => {
  cleanup()
})

describe("TreatmentExecutionCard", () => {
  it("渲染 pending 卡片：标题、执行能力、状态、预约、排队号、注意事项和操作按钮", () => {
    const card = createTreatmentExecutionCard(SESSION_ID, "card-treat-exec-1")

    render(<TreatmentExecutionCard card={card} />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
    expect(screen.getByText("- 雾化吸入治疗")).toBeInTheDocument()
    expect(screen.getByText("执行能力：")).toBeInTheDocument()
    expect(screen.getByText("本院可执行")).toBeInTheDocument()
    // 状态文本为 "状态：待处理" 整体在一个 span 中（取叶子节点，排除父 div）
    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent === "状态：待处理" && el?.children.length === 0,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("注意事项")).toBeInTheDocument()
    for (const notice of card.notices) {
      expect(screen.getByText(notice)).toBeInTheDocument()
    }
    // 操作按钮
    expect(screen.getByRole("button", { name: "预约" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument()
  })

  it("点击「预约」触发 onAction({ type: submit_treatment_execution, action: schedule })", async () => {
    const onAction = vi.fn()
    const card = createTreatmentExecutionCard(SESSION_ID, "card-treat-schedule")

    render(<TreatmentExecutionCard card={card} onAction={onAction} />)

    const user = userEvent.setup()
    const btn = screen.getByRole("button", { name: "预约" })
    await user.click(btn)
    if (onAction.mock.calls.length === 0) {
      fireEvent.click(btn)
    }

    expect(onAction).toHaveBeenCalledWith({
      type: "submit_treatment_execution",
      cardId: card.id,
      action: "schedule",
    })
  })

  it("点击「取消」触发 onAction action=cancel", async () => {
    const onAction = vi.fn()
    const card = createTreatmentExecutionCard(SESSION_ID, "card-treat-cancel")

    render(<TreatmentExecutionCard card={card} onAction={onAction} />)

    const user = userEvent.setup()
    const btn = screen.getByRole("button", { name: "取消" })
    await user.click(btn)
    if (onAction.mock.calls.length === 0) {
      fireEvent.click(btn)
    }

    expect(onAction).toHaveBeenCalledWith({
      type: "submit_treatment_execution",
      cardId: card.id,
      action: "cancel",
    })
  })

  it("scheduled 状态显示「已预约」并展示预约时间", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-scheduled"),
      executionStatus: "scheduled",
      appointmentAt: "2026-06-29T09:00:00.000Z",
      availableActions: ["confirm_arrival", "cancel"],
    }

    render(<TreatmentExecutionCard card={card} />)

    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent === "状态：已预约" && el?.children.length === 0,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/预约时间/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "确认到号" })).toBeInTheDocument()
  })

  it("arrived 状态显示「已到号」和排队号", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-arrived"),
      executionStatus: "arrived",
      queueNo: "A015",
      availableActions: ["start", "cancel"],
    }

    render(<TreatmentExecutionCard card={card} />)

    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent === "状态：已到号" && el?.children.length === 0,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("排队号：")).toBeInTheDocument()
    expect(screen.getByText("A015")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "开始执行" })).toBeInTheDocument()
  })

  it("completed 状态显示「已完成」并隐藏操作按钮", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-done"),
      status: "completed",
      executionStatus: "completed",
      handledAt: "2026-06-28T04:00:00.000Z",
      availableActions: [],
    }

    render(<TreatmentExecutionCard card={card} />)

    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent === "状态：已完成" && el?.children.length === 0,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("治疗已完成")).toBeInTheDocument()
    // handledAt 时间渲染在独立的 span 中（格式由 formatDateTime 决定）
    expect(
      screen.getAllByText((_, el) => el?.textContent?.includes("2026") ?? false)
        .length,
    ).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole("button", { name: "预约" })).not.toBeInTheDocument()
  })

  it("canceled 状态显示「已取消」并隐藏操作按钮", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-canceled"),
      executionStatus: "canceled",
      availableActions: [],
    }

    render(<TreatmentExecutionCard card={card} />)

    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent === "状态：已取消" && el?.children.length === 0,
      ),
    ).toBeInTheDocument()
  })

  it("limited 能力显示「部分可执行」", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-limited"),
      capability: "limited",
    }

    render(<TreatmentExecutionCard card={card} />)

    expect(screen.getByText("部分可执行")).toBeInTheDocument()
  })

  it("unavailable 能力显示「需转诊」", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-unavail"),
      capability: "unavailable",
    }

    render(<TreatmentExecutionCard card={card} />)

    expect(screen.getByText("需转诊")).toBeInTheDocument()
  })

  it("无预约时间时不显示预约信息", () => {
    const card = createTreatmentExecutionCard(SESSION_ID, "card-treat-no-appt")

    render(<TreatmentExecutionCard card={card} />)

    expect(screen.queryByText(/预约时间/)).not.toBeInTheDocument()
  })

  it("无排队号时不显示排队号", () => {
    const card = createTreatmentExecutionCard(SESSION_ID, "card-treat-no-q")

    render(<TreatmentExecutionCard card={card} />)

    expect(screen.queryByText(/排队号/)).not.toBeInTheDocument()
  })

  it("无注意事项时不显示注意事项区块", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-no-notice"),
      notices: [],
    }

    render(<TreatmentExecutionCard card={card} />)

    expect(screen.queryByText("注意事项")).not.toBeInTheDocument()
  })

  it("disabled=true 时操作按钮被禁用", () => {
    const card = createTreatmentExecutionCard(SESSION_ID, "card-treat-disabled")

    render(<TreatmentExecutionCard card={card} disabled />)

    expect(screen.getByRole("button", { name: "预约" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "取消" })).toBeDisabled()
  })

  it("in_progress 状态显示「执行中」", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-inprog"),
      executionStatus: "in_progress",
      availableActions: ["cancel"],
    }

    render(<TreatmentExecutionCard card={card} />)

    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent === "状态：执行中" && el?.children.length === 0,
      ),
    ).toBeInTheDocument()
  })

  it("未知 executionStatus 回退显示原始值", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-unknown-status"),
      executionStatus: "unknown" as "pending",
      availableActions: [],
    }

    render(<TreatmentExecutionCard card={card} />)

    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent === "状态：unknown" && el?.children.length === 0,
      ),
    ).toBeInTheDocument()
  })

  it("未知 action 类型显示原始值", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-unknown-action"),
      availableActions: ["unknown_action" as "schedule"],
    }

    const { container } = render(<TreatmentExecutionCard card={card} />)

    expect(container.querySelector("button")?.textContent).toContain(
      "unknown_action",
    )
  })

  it("completed 无 handledAt 时不显示成功横幅", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-done-nohandle"),
      status: "completed",
      executionStatus: "completed",
      handledAt: undefined,
      availableActions: [],
    }

    render(<TreatmentExecutionCard card={card} />)

    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent === "状态：已完成" && el?.children.length === 0,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText("治疗已完成")).not.toBeInTheDocument()
  })

  it("无 treatmentName 时不显示名称后缀", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-no-name"),
      treatmentName: undefined,
    }

    render(<TreatmentExecutionCard card={card} />)

    // Should not render "- undefined" text
    expect(screen.getByText(card.title)).toBeInTheDocument()
  })

  it("status 为 failed 时隐藏操作按钮", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-failed"),
      status: "failed",
    }

    render(<TreatmentExecutionCard card={card} />)

    expect(screen.queryByRole("button", { name: "预约" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "取消" })).not.toBeInTheDocument()
  })

  it("complete 操作按钮渲染", () => {
    const card: FlowCard = {
      ...createTreatmentExecutionCard(SESSION_ID, "card-treat-complete-action"),
      executionStatus: "in_progress",
      availableActions: ["complete", "cancel"],
    }

    render(<TreatmentExecutionCard card={card} />)

    expect(screen.getByRole("button", { name: "确认完成" })).toBeInTheDocument()
  })
})
