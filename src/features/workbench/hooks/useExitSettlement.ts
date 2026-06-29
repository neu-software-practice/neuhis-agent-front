import { useMemo } from "react"

import type { FlowCard, TimelineItem } from "@/features/workbench/api/types"

/**
 * 退出后果的四档类型。
 *
 * - no_fee：未产生任何费用，可直接结束。
 * - refundable：已支付但对应动作尚未执行，可原路退款。
 * - executed_no_refund：已支付且检验/治疗已执行完成，费用不可退。
 * - medication_dispensed：已完成取药，按退药政策处理。
 *
 * 与 api 层 ExitSettlementResult.consequence 对齐，但本 hook
 * 完全在客户端从既有时间线派生，不调用任何 transport / API。
 */
export type ExitConsequenceKind =
  | "no_fee"
  | "refundable"
  | "executed_no_refund"
  | "medication_dispensed"

export interface ExitConsequence {
  kind: ExitConsequenceKind
  amount?: number
  text: string
}

export interface UseExitSettlementResult {
  consequence: ExitConsequence
}

/** 患者可见的后果文案，对齐 ui-designs，不含任何内部状态名。 */
function consequenceText(kind: ExitConsequenceKind, amount?: number): string {
  switch (kind) {
    case "no_fee":
      return "本次问诊将直接结束，不产生费用。"
    case "refundable":
      return `已支付的 ¥${amount ?? 0} 将原路退回，通常 1-3 个工作日到账。`
    case "executed_no_refund":
      return "已完成的检验/治疗费用不可退，结果会留档供下次使用。"
    case "medication_dispensed":
      return "已取药品按退药政策处理，详见结算明细。"
  }
}

/** 从时间线提取所有流程卡。 */
function collectFlowCards(items: readonly TimelineItem[]): FlowCard[] {
  const cards: FlowCard[] = []
  for (const item of items) {
    if (item.kind === "flow_card") {
      cards.push(item.card)
    }
  }
  return cards
}

/**
 * 从已有 timeline items 派生唯一一条退出后果文案。
 *
 * 判定依据「已发生的不可逆动作」而非用户停在哪一步，承诺度最高者优先：
 *
 *   1. 已取药         medication_fulfillment 完成
 *   2. 已执行不可退   已支付 payment 且对应 lab_execution / treatment_execution 已完成
 *   3. 已支付可退     有已支付 payment 但尚无执行完成
 *   4. 无费用         无任何已支付 payment
 *
 * 纯派生 hook：入参为外部传入的时间线，不自己拉数据，不调 transport / API。
 */
export function useExitSettlement(
  timelineItems: readonly TimelineItem[],
): UseExitSettlementResult {
  return useMemo(() => {
    const cards = collectFlowCards(timelineItems)

    const hasDispensedMedication = cards.some(
      (card) =>
        card.kind === "medication_fulfillment" &&
        card.fulfillmentStatus === "completed",
    )

    const paidPayments = cards.filter(
      (card) => card.kind === "payment" && card.paymentStatus === "paid",
    )
    const hasPaid = paidPayments.length > 0

    const hasCompletedExecution = cards.some(
      (card) =>
        (card.kind === "lab_execution" ||
          card.kind === "treatment_execution") &&
        card.executionStatus === "completed",
    )

    // 可退金额：已支付的自付金额之和。
    const refundAmount = paidPayments.reduce((sum, card) => {
      return card.kind === "payment" ? sum + card.selfPayAmount : sum
    }, 0)

    let kind: ExitConsequenceKind
    let amount: number | undefined

    if (hasDispensedMedication) {
      kind = "medication_dispensed"
    } else if (hasPaid && hasCompletedExecution) {
      kind = "executed_no_refund"
    } else if (hasPaid) {
      kind = "refundable"
      amount = refundAmount
    } else {
      kind = "no_fee"
    }

    return {
      consequence: {
        kind,
        amount,
        text: consequenceText(kind, amount),
      },
    }
  }, [timelineItems])
}
