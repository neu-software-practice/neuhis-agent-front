import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { FlowCard } from "@/features/workbench/api"
import { createTreatmentPlanCard } from "@/mocks/api/fixtures/flow-cards"
import { TreatmentPlanCard } from "@/features/workbench/flow-cards/TreatmentPlanCard"

const SESSION_ID = "session-treatment-plan"

afterEach(() => {
  cleanup()
})

describe("TreatmentPlanCard", () => {
  it("渲染 medication 方案：标题、方案类型、执行能力、摘要和行动项", () => {
    const card = createTreatmentPlanCard(SESSION_ID, "card-plan-med", "medication")

    render(<TreatmentPlanCard card={card} />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
    expect(screen.getByText("药物治疗")).toBeInTheDocument()
    expect(screen.getByText("本院可执行")).toBeInTheDocument()
    expect(screen.getByText("处置方案")).toBeInTheDocument()
    expect(screen.getByText(card.summary)).toBeInTheDocument()
    expect(screen.getByText("行动项")).toBeInTheDocument()
    for (const action of card.actions) {
      expect(screen.getByText(action)).toBeInTheDocument()
    }
  })

  it("treatment 方案显示「院内治疗」", () => {
    const card = createTreatmentPlanCard(SESSION_ID, "card-plan-treat", "treatment")

    render(<TreatmentPlanCard card={card} />)

    expect(screen.getByText("院内治疗")).toBeInTheDocument()
  })

  it("advice_only 方案显示「仅医嘱」", () => {
    const card = createTreatmentPlanCard(SESSION_ID, "card-plan-advice", "advice_only")

    render(<TreatmentPlanCard card={card} />)

    expect(screen.getByText("仅医嘱")).toBeInTheDocument()
  })

  it("referral 方案显示「转诊」和 unavailable 提示", () => {
    const card = createTreatmentPlanCard(SESSION_ID, "card-plan-ref", "referral")

    render(<TreatmentPlanCard card={card} />)

    expect(screen.getByText("转诊")).toBeInTheDocument()
    expect(screen.getByText("需转诊")).toBeInTheDocument()
    expect(screen.getByText("本院无法执行该方案")).toBeInTheDocument()
    expect(
      screen.getByText(
        "建议前往上级医院就诊，或联系医生咨询转诊事宜",
      ),
    ).toBeInTheDocument()
  })

  it("limited 能力显示「部分可执行」提示", () => {
    const card: FlowCard = {
      ...createTreatmentPlanCard(SESSION_ID, "card-plan-med"),
      capability: "limited",
      summary: "部分可执行方案",
      actions: ["项目A"],
    }

    render(<TreatmentPlanCard card={card} />)

    expect(screen.getByText("部分可执行")).toBeInTheDocument()
    expect(screen.getByText("本院仅能部分执行")).toBeInTheDocument()
    expect(
      screen.getByText("部分项目需配合转诊或外送检验完成"),
    ).toBeInTheDocument()
  })

  it("行动项为空时不渲染「行动项」区块", () => {
    const card: FlowCard = {
      ...createTreatmentPlanCard(SESSION_ID, "card-plan-empty"),
      actions: [],
    }

    render(<TreatmentPlanCard card={card} />)

    expect(screen.queryByText("行动项")).not.toBeInTheDocument()
  })

  it("available 能力不显示能力不足提示", () => {
    const card = createTreatmentPlanCard(SESSION_ID, "card-plan-med")

    render(<TreatmentPlanCard card={card} />)

    expect(screen.queryByText("本院无法执行该方案")).not.toBeInTheDocument()
    expect(screen.queryByText("本院仅能部分执行")).not.toBeInTheDocument()
  })

  it("信息型卡片不渲染任何操作按钮", () => {
    const card = createTreatmentPlanCard(SESSION_ID, "card-plan-2")

    render(<TreatmentPlanCard card={card} />)

    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("未知 plan 值回退显示原始字符串", () => {
    const card: FlowCard = {
      ...createTreatmentPlanCard(SESSION_ID, "card-plan-unknown"),
      plan: "custom_plan" as "medication",
    }

    render(<TreatmentPlanCard card={card} />)

    expect(screen.getByText("custom_plan")).toBeInTheDocument()
  })

  it("未知 capability 值不显示能力 Chip", () => {
    const card: FlowCard = {
      ...createTreatmentPlanCard(SESSION_ID, "card-cap-unknown"),
      // @ts-expect-error testing unknown capability
      capability: "unknown_cap",
    }

    render(<TreatmentPlanCard card={card} />)

    // Should not crash and should render without capability info
    expect(screen.getByText(card.title)).toBeInTheDocument()
  })

  it("渲染 ClipboardList 图标", () => {
    const card = createTreatmentPlanCard(SESSION_ID, "card-plan-icon")

    const { container } = render(<TreatmentPlanCard card={card} />)

    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("unavailable 能力渲染危险提示图标", () => {
    const card: FlowCard = {
      ...createTreatmentPlanCard(SESSION_ID, "card-plan-unavailable"),
      capability: "unavailable",
    }

    const { container } = render(<TreatmentPlanCard card={card} />)

    expect(screen.getByText("本院无法执行该方案")).toBeInTheDocument()
    // AlertTriangle icon should be present in warning
    const warningSection = container.querySelector(".text-warning")
    expect(warningSection).toBeInTheDocument()
  })

  it("disabled prop 不影响渲染", () => {
    const card = createTreatmentPlanCard(SESSION_ID, "card-plan-disabled")

    render(<TreatmentPlanCard card={card} disabled />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
  })
})
