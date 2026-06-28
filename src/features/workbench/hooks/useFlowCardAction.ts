import { useCallback, useState } from "react"

import { workbenchApi } from "@/features/workbench/api"
import type { FlowActionResult, FlowCard, FlowCardAction, TimelineItem } from "@/features/workbench/api"
import type { VisitMachineEvent } from "@/features/workbench/machine/visit-machine.types"
import {
  toAckAdviceInput,
  toFulfillmentInput,
  toLabDecisionInput,
  toTreatmentExecutionInput,
  mapTimelineItemToMachineEvent,
} from "@/features/workbench/utils/card-normalizers"

export interface UseFlowCardActionOptions {
  /** 当前就诊会话 ID */
  sessionId: string
  /** 向状态机发送事件的回调 */
  sendMachineEvent: (event: VisitMachineEvent) => void
  /** 更新 timeline cache 中指定卡片状态的函数 */
  updateCardInTimeline: (
    cardId: string,
    updater: (card: FlowCard) => FlowCard,
  ) => void
  /** 合并服务端返回的 timeline items */
  upsertTimelineItems: (items: TimelineItem[]) => void
  /** 根据 cardId 查找卡片数据（用于推断支付目的等上下文信息） */
  findCardById?: (cardId: string) => FlowCard | undefined
}

export interface UseFlowCardActionResult {
  /** 处理卡片动作的入口 */
  handleAction: (action: FlowCardAction) => Promise<void>
  /** 是否正在提交 */
  isSubmitting: boolean
}

/**
 * useFlowCardAction：流程卡操作 hook。
 *
 * 管理卡片操作完整生命周期：乐观更新 → API 调用 → 成功后更新 cache + 发送状态机事件 → 失败回滚。
 */
export function useFlowCardAction(
  options: UseFlowCardActionOptions,
): UseFlowCardActionResult {
  const {
    sessionId,
    sendMachineEvent,
    updateCardInTimeline,
    upsertTimelineItems,
    findCardById,
  } = options
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAction = useCallback(
    async (action: FlowCardAction) => {
      setIsSubmitting(true)
      const submittedCard = findCardById?.(action.cardId)

      try {
        // 1. 乐观更新卡片状态为 processing
        updateCardInTimeline(action.cardId, (card) => ({
          ...card,
          status: "processing" as const,
        }))

        // 2. 根据 action 类型调用对应的 API
        let result: FlowActionResult

        switch (action.type) {
          case "accept_lab":
          case "skip_lab":
          case "veto_lab":
            result = await workbenchApi.submitLabDecision(
              toLabDecisionInput(action, sessionId),
            )
            break
          case "submit_payment": {
            const purpose =
              submittedCard?.kind === "payment" ? submittedCard.purpose : "lab"
            result = await workbenchApi.submitPayment({
              sessionId,
              cardId: action.cardId,
              purpose,
              paymentMethodId: action.paymentMethodId,
            })
            break
          }
          case "defer_payment": {
            const purpose =
              submittedCard?.kind === "payment" ? submittedCard.purpose : "lab"
            result = await workbenchApi.submitPayment({
              sessionId,
              cardId: action.cardId,
              purpose,
              defer: true,
            })
            break
          }
          case "choose_fulfillment":
            result = await workbenchApi.submitFulfillment(
              toFulfillmentInput(action, sessionId),
            )
            break
          case "submit_treatment_execution":
            result = await workbenchApi.submitTreatmentExecution(
              toTreatmentExecutionInput(action, sessionId),
            )
            break
          case "ack_advice":
            result = await workbenchApi.ackAdvice(
              toAckAdviceInput(action, sessionId),
            )
            break
        }

        // 3. 成功后更新被操作卡片本身，并合并服务端新增 timeline。
        updateCardInTimeline(action.cardId, (card) =>
          markHandledCard(card, action, result.card),
        )
        upsertTimelineItems(result.timelineItems)

        // 4. 使用本次 action 和服务端返回 items 共同推进状态机。
        for (const event of collectFlowActionSuccessEvents(action, result, submittedCard)) {
          sendMachineEvent(event)
        }
      } catch (error) {
        // 5. 失败后回滚卡片状态
        updateCardInTimeline(action.cardId, (card) => ({
          ...card,
          status: "pending" as const,
        }))
        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      sessionId,
      sendMachineEvent,
      updateCardInTimeline,
      upsertTimelineItems,
      findCardById,
    ],
  )

  return { handleAction, isSubmitting }
}

/**
 * FlowCardAction → VisitMachineEvent 基础映射（不含支付类特殊处理）。
 * 支付类事件（submit_payment / defer_payment）由 useFlowCardAction 按 purpose 特殊处理。
 */
function mapActionToSuccessEvent(action: FlowCardAction): VisitMachineEvent | null {
  switch (action.type) {
    case "accept_lab":
      return { type: "LAB_ACCEPTED", cardId: action.cardId }
    case "skip_lab":
      return { type: "LAB_SKIPPED", cardId: action.cardId }
    case "veto_lab":
      return { type: "LAB_VETOED", cardId: action.cardId }
    case "choose_fulfillment":
      return { type: "MEDICATION_FULFILLED", cardId: action.cardId }
    case "submit_treatment_execution": {
      switch (action.action) {
        case "schedule":
          return { type: "TREATMENT_SCHEDULED", cardId: action.cardId }
        case "confirm_arrival":
          return { type: "TREATMENT_ARRIVED", cardId: action.cardId }
        case "start":
          return { type: "TREATMENT_STARTED", cardId: action.cardId }
        case "complete":
          return { type: "TREATMENT_COMPLETED", cardId: action.cardId }
        case "cancel":
          return { type: "TRANSFER_REQUIRED", reason: "capability_insufficient" }
      }
      return null
    }
    case "ack_advice":
      return { type: "ADVICE_ACKNOWLEDGED", cardId: action.cardId }
    // 支付类由调用方处理
    case "submit_payment":
    case "defer_payment":
      return null
  }
}

function markHandledCard(
  card: FlowCard,
  action: FlowCardAction,
  resultCard?: FlowCard,
): FlowCard {
  if (resultCard?.id === card.id) return resultCard

  switch (action.type) {
    case "accept_lab":
      return { ...card, status: "accepted", blocking: false }
    case "skip_lab":
      return { ...card, status: "skipped", blocking: false }
    case "veto_lab":
      return { ...card, status: "vetoed", blocking: false }
    case "submit_payment":
      return { ...card, status: "paid", blocking: false }
    case "defer_payment":
      return { ...card, status: "invalidated", blocking: false }
    case "choose_fulfillment":
    case "submit_treatment_execution":
    case "ack_advice":
      return resultCard ?? { ...card, status: "completed", blocking: false }
  }
}

export function collectFlowActionSuccessEvents(
  action: FlowCardAction,
  result: FlowActionResult,
  submittedCard?: FlowCard,
): VisitMachineEvent[] {
  const events: VisitMachineEvent[] = []
  const resultCardId = result.card?.id ?? action.cardId
  const firstTimelineCardId = findFirstTimelineCardId(result.timelineItems)

  switch (action.type) {
    case "accept_lab":
      events.push({ type: "LAB_ACCEPTED", cardId: resultCardId })
      return events
    case "submit_payment": {
      const firstCardId = firstTimelineCardId ?? resultCardId
      const purpose =
        submittedCard?.kind === "payment" ? submittedCard.purpose : "lab"
      if (
        result.card?.kind === "payment" &&
        (result.card.paymentStatus === "failed" || result.card.status === "failed")
      ) {
        events.push({ type: "PAYMENT_FAILED", cardId: resultCardId, purpose })
        return events
      }
      if (purpose === "medication") {
        events.push({
          type: "MEDICATION_PAID",
          cardId: firstCardId,
        })
      } else {
        events.push({
          type: "LAB_PAYMENT_SUCCEEDED",
          cardId: firstCardId,
        })
      }
      events.push(...collectTimelineEvents(result.timelineItems, firstCardId))
      return events
    }
    case "defer_payment": {
      const purpose =
        submittedCard?.kind === "payment"
          ? submittedCard.purpose
          : result.card?.kind === "payment"
            ? result.card.purpose
            : "lab"
      events.push({ type: "PAYMENT_DEFERRED", cardId: action.cardId, purpose })
      return events
    }
    default: {
      const event = mapActionToSuccessEvent(action)
      if (event) events.push(event)
      events.push(...collectTimelineEvents(result.timelineItems))
      return events
    }
  }
}

function collectTimelineEvents(
  items: TimelineItem[],
  skipCardId?: string,
): VisitMachineEvent[] {
  const events: VisitMachineEvent[] = []
  for (const item of items) {
    if (item.kind === "flow_card" && item.card.id === skipCardId) continue
    const event = mapTimelineItemToMachineEvent(item)
    if (event) events.push(event)
  }
  return events
}

function findFirstTimelineCardId(items: TimelineItem[]): string | undefined {
  for (const item of items) {
    if (item.kind === "flow_card") return item.card.id
  }
  return undefined
}
