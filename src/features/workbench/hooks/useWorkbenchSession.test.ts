import { describe, expect, it } from "vitest"

import type {
  FlowCard,
  FlowCardTimelineItem,
  TimelineItem,
} from "@/features/workbench/api"
import { findBlockingCard } from "@/features/workbench/hooks/useWorkbenchSession"

const SESSION_ID = "visit-test"
type LabExecutionCard = Extract<FlowCard, { kind: "lab_execution" }>

function labExecutionCard(
  overrides: Partial<LabExecutionCard> = {},
): LabExecutionCard {
  return {
    id: "card-lab-execution",
    sessionId: SESSION_ID,
    kind: "lab_execution",
    status: "pending",
    blocking: true,
    title: "完成检验",
    createdAt: "2026-07-02T08:00:00.000Z",
    labOrderId: "lab-order-001",
    executionStatus: "testing",
    ...overrides,
  }
}

function flowCardItem(card: FlowCard): FlowCardTimelineItem {
  return {
    kind: "flow_card",
    id: card.id,
    sessionId: card.sessionId,
    createdAt: card.createdAt,
    status: "done",
    card,
  }
}

describe("findBlockingCard", () => {
  it("returns the current pending blocking card", () => {
    const card = labExecutionCard()

    expect(findBlockingCard([flowCardItem(card)], card.id)).toBe(card)
  })

  it("does not return a card after timeline polling marks it non-blocking", () => {
    const card = labExecutionCard({
      status: "completed",
      blocking: false,
    })

    expect(findBlockingCard([flowCardItem(card)], card.id)).toBeUndefined()
  })

  it("ignores other blocking cards when currentCardId does not match", () => {
    const card = labExecutionCard()
    const items: TimelineItem[] = [flowCardItem(card)]

    expect(findBlockingCard(items, "other-card")).toBeUndefined()
  })
})
