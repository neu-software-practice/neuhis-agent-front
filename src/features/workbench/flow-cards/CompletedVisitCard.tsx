import { memo } from "react"
import { Card, CardHeader } from "@heroui/react"
import { CheckCircle } from "lucide-react"

import type { FlowCard } from "@/features/workbench/api"
import { formatDateTime } from "@/lib/time"

interface CompletedVisitCardProps {
  card: FlowCard & { kind: "completed_visit" }
  disabled?: boolean
}

/**
 * 问诊完成卡片。
 *
 * 展示本次问诊的最终诊断、处置小结和复诊建议。
 * 信息型卡片，无患者操作。
 */
export const CompletedVisitCard = memo(function CompletedVisitCard({
  card,
}: CompletedVisitCardProps) {
  return (
    <Card className="w-full border border-divider border-success/20 bg-success/5">
      <CardHeader className="flex flex-col items-center gap-1 pb-2 pt-4">
        <CheckCircle className="size-8 text-success" />
        <span className="text-base font-semibold text-foreground">
          {card.title}
        </span>
        <span className="text-[11px] text-muted-foreground">
          完成时间：{formatDateTime(card.completedAt)}
        </span>
      </CardHeader>

      <Card.Content className="space-y-3 pb-4 pt-0">
        {/* 最终诊断 */}
        <div className="rounded-md bg-background/80 px-3 py-2">
          <span className="text-xs font-medium text-foreground/70">最终诊断</span>
          <p className="mt-0.5 text-sm font-medium text-foreground">
            {card.diagnosis}
          </p>
        </div>

        {/* 处置小结 */}
        <div className="rounded-md bg-background/80 px-3 py-2">
          <span className="text-xs font-medium text-foreground/70">处置小结</span>
          <p className="mt-0.5 text-sm text-foreground/80">
            {card.treatmentSummary}
          </p>
        </div>

        {/* 复诊建议 */}
        <div className="rounded-md bg-background/80 px-3 py-2">
          <span className="text-xs font-medium text-foreground/70">复诊建议</span>
          <p className="mt-0.5 text-sm text-foreground/80">
            {card.followUpSuggestion}
          </p>
        </div>

        {/* 底部提示 */}
        <p className="text-center text-xs text-muted-foreground">
          如有不适，请及时就医
        </p>
      </Card.Content>
    </Card>
  )
})
