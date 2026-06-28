import type { z } from "zod"

import type {
  assistantStreamEventSchema,
  flowCardKindSchema,
  flowCardSchema,
  flowCardStatusSchema,
  flowCardTimelineItemSchema,
  messageTimelineItemSchema,
  systemEventTimelineItemSchema,
  terminalTimelineItemSchema,
  timelineItemSchema,
  timelineItemStatusSchema,
} from "@/features/workbench/api/timeline-schemas"

export type FlowCardKind = z.infer<typeof flowCardKindSchema>
export type FlowCardStatus = z.infer<typeof flowCardStatusSchema>
export type FlowCard = z.infer<typeof flowCardSchema>
export type TimelineItemStatus = z.infer<typeof timelineItemStatusSchema>
export type TimelineItem = z.infer<typeof timelineItemSchema>
export type MessageTimelineItem = z.infer<typeof messageTimelineItemSchema>
export type FlowCardTimelineItem = z.infer<typeof flowCardTimelineItemSchema>
export type SystemEventTimelineItem = z.infer<typeof systemEventTimelineItemSchema>
export type TerminalTimelineItem = z.infer<typeof terminalTimelineItemSchema>
export type AssistantStreamEvent = z.infer<typeof assistantStreamEventSchema>
