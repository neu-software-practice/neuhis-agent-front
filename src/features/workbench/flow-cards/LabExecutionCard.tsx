import { memo } from "react"
import { Card, CardHeader } from "@heroui/react"
import { CheckCircle, FlaskConical, Loader } from "lucide-react"

import type { FlowCard } from "@/features/workbench/api"
import { formatDateTime } from "@/lib/time"
import { cn } from "@/lib/utils"

interface LabExecutionCardProps {
  card: FlowCard & { kind: "lab_execution" }
  disabled?: boolean
}

const executionStatusConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  waiting_payment: { label: "待缴费", icon: Loader, color: "text-warning" },
  queued: { label: "排队中", icon: Loader, color: "text-primary" },
  collecting: { label: "采集中", icon: Loader, color: "text-primary" },
  testing: { label: "检验中", icon: Loader, color: "text-primary" },
  result_ready: { label: "结果已出", icon: CheckCircle, color: "text-success" },
  completed: { label: "已完成", icon: CheckCircle, color: "text-success" },
}

const statusSteps = [
  { key: "waiting_payment", label: "缴费" },
  { key: "queued", label: "排队" },
  { key: "collecting", label: "采集" },
  { key: "testing", label: "检验" },
  { key: "result_ready", label: "出结果" },
] as const

function getActiveStepIndex(status: string): number {
  const order = [
    "waiting_payment",
    "queued",
    "collecting",
    "testing",
    "result_ready",
    "completed",
  ]
  const idx = order.indexOf(status)
  return idx >= 0 ? idx : order.length - 1
}

/**
 * 检验执行卡片。
 *
 * 展示检验执行状态流转，信息型卡片，无需患者操作。
 */
export const LabExecutionCard = memo(function LabExecutionCard({
  card,
}: LabExecutionCardProps) {
  const config = executionStatusConfig[card.executionStatus]
  const Icon = config?.icon ?? Loader
  const activeStep = getActiveStepIndex(card.executionStatus)

  return (
    <Card className="w-full border border-divider">
      <CardHeader className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-primary" />
          <span className="text-sm font-medium">{card.title}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {formatDateTime(card.createdAt)}
        </span>
      </CardHeader>

      <Card.Content className="space-y-3 pb-2 pt-0">
        {/* 执行状态 */}
        <div className="flex items-center gap-2">
          {Icon ? (
            <Icon className={cn("size-4", config?.color ?? "text-muted-foreground")} />
          ) : null}
          <span className="text-sm">
            当前状态：
            <span className="font-medium">
              {config?.label ?? card.executionStatus}
            </span>
          </span>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center gap-1">
          {statusSteps.map((step, idx) => {
            const isCompleted = idx < activeStep
            const isCurrent = idx === activeStep

            return (
              <div key={step.key} className="flex items-center gap-1">
                <div
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
                    isCompleted
                      ? "bg-success text-white"
                      : isCurrent
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="size-3.5" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px]",
                    isCurrent
                      ? "font-medium text-foreground"
                      : isCompleted
                        ? "text-muted-foreground"
                        : "text-muted-foreground/50",
                  )}
                >
                  {step.label}
                </span>
                {idx < statusSteps.length - 1 ? (
                  <div
                    className={cn(
                      "mx-0.5 h-px w-4",
                      idx < activeStep ? "bg-success" : "bg-muted",
                    )}
                  />
                ) : null}
              </div>
            )
          })}
        </div>

        {/* 结果摘要 */}
        {card.resultSummary ? (
          <div className="rounded-md bg-muted/30 px-3 py-2">
            <span className="text-xs font-medium text-foreground/70">检验结果</span>
            <p className="mt-0.5 text-sm text-foreground/80">
              {card.resultSummary}
            </p>
            {card.resultReturnedAt ? (
              <span className="mt-1 block text-[11px] text-muted-foreground">
                结果返回时间：{formatDateTime(card.resultReturnedAt)}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* 已完成时间 */}
        {card.executionStatus === "completed" && card.handledAt ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="size-3.5 text-success" />
            <span>完成于 {formatDateTime(card.handledAt)}</span>
          </div>
        ) : null}
      </Card.Content>
    </Card>
  )
})
