import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { FlowCard } from "@/features/workbench/api"
import { createDiagnosisCard } from "@/mocks/api/fixtures/flow-cards"
import { DiagnosisCard } from "@/features/workbench/flow-cards/DiagnosisCard"

const SESSION_ID = "session-diagnosis"

afterEach(() => {
  cleanup()
})

describe("DiagnosisCard", () => {
  it("渲染完整诊断卡片：标题、诊断结论、置信度、证据、来源、风险信号", () => {
    const card = createDiagnosisCard(SESSION_ID, "card-diag-1")

    render(<DiagnosisCard card={card} />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
    expect(screen.getByText("诊断结论")).toBeInTheDocument()
    expect(screen.getByText(card.diagnosis)).toBeInTheDocument()
    expect(screen.getByText(/置信度/)).toBeInTheDocument()
    // 证据列表
    expect(screen.getByText("诊断依据")).toBeInTheDocument()
    for (const e of card.evidence) {
      expect(screen.getByText(e)).toBeInTheDocument()
    }
    // 来源 chips
    expect(screen.getByText("依据来源")).toBeInTheDocument()
    expect(screen.getByText("病史")).toBeInTheDocument()
    expect(screen.getByText("问诊回答")).toBeInTheDocument()
    expect(screen.getByText("检验结果")).toBeInTheDocument()
    // 风险信号
    expect(screen.getByText("风险提示")).toBeInTheDocument()
    for (const signal of card.riskSignals) {
      expect(screen.getByText(signal)).toBeInTheDocument()
    }
  })

  it("置信度为 low 显示「低」", () => {
    const card: FlowCard = {
      ...createDiagnosisCard(SESSION_ID, "card-diag-low"),
      confidence: "low",
    }

    render(<DiagnosisCard card={card} />)

    expect(screen.getByText("低")).toBeInTheDocument()
  })

  it("置信度为 high 显示「高」", () => {
    const card: FlowCard = {
      ...createDiagnosisCard(SESSION_ID, "card-diag-high"),
      confidence: "high",
    }

    render(<DiagnosisCard card={card} />)

    expect(screen.getByText("高")).toBeInTheDocument()
  })

  it("证据为空时不渲染「诊断依据」区块", () => {
    const card: FlowCard = {
      ...createDiagnosisCard(SESSION_ID, "card-diag-no-evidence"),
      evidence: [],
    }

    render(<DiagnosisCard card={card} />)

    expect(screen.queryByText("诊断依据")).not.toBeInTheDocument()
  })

  it("来源为空时不渲染「依据来源」区块", () => {
    const card: FlowCard = {
      ...createDiagnosisCard(SESSION_ID, "card-diag-no-sources"),
      evidenceSources: [],
    }

    render(<DiagnosisCard card={card} />)

    expect(screen.queryByText("依据来源")).not.toBeInTheDocument()
  })

  it("风险信号为空时不渲染「风险提示」区块", () => {
    const card: FlowCard = {
      ...createDiagnosisCard(SESSION_ID, "card-diag-no-risk"),
      riskSignals: [],
    }

    render(<DiagnosisCard card={card} />)

    expect(screen.queryByText("风险提示")).not.toBeInTheDocument()
  })

  it("无 lab 证据时不显示检验结果来源", () => {
    const card = createDiagnosisCard(SESSION_ID, "card-diag-no-lab", {
      includeLabEvidence: false,
    })

    render(<DiagnosisCard card={card} />)

    expect(screen.queryByText("检验结果")).not.toBeInTheDocument()
  })

  it("信息型卡片不渲染任何操作按钮", () => {
    const card = createDiagnosisCard(SESSION_ID, "card-diag-3")

    render(<DiagnosisCard card={card} />)

    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("置信度为 medium 显示「中」", () => {
    const card = createDiagnosisCard(SESSION_ID, "card-diag-medium")

    render(<DiagnosisCard card={card} />)

    expect(screen.getByText("中")).toBeInTheDocument()
  })

  it("未知 confidence 显示原始值", () => {
    const card: FlowCard = {
      ...createDiagnosisCard(SESSION_ID, "card-diag-unknown-conf"),
      confidence: "unknown" as "low",
    }

    render(<DiagnosisCard card={card} />)

    expect(screen.getByText("unknown")).toBeInTheDocument()
  })

  it("仅渲染诊断依据区块（来源和风险为空时隐藏）", () => {
    const card: FlowCard = {
      ...createDiagnosisCard(SESSION_ID, "card-diag-only-evidence"),
      evidenceSources: [],
      riskSignals: [],
    }

    render(<DiagnosisCard card={card} />)

    expect(screen.getByText("诊断依据")).toBeInTheDocument()
    expect(screen.queryByText("依据来源")).not.toBeInTheDocument()
    expect(screen.queryByText("风险提示")).not.toBeInTheDocument()
  })

  it("渲染多个风险信号", () => {
    const card: FlowCard = {
      ...createDiagnosisCard(SESSION_ID, "card-diag-multi-risk"),
      riskSignals: ["信号 A", "信号 B"],
    }

    render(<DiagnosisCard card={card} />)

    expect(screen.getByText("信号 A")).toBeInTheDocument()
    expect(screen.getByText("信号 B")).toBeInTheDocument()
  })

  it("渲染 Stethoscope 图标", () => {
    const card = createDiagnosisCard(SESSION_ID, "card-diag-icon")

    const { container } = render(<DiagnosisCard card={card} />)

    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("disabled prop 不影响渲染", () => {
    const card = createDiagnosisCard(SESSION_ID, "card-diag-disabled")

    render(<DiagnosisCard card={card} disabled />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
  })
})
