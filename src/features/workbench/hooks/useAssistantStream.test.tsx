import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { api } from "@/features/api"
import type { TimelineItem } from "@/features/workbench/api"
import { useAssistantStream } from "@/features/workbench/hooks/useAssistantStream"
import type { VisitMachineEvent } from "@/features/workbench/machine/visit-machine.types"
import { createStreamingAssistantMessage } from "@/features/workbench/utils/timeline-merge"
import { resetTransportForTests } from "@/lib/api"
import { mockDb } from "@/mocks/api/mock-db"

describe("useAssistantStream", () => {
  beforeEach(() => {
    mockDb.reset()
    resetTransportForTests()
  })

  it("invalidates the streaming placeholder when an emergency event interrupts the flow", async () => {
    const created = await api.visits.createSession({
      patientId: "patient-mock-001",
      entryType: "new",
      chiefComplaint: "胸痛伴呼吸困难。",
    })
    await api.workbench.sendMessage({
      sessionId: created.session.id,
      content: "胸痛伴呼吸困难。",
      clientMessageId: "client-emergency-hook",
    })

    const streamItem = createStreamingAssistantMessage(created.session.id)
    let items: TimelineItem[] = [streamItem]
    const events: VisitMachineEvent[] = []

    const { result } = renderHook(() =>
      useAssistantStream({
        sessionId: created.session.id,
        sendMachineEvent: (event) => {
          events.push(event)
        },
        appendTimelineItem: (item) => {
          items = [...items, item]
        },
        updateTimelineItem: (itemId, updater) => {
          items = items.map((item) =>
            item.id === itemId ? updater(item) : item,
          )
        },
        upsertTimelineItems: (newItems) => {
          for (const incoming of newItems) {
            const idx = items.findIndex((item) => {
              if (item.id === incoming.id) return true
              return (
                item.kind === "flow_card" &&
                incoming.kind === "flow_card" &&
                item.card.id === incoming.card.id
              )
            })
            if (idx >= 0) {
              items[idx] = incoming
            } else {
              items = [...items, incoming]
            }
          }
        },
      }),
    )

    act(() => {
      result.current.startStream({ streamMessageId: streamItem.id })
    })

    await waitFor(() => {
      expect(events.some((event) => event.type === "EMERGENCY_DETECTED")).toBe(true)
    })

    expect(items[0]).toMatchObject({
      id: streamItem.id,
      status: "invalidated",
      interruptedBy: "emergency",
    })
  })
})
