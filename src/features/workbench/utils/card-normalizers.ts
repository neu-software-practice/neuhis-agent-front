import type {
  AckAdviceInput,
  FlowCard,
  FlowCardAction,
  TimelineItem,
  SubmitFulfillmentInput,
  SubmitLabDecisionInput,
  SubmitTreatmentExecutionInput,
} from "@/features/workbench/api"
import type { VisitMachineEvent } from "@/features/workbench/machine/visit-machine.types"

/**
 * FlowCardAction → API 输入类型映射及辅助工具。
 *
 * 纯函数工具文件，无 React 依赖。
 */

// ---- Action → API Input ----

/** accept_lab / skip_lab / veto_lab → SubmitLabDecisionInput */
export function toLabDecisionInput(
  action: Extract<FlowCardAction, { type: "accept_lab" | "skip_lab" | "veto_lab" }>,
  sessionId: string,
): SubmitLabDecisionInput {
  const decision =
    action.type === "accept_lab" ? "accepted"
    : action.type === "skip_lab" ? "skipped"
    : "vetoed"
  return { sessionId, cardId: action.cardId, decision }
}

/** choose_fulfillment → SubmitFulfillmentInput */
export function toFulfillmentInput(
  action: Extract<FlowCardAction, { type: "choose_fulfillment" }>,
  sessionId: string,
): SubmitFulfillmentInput {
  return { sessionId, cardId: action.cardId, mode: action.mode }
}

/** submit_treatment_execution → SubmitTreatmentExecutionInput */
export function toTreatmentExecutionInput(
  action: Extract<FlowCardAction, { type: "submit_treatment_execution" }>,
  sessionId: string,
): SubmitTreatmentExecutionInput {
  return { sessionId, cardId: action.cardId, action: action.action }
}

/** ack_advice → AckAdviceInput */
export function toAckAdviceInput(
  action: Extract<FlowCardAction, { type: "ack_advice" }>,
  sessionId: string,
): AckAdviceInput {
  return { sessionId, cardId: action.cardId }
}

/** 将服务端返回的流程卡映射为状态机事件。 */
export function mapCardToMachineEvent(card: FlowCard): VisitMachineEvent {
  switch (card.kind) {
    case "lab_decision":
      return { type: "LAB_CARD_RAISED", cardId: card.id }
    case "payment":
      return card.purpose === "medication"
        ? { type: "MEDICATION_PAYMENT_RAISED", cardId: card.id }
        : { type: "PAYMENT_CARD_RAISED", cardId: card.id, purpose: "lab" }
    case "lab_execution":
      return { type: "LAB_EXECUTION_STARTED", cardId: card.id }
    case "diagnosis":
      return { type: "DIAGNOSIS_READY", cardId: card.id }
    case "treatment_plan":
      return { type: "TREATMENT_DECIDED", cardId: card.id, plan: card.plan }
    case "medication_fulfillment":
      return { type: "MEDICATION_FULFILLMENT_RAISED", cardId: card.id }
    case "treatment_execution":
      return { type: "TREATMENT_EXECUTION_RAISED", cardId: card.id }
    case "advice_only":
      return { type: "ADVICE_CARD_RAISED", cardId: card.id }
    case "completed_visit":
      return { type: "VISIT_COMPLETED" }
  }
}

/** 将 timeline item 中的流程卡提取为状态机事件。 */
export function mapTimelineItemToMachineEvent(
  item: TimelineItem,
): VisitMachineEvent | null {
  return item.kind === "flow_card" ? mapCardToMachineEvent(item.card) : null
}

// ---- 辅助判断 ----

/** 获取 action 的用户可读标签 */
export function getCardActionLabel(action: FlowCardAction): string {
  switch (action.type) {
    case "accept_lab":
      return "同意检验"
    case "skip_lab":
      return "跳过检验"
    case "veto_lab":
      return "暂不决定"
    case "submit_payment":
      return "确认支付"
    case "defer_payment":
      return "暂不缴费"
    case "choose_fulfillment":
      return action.mode === "pickup" ? "自取" : "配送"
    case "submit_treatment_execution": {
      const labels: Record<string, string> = {
        schedule: "预约",
        confirm_arrival: "确认到号",
        start: "开始执行",
        complete: "确认完成",
        cancel: "取消",
      }
      return labels[action.action] ?? action.action
    }
    case "ack_advice":
      return "已知晓"
  }
}

/** 判断卡片是否阻断输入 */
export function isBlockingCard(card: FlowCard): boolean {
  return card.blocking
}

/** 获取锁定原因文案 */
export function getLockReason(card: FlowCard): string {
  return card.lockReason ?? "请先处理当前卡片"
}
