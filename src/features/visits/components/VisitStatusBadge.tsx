import type { VisitStatus } from "@/lib/api/types"
import { StatusPill } from "@/features/shared/components/StatusPill"

/**
 * VisitStatus → StatusPill tone 映射。
 */
const STATUS_TONE: Record<
  VisitStatus,
  "default" | "muted" | "success" | "warning" | "danger" | "info"
> = {
  loading_context: "default",
  chatting: "info",
  analyzing: "info",
  blocked: "warning",
  diagnosis: "warning",
  treatment: "warning",
  completed: "success",
  suspended: "warning",
  transferred: "muted",
  emergency_terminated: "muted",
  exited: "muted",
}

/**
 * VisitStatus → 中文展示文案。
 */
const STATUS_LABEL: Record<VisitStatus, string> = {
  loading_context: "加载中",
  chatting: "问诊中",
  analyzing: "分析中",
  blocked: "待决策",
  diagnosis: "已确诊",
  treatment: "处置中",
  completed: "已完成",
  suspended: "已暂停",
  transferred: "已转诊",
  emergency_terminated: "急症终止",
  exited: "已退出",
}

interface VisitStatusBadgeProps {
  /** 就诊状态枚举值。 */
  status: VisitStatus
  className?: string
}

/**
 * 就诊状态标签。
 *
 * 将 VisitStatus 枚举映射为 StatusPill 的视觉色调和中文文案，
 * 不直接暴露业务枚举到 UI 展示层。
 */
export function VisitStatusBadge({ status, className }: VisitStatusBadgeProps) {
  return (
    <StatusPill
      label={STATUS_LABEL[status]}
      tone={STATUS_TONE[status]}
      className={className}
    />
  )
}
