import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { createCompletedVisitCard } from "@/mocks/api/fixtures/flow-cards"
import { CompletedVisitCard } from "@/features/workbench/flow-cards/CompletedVisitCard"

const SESSION_ID = "session-completed-visit"

afterEach(() => {
  cleanup()
})

describe("CompletedVisitCard", () => {
  it("渲染完成问诊卡片：标题、完成时间、最终诊断、处置小结、复诊建议和底部提示", () => {
    const card = createCompletedVisitCard(SESSION_ID, "card-completed-1")

    render(<CompletedVisitCard card={card} />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
    expect(screen.getByText(/完成时间/)).toBeInTheDocument()
    expect(screen.getByText("最终诊断")).toBeInTheDocument()
    expect(screen.getByText(card.diagnosis)).toBeInTheDocument()
    expect(screen.getByText("处置小结")).toBeInTheDocument()
    expect(screen.getByText(card.treatmentSummary)).toBeInTheDocument()
    expect(screen.getByText("复诊建议")).toBeInTheDocument()
    expect(screen.getByText(card.followUpSuggestion)).toBeInTheDocument()
    expect(screen.getByText("如有不适，请及时就医")).toBeInTheDocument()
  })

  it("信息型卡片不渲染任何操作按钮", () => {
    const card = createCompletedVisitCard(SESSION_ID, "card-completed-2")

    render(<CompletedVisitCard card={card} />)

    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("渲染 CheckCircle 图标", () => {
    const card = createCompletedVisitCard(SESSION_ID, "card-icon-check")

    const { container } = render(<CompletedVisitCard card={card} />)

    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("disabled prop 不影响渲染", () => {
    const card = createCompletedVisitCard(SESSION_ID, "card-disabled")

    render(<CompletedVisitCard card={card} disabled />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
    expect(screen.getByText("如有不适，请及时就医")).toBeInTheDocument()
  })
})
