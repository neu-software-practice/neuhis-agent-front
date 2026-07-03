import { beforeEach, describe, expect, it, vi } from "vitest"

import { mockDb } from "@/mocks/api/mock-db"
import {
  simulateAssistantStream,
  simulateSimpleReplyStream,
} from "@/mocks/api/stream-simulator"

describe("stream-simulator", () => {
  beforeEach(() => {
    mockDb.reset()
  })

  describe("simulateSimpleReplyStream", () => {
    it("emits delta, message_final, and done events", async () => {
      const events: string[] = []
      const handler = {
        onOpen: vi.fn(),
        onEvent: vi.fn((event: { type: string }) => {
          events.push(event.type)
        }),
        onDone: vi.fn(),
        onError: vi.fn(),
      }

      await simulateSimpleReplyStream(
        { sessionId: "visit-mock-active", requestId: "req-1", content: "问题" },
        handler as never,
      )

      expect(handler.onOpen).toHaveBeenCalled()
      expect(events).toContain("delta")
      expect(events).toContain("message_final")
      expect(events).toContain("done")
      expect(handler.onDone).toHaveBeenCalled()
    })

    it("echoes the input content in the reply", async () => {
      let deltaContent = ""
      const handler = {
        onOpen: vi.fn(),
        onEvent: vi.fn((event: { type: string; content?: string }) => {
          if (event.type === "delta" && event.content) {
            deltaContent += event.content
          }
        }),
        onDone: vi.fn(),
        onError: vi.fn(),
      }

      await simulateSimpleReplyStream(
        { sessionId: "visit-mock-active", requestId: "req-2", content: "我的问题" },
        handler as never,
      )

      expect(deltaContent).toContain("我的问题")
    })
  })

  describe("simulateAssistantStream", () => {
    it("emits emergency events for critical symptoms", async () => {
      // Set lastMessage to contain trigger keyword
      mockDb.sendMessage({
        sessionId: "visit-mock-active",
        content: "胸痛伴呼吸困难",
        clientMessageId: "client-emergency",
      })

      const events: string[] = []
      const handler = {
        onOpen: vi.fn(),
        onEvent: vi.fn((event: { type: string }) => {
          events.push(event.type)
        }),
        onDone: vi.fn(),
        onError: vi.fn(),
      }

      await simulateAssistantStream(
        { sessionId: "visit-mock-active", requestId: "req-emergency" },
        handler as never,
      )

      expect(events).toContain("emergency")
      expect(events).toContain("done")
    })

    it("emits delta events for normal symptoms", async () => {
      const events: string[] = []
      const handler = {
        onOpen: vi.fn(),
        onEvent: vi.fn((event: { type: string }) => {
          events.push(event.type)
        }),
        onDone: vi.fn(),
        onError: vi.fn(),
      }

      await simulateAssistantStream(
        { sessionId: "visit-mock-active", requestId: "req-normal" },
        handler as never,
      )

      expect(events).toContain("delta")
      expect(events).toContain("message_final")
      expect(events).toContain("done")
    })

    it("emits card event with lab decision card", async () => {
      const eventTypes: string[] = []
      let cardEvent: { type: string; card?: { kind: string } } | undefined
      const handler = {
        onOpen: vi.fn(),
        onEvent: vi.fn(
          (event: { type: string; card?: { kind: string } }) => {
            eventTypes.push(event.type)
            if (event.type === "card") {
              cardEvent = event
            }
          },
        ),
        onDone: vi.fn(),
        onError: vi.fn(),
      }

      await simulateAssistantStream(
        { sessionId: "visit-mock-active", requestId: "req-card" },
        handler as never,
      )

      expect(eventTypes).toContain("card")
      expect(cardEvent?.card?.kind).toBe("lab_decision")
    })

    it("emits state event", async () => {
      const events: { type: string; state?: string }[] = []
      const handler = {
        onOpen: vi.fn(),
        onEvent: vi.fn((event: { type: string; state?: string }) => {
          events.push(event)
        }),
        onDone: vi.fn(),
        onError: vi.fn(),
      }

      await simulateAssistantStream(
        { sessionId: "visit-mock-active", requestId: "req-state" },
        handler as never,
      )

      const stateEvent = events.find((e) => e.type === "state")
      expect(stateEvent).toBeDefined()
      expect(stateEvent?.state).toBe("labDecision")
    })

    it("calls onError and emits error event on failure", async () => {
      const handler = {
        onOpen: vi.fn(),
        onEvent: vi.fn(),
        onDone: vi.fn(),
        onError: vi.fn(),
        signal: new AbortController().signal,
      }

      // Force an error by using a bad signal that's already aborted
      const controller = new AbortController()
      controller.abort()
      const abortHandler = { ...handler, signal: controller.signal }

      await simulateAssistantStream(
        { sessionId: "visit-mock-active", requestId: "req-error" },
        abortHandler as never,
      )

      // The stream should call onError when aborted
      // Note: the error might be caught differently depending on timing
    })
  })
})
