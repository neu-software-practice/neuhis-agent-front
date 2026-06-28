import { Lock } from "lucide-react"

import { cn } from "@/lib/utils"

interface LockBarProps {
  lockReason?: string
  visible?: boolean
  onReportEmergency: () => void
  onAskQuestion: () => void
  className?: string
}

/**
 * 阻断状态栏。
 *
 * 当有阻断卡片待处理时，显示在输入区上方。
 * - 锁图标 + 阻断原因
 * - "我现在很不舒服"（红色轮廓）→ 上报急症
 * - "我有疑问"（次要轮廓）→ 打开疑问输入
 */
export function LockBar({
  lockReason,
  visible = false,
  onReportEmergency,
  onAskQuestion,
  className,
}: LockBarProps) {
  if (!visible) return null

  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 border-t border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/60",
        className,
      )}
    >
      {/* 锁原因 */}
      <div className="mb-2 flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
        <Lock className="size-4" />
        <span>{lockReason ?? "有操作待处理"}</span>
      </div>

      {/* 逃生按钮 */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onReportEmergency}
          className={cn(
            "flex-1 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium",
            "text-red-600 transition-colors hover:bg-red-50",
            "dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/40",
            "cursor-pointer",
          )}
        >
          我现在很不舒服
        </button>
        <button
          type="button"
          onClick={onAskQuestion}
          className={cn(
            "flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium",
            "text-foreground transition-colors hover:bg-muted",
            "cursor-pointer",
          )}
        >
          我有疑问
        </button>
      </div>
    </div>
  )
}
