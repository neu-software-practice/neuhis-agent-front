import type { VisitStatus } from "@/lib/api/types"
import type { FlowCard, TimelineItem } from "@/features/workbench/api"

export type FlowProgressStatus =
  | "done"
  | "current"
  | "pending"
  | "blocked"
  | "skipped"
  | "failed"
  | "suspended"
  | "terminated"

export interface FlowProgressStep {
  id: string
  label: string
  status: FlowProgressStatus
  sourceCardId?: string
  description?: string
}

export interface BuildFlowProgressInput {
  items: readonly TimelineItem[]
  sessionStatus?: VisitStatus
  machineState?: string
}

const TERMINAL_STATUS = new Set<VisitStatus>([
  "transferred",
  "emergency_terminated",
  "exited",
])

export function buildFlowProgressSteps({
  items,
  sessionStatus,
  machineState,
}: BuildFlowProgressInput): FlowProgressStep[] {
  const cards = collectFlowCards(items)
  const steps: FlowProgressStep[] = [
    { id: "identity", label: "身份核验", status: "done" },
    { id: "history", label: "病史读取", status: "done" },
    buildInquiryStep(cards.length > 0, sessionStatus, machineState),
  ]

  for (const card of cards) {
    steps.push(mapCardToProgressStep(card))
  }

  const terminal = findLastTerminalItem(items)
  const hasCompletedCard = cards.some((card) => card.kind === "completed_visit")

  if (!hasCompletedCard && sessionStatus === "completed") {
    steps.push({
      id: "completed-session",
      label: "就诊完成",
      status: "done",
    })
  }

  if (sessionStatus === "suspended" || machineState === "suspended") {
    steps.push({
      id: "session-suspended",
      label: "会话已暂停",
      status: "suspended",
      description: "可继续输入并按复诊流程恢复。",
    })
  }

  if (machineState === "emergencyPending") {
    steps.push({
      id: "emergency-pending",
      label: "急症确认",
      status: "blocked",
      description: "正在等待患者确认是否前往急诊。",
    })
  }

  if (machineState === "exitSettlement") {
    steps.push({
      id: "exit-settlement",
      label: "退出结算",
      status: "blocked",
      description: "正在确认本次退出后果。",
    })
  }

  if (terminal) {
    steps.push({
      id: `terminal-${terminal.id}`,
      label: terminalLabel(terminal.reason),
      status: "terminated",
      description: terminal.description,
    })
  } else if (sessionStatus && TERMINAL_STATUS.has(sessionStatus)) {
    steps.push({
      id: `terminal-${sessionStatus}`,
      label: terminalStatusLabel(sessionStatus),
      status: "terminated",
    })
  }

  return markLastActiveStep(steps)
}

function collectFlowCards(items: readonly TimelineItem[]): FlowCard[] {
  const cards: FlowCard[] = []
  for (const item of items) {
    if (item.kind === "flow_card") {
      cards.push(item.card)
    }
  }
  return cards
}

function findLastTerminalItem(items: readonly TimelineItem[]) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index]
    if (item.kind === "terminal") return item
  }
  return undefined
}

function buildInquiryStep(
  hasCards: boolean,
  sessionStatus?: VisitStatus,
  machineState?: string,
): FlowProgressStep {
  if (sessionStatus === "suspended" || machineState === "suspended") {
    return {
      id: "inquiry",
      label: "问诊收集",
      status: hasCards ? "done" : "suspended",
    }
  }

  if (
    sessionStatus === "loading_context" ||
    machineState === "loadingContext"
  ) {
    return { id: "inquiry", label: "问诊收集", status: "pending" }
  }

  return {
    id: "inquiry",
    label: "问诊收集",
    status: hasCards ? "done" : "current",
  }
}

function mapCardToProgressStep(card: FlowCard): FlowProgressStep {
  switch (card.kind) {
    case "lab_decision":
      return {
        id: `card-${card.id}`,
        label: "检验决策",
        status: mapDecisionStatus(card.status),
        sourceCardId: card.id,
        description: card.status === "vetoed" ? "暂不决定，继续补充症状。" : undefined,
      }
    case "payment":
      return {
        id: `card-${card.id}`,
        label: card.purpose === "lab" ? "检验缴费" : "药品缴费",
        status: mapPaymentStatus(card.status, card.paymentStatus),
        sourceCardId: card.id,
        description: card.paymentStatus === "failed" ? "支付失败，请重新尝试。" : undefined,
      }
    case "lab_execution":
      return {
        id: `card-${card.id}`,
        label: "检验执行",
        status:
          card.executionStatus === "completed" ||
          card.executionStatus === "result_ready"
            ? "done"
            : "current",
        sourceCardId: card.id,
        description: labExecutionDescription(card.executionStatus),
      }
    case "diagnosis":
      return {
        id: `card-${card.id}`,
        label: "诊断分析",
        status: "done",
        sourceCardId: card.id,
        description: card.diagnosis,
      }
    case "treatment_plan":
      return {
        id: `card-${card.id}`,
        label: "处置决策",
        status: card.plan === "referral" ? "terminated" : "done",
        sourceCardId: card.id,
        description: treatmentPlanDescription(card.plan),
      }
    case "medication_fulfillment":
      return {
        id: `card-${card.id}`,
        label: "取药方式",
        status:
          card.fulfillmentStatus === "completed" ||
          card.fulfillmentStatus === "confirmed"
            ? "done"
            : mapBlockingCardStatus(card.status),
        sourceCardId: card.id,
        description:
          card.fulfillmentStatus === "confirmed" ? "配送信息已确认。" : undefined,
      }
    case "treatment_execution":
      return {
        id: `card-${card.id}`,
        label: "治疗执行",
        status: mapTreatmentExecutionStatus(card.executionStatus),
        sourceCardId: card.id,
        description: treatmentExecutionDescription(card.executionStatus),
      }
    case "advice_only":
      return {
        id: `card-${card.id}`,
        label: "医嘱确认",
        status: mapBlockingCardStatus(card.status),
        sourceCardId: card.id,
      }
    case "completed_visit":
      return {
        id: `card-${card.id}`,
        label: "就诊完成",
        status: "done",
        sourceCardId: card.id,
        description: card.followUpSuggestion,
      }
  }
}

function mapDecisionStatus(status: FlowCard["status"]): FlowProgressStatus {
  switch (status) {
    case "accepted":
    case "completed":
      return "done"
    case "skipped":
    case "vetoed":
    case "invalidated":
      return "skipped"
    case "failed":
      return "failed"
    case "processing":
      return "current"
    case "pending":
    case "paid":
      return "blocked"
  }
}

function mapPaymentStatus(
  cardStatus: FlowCard["status"],
  paymentStatus: "unpaid" | "pending" | "paid" | "failed" | "refunded",
): FlowProgressStatus {
  if (cardStatus === "invalidated") return "skipped"
  if (paymentStatus === "failed" || cardStatus === "failed") return "failed"
  if (paymentStatus === "paid" || cardStatus === "paid") return "done"
  if (cardStatus === "processing" || paymentStatus === "pending") return "current"
  return "blocked"
}

function mapBlockingCardStatus(status: FlowCard["status"]): FlowProgressStatus {
  switch (status) {
    case "completed":
    case "accepted":
    case "paid":
      return "done"
    case "skipped":
    case "vetoed":
    case "invalidated":
      return "skipped"
    case "failed":
      return "failed"
    case "processing":
      return "current"
    case "pending":
      return "blocked"
  }
}

function mapTreatmentExecutionStatus(
  status: "pending" | "scheduled" | "arrived" | "in_progress" | "completed" | "canceled",
): FlowProgressStatus {
  if (status === "completed") return "done"
  if (status === "canceled") return "skipped"
  return "current"
}

function labExecutionDescription(
  status: "waiting_payment" | "queued" | "collecting" | "testing" | "result_ready" | "completed",
): string {
  const descriptions = {
    waiting_payment: "等待缴费。",
    queued: "已排队。",
    collecting: "正在采样。",
    testing: "正在检验。",
    result_ready: "结果已回填。",
    completed: "结果已回填。",
  } satisfies Record<typeof status, string>
  return descriptions[status]
}

function treatmentPlanDescription(
  plan: "medication" | "treatment" | "advice_only" | "referral",
): string {
  const descriptions = {
    medication: "进入用药分支。",
    treatment: "进入院内治疗分支。",
    advice_only: "进入保守医嘱分支。",
    referral: "建议转线下就医。",
  } satisfies Record<typeof plan, string>
  return descriptions[plan]
}

function treatmentExecutionDescription(
  status: "pending" | "scheduled" | "arrived" | "in_progress" | "completed" | "canceled",
): string {
  const descriptions = {
    pending: "等待预约。",
    scheduled: "已预约。",
    arrived: "已到号。",
    in_progress: "执行中。",
    completed: "治疗已完成。",
    canceled: "治疗已取消。",
  } satisfies Record<typeof status, string>
  return descriptions[status]
}

function terminalLabel(reason: string): string {
  const labels: Record<string, string> = {
    emergency: "急症终止",
    timeout: "超时终止",
    referral: "转线下就医",
    capability_insufficient: "转线下就医",
    exited: "已退出",
    patient_request: "已退出",
    ask_limit_reached: "问诊轮次已达上限",
    lab_limit_reached: "检验轮次已达上限",
  }
  return labels[reason] ?? "流程终止"
}

function terminalStatusLabel(status: VisitStatus): string {
  const labels: Partial<Record<VisitStatus, string>> = {
    transferred: "转线下就医",
    emergency_terminated: "急症终止",
    exited: "已退出",
  }
  return labels[status] ?? "流程终止"
}

function markLastActiveStep(steps: FlowProgressStep[]): FlowProgressStep[] {
  let activeIndex = -1
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const status = steps[index].status
    if (status === "current" || status === "blocked" || status === "failed") {
      activeIndex = index
      break
    }
  }

  if (activeIndex < 0) return steps

  return steps.map((step, index) => {
    if (index !== activeIndex || step.status !== "blocked") return step
    return { ...step, status: "current" }
  })
}
