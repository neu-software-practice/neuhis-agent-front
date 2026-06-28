import { memo } from "react"

import type { FlowCardAction, TimelineItem } from "@/features/workbench/api"
import { assertNever } from "@/lib/utils"
import { MessageBubble } from "@/features/workbench/components/MessageBubble"
import { SystemEventRow } from "@/features/workbench/components/SystemEventRow"
import { TerminalEventRow } from "@/features/workbench/components/TerminalEventRow"

/**
 * FlowCardRenderer 将在 P3.4 中创建。
 * 当前构建时可能因模块不存在而失败，属于预期行为。
 */
import { FlowCardRenderer } from "@/features/workbench/flow-cards/FlowCardRenderer"

interface TimelineRowProps {
  item: TimelineItem
  onAction?: (action: FlowCardAction) => void
}

/**
 * Timeline 行分发器。
 *
 * 根据 item.kind 分发到对应渲染组件。
 * 使用 assertNever 确保 union 新增成员时编译期报错。
 */
export const TimelineRow = memo(function TimelineRow({
  item,
  onAction,
}: TimelineRowProps) {
  switch (item.kind) {
    case "message":
      return <MessageBubble item={item} />
    case "flow_card":
      return <FlowCardRenderer card={item.card} onAction={onAction} />
    case "system_event":
      return <SystemEventRow item={item} />
    case "terminal":
      return <TerminalEventRow item={item} />
    default:
      return assertNever(item)
  }
})
