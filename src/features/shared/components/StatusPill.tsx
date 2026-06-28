import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * 通用状态色调。仅表达视觉语义，不绑定任何业务状态枚举。
 * 业务状态（如就诊状态）由上层映射到这些 tone 后再传入。
 */
export type StatusTone = "default" | "muted" | "success" | "warning" | "danger" | "info"

interface StatusPillProps {
  /** 展示文案。 */
  label: string
  /** 视觉色调，默认 default。 */
  tone?: StatusTone
  /** 可选前置图标。 */
  icon?: ReactNode
  className?: string
}

const TONE_CLASS: Record<StatusTone, string> = {
  default: "bg-secondary text-secondary-foreground",
  muted: "bg-muted text-muted-foreground",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
}

/**
 * 通用状态标签。用于会话状态、终止原因等的轻量视觉标识。
 * 只接收已转换好的文案与 tone，不在内部解析业务枚举。
 */
export function StatusPill({ label, tone = "default", icon, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {icon}
      {label}
    </span>
  )
}
