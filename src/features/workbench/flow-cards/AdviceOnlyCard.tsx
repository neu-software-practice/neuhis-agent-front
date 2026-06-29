import { memo } from "react"
import { Button, Card, CardFooter, CardHeader } from "@heroui/react"
import { CheckCircle, FileText } from "lucide-react"

import type { FlowCard, FlowCardAction } from "@/features/workbench/api"
import { formatDateTime } from "@/lib/time"

interface AdviceOnlyCardProps {
  card: FlowCard & { kind: "advice_only" }
  disabled?: boolean
  onAction?: (action: FlowCardAction) => void
}

/**
 * 医嘱卡片。
 *
 * 展示 AI 给出的健康建议和注意事项。
 * - pending: 显示"已知晓"确认按钮
 * - acknowledged: 显示已确认时间
 */
export const AdviceOnlyCard = memo(function AdviceOnlyCard({
  card,
  disabled,
  onAction,
}: AdviceOnlyCardProps) {
  const isHandled = card.status !== "pending"
  const isLocked = disabled || isHandled

  return (
    <Card className="w-full border border-divider bg-success-foreground">
      <CardHeader className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <span className="text-sm font-medium">{card.title}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {formatDateTime(card.createdAt)}
        </span>
      </CardHeader>

      <Card.Content className="space-y-3 pb-2 pt-0">
        {/* 建议列表 */}
        {card.advices.length > 0 ? (
          <div>
            <span className="text-xs font-medium text-foreground/70">健康建议</span>
            <ul className="mt-1 space-y-1">
              {card.advices.map((advice, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-foreground/80"
                >
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{advice}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 观察项 */}
        {card.watchItems.length > 0 ? (
          <div>
            <span className="text-xs font-medium text-foreground/70">注意事项</span>
            <ul className="mt-1 space-y-1">
              {card.watchItems.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-foreground/80"
                >
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-warning" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 复诊建议 */}
        <div className="rounded-md bg-primary/5 px-3 py-2">
          <span className="text-xs font-medium text-primary">复诊建议</span>
          <p className="mt-0.5 text-sm text-foreground/80">
            {card.followUpRecommendation}
          </p>
        </div>

        {/* 已确认状态 */}
        {isHandled ? (
          <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm">
            <CheckCircle className="size-4 text-success" />
            <span className="text-success">
              已于 {card.handledAt ? formatDateTime(card.handledAt) : ""} 确认
            </span>
          </div>
        ) : null}
      </Card.Content>

      {!isHandled ? (
        <CardFooter className="pt-0">
          <Button
            size="sm"
            variant="primary"
            isDisabled={isLocked}
            onPress={() => onAction?.({ type: "ack_advice", cardId: card.id })}
          >
            <CheckCircle className="size-3.5" />
            已知晓
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
})
