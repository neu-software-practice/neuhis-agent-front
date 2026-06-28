import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  /** 主标题文案。 */
  title: string
  /** 可选补充描述。 */
  description?: string
  /** 可选图标插槽。 */
  icon?: ReactNode
  /** 可选操作区，例如重试按钮或主行动按钮。 */
  action?: ReactNode
  className?: string
}

/**
 * 通用空态 / 占位组件：用于列表为空、筛选无结果或页面骨架占位。
 *
 * 不区分具体业务语义，文案与动作由调用方传入。
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <p className="text-base font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
