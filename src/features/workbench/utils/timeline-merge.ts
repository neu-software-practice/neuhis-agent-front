import type {
  FlowCard,
  FlowCardTimelineItem,
  SystemEventTimelineItem,
  TimelineItem,
} from "@/features/workbench/api"
import type { TerminalReason } from "@/lib/api/types"

/**
 * 将无限查询的 pages 扁平化为按 createdAt 升序排列的数组。
 */
export function flattenTimelinePages(
  pages: { items: TimelineItem[] }[],
): TimelineItem[] {
  return pages
    .flatMap((page) => page.items)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const createdAtDiff =
        timestampOf(a.item.createdAt) - timestampOf(b.item.createdAt)
      if (createdAtDiff !== 0) return createdAtDiff

      const rankDiff = timelineTieBreakRank(a.item) - timelineTieBreakRank(b.item)
      if (rankDiff !== 0) return rankDiff

      return a.index - b.index
    })
    .map(({ item }) => item)
}

function timestampOf(value: string): number {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function timelineTieBreakRank(item: TimelineItem): number {
  if (item.kind === "message") {
    return item.role === "patient" ? 0 : 1
  }
  if (item.kind === "flow_card") return 2
  if (item.kind === "system_event") return 3
  return 4
}

export function timelineItemsShareIdentity(
  current: TimelineItem,
  incoming: TimelineItem,
): boolean {
  if (current.id === incoming.id) return true

  if (
    current.kind === "message" &&
    incoming.kind === "message" &&
    current.sessionId === incoming.sessionId &&
    current.role === incoming.role
  ) {
    const currentKeys = new Set([current.id, current.localKey].filter(Boolean))
    const incomingKeys = [incoming.id, incoming.localKey].filter(Boolean)
    return incomingKeys.some((key) => currentKeys.has(key))
  }

  return (
    current.kind === "flow_card" &&
    incoming.kind === "flow_card" &&
    current.card.id === incoming.card.id
  )
}

/**
 * 创建乐观患者消息（status: "pending"）。
 */
export function createOptimisticPatientMessage(
  content: string,
  clientMessageId: string,
  sessionId: string,
): TimelineItem {
  return {
    kind: "message",
    id: clientMessageId,
    sessionId,
    createdAt: new Date().toISOString(),
    status: "pending",
    role: "patient",
    content,
    localKey: clientMessageId,
  }
}

/**
 * 创建流式 AI 消息占位（status: "streaming", content: ""）。
 */
export function createStreamingAssistantMessage(
  sessionId: string,
): TimelineItem {
  return {
    kind: "message",
    id: `stream-${generateClientMessageId()}`,
    sessionId,
    createdAt: new Date().toISOString(),
    status: "streaming",
    role: "assistant",
    content: "",
  }
}

/**
 * 追加 delta 文本到消息中。
 */
export function appendMessageDelta(
  item: TimelineItem,
  delta: string,
): TimelineItem {
  if (item.kind !== "message") return item
  return {
    ...item,
    content: item.content + delta,
  }
}

/**
 * 将流式消息标记为完成。
 */
export function finalizeStreamingMessage(
  item: TimelineItem,
  content: string,
): TimelineItem {
  if (item.kind !== "message") return item
  return {
    ...item,
    status: "done",
    content,
  }
}

/**
 * 在时间线中 upsert 流程卡（按 card.id 查找，存在则替换，不存在则追加）。
 */
export function upsertFlowCardItem(
  items: TimelineItem[],
  card: FlowCard,
): TimelineItem[] {
  const existingIndex = items.findIndex(
    (item): item is FlowCardTimelineItem =>
      item.kind === "flow_card" && item.card.id === card.id,
  )
  if (existingIndex >= 0) {
    const updated = [...items]
    updated[existingIndex] = {
      ...updated[existingIndex],
      card,
    } as FlowCardTimelineItem
    return updated
  }
  const newItem: FlowCardTimelineItem = {
    kind: "flow_card",
    id: card.id,
    sessionId: card.sessionId,
    createdAt: card.createdAt,
    status: "done",
    card,
  }
  return [...items, newItem]
}

/**
 * 创建系统事件。
 */
export function createSystemEventItem(
  sessionId: string,
  eventType: SystemEventTimelineItem["eventType"],
  title: string,
  description?: string,
): TimelineItem {
  return {
    kind: "system_event",
    id: `sys-${generateClientMessageId()}`,
    sessionId,
    createdAt: new Date().toISOString(),
    status: "done",
    eventType,
    title,
    ...(description ? { description } : {}),
  }
}

/**
 * 创建终止事件。
 */
export function createTerminalItem(
  sessionId: string,
  reason: TerminalReason,
  title: string,
  description?: string,
  suggestedDepartment?: string,
): TimelineItem {
  return {
    kind: "terminal",
    id: `term-${generateClientMessageId()}`,
    sessionId,
    createdAt: new Date().toISOString(),
    status: "done",
    reason,
    title,
    ...(description ? { description } : {}),
    ...(suggestedDepartment ? { suggestedDepartment } : {}),
  }
}

/**
 * 生成客户端消息 ID。
 */
export function generateClientMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
