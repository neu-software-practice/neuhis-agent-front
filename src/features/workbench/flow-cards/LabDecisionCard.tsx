import { memo } from "react"
import { Button, Card, CardFooter, CardHeader, Chip } from "@heroui/react"
import {
  Check,
  Clock,
  FlaskConical,
  X,
} from "lucide-react"

import type { FlowCard, FlowCardAction } from "@/features/workbench/api"
import { formatDateTime } from "@/lib/time"

interface LabDecisionCardProps {
  card: FlowCard & { kind: "lab_decision" }
  disabled?: boolean
  onAction?: (action: FlowCardAction) => void
}

/**
 * 检验决策卡片。
 *
 * 当 AI 判断需要检验时展示，由患者选择是否接受检验。
 * - pending: 展示三个操作按钮（同意/暂不决定/不查）
 * - handled (accepted/skipped/vetoed): 展示最终状态
 * - blocking时显示锁指示
 */
export const LabDecisionCard = memo(function LabDecisionCard({
  card,
  disabled,
  onAction,
}: LabDecisionCardProps) {
  const isHandled = card.status !== "pending"
  const isBlocking = card.blocking
  const isLocked = disabled || isHandled

  return (
    <Card className="w-full border border-divider">
      <CardHeader className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-primary" />
          <span className="text-sm font-medium">{card.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {isBlocking && !isHandled ? (
            <Chip
              size="sm"
              variant="tertiary"
              color="warning"
            >
              <Clock className="size-3" />
              请先处理
            </Chip>
          ) : null}
          <span className="text-[11px] text-muted-foreground">
            {formatDateTime(card.createdAt)}
          </span>
        </div>
      </CardHeader>

      <Card.Content className="space-y-3 pb-2 pt-0">
        {/* 检验项目列表 */}
        <div>
          <span className="text-xs font-medium text-foreground/70">检验项目</span>
          <ul className="mt-1 space-y-1">
            {card.testItems.map((item) => (
              <li
                key={item.code}
                className="flex items-center gap-2 text-sm"
              >
                <span className="size-1.5 rounded-full bg-primary" />
                <span>{item.name}</span>
                {item.sampleType ? (
                  <span className="text-xs text-muted-foreground">
                    ({item.sampleType})
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        {/* 检验原因 */}
        <div>
          <span className="text-xs font-medium text-foreground/70">检验原因</span>
          <p className="mt-0.5 text-sm text-foreground/80">{card.reason}</p>
        </div>

        {/* 鉴别诊断目标 */}
        {card.differentialTargets.length > 0 ? (
          <div>
            <span className="text-xs font-medium text-foreground/70">
              鉴别目标
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {card.differentialTargets.map((target) => (
                <Chip key={target} size="sm" variant="tertiary" color="accent">
                  {target}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        {/* 预估费用 */}
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">预估费用：</span>
          <span className="font-medium text-foreground">
            ¥{card.estimatedFee.toFixed(2)}
          </span>
        </div>

        {/* 已处理状态展示 */}
        {isHandled ? (
          <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm">
            {card.status === "accepted" ? (
              <>
                <Check className="size-4 text-success" />
                <span className="text-success">已同意检验</span>
              </>
            ) : card.status === "skipped" ? (
              <>
                <X className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">已跳过检验</span>
              </>
            ) : card.status === "vetoed" ? (
              <>
                <X className="size-4 text-warning" />
                <span className="text-warning">暂不决定</span>
              </>
            ) : null}
            {card.handledAt ? (
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDateTime(card.handledAt)}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* 锁提示 */}
        {isBlocking && !isHandled && card.lockReason ? (
          <div className="flex items-center gap-1.5 rounded-md bg-warning/10 px-3 py-1.5">
            <Clock className="size-3.5 text-warning" />
            <span className="text-xs text-warning-700">{card.lockReason}</span>
          </div>
        ) : null}
      </Card.Content>

      {!isHandled ? (
        <CardFooter className="flex gap-2 pt-0">
          <Button
            size="sm"
            variant="primary"
            isDisabled={isLocked}
            onPress={() => onAction?.({ type: "accept_lab", cardId: card.id })}
          >
            <Check className="size-3.5" />
            同意检验
          </Button>
          <Button
            size="sm"
            variant="outline"
            isDisabled={isLocked}
            onPress={() => onAction?.({ type: "veto_lab", cardId: card.id })}
          >
            暂不决定
          </Button>
          <Button
            size="sm"
            variant="ghost"
            isDisabled={isLocked}
            onPress={() => onAction?.({ type: "skip_lab", cardId: card.id })}
          >
            <X className="size-3.5" />
            不查
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
})
