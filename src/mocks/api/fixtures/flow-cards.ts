import type { FlowCard } from "@/features/workbench/api/timeline-types"

const baseTime = "2026-06-28T02:00:00.000Z"

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

export function createDiagnosisCard(sessionId: string, id: string): FlowCard {
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
    evidence: ["发热两天", "咽痛", "血常规白细胞轻度升高"],
    evidenceSources: ["history", "answer", "lab_result"],
    riskSignals: ["如出现呼吸困难、持续高热不退，应立即线下急诊。"],
  }
}

export function createTreatmentPlanCard(sessionId: string, id: string): FlowCard {
  return {
    id,
    sessionId,
    kind: "treatment_plan",
    status: "completed",
    blocking: false,
    title: "处置建议",
    createdAt: baseTime,
    plan: "medication",
    capability: "available",
    summary: "建议对症用药、补液休息，并观察 48 小时。",
    actions: ["退热止痛", "缓解咽痛", "观察体温"],
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
