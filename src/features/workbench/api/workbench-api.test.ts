import { beforeEach, describe, expect, it } from "vitest"

import { api } from "@/features/api"
import type { AssistantStreamEvent } from "@/features/workbench/api/types"
import { resetTransportForTests } from "@/lib/api"
import { mockDb } from "@/mocks/api/mock-db"

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
})
