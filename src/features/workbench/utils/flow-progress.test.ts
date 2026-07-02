import { describe, expect, it } from "vitest"

import type {
  FlowCard,
  FlowCardTimelineItem,
  TerminalTimelineItem,
  TimelineItem,
} from "@/features/workbench/api"
import { buildFlowProgressSteps } from "@/features/workbench/utils/flow-progress"
import {
  createAdviceOnlyCard,
  createCompletedLabExecutionCard,
  createCompletedVisitCard,
  createDiagnosisCard,
  createLabDecisionCard,
  createLabPaymentCard,
  createMedicationFulfillmentCard,
  createMedicationPaymentCard,
  createTreatmentExecutionCard,
  createTreatmentPlanCard,
} from "@/mocks/api/fixtures/flow-cards"

const SESSION_ID = "session-flow-progress"

function cardItem(card: FlowCard): FlowCardTimelineItem {
  return {
    kind: "flow_card",
    id: `tl-${card.id}`,
    sessionId: SESSION_ID,
    createdAt: card.createdAt,
    status: "done",
    card,
  }
}

function terminalItem(reason: TerminalTimelineItem["reason"]): TerminalTimelineItem {
  return {
    kind: "terminal",
    id: `terminal-${reason}`,
    sessionId: SESSION_ID,
    createdAt: "2026-06-28T02:30:00.000Z",
    status: "done",
    reason,
    title: "流程终止",
    description: "请转线下处理。",
  }
}

function labelsAndStatuses(items: TimelineItem[]) {
  return buildFlowProgressSteps({ items }).map((step) => [
    step.label,
    step.status,
  ])
}

describe("buildFlowProgressSteps", () => {
  it("marks inquiry as current before any flow card appears", () => {
    const steps = buildFlowProgressSteps({
      items: [],
      sessionStatus: "chatting",
      machineState: "chatting",
    })

    expect(steps.map((step) => [step.label, step.status])).toEqual([
      ["身份核验", "done"],
      ["病史读取", "done"],
      ["问诊收集", "current"],
    ])
  })

  it("derives the full medication branch from card history", () => {
    const labDecision = {
      ...createLabDecisionCard(SESSION_ID, "lab-decision"),
      status: "accepted" as const,
      blocking: false,
    }
    const labPayment = {
      ...createLabPaymentCard(SESSION_ID, "lab-payment"),
      status: "paid" as const,
      paymentStatus: "paid" as const,
      blocking: false,
    }
    const medicationPayment = {
      ...createMedicationPaymentCard(SESSION_ID, "med-payment"),
      status: "paid" as const,
      paymentStatus: "paid" as const,
      blocking: false,
    }
    const fulfillment = {
      ...createMedicationFulfillmentCard(SESSION_ID, "fulfillment"),
      status: "completed" as const,
      blocking: false,
      fulfillmentStatus: "completed" as const,
    }

    const items = [
      cardItem(labDecision),
      cardItem(labPayment),
      cardItem(createCompletedLabExecutionCard(SESSION_ID, "lab-execution")),
      cardItem(createDiagnosisCard(SESSION_ID, "diagnosis")),
      cardItem(createTreatmentPlanCard(SESSION_ID, "plan", "medication")),
      cardItem(medicationPayment),
      cardItem(fulfillment),
      cardItem(createCompletedVisitCard(SESSION_ID, "completed")),
    ]

    expect(labelsAndStatuses(items)).toEqual([
      ["身份核验", "done"],
      ["病史读取", "done"],
      ["问诊收集", "done"],
      ["检验决策", "done"],
      ["检验缴费", "done"],
      ["检验执行", "done"],
      ["诊断分析", "done"],
      ["处置决策", "done"],
      ["药品缴费", "done"],
      ["取药方式", "done"],
      ["就诊完成", "done"],
    ])
  })

  it("shows skipped lab decision and current advice confirmation for advice-only branch", () => {
    const labDecision = {
      ...createLabDecisionCard(SESSION_ID, "lab-decision"),
      status: "skipped" as const,
      blocking: false,
    }

    const items = [
      cardItem(labDecision),
      cardItem(createDiagnosisCard(SESSION_ID, "diagnosis", { includeLabEvidence: false })),
      cardItem(createTreatmentPlanCard(SESSION_ID, "plan", "advice_only")),
      cardItem(createAdviceOnlyCard(SESSION_ID, "advice")),
    ]

    expect(labelsAndStatuses(items)).toEqual([
      ["身份核验", "done"],
      ["病史读取", "done"],
      ["问诊收集", "done"],
      ["检验决策", "skipped"],
      ["诊断分析", "done"],
      ["处置决策", "done"],
      ["医嘱确认", "current"],
    ])
  })

  it("keeps treatment execution current until completion", () => {
    const baseTreatment = createTreatmentExecutionCard(
      SESSION_ID,
      "treatment",
    ) as Extract<FlowCard, { kind: "treatment_execution" }>
    const treatment = {
      ...baseTreatment,
      executionStatus: "in_progress" as const,
      availableActions: ["complete" as const],
    }

    const items = [
      cardItem(createDiagnosisCard(SESSION_ID, "diagnosis")),
      cardItem(createTreatmentPlanCard(SESSION_ID, "plan", "treatment")),
      cardItem(treatment),
    ]

    expect(labelsAndStatuses(items)).toContainEqual(["治疗执行", "current"])
  })

  it("appends suspended and terminal lifecycle steps", () => {
    const suspendedSteps = buildFlowProgressSteps({
      items: [],
      sessionStatus: "suspended",
      machineState: "suspended",
    })
    expect(suspendedSteps.map((step) => [step.label, step.status])).toEqual([
      ["身份核验", "done"],
      ["病史读取", "done"],
      ["问诊收集", "suspended"],
      ["会话已暂停", "suspended"],
    ])

    const terminalSteps = buildFlowProgressSteps({
      items: [terminalItem("emergency")],
      sessionStatus: "emergency_terminated",
      machineState: "terminated",
    })
    expect(terminalSteps.at(-1)).toMatchObject({
      label: "急症终止",
      status: "terminated",
    })
  })

  it("surfaces payment failure as the current step", () => {
    const failedPayment = {
      ...createLabPaymentCard(SESSION_ID, "lab-payment"),
      status: "failed" as const,
      paymentStatus: "failed" as const,
    }

    const steps = buildFlowProgressSteps({
      items: [cardItem(failedPayment)],
      sessionStatus: "blocked",
      machineState: "labPayment",
    })

    expect(steps.at(-1)).toMatchObject({
      label: "检验缴费",
      status: "failed",
    })
  })
})
