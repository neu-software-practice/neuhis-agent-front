import { memo } from "react"
import { Button, Card, CardFooter, CardHeader, Chip } from "@heroui/react"
import { Activity, Calendar, CheckCircle, CircleX, Clock } from "lucide-react"

import type { FlowCard, FlowCardAction } from "@/features/workbench/api"
import { formatDateTime } from "@/lib/time"
import { cn } from "@/lib/utils"

interface TreatmentExecutionCardProps {
  card: FlowCard & { kind: "treatment_execution" }
  disabled?: boolean
  onAction?: (action: FlowCardAction) => void
}

const executionStatusConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  pending: { label: "待处理", icon: Clock, color: "text-muted-foreground" },
  scheduled: { label: "已预约", icon: Calendar, color: "text-primary" },
  arrived: { label: "已到号", icon: CheckCircle, color: "text-success" },
  in_progress: { label: "执行中", icon: Activity, color: "text-primary" },
  completed: { label: "已完成", icon: CheckCircle, color: "text-success" },
  canceled: { label: "已取消", icon: CircleX, color: "text-muted-foreground" },
}

const capabilityLabels: Record<string, string> = {
  available: "本院可执行",
  limited: "部分可执行",
  unavailable: "需转诊",
}

const actionLabels: Record<string, string> = {
  schedule: "预约",
  confirm_arrival: "确认到号",
  start: "开始执行",
  complete: "确认完成",
  cancel: "取消",
}

/**
 * 治疗执行卡片。
 *
 * 展示治疗执行进度，患者可按需操作。
 * - 根据 availableActions 动态渲染操作按钮
 * - executionStatus 展示当前进度状态
 */
export const TreatmentExecutionCard = memo(
  function TreatmentExecutionCard({
    card,
    disabled,
    onAction,
  }: TreatmentExecutionCardProps) {
    const config = executionStatusConfig[card.executionStatus]
    const Icon = config?.icon ?? Activity
    const isCompleted = card.executionStatus === "completed"
    const canAct =
      !isCompleted &&
      card.status !== "completed" &&
      card.status !== "failed" &&
      card.status !== "invalidated" &&
      card.availableActions.length > 0
    const isLocked = disabled || !canAct

    return (
      <Card className="w-full border border-divider bg-info-foreground">
        <CardHeader className="flex items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span className="text-sm font-medium">
              {card.title}
              {card.treatmentName ? (
                <span className="ml-1 text-xs text-muted-foreground">
                  - {card.treatmentName}
                </span>
              ) : null}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {formatDateTime(card.createdAt)}
          </span>
        </CardHeader>

        <Card.Content className="space-y-3 pb-2 pt-0">
          {/* 执行能力 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">执行能力：</span>
            <Chip
              size="sm"
              variant="tertiary"
              color={
                card.capability === "available"
                  ? "success"
                  : card.capability === "limited"
                    ? "warning"
                    : "danger"
              }
            >
              {capabilityLabels[card.capability] ?? card.capability}
            </Chip>
          </div>

          {/* 执行状态 */}
          <div className="flex items-center gap-2">
            {Icon ? (
              <Icon className={cn("size-4", config?.color ?? "text-muted-foreground")} />
            ) : null}
            <span className="text-sm">状态：{config?.label ?? card.executionStatus}</span>
          </div>

          {/* 预约信息 */}
          {card.appointmentAt ? (
            <div className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-sm">
              <Calendar className="size-4 text-primary" />
              <span>
                预约时间：
                <span className="font-medium">
                  {formatDateTime(card.appointmentAt)}
                </span>
              </span>
            </div>
          ) : null}

          {/* 排队号 */}
          {card.queueNo ? (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-muted-foreground" />
              <span>
                排队号：<span className="font-medium">{card.queueNo}</span>
              </span>
            </div>
          ) : null}

          {/* 通知列表 */}
          {card.notices.length > 0 ? (
            <div className="rounded-md bg-muted/30 px-3 py-2">
              <span className="text-xs font-medium text-foreground/70">注意事项</span>
              <ul className="mt-1 space-y-0.5">
                {card.notices.map((notice, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-1.5 text-xs text-muted-foreground"
                  >
                    <span className="mt-0.5 block size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                    <span>{notice}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* 已完成 */}
          {isCompleted && card.handledAt ? (
            <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm">
              <CheckCircle className="size-4 text-success" />
              <span className="text-success">治疗已完成</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDateTime(card.handledAt)}
              </span>
            </div>
          ) : null}
        </Card.Content>

        {canAct ? (
          <CardFooter className="flex flex-wrap gap-2 pt-0">
            {card.availableActions.map((action) => {
              const isDestructive = action === "cancel"
              return (
                <Button
                  key={action}
                  size="sm"
                  variant={isDestructive ? "danger" : "primary"}
                  isDisabled={isLocked}
                  onPress={() =>
                    onAction?.({
                      type: "submit_treatment_execution",
                      cardId: card.id,
                      action,
                    })
                  }
                >
                  {actionLabels[action] ?? action}
                </Button>
              )
            })}
          </CardFooter>
        ) : null}
      </Card>
    )
  },
)
