import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

interface ContextSummaryBarProps {
  /** 患者姓名。 */
  patientName?: string
  /** 主诉。 */
  chiefComplaint?: string
  /** 点击展开完整 Drawer。 */
  onClick?: () => void
  className?: string
}

/**
 * 可折叠的上下文摘要条。
 *
 * 移动端默认折叠为单行，显示 "患者: {name} | 主诉: {complaint}"。
 * 点击调用 onClick 打开完整 ContextSummaryDrawer。
 */
export function ContextSummaryBar({
  patientName,
  chiefComplaint,
  onClick,
  className,
}: ContextSummaryBarProps) {
  const hasContext = patientName || chiefComplaint

  if (!hasContext) {
    return null
  }

  const parts: string[] = []
  if (patientName) parts.push(`患者: ${patientName}`)
  if (chiefComplaint) parts.push(`主诉: ${chiefComplaint}`)

  return (
    <button
      type="button"
      aria-label="查看问诊上下文详情"
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs text-muted-foreground",
        "bg-muted/50 hover:bg-muted/80 transition-colors",
        className,
      )}
      onClick={onClick}
    >
      <span className="truncate">{parts.join(" | ")}</span>
      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
    </button>
  )
}
