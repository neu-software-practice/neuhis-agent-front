import type { TimelineItem } from "@/features/workbench/api/timeline-types"

import {
  createCompletedVisitCard,
  createDiagnosisCard,
  createLabPaymentCard,
  createTreatmentPlanCard,
} from "@/mocks/api/fixtures/flow-cards"

export const mockActiveTimeline: TimelineItem[] = [
  {
    id: "tl-active-001",
    sessionId: "visit-mock-active",
    kind: "system_event",
    status: "done",
    createdAt: "2026-06-28T01:50:00.000Z",
    eventType: "context_loaded",
    title: "已读取患者上下文",
    description: "包含过敏史、长期用药和近期就诊摘要。",
  },
  {
    id: "tl-active-002",
    sessionId: "visit-mock-active",
    kind: "message",
    status: "done",
    role: "patient",
    content: "发热两天，伴有咽痛。",
    createdAt: "2026-06-28T01:51:00.000Z",
  },
  {
    id: "tl-active-003",
    sessionId: "visit-mock-active",
    kind: "message",
    status: "done",
    role: "assistant",
    content: "我会先确认几个关键信息：体温最高多少度？是否咳嗽、胸闷或呼吸困难？",
    createdAt: "2026-06-28T01:52:00.000Z",
  },
]

export const mockCompletedTimeline: TimelineItem[] = [
  {
    id: "tl-completed-001",
    sessionId: "visit-mock-completed",
    kind: "message",
    status: "done",
    role: "patient",
    content: "咽痛、低热一天。",
    createdAt: "2026-06-18T02:35:00.000Z",
  },
  {
    id: "tl-completed-002",
    sessionId: "visit-mock-completed",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-06-18T03:10:00.000Z",
    card: {
      ...createLabPaymentCard("visit-mock-completed", "card-completed-lab-pay"),
      status: "paid",
      paymentStatus: "paid",
      blocking: false,
      handledAt: "2026-06-18T03:12:00.000Z",
    } as ReturnType<typeof createLabPaymentCard>,
  },
  {
    id: "tl-completed-003",
    sessionId: "visit-mock-completed",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-06-18T03:20:00.000Z",
    card: createDiagnosisCard("visit-mock-completed", "card-completed-diagnosis"),
  },
  {
    id: "tl-completed-004",
    sessionId: "visit-mock-completed",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-06-18T03:25:00.000Z",
    card: createTreatmentPlanCard("visit-mock-completed", "card-completed-plan"),
  },
  {
    id: "tl-completed-005",
    sessionId: "visit-mock-completed",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-06-18T03:30:00.000Z",
    card: createCompletedVisitCard(
      "visit-mock-completed",
      "card-completed-finished",
    ),
  },
]
