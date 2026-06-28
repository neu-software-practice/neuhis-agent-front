import { memo } from "react"

import type { FlowCard, FlowCardAction } from "@/features/workbench/api"
import { assertNever } from "@/lib/utils"

import { AdviceOnlyCard } from "@/features/workbench/flow-cards/AdviceOnlyCard"
import { CompletedVisitCard } from "@/features/workbench/flow-cards/CompletedVisitCard"
import { DiagnosisCard } from "@/features/workbench/flow-cards/DiagnosisCard"
import { LabDecisionCard } from "@/features/workbench/flow-cards/LabDecisionCard"
import { LabExecutionCard } from "@/features/workbench/flow-cards/LabExecutionCard"
import { MedicationFulfillmentCard } from "@/features/workbench/flow-cards/MedicationFulfillmentCard"
import { PaymentCard } from "@/features/workbench/flow-cards/PaymentCard"
import { TreatmentExecutionCard } from "@/features/workbench/flow-cards/TreatmentExecutionCard"
import { TreatmentPlanCard } from "@/features/workbench/flow-cards/TreatmentPlanCard"

interface FlowCardRendererProps {
  card: FlowCard
  disabled?: boolean
  onAction?: (action: FlowCardAction) => void
}

/**
 * FlowCard 分发渲染器。
 *
 * 根据 card.kind 分发到对应卡片组件。
 * 使用 assertNever 确保 union 新增成员时编译期报错。
 */
export const FlowCardRenderer = memo(function FlowCardRenderer({
  card,
  disabled,
  onAction,
}: FlowCardRendererProps) {
  switch (card.kind) {
    case "lab_decision":
      return (
        <LabDecisionCard
          card={card}
          disabled={disabled}
          onAction={onAction}
        />
      )
    case "payment":
      return (
        <PaymentCard
          card={card}
          disabled={disabled}
          onAction={onAction}
        />
      )
    case "lab_execution":
      return <LabExecutionCard card={card} disabled={disabled} />
    case "diagnosis":
      return <DiagnosisCard card={card} disabled={disabled} />
    case "treatment_plan":
      return <TreatmentPlanCard card={card} disabled={disabled} />
    case "medication_fulfillment":
      return (
        <MedicationFulfillmentCard
          card={card}
          disabled={disabled}
          onAction={onAction}
        />
      )
    case "treatment_execution":
      return (
        <TreatmentExecutionCard
          card={card}
          disabled={disabled}
          onAction={onAction}
        />
      )
    case "advice_only":
      return (
        <AdviceOnlyCard
          card={card}
          disabled={disabled}
          onAction={onAction}
        />
      )
    case "completed_visit":
      return <CompletedVisitCard card={card} disabled={disabled} />
    default:
      return assertNever(card)
  }
})
