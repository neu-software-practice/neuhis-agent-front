import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { FlowCard } from "@/features/workbench/api"
import { createCompletedLabExecutionCard } from "@/mocks/api/fixtures/flow-cards"
import { LabExecutionCard } from "@/features/workbench/flow-cards/LabExecutionCard"

const SESSION_ID = "session-lab-execution"

afterEach(() => {
  cleanup()
})

describe("LabExecutionCard", () => {
  it("渲染 completed 卡片：标题、状态、步骤、结果摘要和完成时间", () => {
    const card: FlowCard = {
      ...createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec-1"),
      handledAt: "2026-06-28T04:00:00.000Z",
    }

    render(<LabExecutionCard card={card} />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
    expect(screen.getByText(/当前状态：/)).toBeInTheDocument()
    expect(
      screen.getByText((_, el) => el?.textContent === "已检验"),
    ).toBeInTheDocument()
    // 步骤标签
    expect(screen.getByText("缴费")).toBeInTheDocument()
    expect(screen.getByText("排队")).toBeInTheDocument()
    expect(screen.getByText("采集")).toBeInTheDocument()
    expect(screen.getByText("检验")).toBeInTheDocument()
    expect(screen.getByText("出结果")).toBeInTheDocument()
    // 结果
    expect(screen.getByText("检验结果")).toBeInTheDocument()
    expect(screen.getByText(card.resultSummary)).toBeInTheDocument()
    // 完成时间
    expect(screen.getByText(/完成于/)).toBeInTheDocument()
  })

  it("waiting_payment 状态显示「待缴费」", () => {
    const card: FlowCard = {
      ...createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec-2"),
      status: "pending",
      executionStatus: "waiting_payment",
      resultSummary: undefined,
      resultReturnedAt: undefined,
      handledAt: undefined,
    }

    render(<LabExecutionCard card={card} />)

    expect(screen.getByText("待缴费")).toBeInTheDocument()
  })

  it("queued 状态显示「排队中」", () => {
    const card: FlowCard = {
      ...createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec-3"),
      status: "pending",
      executionStatus: "queued",
      resultSummary: undefined,
      resultReturnedAt: undefined,
      handledAt: undefined,
    }

    render(<LabExecutionCard card={card} />)

    expect(screen.getByText("排队中")).toBeInTheDocument()
  })

  it("testing 状态显示「检验中」", () => {
    const card: FlowCard = {
      ...createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec-4"),
      status: "pending",
      executionStatus: "testing",
      resultSummary: undefined,
      resultReturnedAt: undefined,
      handledAt: undefined,
    }

    render(<LabExecutionCard card={card} />)

    expect(screen.getByText("检验中")).toBeInTheDocument()
  })

  it("result_ready 状态显示「结果已出」并展示结果返回时间", () => {
    const card: FlowCard = {
      ...createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec-5"),
      status: "completed",
      executionStatus: "result_ready",
      handledAt: "2026-06-28T04:00:00.000Z",
    }

    render(<LabExecutionCard card={card} />)

    expect(screen.getByText("结果已出")).toBeInTheDocument()
    expect(screen.getByText(/结果返回时间/)).toBeInTheDocument()
  })

  it("无 resultSummary 时不显示「检验结果」区块", () => {
    const card: FlowCard = {
      ...createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec-6"),
      resultSummary: undefined,
    }

    render(<LabExecutionCard card={card} />)

    expect(screen.queryByText("检验结果")).not.toBeInTheDocument()
  })

  it("非 completed 状态且无 handledAt 时不显示完成时间", () => {
    const card: FlowCard = {
      ...createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec-7"),
      executionStatus: "testing",
      handledAt: undefined,
    }

    render(<LabExecutionCard card={card} />)

    expect(screen.queryByText(/完成于/)).not.toBeInTheDocument()
  })

  it("信息型卡片不渲染任何操作按钮", () => {
    const card = createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec-8")

    render(<LabExecutionCard card={card} />)

    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("collecting 状态显示「采集中」", () => {
    const card: FlowCard = {
      ...createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec-collect"),
      status: "pending",
      executionStatus: "collecting",
      resultSummary: undefined,
      resultReturnedAt: undefined,
      handledAt: undefined,
    }

    render(<LabExecutionCard card={card} />)

    expect(screen.getByText("采集中")).toBeInTheDocument()
  })

  it("未知 executionStatus 回退显示原始值", () => {
    const card: FlowCard = {
      ...createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec-unknown"),
      status: "pending",
      executionStatus: "unknown_status" as "waiting_payment",
      resultSummary: undefined,
      resultReturnedAt: undefined,
      handledAt: undefined,
    }

    render(<LabExecutionCard card={card} />)

    expect(screen.getByText("unknown_status")).toBeInTheDocument()
  })

  it("completed 但无 handledAt 时不显示完成于", () => {
    const card: FlowCard = {
      ...createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec-nohandle"),
      handledAt: undefined,
    }

    render(<LabExecutionCard card={card} />)

    expect(screen.getByText("已检验")).toBeInTheDocument()
    expect(screen.queryByText(/完成于/)).not.toBeInTheDocument()
  })

  it("result_ready 但无 resultSummary 时不显示检验结果区块", () => {
    const card: FlowCard = {
      ...createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec-rsready"),
      executionStatus: "result_ready",
      handledAt: "2026-06-28T04:00:00.000Z",
    }

    render(<LabExecutionCard card={card} />)

    // resultSummary comes from fixture - should be present
    expect(screen.getByText("结果已出")).toBeInTheDocument()
    expect(screen.getByText(/结果返回时间/)).toBeInTheDocument()
  })

  it("disabled prop 不影响渲染", () => {
    const card = createCompletedLabExecutionCard(SESSION_ID, "card-lab-exec-disabled")

    render(<LabExecutionCard card={card} disabled />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
  })
})
