import { createApiError, throwApiError } from "@/lib/api/errors"
import type {
  PatientId,
  SessionId,
  TerminalReason,
  VisitStatus,
} from "@/lib/api/types"
import type { PatientContext, PatientProfile } from "@/features/patient/api/types"
import {
  parsePatientContext,
  parsePatientProfile,
  parseVerifyIdentityResult,
} from "@/features/patient/api/schemas"
import type {
  CreateFollowUpInput,
  CreateSessionInput,
  CreateSessionResult,
  ListSessionsInput,
  VisitSession,
  VisitSnapshot,
} from "@/features/visits/api/types"
import {
  parseCreateSessionResult,
  parseListSessionsResult,
  parseVisitSession,
  parseVisitSnapshot,
} from "@/features/visits/api/schemas"
import type {
  AckAdviceInput,
  ClassifyIntentInput,
  ClassifyIntentResult,
  EmergencyRecheckResult,
  ExitSettlementResult,
  ExitVisitInput,
  FlowActionResult,
  ListTimelineInput,
  ReportVitalsInput,
  SendMessageInput,
  SendMessageResult,
  SubmitFulfillmentInput,
  SubmitLabDecisionInput,
  SubmitPaymentInput,
  SubmitTreatmentExecutionInput,
} from "@/features/workbench/api/types"
import type { FlowCard, TimelineItem } from "@/features/workbench/api/timeline-types"
import {
  parseFlowActionResult,
  parseListTimelineResult,
  parseSendMessageResult,
  parseExitSettlementResult,
} from "@/features/workbench/api/schemas"
import {
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
import { mockPatient, mockPatientContext } from "@/mocks/api/fixtures/patient"
import {
  mockActiveTimeline,
  mockCompletedTimeline,
} from "@/mocks/api/fixtures/timeline"
import {
  mockActiveSession,
  mockCompletedSession,
} from "@/mocks/api/fixtures/visits"

interface EmergencyRestorePoint {
  status: VisitStatus
  activeCardId?: string
}

interface MockDbState {
  patients: Record<PatientId, PatientProfile>
  contexts: Record<PatientId, PatientContext>
  sessions: Record<SessionId, VisitSession>
  timelines: Record<SessionId, TimelineItem[]>
  // 急症误报恢复点：进入 emergency_terminated 前的可恢复状态。
  // dismissEmergency 据此把会话还原到急症发生前。
  emergencyRestore: Record<SessionId, EmergencyRestorePoint>
  nextId: number
}

type MockTreatmentPlan = Extract<FlowCard, { kind: "treatment_plan" }>["plan"]

function clone<T>(value: T): T {
  return structuredClone(value)
}

function nowIso() {
  return new Date().toISOString()
}

// 种子活跃会话的时间戳在 fixture 里是写死的绝对时间，随真实日期推移会立即「空闲超时」，
// 一进工作台就触发挂起 Overlay。这里在每次初始化 mock 状态时把它重置成相对当前
// 时间（刚开始问诊，最后操作就在 1 分钟前），保证 mock 走查长期有效。
function seedActiveSession(): VisitSession {
  const session = clone(mockActiveSession)
  const now = Date.now()
  session.startedAt = new Date(now - 5 * 60_000).toISOString()
  session.updatedAt = new Date(now - 1 * 60_000).toISOString()
  session.lastActivityAt = new Date(now - 1 * 60_000).toISOString()
  return session
}

function createInitialState(): MockDbState {
  return {
    patients: {
      [mockPatient.id]: clone(mockPatient),
    },
    contexts: {
      [mockPatient.id]: clone(mockPatientContext),
    },
    sessions: {
      [mockActiveSession.id]: seedActiveSession(),
      [mockCompletedSession.id]: clone(mockCompletedSession),
    },
    timelines: {
      [mockActiveSession.id]: clone(mockActiveTimeline),
      [mockCompletedSession.id]: clone(mockCompletedTimeline),
    },
    emergencyRestore: {},
    nextId: 1,
  }
}

class MockDb {
  private state = createInitialState()

  reset() {
    this.state = createInitialState()
  }

  verifyIdentity() {
    return parseVerifyIdentityResult({
      patient: this.state.patients[mockPatient.id],
      readableScopes: ["profile", "history", "allergies", "medications"],
      verifiedAt: nowIso(),
    })
  }

  getPatientContext(patientId: PatientId) {
    const context = this.state.contexts[patientId]
    if (!context) {
      throwApiError(
        createApiError({
          code: "PATIENT_NOT_FOUND",
          message: "未找到患者信息",
          status: 404,
          retriable: false,
        }),
      )
    }

    return parsePatientContext(clone(context))
  }

  updatePatientProfile(input: {
    patientId: PatientId
    allergies?: string[]
    chronicDiseases?: string[]
    longTermMedications?: string[]
    medicalHistory?: string[]
  }) {
    const patient = this.state.patients[input.patientId]
    if (!patient) {
      throwApiError(
        createApiError({
          code: "PATIENT_NOT_FOUND",
          message: "未找到患者信息",
          status: 404,
          retriable: false,
        }),
      )
    }

    const updated = parsePatientProfile({
      ...patient,
      allergies: input.allergies ?? patient.allergies,
      chronicDiseases: input.chronicDiseases ?? patient.chronicDiseases,
      longTermMedications:
        input.longTermMedications ?? patient.longTermMedications,
      updatedAt: nowIso(),
    })
    this.state.patients[input.patientId] = updated
    this.state.contexts[input.patientId] = {
      ...this.state.contexts[input.patientId],
      patient: updated,
      allergies: updated.allergies,
      longTermMedications: updated.longTermMedications,
      medicalHistory:
        input.medicalHistory ??
        this.state.contexts[input.patientId].medicalHistory,
    }

    return clone(updated)
  }

  listSessions(input: ListSessionsInput) {
    const pageSize = input.pageSize ?? 20
    const sessions = Object.values(this.state.sessions)
      .filter((session) => !input.patientId || session.patientId === input.patientId)
      .filter((session) => !input.status || session.status === input.status)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((session) => ({
        id: session.id,
        patientId: session.patientId,
        entryType: session.entryType,
        status: session.status,
        startedAt: session.startedAt,
        updatedAt: session.updatedAt,
        endedAt: session.endedAt,
        parentSessionId: session.parentSessionId,
        terminalReason: session.terminalReason,
        summary: session.summary,
      }))

    return parseListSessionsResult({
      items: sessions.slice(0, pageSize),
      hasMore: sessions.length > pageSize,
      nextCursor: sessions.length > pageSize ? sessions[pageSize].id : undefined,
    })
  }

  getSession(sessionId: SessionId) {
    return parseVisitSession(clone(this.requireSession(sessionId)))
  }

  createSession(input: CreateSessionInput): CreateSessionResult {
    const sessionId = this.id("visit")
    const createdAt = nowIso()
    const session: VisitSession = {
      id: sessionId,
      patientId: input.patientId,
      entryType: "new",
      status: "chatting",
      startedAt: createdAt,
      updatedAt: createdAt,
      lastActivityAt: createdAt,
      askRound: input.chiefComplaint ? 1 : 0,
      askRoundLimit: 6,
      labRound: 0,
      labRoundLimit: 2,
      timerPaused: false,
      summary: {
        chiefComplaint: input.chiefComplaint,
        lastMessage: input.chiefComplaint ?? "已创建新问诊。",
      },
    }

    const initialTimeline: TimelineItem[] = [
      {
        id: this.id("tl"),
        sessionId,
        kind: "system_event",
        status: "done",
        createdAt,
        eventType: "context_loaded",
        title: "已读取患者上下文",
      },
    ]

    if (input.chiefComplaint) {
      initialTimeline.push({
        id: this.id("tl"),
        sessionId,
        kind: "message",
        status: "done",
        role: "patient",
        content: input.chiefComplaint,
        createdAt,
      })
    }

    this.state.sessions[sessionId] = session
    this.state.timelines[sessionId] = initialTimeline

    return parseCreateSessionResult({ session, initialTimeline })
  }

  createFollowUp(input: CreateFollowUpInput): CreateSessionResult {
    this.requireSession(input.parentSessionId)
    const sessionId = this.id("visit")
    const createdAt = nowIso()
    const session: VisitSession = {
      id: sessionId,
      patientId: input.patientId,
      entryType: "follow_up",
      status: "chatting",
      startedAt: createdAt,
      updatedAt: createdAt,
      lastActivityAt: createdAt,
      askRound: input.chiefComplaint ? 1 : 0,
      askRoundLimit: 6,
      labRound: 0,
      labRoundLimit: 2,
      parentSessionId: input.parentSessionId,
      timerPaused: false,
      summary: {
        chiefComplaint: input.chiefComplaint,
        lastMessage: input.chiefComplaint ?? "已基于上次记录创建复诊。",
      },
    }

    const initialTimeline: TimelineItem[] = [
      {
        id: this.id("tl"),
        sessionId,
        kind: "system_event",
        status: "done",
        createdAt,
        eventType: "follow_up_started",
        title: "已创建复诊",
        description: `已引用上次会话 ${input.parentSessionId} 的诊疗摘要。`,
      },
    ]

    if (input.chiefComplaint) {
      initialTimeline.push({
        id: this.id("tl"),
        sessionId,
        kind: "message",
        status: "done",
        role: "patient",
        content: input.chiefComplaint,
        createdAt,
      })
    }

    this.state.sessions[sessionId] = session
    this.state.timelines[sessionId] = initialTimeline

    return parseCreateSessionResult({ session, initialTimeline })
  }

  getReadonlySnapshot(sessionId: SessionId): VisitSnapshot {
    const session = this.requireSession(sessionId)
    return parseVisitSnapshot({
      session,
      timeline: this.state.timelines[sessionId] ?? [],
      readonly: true,
      terminalReason: session.terminalReason,
    })
  }

  listTimeline(input: ListTimelineInput) {
    this.requireSession(input.sessionId)
    const pageSize = input.pageSize ?? 50
    const items = this.state.timelines[input.sessionId] ?? []
    return parseListTimelineResult({
      items: clone(items).slice(-pageSize),
      hasMore: items.length > pageSize,
      nextCursor: items.length > pageSize ? items[0].id : undefined,
    })
  }

  sendMessage(input: SendMessageInput): SendMessageResult {
    const session = this.requireSession(input.sessionId)
    const createdAt = nowIso()
    const patientMessage: TimelineItem = {
      id: this.id("tl"),
      localKey: input.clientMessageId,
      sessionId: input.sessionId,
      kind: "message",
      status: "done",
      role: "patient",
      content: input.content,
      createdAt,
    }
    const assistantPlaceholder: TimelineItem = {
      id: this.id("tl"),
      sessionId: input.sessionId,
      kind: "message",
      status: "streaming",
      role: "assistant",
      content: "",
      createdAt,
    }

    this.pushTimeline(input.sessionId, patientMessage, assistantPlaceholder)
    this.updateSession(session.id, {
      status: "analyzing",
      updatedAt: createdAt,
      // 发消息是一次操作：刷新空闲计时基准。
      lastActivityAt: createdAt,
      askRound: session.askRound + 1,
      summary: {
        ...session.summary,
        chiefComplaint: session.summary.chiefComplaint ?? input.content,
        lastMessage: input.content,
      },
    })

    return parseSendMessageResult({
      session: this.requireSession(input.sessionId),
      patientMessage,
      assistantPlaceholder,
    })
  }

  raiseLabDecision(sessionId: SessionId): FlowActionResult {
    const card = createLabDecisionCard(sessionId, this.id("card"))
    const item = this.cardItem(sessionId, card)
    this.pushTimeline(sessionId, item)
    this.updateSession(sessionId, {
      status: "blocked",
      activeCardId: card.id,
      updatedAt: nowIso(),
    })
    return this.flowResult(sessionId, [item], card, "需要先确认是否进行检验。")
  }

  submitLabDecision(input: SubmitLabDecisionInput): FlowActionResult {
    const card = this.requireCard(input.sessionId, input.cardId)
    if (card.kind !== "lab_decision") {
      return this.flowResult(input.sessionId, [], undefined, "当前卡片不是检验决策卡。")
    }

    card.status = input.decision
    card.handledAt = nowIso()
    card.blocking = false

    if (input.decision === "accepted") {
      const paymentCard = createLabPaymentCard(input.sessionId, this.id("card"))
      const paymentItem = this.cardItem(input.sessionId, paymentCard)
      this.pushTimeline(input.sessionId, paymentItem)
      this.updateSession(input.sessionId, {
        status: "blocked",
        activeCardId: paymentCard.id,
        updatedAt: nowIso(),
      })
      return this.flowResult(input.sessionId, [paymentItem], paymentCard)
    }

    if (input.decision === "vetoed") {
      this.updateSession(input.sessionId, {
        status: "chatting",
        activeCardId: undefined,
        updatedAt: nowIso(),
      })
      return this.flowResult(input.sessionId, [
        this.systemItem(input.sessionId, "暂不决定", "可以继续补充症状，稍后再决定是否检验。"),
      ])
    }

    return this.completeAdviceOnly(input.sessionId, "患者选择不做检验，AI 基于已知病史给出保守建议。")
  }

  submitPayment(input: SubmitPaymentInput): FlowActionResult {
    const card = this.requireCard(input.sessionId, input.cardId)
    if (card.kind !== "payment") {
      return this.flowResult(input.sessionId, [], undefined, "当前卡片不是支付卡。")
    }

    if (input.defer) {
      card.status = "invalidated"
      card.paymentStatus = "unpaid"
      card.blocking = false
      card.handledAt = nowIso()
      const item = this.systemItem(
        input.sessionId,
        "暂不缴费",
        "已暂停当前支付，患者可继续补充症状或稍后再处理。",
      )
      this.pushTimeline(input.sessionId, item)
      this.updateSession(input.sessionId, {
        status: "chatting",
        activeCardId: undefined,
        updatedAt: nowIso(),
      })
      return this.flowResult(input.sessionId, [item], card)
    }

    if (input.simulateStatus === "failed") {
      card.status = "failed"
      card.paymentStatus = "failed"
      return this.flowResult(input.sessionId, [], card, "支付失败，请重新尝试。")
    }

    card.status = "paid"
    card.paymentStatus = "paid"
    card.blocking = false
    card.handledAt = nowIso()

    if (input.purpose === "lab") {
      const plan = this.inferTreatmentPlan(input.sessionId)
      const labItem = this.cardItem(
        input.sessionId,
        createCompletedLabExecutionCard(input.sessionId, this.id("card")),
      )
      const diagnosisItem = this.cardItem(
        input.sessionId,
        createDiagnosisCard(input.sessionId, this.id("card")),
      )
      const planItem = this.cardItem(
        input.sessionId,
        createTreatmentPlanCard(input.sessionId, this.id("card"), plan),
      )

      if (plan === "advice_only") {
        const adviceCard = this.createAdviceOnlyCard(
          input.sessionId,
          "检验结果已回填，当前建议先按保守医嘱观察。",
        )
        const adviceItem = this.cardItem(input.sessionId, adviceCard)
        this.pushTimeline(
          input.sessionId,
          this.systemItem(input.sessionId, "检验已完成", "血常规结果已自动回填。"),
          labItem,
          diagnosisItem,
          planItem,
          adviceItem,
        )
        this.updateSession(input.sessionId, {
          status: "blocked",
          activeCardId: adviceCard.id,
          updatedAt: nowIso(),
        })
        return this.flowResult(
          input.sessionId,
          [labItem, diagnosisItem, planItem, adviceItem],
          adviceCard,
        )
      }

      if (plan === "treatment") {
        const treatmentCard = createTreatmentExecutionCard(
          input.sessionId,
          this.id("card"),
        )
        const treatmentItem = this.cardItem(input.sessionId, treatmentCard)
        this.pushTimeline(
          input.sessionId,
          this.systemItem(input.sessionId, "检验已完成", "血常规结果已自动回填。"),
          labItem,
          diagnosisItem,
          planItem,
          treatmentItem,
        )
        this.updateSession(input.sessionId, {
          status: "blocked",
          activeCardId: treatmentCard.id,
          updatedAt: nowIso(),
        })
        return this.flowResult(
          input.sessionId,
          [labItem, diagnosisItem, planItem, treatmentItem],
          treatmentCard,
        )
      }

      const medicationPayment = createMedicationPaymentCard(
        input.sessionId,
        this.id("card"),
      )
      const medicationPaymentItem = this.cardItem(input.sessionId, medicationPayment)
      this.pushTimeline(
        input.sessionId,
        this.systemItem(input.sessionId, "检验已完成", "血常规结果已自动回填。"),
        labItem,
        diagnosisItem,
        planItem,
        medicationPaymentItem,
      )
      this.updateSession(input.sessionId, {
        status: "blocked",
        activeCardId: medicationPayment.id,
        updatedAt: nowIso(),
      })
      return this.flowResult(
        input.sessionId,
        [labItem, diagnosisItem, planItem, medicationPaymentItem],
        medicationPayment,
      )
    }

    const fulfillmentCard = createMedicationFulfillmentCard(
      input.sessionId,
      this.id("card"),
    )
    const fulfillmentItem = this.cardItem(input.sessionId, fulfillmentCard)
    this.pushTimeline(input.sessionId, fulfillmentItem)
    this.updateSession(input.sessionId, {
      status: "blocked",
      activeCardId: fulfillmentCard.id,
      updatedAt: nowIso(),
    })
    return this.flowResult(input.sessionId, [fulfillmentItem], fulfillmentCard)
  }

  submitFulfillment(input: SubmitFulfillmentInput): FlowActionResult {
    const card = this.requireCard(input.sessionId, input.cardId)
    if (card.kind !== "medication_fulfillment") {
      return this.flowResult(input.sessionId, [], undefined, "当前卡片不是取药确认卡。")
    }

    card.status = "completed"
    card.blocking = false
    card.handledAt = nowIso()
    card.selectedMode = input.mode
    card.fulfillmentStatus = "completed"
    return this.completeVisit(input.sessionId)
  }

  submitTreatmentExecution(input: SubmitTreatmentExecutionInput): FlowActionResult {
    const card = this.requireCard(input.sessionId, input.cardId)
    if (card.kind !== "treatment_execution") {
      return this.flowResult(input.sessionId, [], undefined, "当前卡片不是治疗执行卡。")
    }

    if (input.action === "complete") {
      card.status = "completed"
      card.executionStatus = "completed"
      card.blocking = false
      card.handledAt = nowIso()
      card.availableActions = []
      return this.completeVisit(input.sessionId)
    }

    if (input.action === "schedule") {
      card.status = "pending"
      card.executionStatus = "scheduled"
      card.appointmentAt = new Date(Date.now() + 20 * 60_000).toISOString()
      card.queueNo = "W-018"
      card.availableActions = ["confirm_arrival", "cancel"]
    } else if (input.action === "confirm_arrival") {
      card.status = "pending"
      card.executionStatus = "arrived"
      card.availableActions = ["start", "cancel"]
    } else if (input.action === "start") {
      card.status = "pending"
      card.executionStatus = "in_progress"
      card.availableActions = ["complete"]
    } else {
      card.status = "invalidated"
      card.executionStatus = "canceled"
      card.blocking = false
      card.handledAt = nowIso()
      card.availableActions = []
      this.updateSession(input.sessionId, {
        status: "chatting",
        activeCardId: undefined,
        updatedAt: nowIso(),
      })
    }
    return this.flowResult(input.sessionId, [], card)
  }

  ackAdvice(input: AckAdviceInput): FlowActionResult {
    const card = this.requireCard(input.sessionId, input.cardId)
    if (card.kind !== "advice_only") {
      return this.flowResult(input.sessionId, [], undefined, "当前卡片不是医嘱确认卡。")
    }
    card.status = "completed"
    card.blocking = false
    card.handledAt = nowIso()
    return this.completeVisit(input.sessionId)
  }

  classifyFollowUpIntent(input: ClassifyIntentInput): ClassifyIntentResult {
    if (/复诊|又|新症状|加重/.test(input.content)) {
      return { intent: "follow_up", confidence: 0.82, reason: "文本包含复诊或症状加重意图" }
    }
    if (/怎么办|能不能|需要|注意/.test(input.content)) {
      return { intent: "consultation", confidence: 0.76, reason: "文本更像针对本次记录追问" }
    }
    return { intent: "uncertain", confidence: 0.55, reason: "mock 分类置信度不足" }
  }

  reportVitals(input: ReportVitalsInput): EmergencyRecheckResult {
    const text = input.symptoms.join(" ")
    if (/胸痛|呼吸困难|意识|抽搐|昏迷/.test(text) || (input.vitals?.spo2 ?? 100) < 92) {
      return {
        emergency: true,
        severity: "critical",
        message: "检测到急症风险，请立即前往急诊或呼叫急救。",
      }
    }
    return { emergency: false, message: "暂未命中急症标准，建议继续问诊。" }
  }

  exitVisit(input: ExitVisitInput): ExitSettlementResult {
    const reason: TerminalReason =
      input.reason === "emergency"
        ? "emergency"
        : input.reason === "timeout"
          ? "timeout"
          : "exited"
    const settlement = this.computeSettlement(input.sessionId)
    const terminal = this.terminalItem(input.sessionId, reason, "本次问诊已结束")
    if (input.reason === "emergency") {
      // 记录急症发生前的可恢复状态，供误报恢复 dismissEmergency 还原。
      const current = this.requireSession(input.sessionId)
      this.state.emergencyRestore[input.sessionId] = {
        status: current.status,
        activeCardId: current.activeCardId,
      }
    }
    this.pushTimeline(input.sessionId, terminal)
    this.updateSession(input.sessionId, {
      status: input.reason === "emergency" ? "emergency_terminated" : "exited",
      terminalReason: reason,
      endedAt: nowIso(),
      activeCardId: undefined,
      updatedAt: nowIso(),
    })
    return parseExitSettlementResult({
      sessionId: input.sessionId,
      terminalReason: reason,
      refundAmount: settlement.refundAmount,
      payableAmount: settlement.payableAmount,
      timelineItem: terminal,
      consequence: settlement.consequence,
    })
  }

  /**
   * 真实退出结算：扫描时间线已支付/已执行/已取药卡片，计算退款与后果摘要。
   *
   * 四档后果（取承诺度最高者）：
   * - medication_dispensed：药品已取（取药卡 completed）→ 不可退。
   * - executed_no_refund：检验/治疗已执行（执行卡 completed）→ 不可退。
   * - refundable：已支付但未消费 → 可退该自费金额。
   * - no_fee：无任何已支付项 → 无费用。
   *
   * payableAmount 在 mock 中恒为 0（退出时不追加欠费）。金额以支付卡 selfPayAmount 计。
   */
  private computeSettlement(sessionId: SessionId): {
    refundAmount: number
    payableAmount: number
    consequence: {
      kind: "no_fee" | "refundable" | "executed_no_refund" | "medication_dispensed"
      amount?: number
      text: string
    }
  } {
    const items = this.state.timelines[sessionId] ?? []
    const cards = items
      .filter(
        (item): item is Extract<TimelineItem, { kind: "flow_card" }> =>
          item.kind === "flow_card",
      )
      .map((item) => item.card)

    let labConsumed = false
    let treatmentExecuted = false
    let medicationDispensed = false
    let refundAmount = 0
    let consumedAmount = 0

    for (const card of cards) {
      if (card.kind === "lab_execution" && card.executionStatus === "completed") {
        labConsumed = true
      }
      if (
        card.kind === "treatment_execution" &&
        card.executionStatus === "completed"
      ) {
        treatmentExecuted = true
      }
      if (
        card.kind === "medication_fulfillment" &&
        card.fulfillmentStatus === "completed"
      ) {
        medicationDispensed = true
      }
    }

    for (const card of cards) {
      if (card.kind !== "payment") continue
      const paid = card.paymentStatus === "paid" || card.status === "paid"
      if (!paid) continue
      const amount = card.selfPayAmount
      const consumed =
        card.purpose === "lab"
          ? labConsumed
          : medicationDispensed || treatmentExecuted
      if (consumed) {
        consumedAmount += amount
      } else {
        refundAmount += amount
      }
    }

    if (medicationDispensed) {
      return {
        refundAmount,
        payableAmount: 0,
        consequence: {
          kind: "medication_dispensed",
          amount: consumedAmount > 0 ? consumedAmount : undefined,
          text:
            refundAmount > 0
              ? `药品已取，已取药费用不可退；其余 ¥${refundAmount} 将原路退回。`
              : "药品已取，相关费用不可退。",
        },
      }
    }

    if (labConsumed || treatmentExecuted) {
      return {
        refundAmount,
        payableAmount: 0,
        consequence: {
          kind: "executed_no_refund",
          amount: consumedAmount > 0 ? consumedAmount : undefined,
          text:
            refundAmount > 0
              ? `检验或治疗已执行，已执行费用不可退；其余 ¥${refundAmount} 将原路退回。`
              : "检验或治疗已执行，相关费用不可退。",
        },
      }
    }

    if (refundAmount > 0) {
      return {
        refundAmount,
        payableAmount: 0,
        consequence: {
          kind: "refundable",
          amount: refundAmount,
          text: `本次已支付但未执行，¥${refundAmount} 将原路退回。`,
        },
      }
    }

    return {
      refundAmount: 0,
      payableAmount: 0,
      consequence: {
        kind: "no_fee",
        text: "本次未产生任何费用，可放心退出。",
      },
    }
  }

  pauseVisitTimer(sessionId: SessionId) {
    const session = this.requireSession(sessionId)
    // 已暂停则保持原 pausedAt 不变，避免重复暂停吞掉已记账起点。
    return this.updateSession(sessionId, {
      timerPaused: true,
      pausedAt: session.pausedAt ?? nowIso(),
      updatedAt: nowIso(),
    })
  }

  resumeVisitTimer(sessionId: SessionId) {
    this.requireSession(sessionId)
    // 空闲计时模型下，暂停期间靠 pausedAt 冻结剩余时间。恢复本身视为一次操作：
    // 清空 pausedAt 并由 updateSession 自动刷新 lastActivityAt，空闲计时从此刻重新开始。
    return this.updateSession(sessionId, {
      timerPaused: false,
      pausedAt: undefined,
      updatedAt: nowIso(),
    })
  }

  /**
   * 急症误报恢复：把会话从 emergency_terminated 还原到急症发生前的状态，
   * 写入一条 emergency_dismissed 系统事件，返回 { session, timelineItem }。
   *
   * 仅前端 / mock 语义：HTTP 模式下后端命中急症即关闭会话，无法恢复（见 api.md）。
   * 恢复点优先用 exitVisit(emergency) 记录的前态；缺失时务实回退到 chatting。
   */
  dismissEmergency(input: { sessionId: SessionId }): {
    session: VisitSession
    timelineItem: TimelineItem
  } {
    this.requireSession(input.sessionId)
    const restore = this.state.emergencyRestore[input.sessionId]
    const restoredStatus: VisitStatus = restore?.status ?? "chatting"
    // 阻塞态必须带 activeCardId（schema 约束）；恢复点无卡时降级到 chatting。
    const restoredCardId = restore?.activeCardId
    const safeStatus: VisitStatus =
      restoredStatus === "blocked" && !restoredCardId ? "chatting" : restoredStatus

    const dismissedItem: TimelineItem = {
      id: this.id("tl"),
      sessionId: input.sessionId,
      kind: "system_event",
      status: "done",
      createdAt: nowIso(),
      eventType: "emergency_dismissed",
      title: "急症误报已解除",
      description: "经复核未达急症标准，已恢复本次问诊。",
    }
    this.pushTimeline(input.sessionId, dismissedItem)

    const updated = this.updateSession(input.sessionId, {
      status: safeStatus,
      activeCardId: safeStatus === "blocked" ? restoredCardId : undefined,
      terminalReason: undefined,
      endedAt: undefined,
      updatedAt: nowIso(),
    })
    delete this.state.emergencyRestore[input.sessionId]

    return { session: updated, timelineItem: dismissedItem }
  }

  /**
   * 空闲挂起：长时间未操作后自动中断会话。
   *
   * 非终态——不写 terminalReason / endedAt，status 置为 suspended。患者之后可按
   * 复诊流程继续（以本会话为 parentSessionId 创建 follow_up）。写入一条
   * session_suspended 系统事件，返回 { session, timelineItem }。
   */
  suspendVisit(input: { sessionId: SessionId }): {
    session: VisitSession
    timelineItem: TimelineItem
  } {
    this.requireSession(input.sessionId)

    const suspendedItem: TimelineItem = {
      id: this.id("tl"),
      sessionId: input.sessionId,
      kind: "system_event",
      status: "done",
      createdAt: nowIso(),
      eventType: "session_suspended",
      title: "会话已暂停",
      description: "长时间未操作，本次问诊已自动暂停。可直接输入或点「继续问诊」按复诊流程继续。",
    }
    this.pushTimeline(input.sessionId, suspendedItem)

    const updated = this.updateSession(input.sessionId, {
      status: "suspended",
      activeCardId: undefined,
      // 保持原 lastActivityAt（不视为操作）：挂起是空闲的结果，不应刷新计时基准。
      lastActivityAt: this.requireSession(input.sessionId).lastActivityAt,
      updatedAt: nowIso(),
    })

    return { session: updated, timelineItem: suspendedItem }
  }

  appendAssistantMessage(sessionId: SessionId, content: string) {
    const timeline = this.state.timelines[sessionId] ?? []
    for (let i = timeline.length - 1; i >= 0; i--) {
      const item = timeline[i]
      if (
        item.kind === "message" &&
        item.role === "assistant" &&
        item.status === "streaming"
      ) {
        const finalized: TimelineItem = {
          ...item,
          status: "done",
          content,
        }
        timeline[i] = finalized
        return finalized
      }
    }

    const item: TimelineItem = {
      id: this.id("tl"),
      sessionId,
      kind: "message",
      status: "done",
      role: "assistant",
      content,
      createdAt: nowIso(),
    }
    this.pushTimeline(sessionId, item)
    return item
  }

  private completeAdviceOnly(sessionId: SessionId, reason: string): FlowActionResult {
    const diagnosisItem = this.cardItem(
      sessionId,
      createDiagnosisCard(sessionId, this.id("card"), { includeLabEvidence: false }),
    )
    const adviceCard = this.createAdviceOnlyCard(sessionId, reason)
    const adviceItem = this.cardItem(sessionId, adviceCard)
    this.pushTimeline(sessionId, diagnosisItem, adviceItem)
    this.updateSession(sessionId, {
      status: "blocked",
      activeCardId: adviceCard.id,
      updatedAt: nowIso(),
    })
    return this.flowResult(sessionId, [diagnosisItem, adviceItem], adviceCard)
  }

  private createAdviceOnlyCard(sessionId: SessionId, reason: string): FlowCard {
    return {
      id: this.id("card"),
      sessionId,
      kind: "advice_only",
      status: "pending",
      blocking: true,
      title: "保守处置医嘱",
      createdAt: nowIso(),
      advices: ["休息补液", "监测体温", "避免自行叠加退热药"],
      watchItems: ["持续高热", "呼吸困难", "精神状态明显变差"],
      followUpRecommendation: reason,
    }
  }

  private inferTreatmentPlan(sessionId: SessionId): MockTreatmentPlan {
    const summary = this.requireSession(sessionId).summary
    const text = `${summary.chiefComplaint ?? ""} ${summary.lastMessage ?? ""}`
    if (/只要建议|不想买药|不买药|先观察|观察|医嘱|不用药/.test(text)) {
      return "advice_only"
    }
    if (/雾化|理疗|治疗执行|院内治疗|自动化治疗/.test(text)) {
      return "treatment"
    }
    return "medication"
  }

  private completeVisit(sessionId: SessionId): FlowActionResult {
    const completedCard = createCompletedVisitCard(sessionId, this.id("card"))
    const item = this.cardItem(sessionId, completedCard)
    this.pushTimeline(sessionId, item)
    this.updateSession(sessionId, {
      status: "completed",
      activeCardId: undefined,
      endedAt: nowIso(),
      updatedAt: nowIso(),
      summary: {
        ...this.requireSession(sessionId).summary,
        diagnosis:
          completedCard.kind === "completed_visit"
            ? completedCard.diagnosis
            : undefined,
        treatmentSummary:
          completedCard.kind === "completed_visit"
            ? completedCard.treatmentSummary
            : undefined,
        lastMessage:
          completedCard.kind === "completed_visit"
            ? completedCard.followUpSuggestion
            : undefined,
      },
    })
    return this.flowResult(sessionId, [item], completedCard)
  }

  private flowResult(
    sessionId: SessionId,
    timelineItems: TimelineItem[],
    card?: FlowCard,
    message?: string,
  ): FlowActionResult {
    const session = this.requireSession(sessionId)
    return parseFlowActionResult({
      sessionId,
      status: session.status,
      activeCardId: session.activeCardId,
      card,
      timelineItems,
      message,
    })
  }

  private cardItem(sessionId: SessionId, card: FlowCard): TimelineItem {
    const createdAt = nowIso()
    const timelineCard: FlowCard = {
      ...card,
      createdAt,
      ...(card.kind === "lab_execution" ? { resultReturnedAt: createdAt } : {}),
      ...(card.kind === "completed_visit" ? { completedAt: createdAt } : {}),
    } as FlowCard

    return {
      id: this.id("tl"),
      sessionId,
      kind: "flow_card",
      status: card.status === "failed" ? "failed" : "done",
      createdAt,
      card: timelineCard,
    }
  }

  private systemItem(sessionId: SessionId, title: string, description?: string): TimelineItem {
    return {
      id: this.id("tl"),
      sessionId,
      kind: "system_event",
      status: "done",
      createdAt: nowIso(),
      eventType: "agent_thinking",
      title,
      description,
    }
  }

  private terminalItem(
    sessionId: SessionId,
    reason: TerminalReason,
    title: string,
  ): TimelineItem {
    return {
      id: this.id("tl"),
      sessionId,
      kind: "terminal",
      status: "done",
      createdAt: nowIso(),
      reason,
      title,
      description: reason === "timeout" ? "导诊总计时已结束。" : undefined,
    }
  }

  private pushTimeline(sessionId: SessionId, ...items: TimelineItem[]) {
    this.requireSession(sessionId)
    this.state.timelines[sessionId] = [
      ...(this.state.timelines[sessionId] ?? []),
      ...items,
    ]
  }

  private requireSession(sessionId: SessionId): VisitSession {
    const session = this.state.sessions[sessionId]
    if (!session) {
      throwApiError(
        createApiError({
          code: "SESSION_NOT_FOUND",
          message: "未找到问诊会话",
          status: 404,
          retriable: false,
        }),
      )
    }
    return session
  }

  private requireCard(sessionId: SessionId, cardId: string): FlowCard {
    this.requireSession(sessionId)
    const item = (this.state.timelines[sessionId] ?? []).find(
      (timelineItem) =>
        timelineItem.kind === "flow_card" && timelineItem.card.id === cardId,
    )
    if (!item || item.kind !== "flow_card") {
      throwApiError(
        createApiError({
          code: "CARD_NOT_FOUND",
          message: "未找到流程卡",
          status: 404,
          retriable: false,
        }),
      )
    }
    return item.card
  }

  private updateSession(sessionId: SessionId, patch: Partial<VisitSession>) {
    const current = this.requireSession(sessionId)
    // 空闲计时基准：任何带 updatedAt 的会话变更都视为一次「操作」，自动刷新
    // lastActivityAt，从而重置空闲倒计时。调用方显式传 lastActivityAt 时以其为准。
    const activityPatch: Partial<VisitSession> =
      patch.updatedAt && patch.lastActivityAt === undefined
        ? { lastActivityAt: patch.updatedAt }
        : {}
    const updated = parseVisitSession({ ...current, ...patch, ...activityPatch })
    this.state.sessions[sessionId] = updated
    return clone(updated)
  }

  private id(prefix: string) {
    const value = `${prefix}-${String(this.state.nextId).padStart(4, "0")}`
    this.state.nextId += 1
    return value
  }
}

export const mockDb = new MockDb()
