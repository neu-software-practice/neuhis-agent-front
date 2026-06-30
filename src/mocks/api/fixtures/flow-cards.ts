import type { FlowCard } from "@/features/workbench/api/timeline-types"

const baseTime = "2026-06-28T02:00:00.000Z"
type TreatmentPlanKind = Extract<FlowCard, { kind: "treatment_plan" }>["plan"]

export function createLabDecisionCard(sessionId: string, id: string): FlowCard {
  return {
    id,
    sessionId,
    kind: "lab_decision",
    status: "pending",
    blocking: true,
    title: "建议进行血常规检验",
    createdAt: baseTime,
    lockReason: "需要先确认是否检验，AI 才能继续收敛诊断。",
    testItems: [
      {
        code: "CBC",
        name: "血常规",
        sampleType: "静脉血",
      },
    ],
    reason: "发热伴咽痛需要区分病毒感染、细菌感染及炎症程度。",
    differentialTargets: ["病毒性上呼吸道感染", "细菌性扁桃体炎"],
    estimatedFee: 35,
  }
}

export function createLabPaymentCard(sessionId: string, id: string): FlowCard {
  return {
    id,
    sessionId,
    kind: "payment",
    status: "pending",
    blocking: true,
    title: "检验费用确认",
    createdAt: baseTime,
    paymentId: `pay-${id}`,
    purpose: "lab",
    items: [{ name: "血常规", amount: 35, quantity: 1 }],
    totalAmount: 35,
    insuranceAmount: 20,
    selfPayAmount: 15,
    paymentStatus: "unpaid",
  }
}

export function createMedicationPaymentCard(
  sessionId: string,
  id: string,
): FlowCard {
  return {
    id,
    sessionId,
    kind: "payment",
    status: "pending",
    blocking: true,
    title: "药品费用确认",
    createdAt: baseTime,
    paymentId: `pay-${id}`,
    purpose: "medication",
    items: [
      { name: "对乙酰氨基酚片", amount: 18, quantity: 1 },
      { name: "含片", amount: 12, quantity: 1 },
    ],
    totalAmount: 30,
    insuranceAmount: 10,
    selfPayAmount: 20,
    paymentStatus: "unpaid",
  }
}

export function createCompletedLabExecutionCard(
  sessionId: string,
  id: string,
): FlowCard {
  return {
    id,
    sessionId,
    kind: "lab_execution",
    status: "completed",
    blocking: false,
    title: "血常规结果已回填",
    createdAt: baseTime,
    labOrderId: `lab-${id}`,
    executionStatus: "completed",
    resultSummary: "白细胞轻度升高，中性粒细胞比例偏高，提示细菌感染可能。",
    resultReturnedAt: baseTime,
  }
}

export function createDiagnosisCard(
  sessionId: string,
  id: string,
  options: { includeLabEvidence?: boolean } = {},
): FlowCard {
  const includeLabEvidence = options.includeLabEvidence ?? true
  return {
    id,
    sessionId,
    kind: "diagnosis",
    status: "completed",
    blocking: false,
    title: "初步诊断",
    createdAt: baseTime,
    diagnosis: "急性上呼吸道感染，细菌感染可能",
    confidence: "medium",
    evidence: includeLabEvidence
      ? ["发热两天", "咽痛", "血常规白细胞轻度升高"]
      : ["发热两天", "咽痛", "患者选择暂不进行检验"],
    evidenceSources: includeLabEvidence
      ? ["history", "answer", "lab_result"]
      : ["history", "answer"],
    riskSignals: ["如出现呼吸困难、持续高热不退，应立即线下急诊。"],
  }
}

export function createTreatmentPlanCard(
  sessionId: string,
  id: string,
  plan: TreatmentPlanKind = "medication",
): FlowCard {
  const planConfig: Record<
    TreatmentPlanKind,
    Pick<
      Extract<FlowCard, { kind: "treatment_plan" }>,
      "capability" | "summary" | "actions"
    >
  > = {
    medication: {
      capability: "available",
      summary: "建议对症用药、补液休息，并观察 48 小时。",
      actions: ["退热止痛", "缓解咽痛", "观察体温"],
    },
    treatment: {
      capability: "available",
      summary: "建议预约院内雾化治疗，并按到号后流程执行。",
      actions: ["预约雾化治疗", "确认到号", "开始治疗", "完成治疗"],
    },
    advice_only: {
      capability: "available",
      summary: "当前可先按保守医嘱观察，暂不进入药品或治疗执行。",
      actions: ["休息补液", "监测体温", "必要时复诊"],
    },
    referral: {
      capability: "unavailable",
      summary: "当前能力不足，建议转线下专科进一步评估。",
      actions: ["线下就医", "携带既往资料"],
    },
  }
  const config = planConfig[plan]
  return {
    id,
    sessionId,
    kind: "treatment_plan",
    status: "completed",
    blocking: false,
    title: "处置建议",
    createdAt: baseTime,
    plan,
    ...config,
  }
}

export function createTreatmentExecutionCard(
  sessionId: string,
  id: string,
): FlowCard {
  return {
    id,
    sessionId,
    kind: "treatment_execution",
    status: "pending",
    blocking: true,
    title: "雾化治疗执行",
    createdAt: baseTime,
    lockReason: "需要先完成治疗执行流程，AI 才能结束本次问诊。",
    treatmentName: "雾化吸入治疗",
    capability: "available",
    executionStatus: "pending",
    notices: ["治疗前请确认无明显呼吸困难", "治疗过程中如不适请立即告知护士"],
    availableActions: ["schedule", "cancel"],
  }
}

export function createMedicationFulfillmentCard(
  sessionId: string,
  id: string,
): FlowCard {
  return {
    id,
    sessionId,
    kind: "medication_fulfillment",
    status: "pending",
    blocking: true,
    title: "确认取药方式",
    createdAt: baseTime,
    medications: [
      {
        name: "对乙酰氨基酚片",
        spec: "0.5g*12片",
        quantity: 1,
        dosage: "发热或疼痛时服用，每次 1 片",
        days: 3,
        price: 18,
      },
      {
        name: "含片",
        spec: "12片/盒",
        quantity: 1,
        dosage: "咽痛时含服",
        days: 3,
        price: 12,
      },
    ],
    availableModes: ["pickup", "delivery"],
    fulfillmentStatus: "pending",
  }
}

export function createCompletedVisitCard(sessionId: string, id: string): FlowCard {
  return {
    id,
    sessionId,
    kind: "completed_visit",
    status: "completed",
    blocking: false,
    title: "本次问诊已完成",
    createdAt: baseTime,
    diagnosis: "急性上呼吸道感染，细菌感染可能",
    treatmentSummary: "已生成用药和观察建议。",
    followUpSuggestion: "若 48 小时后仍高热或症状加重，请发起复诊或线下就医。",
    completedAt: baseTime,
  }
}

export function createAdviceOnlyCard(sessionId: string, id: string): FlowCard {
  return {
    id,
    sessionId,
    kind: "advice_only",
    status: "completed",
    blocking: false,
    title: "健康建议",
    createdAt: baseTime,
    handledAt: baseTime,
    advices: [
      "多休息，保证充足睡眠",
      "多喝温水，每日饮水量建议 1500-2000ml",
      "清淡饮食，避免辛辣刺激食物",
    ],
    watchItems: [
      "如体温超过 38.5℃ 持续不退，请及时就医",
      "如出现呼吸困难、胸痛等新症状，请立即急诊",
    ],
    followUpRecommendation: "建议 3 天后复诊，如症状缓解可延至一周后。",
  }
}
