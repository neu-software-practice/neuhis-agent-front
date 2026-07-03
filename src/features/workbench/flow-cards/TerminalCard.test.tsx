import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { TerminalTimelineItem } from "@/features/workbench/api"
import { TerminalCard } from "@/features/workbench/flow-cards/TerminalCard"

function makeTerminalCard(
  overrides: Partial<TerminalTimelineItem> = {},
): TerminalTimelineItem {
  return {
    id: "term-1",
    sessionId: "session-terminal",
    kind: "terminal",
    status: "done",
    createdAt: "2026-06-28T02:00:00.000Z",
    reason: "timeout",
    title: "问诊已结束",
    description: "本次问诊因超时而结束",
    suggestedDepartment: "耳鼻喉科",
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe("TerminalCard", () => {
  it("渲染终诊卡片：标题、描述、建议科室和保存按钮", () => {
    const card = makeTerminalCard()

    render(<TerminalCard card={card} />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
    expect(screen.getByText(card.description!)).toBeInTheDocument()
    expect(screen.getByText(/建议转至：耳鼻喉科/)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /保存问诊摘要/ }),
    ).toBeInTheDocument()
  })

  it("无描述时不显示描述文本", () => {
    const card = makeTerminalCard({ description: undefined })

    render(<TerminalCard card={card} />)

    expect(screen.queryByText("本次问诊因超时而结束")).not.toBeInTheDocument()
  })

  it("无建议科室时不显示转科提示", () => {
    const card = makeTerminalCard({ suggestedDepartment: undefined })

    render(<TerminalCard card={card} />)

    expect(screen.queryByText(/建议转至/)).not.toBeInTheDocument()
  })

  it("disabled=true 时保存按钮被禁用", () => {
    const card = makeTerminalCard()

    render(<TerminalCard card={card} disabled />)

    expect(screen.getByRole("button", { name: /保存问诊摘要/ })).toBeDisabled()
  })

  it("emergency 原因渲染对应样式（不崩溃）", () => {
    const card = makeTerminalCard({
      reason: "emergency",
      title: "急症转急诊",
    })

    render(<TerminalCard card={card} />)

    expect(screen.getByText("急症转急诊")).toBeInTheDocument()
  })

  it("exited 原因渲染对应样式（不崩溃）", () => {
    const card = makeTerminalCard({
      reason: "exited",
      title: "患者主动退出",
    })

    render(<TerminalCard card={card} />)

    expect(screen.getByText("患者主动退出")).toBeInTheDocument()
  })

  it("ask_limit_reached 原因渲染（不崩溃）", () => {
    const card = makeTerminalCard({
      reason: "ask_limit_reached",
      title: "问询次数已达上限",
    })

    render(<TerminalCard card={card} />)
    expect(screen.getByText("问询次数已达上限")).toBeInTheDocument()
  })

  it("lab_limit_reached 原因渲染（不崩溃）", () => {
    const card = makeTerminalCard({
      reason: "lab_limit_reached",
      title: "检验次数已达上限",
    })

    render(<TerminalCard card={card} />)
    expect(screen.getByText("检验次数已达上限")).toBeInTheDocument()
  })

  it("capability_insufficient 原因渲染（不崩溃）", () => {
    const card = makeTerminalCard({
      reason: "capability_insufficient",
      title: "能力不足转人工",
    })

    render(<TerminalCard card={card} />)
    expect(screen.getByText("能力不足转人工")).toBeInTheDocument()
  })

  it("patient_request 原因渲染（不崩溃）", () => {
    const card = makeTerminalCard({
      reason: "patient_request",
      title: "患者要求结束",
    })

    render(<TerminalCard card={card} />)
    expect(screen.getByText("患者要求结束")).toBeInTheDocument()
  })

  it("referral 原因渲染（不崩溃）", () => {
    const card = makeTerminalCard({
      reason: "referral",
      title: "转诊专科",
    })

    render(<TerminalCard card={card} />)
    expect(screen.getByText("转诊专科")).toBeInTheDocument()
  })

  it("未知 reason 值不崩溃（使用默认回退样式）", () => {
    // @ts-expect-error - 测试未知 reason 值的回退行为
    const card = makeTerminalCard({
      reason: "unknown_reason",
      title: "未知终止原因",
      description: undefined,
    })

    render(<TerminalCard card={card} />)
    expect(screen.getByText("未知终止原因")).toBeInTheDocument()
  })

  it("description 为空字符串时不显示", () => {
    const card = makeTerminalCard({
      description: "",
    })

    render(<TerminalCard card={card} />)
    expect(screen.queryByText("本次问诊因超时而结束")).not.toBeInTheDocument()
  })

  it("suggestedDepartment 为空字符串时不显示", () => {
    const card = makeTerminalCard({
      suggestedDepartment: "",
    })

    render(<TerminalCard card={card} />)
    expect(screen.queryByText(/建议转至/)).not.toBeInTheDocument()
  })

  it("description 和 suggestedDepartment 同时缺失时正常渲染", () => {
    const card = makeTerminalCard({
      description: undefined,
      suggestedDepartment: undefined,
    })

    render(<TerminalCard card={card} />)
    expect(screen.getByText(card.title)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /保存问诊摘要/ }),
    ).toBeInTheDocument()
  })

  it("disabled 为 false 时按钮启用", () => {
    const card = makeTerminalCard()

    render(<TerminalCard card={card} disabled={false} />)

    expect(
      screen.getByRole("button", { name: /保存问诊摘要/ }),
    ).toBeEnabled()
  })

  it("每项 reason 对应的 SVG 图标渲染", () => {
    const reasons = [
      "emergency",
      "timeout",
      "ask_limit_reached",
      "lab_limit_reached",
      "referral",
      "capability_insufficient",
      "exited",
      "patient_request",
    ] as const

    for (const reason of reasons) {
      const { container, unmount } = render(
        <TerminalCard
          card={makeTerminalCard({ reason, title: reason })}
        />,
      )
      // Each reason renders an SVG icon
      expect(container.querySelector("svg")).toBeInTheDocument()
      unmount()
    }
  })
})
