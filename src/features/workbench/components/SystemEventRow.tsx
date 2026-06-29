import { memo } from "react"
import {
  Activity,
  Brain,
  CheckCircle,
  FlaskConical,
  LogOut,
  PauseCircle,
  Pill,
  RefreshCw,
  ShieldOff,
} from "lucide-react"

import type { SystemEventTimelineItem } from "@/features/workbench/api"

const eventIconMap: Record<
  SystemEventTimelineItem["eventType"],
  React.ComponentType<{ className?: string }>
> = {
  context_loaded: Activity,
  agent_thinking: Brain,
  lab_result_received: FlaskConical,
  payment_succeeded: CheckCircle,
  drug_purchased: Pill,
  follow_up_started: RefreshCw,
  emergency_dismissed: ShieldOff,
  exit_settled: LogOut,
  session_suspended: PauseCircle,
}

interface SystemEventRowProps {
  item: SystemEventTimelineItem
}

/**
 * 系统事件行。
 *
 * 居中显示，带事件类型对应图标，title 为主文本，description 为副文本。
 */
export const SystemEventRow = memo(function SystemEventRow({
  item,
}: SystemEventRowProps) {
  const Icon = eventIconMap[item.eventType]

  return (
    <div className="flex flex-col items-center justify-center gap-1 py-3">
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
        <span className="text-xs text-muted-foreground">{item.title}</span>
      </div>
      {item.description ? (
        <span className="text-[11px] text-muted-foreground/70">
          {item.description}
        </span>
      ) : null}
    </div>
  )
})
