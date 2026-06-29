import { Pause, Play, ShieldAlert, X } from "lucide-react"

import { cn } from "@/lib/utils"

interface WorkbenchHeaderProps {
  /** AI 医生名称，默认 "AI 医生助手"。 */
  aiName?: string
  /** 头像 URL 或首字母。 */
  aiAvatar?: string
  /** 超时警告文案（例如 "剩余 5 分钟"），非空时显示红色警告并可能挤压暂停按钮。 */
  timeoutWarning?: string
  /** 计时是否已暂停。 */
  timerPaused?: boolean
  /** 暂停计时回调。 */
  onPause?: () => void
  /** 恢复计时回调。 */
  onResume?: () => void
  /** 患者主动上报急症回调（盾牌按钮）。 */
  onReportEmergency?: () => void
  /** 退出问诊回调。 */
  onExit?: () => void
  className?: string
}

/**
 * 工作台顶部栏。
 *
 * 移动端（375pt 基线，可用宽度约 345pt）：
 * - 左侧：AI 头像 + 名称（约 120pt）
 * - 右侧优先级：超时警告（红色，约 140pt）> 暂停按钮（约 48pt）> 盾牌图标 > 退出按钮
 * PC（>=768px）：所有元素同时可见，无互斥。
 */
export function WorkbenchHeader({
  aiName = "AI 医生助手",
  aiAvatar,
  timeoutWarning,
  timerPaused = false,
  onPause,
  onResume,
  onReportEmergency,
  onExit,
  className,
}: WorkbenchHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-14 items-center justify-between gap-2 px-4",
        className,
      )}
    >
      {/* 左侧：头像 + 名称 */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {aiAvatar ?? aiName.charAt(0)}
        </div>
        <span className="truncate text-sm font-medium">{aiName}</span>
      </div>

      {/* 右侧：操作区 */}
      <div className="flex items-center gap-1">
        {/* 超时警告：移动端在有警告文字时优先显示 */}
        {timeoutWarning ? (
          <span className="truncate text-xs font-medium text-danger whitespace-nowrap max-w-[140px]">
            {timeoutWarning}
          </span>
        ) : null}

        {/* 暂停/恢复按钮 */}
        {timerPaused ? (
          <button
            type="button"
            aria-label="恢复计时"
            title="恢复计时"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onResume}
          >
            <Play className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="暂停计时"
            title="暂停计时"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onPause}
          >
            <Pause className="h-4 w-4" />
          </button>
        )}

        {/* 急症求助：始终可见，点击患者主动上报不适 */}
        <button
          type="button"
          aria-label="急症求助"
          title="急症求助"
          className="flex h-9 items-center justify-center gap-1 rounded-full px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onReportEmergency}
        >
          <ShieldAlert className="h-4 w-4" />
          <span className="text-xs font-medium">急症</span>
        </button>

        {/* 退出按钮 */}
        <button
          type="button"
          aria-label="退出问诊"
          title="退出问诊"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onExit}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
