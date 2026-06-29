import { memo } from "react"
import { Button } from "@heroui/react"
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Download,
  LogOut,
  Siren,
} from "lucide-react"

import type { TerminalTimelineItem } from "@/features/workbench/api"
import { cn } from "@/lib/utils"

interface TerminalCardProps {
  card: TerminalTimelineItem
  disabled?: boolean
}

const reasonIconMap: Record<
  TerminalTimelineItem["reason"],
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  emergency: { icon: Siren, color: "text-danger", bg: "bg-danger-foreground" },
  timeout: { icon: Clock, color: "text-warning", bg: "bg-warning-foreground" },
  ask_limit_reached: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning-foreground",
  },
  lab_limit_reached: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning-foreground",
  },
  referral: { icon: ArrowRight, color: "text-info", bg: "bg-info-foreground" },
  capability_insufficient: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning-foreground",
  },
  exited: { icon: LogOut, color: "text-muted-foreground", bg: "bg-muted/20" },
}

/**
 * 终诊卡片。
 *
 * 与 TerminalEventRow 样式一致但独立为卡片组件，
 * 带 reason 对应图标和颜色，提供"保存问诊摘要"操作。
 */
export const TerminalCard = memo(function TerminalCard({
  card,
  disabled,
}: TerminalCardProps) {
  const config = reasonIconMap[card.reason]
  const Icon = config?.icon ?? AlertTriangle

  return (
    <div
      className={cn(
        "mx-auto flex max-w-[320px] flex-col items-center gap-3 rounded-lg border px-5 py-4",
        config?.bg ?? "bg-muted/30",
        "border-border",
      )}
    >
      <div className={config?.color ?? "text-muted-foreground"}>
        <Icon className="size-6" />
      </div>
      <span className="text-center text-sm font-medium text-foreground">
        {card.title}
      </span>
      {card.description ? (
        <span className="text-center text-xs text-muted-foreground">
          {card.description}
        </span>
      ) : null}
      {card.suggestedDepartment ? (
        <span className="text-center text-xs font-medium text-info">
          建议转至：{card.suggestedDepartment}
        </span>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        isDisabled={disabled}
        onPress={() => {
          // 保存问诊摘要（占位）
          console.log("Save summary requested for terminal card", card.id)
        }}
      >
        <Download className="size-3.5" />
        保存问诊摘要
      </Button>
    </div>
  )
})
