import { beforeEach, describe, expect, it } from "vitest"

import { api } from "@/features/api"
import type { AssistantStreamEvent } from "@/features/workbench/api/types"
import { resetTransportForTests } from "@/lib/api"
import { mockDb } from "@/mocks/api/mock-db"

async function createSessionAndRaiseLabCard(content: string) {
  const created = await api.visits.createSession({
    patientId: "patient-mock-001",
    entryType: "new",
    chiefComplaint: content,
  })

  await api.workbench.sendMessage({
    sessionId: created.session.id,
    content,
    clientMessageId: `client-${created.session.id}`,
  })

  const events: AssistantStreamEvent[] = []
  await api.workbench.streamAssistantMessage(
    {
      sessionId: created.session.id,
      requestId: `request-${created.session.id}`,
      clientMessageId: `client-${created.session.id}`,
    },
    {
      onEvent: (event) => events.push(event),
    },
  )

  const labEvent = events.find(
    (event): event is Extract<AssistantStreamEvent, { type: "card" }> =>
      event.type === "card" && event.card.kind === "lab_decision",
  )
  if (!labEvent) {
    throw new Error("expected lab decision card event")
  }

  return { sessionId: created.session.id, labCard: labEvent.card }
}

async function acceptLabAndPay(
  sessionId: string,
  labCard: { id: string },
) {
  const labResult = await api.workbench.submitLabDecision({
    sessionId,
    cardId: labCard.id,
    decision: "accepted",
  })
  if (!labResult.card || labResult.card.kind !== "payment") {
    throw new Error("expected lab payment card")
  }

  return api.workbench.submitPayment({
    sessionId,
    cardId: labResult.card.id,
    purpose: "lab",
    paymentMethodId: "mock-pay",
  })
}

describe("workbench API facade with mock transport", () => {
  beforeEach(() => {
    mockDb.reset()
    resetTransportForTests()
  })

  it("creates a session, streams an assistant reply, and raises a lab card", async () => {
    const created = await api.visits.createSession({
      patientId: "patient-mock-001",
      entryType: "new",
      chiefComplaint: "发热两天，伴有咽痛。",
    })

    await api.workbench.sendMessage({
      sessionId: created.session.id,
      content: "体温最高 38.6 度，没有胸闷。",
      clientMessageId: "client-message-1",
    })

    const events: AssistantStreamEvent[] = []
    await api.workbench.streamAssistantMessage(
      {
        sessionId: created.session.id,
        requestId: "request-1",
        clientMessageId: "client-message-1",
      },
      {
        onEvent: (event) => events.push(event),
      },
    )

    expect(events.some((event) => event.type === "delta")).toBe(true)
    expect(events.some((event) => event.type === "message_final")).toBe(true)
    expect(events.some((event) => event.type === "card")).toBe(true)
    expect(events.at(-1)?.type).toBe("done")

    const session = await api.workbench.getSession(created.session.id)
    expect(session.status).toBe("blocked")
    expect(session.activeCardId).toBeTruthy()
  })

  it("writes the chief complaint as the last patient message so the workbench can auto-reply", async () => {
    // 回归：首页输入主诉建会话进工作台后，必须能据「最后一条是未回复的患者消息」
    // 自动触发首轮 AI 回复（useWorkbenchSession 首轮自动回复依赖此前置）。
    const created = await api.visits.createSession({
      patientId: "patient-mock-001",
      entryType: "new",
      chiefComplaint: "发热两天，伴有咽痛。",
    })

    const messages = created.initialTimeline.filter(
      (item) => item.kind === "message",
    )
    const lastMessage = messages.at(-1)
    expect(lastMessage).toBeDefined()
    expect(lastMessage?.kind === "message" && lastMessage.role).toBe("patient")
    expect(lastMessage?.kind === "message" && lastMessage.content).toBe(
      "发热两天，伴有咽痛。",
    )
  })

  it("advances lab decision and payment through schema-validated mock handlers", async () => {
    await api.workbench.sendMessage({
      sessionId: "visit-mock-active",
      content: "体温 38.5 度，咽痛明显。",
      clientMessageId: "client-message-2",
    })

    const streamEvents: AssistantStreamEvent[] = []
    await api.workbench.streamAssistantMessage(
      {
        sessionId: "visit-mock-active",
        requestId: "request-2",
        clientMessageId: "client-message-2",
      },
      {
        onEvent: (event) => streamEvents.push(event),
      },
    )

    const labEvent = streamEvents.find((event) => event.type === "card")
    expect(labEvent?.type).toBe("card")
    if (labEvent?.type !== "card") {
      throw new Error("expected lab card event")
    }

    const labResult = await api.workbench.submitLabDecision({
      sessionId: "visit-mock-active",
      cardId: labEvent.card.id,
      decision: "accepted",
    })
    expect(labResult.card?.kind).toBe("payment")
    expect(labResult.status).toBe("blocked")

    if (!labResult.card || labResult.card.kind !== "payment") {
      throw new Error("expected lab payment card")
    }

    const paymentResult = await api.workbench.submitPayment({
      sessionId: "visit-mock-active",
      cardId: labResult.card.id,
      purpose: "lab",
      paymentMethodId: "mock-pay",
    })

    expect(paymentResult.timelineItems.length).toBeGreaterThan(0)
    expect(paymentResult.card?.kind).toBe("payment")
    expect(paymentResult.card?.status).toBe("pending")
  })

  it("runs the medication branch to a completed visit card", async () => {
    const { sessionId, labCard } = await createSessionAndRaiseLabCard(
      "体温 38.5 度，咽痛明显，需要药物治疗。",
    )

    const labPaymentResult = await acceptLabAndPay(sessionId, labCard)
    expect(labPaymentResult.card?.kind).toBe("payment")
    expect(labPaymentResult.card?.kind === "payment" && labPaymentResult.card.purpose)
      .toBe("medication")

    if (!labPaymentResult.card || labPaymentResult.card.kind !== "payment") {
      throw new Error("expected medication payment card")
    }

    const medicationPaymentResult = await api.workbench.submitPayment({
      sessionId,
      cardId: labPaymentResult.card.id,
      purpose: "medication",
      paymentMethodId: "mock-pay",
    })
    expect(medicationPaymentResult.card?.kind).toBe("medication_fulfillment")

    if (
      !medicationPaymentResult.card ||
      medicationPaymentResult.card.kind !== "medication_fulfillment"
    ) {
      throw new Error("expected medication fulfillment card")
    }

    const completedResult = await api.workbench.submitFulfillment({
      sessionId,
      cardId: medicationPaymentResult.card.id,
      mode: "pickup",
    })

    expect(completedResult.status).toBe("completed")
    expect(completedResult.card?.kind).toBe("completed_visit")
    expect((await api.workbench.getSession(sessionId)).status).toBe("completed")
  })

  it("runs the medication delivery branch with a saved address", async () => {
    const { sessionId, labCard } = await createSessionAndRaiseLabCard(
      "体温 38.5 度，咽痛明显，需要配送药品。",
    )

    const labPaymentResult = await acceptLabAndPay(sessionId, labCard)
    if (!labPaymentResult.card || labPaymentResult.card.kind !== "payment") {
      throw new Error("expected medication payment card")
    }

    const medicationPaymentResult = await api.workbench.submitPayment({
      sessionId,
      cardId: labPaymentResult.card.id,
      purpose: "medication",
      paymentMethodId: "mock-pay",
    })
    if (
      !medicationPaymentResult.card ||
      medicationPaymentResult.card.kind !== "medication_fulfillment"
    ) {
      throw new Error("expected medication fulfillment card")
    }

    const completedResult = await api.workbench.submitFulfillment({
      sessionId,
      cardId: medicationPaymentResult.card.id,
      mode: "delivery",
      addressId: "addr-seed-001",
    })

    expect(completedResult.status).toBe("completed")
    expect(completedResult.card?.kind).toBe("completed_visit")
    expect((await api.workbench.getSession(sessionId)).status).toBe("completed")

    const orders = await api.medicalOrders.listRecords()
    const order = orders.items.find((item) => item.sessionId === sessionId)
    expect(order).toMatchObject({
      kind: "medication",
      fulfillmentStatus: "confirmed",
      deliveryAddress: {
        name: "李明",
        phone: "13800002468",
        fullAddress: "辽宁省沈阳市浑南区创新路195号东软软件园B4座3楼",
      },
    })
  })

  it("runs the advice-only branch to a completed visit card", async () => {
    const { sessionId, labCard } = await createSessionAndRaiseLabCard(
      "低热咽痛，我想先观察，只要建议和医嘱。",
    )

    const labPaymentResult = await acceptLabAndPay(sessionId, labCard)
    expect(labPaymentResult.card?.kind).toBe("advice_only")

    if (!labPaymentResult.card || labPaymentResult.card.kind !== "advice_only") {
      throw new Error("expected advice-only card")
    }

    const completedResult = await api.workbench.ackAdvice({
      sessionId,
      cardId: labPaymentResult.card.id,
    })

    expect(completedResult.status).toBe("completed")
    expect(completedResult.card?.kind).toBe("completed_visit")
  })

  it("runs the automated treatment branch through schedule, arrival, start, and complete", async () => {
    const { sessionId, labCard } = await createSessionAndRaiseLabCard(
      "咽痛咳嗽明显，希望预约雾化治疗。",
    )

    const labPaymentResult = await acceptLabAndPay(sessionId, labCard)
    expect(labPaymentResult.card?.kind).toBe("treatment_execution")

    if (
      !labPaymentResult.card ||
      labPaymentResult.card.kind !== "treatment_execution"
    ) {
      throw new Error("expected treatment execution card")
    }

    const scheduled = await api.workbench.submitTreatmentExecution({
      sessionId,
      cardId: labPaymentResult.card.id,
      action: "schedule",
    })
    expect(scheduled.card?.kind).toBe("treatment_execution")
    expect(
      scheduled.card?.kind === "treatment_execution" &&
        scheduled.card.executionStatus,
    ).toBe("scheduled")

    const arrived = await api.workbench.submitTreatmentExecution({
      sessionId,
      cardId: labPaymentResult.card.id,
      action: "confirm_arrival",
    })
    expect(
      arrived.card?.kind === "treatment_execution" &&
        arrived.card.executionStatus,
    ).toBe("arrived")

    const started = await api.workbench.submitTreatmentExecution({
      sessionId,
      cardId: labPaymentResult.card.id,
      action: "start",
    })
    expect(
      started.card?.kind === "treatment_execution" &&
        started.card.executionStatus,
    ).toBe("in_progress")

    const completed = await api.workbench.submitTreatmentExecution({
      sessionId,
      cardId: labPaymentResult.card.id,
      action: "complete",
    })
    expect(completed.status).toBe("completed")
    expect(completed.card?.kind).toBe("completed_visit")
  })

  it("does not add lab evidence when the patient skips lab testing", async () => {
    const { sessionId, labCard } = await createSessionAndRaiseLabCard(
      "低热咽痛，但我不想做检验。",
    )

    const result = await api.workbench.submitLabDecision({
      sessionId,
      cardId: labCard.id,
      decision: "skipped",
    })

    const diagnosisItem = result.timelineItems.find(
      (item) => item.kind === "flow_card" && item.card.kind === "diagnosis",
    )
    expect(diagnosisItem?.kind).toBe("flow_card")
    if (diagnosisItem?.kind !== "flow_card" || diagnosisItem.card.kind !== "diagnosis") {
      throw new Error("expected diagnosis card")
    }
    expect(diagnosisItem.card.evidenceSources).not.toContain("lab_result")
  })

  it("classifies completed-session consultation without creating a follow-up session", async () => {
    const before = await api.visits.listSessions({ patientId: "patient-mock-001" })
    const intent = await api.workbench.classifyFollowUpIntent({
      sessionId: "visit-mock-completed",
      content: "用药需要注意什么？",
    })
    expect(intent.intent).toBe("consultation")

    const events: AssistantStreamEvent[] = []
    await api.workbench.streamConsultationReply(
      {
        sessionId: "visit-mock-completed",
        content: "用药需要注意什么？",
        requestId: "consult-request-1",
      },
      {
        onEvent: (event) => events.push(event),
      },
    )

    const after = await api.visits.listSessions({ patientId: "patient-mock-001" })
    expect(events.some((event) => event.type === "message_final")).toBe(true)
    expect(after.items).toHaveLength(before.items.length)
  })

  it("creates a follow-up session with a parent session reference for new symptoms", async () => {
    const intent = await api.workbench.classifyFollowUpIntent({
      sessionId: "visit-mock-completed",
      content: "我又出现新症状，咳嗽加重了。",
    })
    expect(intent.intent).toBe("follow_up")

    const followUp = await api.visits.createFollowUp({
      patientId: "patient-mock-001",
      parentSessionId: "visit-mock-completed",
      chiefComplaint: "我又出现新症状，咳嗽加重了。",
    })

    expect(followUp.session.entryType).toBe("follow_up")
    expect(followUp.session.parentSessionId).toBe("visit-mock-completed")
  })

  it("can trigger an emergency stream event from mock input", async () => {
    const created = await api.visits.createSession({
      patientId: "patient-mock-001",
      entryType: "new",
      chiefComplaint: "胸痛伴呼吸困难。",
    })

    await api.workbench.sendMessage({
      sessionId: created.session.id,
      content: "胸痛伴呼吸困难。",
      clientMessageId: "client-emergency-1",
    })

    const events: AssistantStreamEvent[] = []
    await api.workbench.streamAssistantMessage(
      {
        sessionId: created.session.id,
        requestId: "request-emergency-1",
        clientMessageId: "client-emergency-1",
      },
      {
        onEvent: (event) => events.push(event),
      },
    )

    expect(events.some((event) => event.type === "emergency")).toBe(true)
    expect(events.at(-1)?.type).toBe("done")
  })

  it("dismisses an emergency and restores the session to a continuable state", async () => {
    const created = await api.visits.createSession({
      patientId: "patient-mock-001",
      entryType: "new",
      chiefComplaint: "胸痛伴呼吸困难。",
    })

    await api.workbench.exitVisit({
      sessionId: created.session.id,
      reason: "emergency",
    })
    expect((await api.workbench.getSession(created.session.id)).status).toBe(
      "emergency_terminated",
    )

    const result = await api.workbench.dismissEmergency({
      sessionId: created.session.id,
    })

    expect(result.timelineItem.kind).toBe("system_event")
    if (result.timelineItem.kind !== "system_event") {
      throw new Error("expected system event timeline item")
    }
    expect(result.timelineItem.eventType).toBe("emergency_dismissed")
    expect(result.session.status).not.toBe("emergency_terminated")
    expect(result.session.terminalReason).toBeUndefined()
    expect(["chatting", "blocked", "analyzing"]).toContain(result.session.status)
  })

  it("settles an exit with no paid items as no_fee", async () => {
    const { sessionId, labCard } = await createSessionAndRaiseLabCard(
      "体温 38.5 度，咽痛明显，需要药物治疗。",
    )
    const labResult = await api.workbench.submitLabDecision({
      sessionId,
      cardId: labCard.id,
      decision: "accepted",
    })
    if (!labResult.card || labResult.card.kind !== "payment") {
      throw new Error("expected lab payment card")
    }

    const settlement = await api.workbench.exitVisit({
      sessionId,
      reason: "patient_request",
    })

    // 检验费尚未支付，无任何已支付项 → 无费用。
    expect(settlement.consequence?.kind).toBe("no_fee")
    expect(settlement.refundAmount).toBe(0)
  })

  it("settles an executed lab exit as non-refundable for the consumed amount", async () => {
    const { sessionId, labCard } = await createSessionAndRaiseLabCard(
      "体温 38.5 度，咽痛明显，需要药物治疗。",
    )
    // 检验已支付并回填（lab_execution completed）→ 已执行不可退。
    await acceptLabAndPay(sessionId, labCard)

    const settlement = await api.workbench.exitVisit({
      sessionId,
      reason: "patient_request",
    })

    expect(settlement.consequence?.kind).toBe("executed_no_refund")
  })

  it("freezes via pausedAt and refreshes lastActivityAt on resume", async () => {
    const created = await api.visits.createSession({
      patientId: "patient-mock-001",
      entryType: "new",
      chiefComplaint: "发热两天。",
    })
    const beforeActivity = created.session.lastActivityAt

    const paused = await api.workbench.pauseVisitTimer({
      sessionId: created.session.id,
    })
    expect(paused.timerPaused).toBe(true)
    expect(paused.pausedAt).toBeTruthy()

    await new Promise((resolve) => setTimeout(resolve, 20))

    const resumed = await api.workbench.resumeVisitTimer({
      sessionId: created.session.id,
    })
    expect(resumed.timerPaused).toBe(false)
    expect(resumed.pausedAt).toBeUndefined()
    // 恢复被视为一次操作：lastActivityAt 被刷新，不早于创建时。
    if (beforeActivity && resumed.lastActivityAt) {
      expect(new Date(resumed.lastActivityAt).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeActivity).getTime(),
      )
    }
  })

  it("suspends an idle session as a non-terminal state and resumes via follow-up", async () => {
    const created = await api.visits.createSession({
      patientId: "patient-mock-001",
      entryType: "new",
      chiefComplaint: "头痛一天。",
    })

    const suspended = await api.workbench.suspendVisit({
      sessionId: created.session.id,
    })
    // 挂起是非终态：status=suspended，不写 terminalReason / endedAt。
    expect(suspended.session.status).toBe("suspended")
    expect(suspended.session.terminalReason).toBeUndefined()
    expect(suspended.session.endedAt).toBeUndefined()
    expect(suspended.timelineItem.kind).toBe("system_event")

    // 按复诊流程继续：以挂起会话为 parentSessionId 创建 follow_up。
    const followUp = await api.visits.createFollowUp({
      patientId: created.session.patientId,
      parentSessionId: created.session.id,
      chiefComplaint: "还是头痛。",
    })
    expect(followUp.session.entryType).toBe("follow_up")
    expect(followUp.session.parentSessionId).toBe(created.session.id)
    expect(followUp.session.status).toBe("chatting")
  })

  it("exposes a readonly snapshot via the object-signature facade", async () => {
    const snapshot = await api.visits.getReadonlySnapshot({
      sessionId: "visit-mock-completed",
    })
    expect(snapshot.readonly).toBe(true)
    expect(snapshot.session.id).toBe("visit-mock-completed")
    expect(Array.isArray(snapshot.timeline)).toBe(true)
  })
})
