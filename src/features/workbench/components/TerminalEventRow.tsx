import { memo } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  LogOut,
  Siren,
} from "lucide-react"

import type { TerminalTimelineItem } from "@/features/workbench/api"

const reasonIconMap: Record<
  TerminalTimelineItem["reason"],
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  emergency: { icon: Siren, color: "text-red-500" },
  timeout: { icon: Clock, color: "text-orange-500" },
  ask_limit_reached: { icon: AlertTriangle, color: "text-amber-500" },
  lab_limit_reached: { icon: AlertTriangle, color: "text-amber-500" },
  referral: { icon: ArrowRight, color: "text-blue-500" },
  capability_insufficient: { icon: AlertTriangle, color: "text-amber-500" },
  exited: { icon: LogOut, color: "text-muted-foreground" },
  patient_request: { icon: LogOut, color: "text-muted-foreground" },
}

interface TerminalEventRowProps {
  item: TerminalTimelineItem
}

/**
 * 终诊事件行。
 *
 * 居中卡片式显示，带 reason 对应图标和颜色，title 为主文本，description 为副文本。
 * 转诊（referral）时额外显示 suggestedDepartment。
 */
export const TerminalEventRow = memo(function TerminalEventRow({
  item,
}: TerminalEventRowProps) {
  const { icon: Icon, color } = reasonIconMap[item.reason]

  return (
    <div className="mx-auto flex max-w-[320px] flex-col items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className={color}>
        <Icon className="size-5" />
      </div>
      <span className="text-center text-sm font-medium text-foreground">
        {item.title}
      </span>
      {item.description ? (
        <span className="text-center text-xs text-muted-foreground">
          {item.description}
        </span>
      ) : null}
      {item.suggestedDepartment ? (
        <span className="text-center text-xs font-medium text-blue-600">
          建议转至：{item.suggestedDepartment}
        </span>
      ) : null}
    </div>
  )
})
