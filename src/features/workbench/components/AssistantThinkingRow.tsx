import { Brain } from "lucide-react"

interface AssistantThinkingRowProps {
  visible?: boolean
}

/**
 * AI 正在分析指示器。
 *
 * 当 visible 为 true 时，显示 Brain 图标 + "AI 正在分析..." 脉冲动画。
 */
export function AssistantThinkingRow({ visible = false }: AssistantThinkingRowProps) {
  if (!visible) return null

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Brain className="size-4 animate-pulse text-muted-foreground" />
      <span className="animate-pulse text-sm text-muted-foreground">
        AI 正在分析...
      </span>
    </div>
  )
}
