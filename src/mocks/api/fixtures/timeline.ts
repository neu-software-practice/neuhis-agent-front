import type { TimelineItem } from "@/features/workbench/api/timeline-types"

import {
  createAdviceOnlyCard,
  createCompletedLabExecutionCard,
  createCompletedVisitCard,
  createDiagnosisCard,
  createLabDecisionCard,
  createLabPaymentCard,
  createMedicationFulfillmentCard,
  createMedicationPaymentCard,
  createTreatmentExecutionCard,
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
    id: "tl-completed-006",
    sessionId: "visit-mock-completed",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-06-18T03:28:00.000Z",
    card: {
      ...createMedicationPaymentCard(
        "visit-mock-completed",
        "card-completed-med-pay",
      ),
      status: "paid",
      paymentStatus: "paid",
      blocking: false,
      handledAt: "2026-06-18T03:29:00.000Z",
    } as ReturnType<typeof createMedicationPaymentCard>,
  },
  {
    id: "tl-completed-007",
    sessionId: "visit-mock-completed",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-06-18T03:30:00.000Z",
    card: {
      ...createMedicationFulfillmentCard(
        "visit-mock-completed",
        "card-completed-fulfillment",
      ),
      status: "completed",
      blocking: false,
      fulfillmentStatus: "completed",
      handledAt: "2026-06-18T03:30:00.000Z",
    } as ReturnType<typeof createMedicationFulfillmentCard>,
  },
  {
    id: "tl-completed-008",
    sessionId: "visit-mock-completed",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-06-18T03:31:00.000Z",
    card: {
      ...createAdviceOnlyCard(
        "visit-mock-completed",
        "card-completed-advice",
      ),
      status: "completed",
      blocking: false,
      handledAt: "2026-06-18T03:31:00.000Z",
    } as ReturnType<typeof createAdviceOnlyCard>,
  },
  {
    id: "tl-completed-005",
    sessionId: "visit-mock-completed",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-06-18T03:32:00.000Z",
    card: createCompletedVisitCard(
      "visit-mock-completed",
      "card-completed-finished",
    ),
  },
]

/**
 * 截图专用时间线：包含全部 FlowCard 类型（9 种 kind × 多 variations = 13 张卡）。
 * 所有卡片均为已完成/只读状态，适合一次性截图展示全部卡片样式。
 */
export const mockScreenshotTimeline: TimelineItem[] = [
  // 0. 开场消息
  {
    id: "tl-ss-000",
    sessionId: "visit-mock-screenshot",
    kind: "message",
    status: "done",
    role: "patient",
    content: "发热两天，伴有咽痛、咳嗽。",
    createdAt: "2026-07-02T08:00:00.000Z",
  },
  {
    id: "tl-ss-001",
    sessionId: "visit-mock-screenshot",
    kind: "message",
    status: "done",
    role: "assistant",
    content: "我会为您进行问诊，请先确认是否需要进行检验。",
    createdAt: "2026-07-02T08:00:30.000Z",
  },
  // 1. lab_decision — 检验决策卡（accepted）
  {
    id: "tl-ss-002",
    sessionId: "visit-mock-screenshot",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-07-02T08:01:00.000Z",
    card: {
      ...createLabDecisionCard("visit-mock-screenshot", "card-ss-lab-decision"),
      status: "accepted",
      blocking: false,
      handledAt: "2026-07-02T08:01:30.000Z",
    } as ReturnType<typeof createLabDecisionCard>,
  },
  // 2. payment (lab) — 检验支付卡（paid）
  {
    id: "tl-ss-003",
    sessionId: "visit-mock-screenshot",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-07-02T08:02:00.000Z",
    card: {
      ...createLabPaymentCard("visit-mock-screenshot", "card-ss-lab-pay"),
      status: "paid",
      paymentStatus: "paid",
      blocking: false,
      handledAt: "2026-07-02T08:02:30.000Z",
    } as ReturnType<typeof createLabPaymentCard>,
  },
  // 3. lab_execution — 检验执行卡（completed）
  {
    id: "tl-ss-004",
    sessionId: "visit-mock-screenshot",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-07-02T08:03:00.000Z",
    card: createCompletedLabExecutionCard("visit-mock-screenshot", "card-ss-lab-exec"),
  },
  // 4. diagnosis — 诊断卡（completed）
  {
    id: "tl-ss-005",
    sessionId: "visit-mock-screenshot",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-07-02T08:04:00.000Z",
    card: createDiagnosisCard("visit-mock-screenshot", "card-ss-diagnosis"),
  },
  // 5. treatment_plan (medication) — 用药方案
  {
    id: "tl-ss-006",
    sessionId: "visit-mock-screenshot",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-07-02T08:05:00.000Z",
    card: createTreatmentPlanCard("visit-mock-screenshot", "card-ss-plan-med", "medication"),
  },
  // 6. treatment_plan (treatment) — 治疗执行方案
  {
    id: "tl-ss-007",
    sessionId: "visit-mock-screenshot",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-07-02T08:05:30.000Z",
    card: createTreatmentPlanCard("visit-mock-screenshot", "card-ss-plan-trt", "treatment"),
  },
  // 7. treatment_plan (advice_only) — 仅建议方案
  {
    id: "tl-ss-008",
    sessionId: "visit-mock-screenshot",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-07-02T08:06:00.000Z",
    card: createTreatmentPlanCard("visit-mock-screenshot", "card-ss-plan-adv", "advice_only"),
  },
  // 8. treatment_plan (referral) — 转诊方案
  {
    id: "tl-ss-009",
    sessionId: "visit-mock-screenshot",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-07-02T08:06:30.000Z",
    card: createTreatmentPlanCard("visit-mock-screenshot", "card-ss-plan-ref", "referral"),
  },
  // 9. payment (medication) — 药品支付卡（paid）
  {
    id: "tl-ss-010",
    sessionId: "visit-mock-screenshot",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-07-02T08:07:00.000Z",
    card: {
      ...createMedicationPaymentCard("visit-mock-screenshot", "card-ss-med-pay"),
      status: "paid",
      paymentStatus: "paid",
      blocking: false,
      handledAt: "2026-07-02T08:07:30.000Z",
    } as ReturnType<typeof createMedicationPaymentCard>,
  },
  // 10. medication_fulfillment — 取药确认卡（completed）
  {
    id: "tl-ss-011",
    sessionId: "visit-mock-screenshot",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-07-02T08:08:00.000Z",
    card: {
      ...createMedicationFulfillmentCard("visit-mock-screenshot", "card-ss-fulfill"),
      status: "completed",
      blocking: false,
      fulfillmentStatus: "completed",
      selectedMode: "pickup",
      handledAt: "2026-07-02T08:08:30.000Z",
    } as ReturnType<typeof createMedicationFulfillmentCard>,
  },
  // 11. treatment_execution — 治疗执行卡（completed）
  {
    id: "tl-ss-012",
    sessionId: "visit-mock-screenshot",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-07-02T08:09:00.000Z",
    card: {
      ...createTreatmentExecutionCard("visit-mock-screenshot", "card-ss-trt-exec"),
      status: "completed",
      blocking: false,
      executionStatus: "completed",
      appointmentAt: "2026-07-02T08:15:00.000Z",
      queueNo: "W-018",
      handledAt: "2026-07-02T08:30:00.000Z",
    } as ReturnType<typeof createTreatmentExecutionCard>,
  },
  // 12. advice_only — 健康建议卡（completed）
  {
    id: "tl-ss-013",
    sessionId: "visit-mock-screenshot",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-07-02T08:10:00.000Z",
    card: {
      ...createAdviceOnlyCard("visit-mock-screenshot", "card-ss-advice"),
      status: "completed",
      blocking: false,
      handledAt: "2026-07-02T08:10:30.000Z",
    } as ReturnType<typeof createAdviceOnlyCard>,
  },
  // 13. completed_visit — 问诊完成卡
  {
    id: "tl-ss-014",
    sessionId: "visit-mock-screenshot",
    kind: "flow_card",
    status: "done",
    createdAt: "2026-07-02T08:11:00.000Z",
    card: createCompletedVisitCard("visit-mock-screenshot", "card-ss-done"),
  },
]
