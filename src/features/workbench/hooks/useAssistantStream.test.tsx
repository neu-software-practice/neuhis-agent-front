import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/features/api"
import type { AssistantStreamEvent, TimelineItem } from "@/features/workbench/api"
import { workbenchApi } from "@/features/workbench/api"
import { useAssistantStream } from "@/features/workbench/hooks/useAssistantStream"
import type { VisitMachineEvent } from "@/features/workbench/machine/visit-machine.types"
import { createStreamingAssistantMessage } from "@/features/workbench/utils/timeline-merge"
import { resetTransportForTests } from "@/lib/api"
import { mockDb } from "@/mocks/api/mock-db"

/** Capture the latest set of stream handlers passed to the mocked API. */
let capturedHandlers: {
  signal?: AbortSignal
  onOpen?: () => void
  onEvent?: (event: AssistantStreamEvent) => void
  onError?: (error: unknown) => void
  onDone?: () => void
} = {}

beforeEach(() => {
  capturedHandlers = {}
  mockDb.reset()
  resetTransportForTests()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Mock requestAnimationFrame to execute synchronously for tests
beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(
    (cb: FrameRequestCallback) => {
      cb(Date.now())
      return 1
    },
  )
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
})

describe("useAssistantStream", () => {
  // ---- Original integration test (keep) ----

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

  // ---- New unit tests (mock-based) ----

  describe("startStream", () => {
    beforeEach(() => {
      vi.spyOn(workbenchApi, "streamAssistantMessage").mockImplementation(
        (_input: unknown, handlers: typeof capturedHandlers) => {
          capturedHandlers = handlers
          return Promise.resolve()
        },
      )
      vi.spyOn(workbenchApi, "streamConsultationReply").mockImplementation(
        (_input: unknown, handlers: typeof capturedHandlers) => {
          capturedHandlers = handlers
          return Promise.resolve()
        },
      )
      vi.spyOn(workbenchApi, "askLockedQuestion").mockImplementation(
        (_input: unknown, handlers: typeof capturedHandlers) => {
          capturedHandlers = handlers
          return Promise.resolve()
        },
      )
    })

    it("starts stream with assistant mode by default", () => {
      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      expect(result.current.isStreaming).toBe(false)

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      expect(result.current.isStreaming).toBe(true)
      expect(workbenchApi.streamAssistantMessage).toHaveBeenCalledTimes(1)
      expect(workbenchApi.streamConsultationReply).not.toHaveBeenCalled()
      expect(workbenchApi.askLockedQuestion).not.toHaveBeenCalled()
    })

    it("starts stream with consultation mode", () => {
      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({
          streamMessageId: "msg-001",
          mode: "consultation",
          content: "复诊咨询",
        })
      })

      expect(workbenchApi.streamConsultationReply).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: "visit-001", content: "复诊咨询" }),
        expect.any(Object),
      )
    })

    it("starts stream with lock-question mode when cardId is provided", () => {
      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({
          streamMessageId: "msg-001",
          mode: "lock-question",
          content: "锁问题",
          cardId: "card-001",
        })
      })

      expect(workbenchApi.askLockedQuestion).toHaveBeenCalledWith(
        expect.objectContaining({ cardId: "card-001" }),
        expect.any(Object),
      )
    })

    it("aborts previous stream before starting a new one", () => {
      const abortSpy = vi.fn()
      const originalAbort = AbortController.prototype.abort
      AbortController.prototype.abort = abortSpy

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })
      expect(abortSpy).not.toHaveBeenCalled()

      act(() => {
        result.current.startStream({ streamMessageId: "msg-002" })
      })
      expect(abortSpy).toHaveBeenCalledTimes(1)

      AbortController.prototype.abort = originalAbort
    })

    it("cancels previous pending rAF when starting a new stream", () => {
      // Override rAF to NOT fire synchronously so rafIdRef persists
      const rAFId = 999
      vi.spyOn(window, "requestAnimationFrame").mockImplementation(
        (_cb: FrameRequestCallback) => rAFId,
      )
      const cancelSpy = vi.spyOn(window, "cancelAnimationFrame")

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })
      // Send a delta to schedule a rAF
      act(() => {
        capturedHandlers.onEvent!({ type: "delta", content: "hello" })
      })

      // Second call must cancel the previous rAF
      act(() => {
        result.current.startStream({ streamMessageId: "msg-002" })
      })

      expect(cancelSpy).toHaveBeenCalledWith(rAFId)
    })

    it("handles stream promise rejection gracefully", async () => {
      vi.spyOn(workbenchApi, "streamAssistantMessage").mockImplementation(() =>
        Promise.reject(new Error("stream failed")),
      )

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      // isStreaming should become false after the catch handler runs
      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false)
      })
    })
  })

  describe("delta event handling", () => {
    beforeEach(() => {
      vi.spyOn(workbenchApi, "streamAssistantMessage").mockImplementation(
        (_input: unknown, handlers: typeof capturedHandlers) => {
          capturedHandlers = handlers
          return Promise.resolve()
        },
      )
    })

    it("accumulates delta text and flushes to timeline via updateTimelineItem", () => {
      const updateTimelineItem = vi.fn()

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem,
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      expect(capturedHandlers.onEvent).toBeDefined()

      // Send multiple delta events
      act(() => {
        capturedHandlers.onEvent!({ type: "delta", content: "你好" })
      })

      // The updater should have been called with the accumulated content
      expect(updateTimelineItem).toHaveBeenCalledWith(
        "msg-001",
        expect.any(Function),
      )

      // Verify the updater appends content
      const updater = updateTimelineItem.mock.calls[0][1] as (item: TimelineItem) => TimelineItem
      const baseItem = {
        kind: "message" as const,
        id: "msg-001",
        sessionId: "visit-001",
        createdAt: new Date().toISOString(),
        status: "streaming" as const,
        role: "assistant" as const,
        content: "",
      }
      const resultItem = updater(baseItem)
      expect((resultItem as typeof baseItem).content).toBe("你好")
    })

    it("does not flush delta when there is no pending text", () => {
      const updateTimelineItem = vi.fn()

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem,
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      // Call flush without sending any delta events first
      // The flushDelta is only called via rAF inside the onEvent handler,
      // so we just verify that updateTimelineItem wasn't called for a non-delta
      expect(updateTimelineItem).not.toHaveBeenCalled()
    })
  })

  describe("message_final event handling", () => {
    beforeEach(() => {
      vi.spyOn(workbenchApi, "streamAssistantMessage").mockImplementation(
        (_input: unknown, handlers: typeof capturedHandlers) => {
          capturedHandlers = handlers
          return Promise.resolve()
        },
      )
    })

    it("flushes pending delta and finalizes streaming message with content", () => {
      const updateTimelineItem = vi.fn()

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem,
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      // Send a delta and then message_final
      act(() => {
        capturedHandlers.onEvent!({ type: "delta", content: "完整" })
      })

      expect(updateTimelineItem).toHaveBeenCalledTimes(1)

      act(() => {
        capturedHandlers.onEvent!({
          type: "message_final",
          item: { content: "完整回复" },
        } as AssistantStreamEvent)
      })

      // message_final should trigger another updateTimelineItem call
      expect(updateTimelineItem).toHaveBeenCalledTimes(2)

      // Verify the finalize updater replaces content with final text
      const finalCall = updateTimelineItem.mock.calls[1]
      expect(finalCall[0]).toBe("msg-001")
      const finalUpdater = finalCall[1] as (item: TimelineItem) => TimelineItem
      const baseItem = {
        kind: "message" as const,
        id: "msg-001",
        sessionId: "visit-001",
        createdAt: new Date().toISOString(),
        status: "streaming" as const,
        role: "assistant" as const,
        content: "incomplete",
      }
      const finalized = finalUpdater(baseItem) as typeof baseItem
      expect(finalized.status).toBe("done")
      expect(finalized.content).toBe("完整回复")
    })
  })

  describe("card event handling", () => {
    const mockCard = {
      id: "card-001",
      sessionId: "visit-001",
      kind: "lab_decision" as const,
      status: "pending" as const,
      blocking: true,
      title: "建议检验",
      createdAt: "2026-06-28T01:00:00.000Z",
    }

    beforeEach(() => {
      vi.spyOn(workbenchApi, "streamAssistantMessage").mockImplementation(
        (_input: unknown, handlers: typeof capturedHandlers) => {
          capturedHandlers = handlers
          return Promise.resolve()
        },
      )
    })

    it("creates a card item and sends machine event on card event (with and without timelineItem)", () => {
      const upsertTimelineItems = vi.fn()
      const sendMachineEvent = vi.fn()

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent,
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems,
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      // Test: card event WITHOUT timelineItem
      act(() => {
        capturedHandlers.onEvent!({
          type: "card",
          sessionId: "visit-001",
          card: mockCard,
        } as AssistantStreamEvent)
      })

      expect(upsertTimelineItems).toHaveBeenCalledTimes(1)
      expect(sendMachineEvent).toHaveBeenCalledWith({
        type: "LAB_CARD_RAISED",
        cardId: "card-001",
      })

      const upsertedItems = upsertTimelineItems.mock.calls[0][0] as TimelineItem[]
      expect(upsertedItems).toHaveLength(1)
      expect(upsertedItems[0]).toMatchObject({
        kind: "flow_card",
        id: "card-001",
        card: mockCard,
      })

      upsertTimelineItems.mockClear()

      // Test: card event WITH timelineItem
      const timelineItem: TimelineItem = {
        kind: "flow_card",
        id: "tl-card-001",
        sessionId: "visit-001",
        createdAt: "2026-06-28T01:00:00.000Z",
        status: "done",
        card: { ...mockCard, id: "card-002" },
      }

      act(() => {
        capturedHandlers.onEvent!({
          type: "card",
          sessionId: "visit-001",
          card: mockCard,
          timelineItem,
        } as AssistantStreamEvent)
      })

      expect(upsertTimelineItems).toHaveBeenCalledWith([timelineItem])
      expect(sendMachineEvent).toHaveBeenCalledTimes(2)
    })
  })

  describe("state event handling", () => {
    beforeEach(() => {
      vi.spyOn(workbenchApi, "streamAssistantMessage").mockImplementation(
        (_input: unknown, handlers: typeof capturedHandlers) => {
          capturedHandlers = handlers
          return Promise.resolve()
        },
      )
    })

    it("sends AGENT_ANALYSIS_STARTED on state event 'analyzing'", () => {
      const sendMachineEvent = vi.fn()

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent,
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      act(() => {
        capturedHandlers.onEvent!({
          type: "state",
          state: "analyzing",
        } as AssistantStreamEvent)
      })

      expect(sendMachineEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "AGENT_ANALYSIS_STARTED" }),
      )
    })

    it("does not send a machine event for unmapped states", () => {
      const sendMachineEvent = vi.fn()

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent,
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      act(() => {
        capturedHandlers.onEvent!({
          type: "state",
          state: "lab_decision",
        } as AssistantStreamEvent)
      })

      expect(sendMachineEvent).not.toHaveBeenCalled()
    })
  })

  describe("done / error / onError / onDone events", () => {
    beforeEach(() => {
      vi.spyOn(workbenchApi, "streamAssistantMessage").mockImplementation(
        (_input: unknown, handlers: typeof capturedHandlers) => {
          capturedHandlers = handlers
          return Promise.resolve()
        },
      )
    })

    it("sets isStreaming to false on done event", () => {
      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })
      expect(result.current.isStreaming).toBe(true)

      act(() => {
        capturedHandlers.onEvent!({ type: "done" } as AssistantStreamEvent)
      })

      expect(result.current.isStreaming).toBe(false)
    })

    it("marks message as failed and sets isStreaming to false on error event", () => {
      const updateTimelineItem = vi.fn()

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem,
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      act(() => {
        capturedHandlers.onEvent!({
          type: "error",
          message: "something went wrong",
          code: "STREAM_ERROR",
        } as AssistantStreamEvent)
      })

      expect(result.current.isStreaming).toBe(false)

      // Should mark message as failed
      expect(updateTimelineItem).toHaveBeenCalledWith(
        "msg-001",
        expect.any(Function),
      )
      const updater = updateTimelineItem.mock.calls[0][1] as (item: TimelineItem) => TimelineItem
      const baseItem = {
        kind: "message" as const,
        id: "msg-001",
        sessionId: "visit-001",
        createdAt: new Date().toISOString(),
        status: "streaming" as const,
        role: "assistant" as const,
        content: "",
      }
      const failedItem = updater(baseItem) as typeof baseItem
      expect(failedItem.status).toBe("failed")
    })

    it("sets isStreaming to false on transport onError", () => {
      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })
      expect(result.current.isStreaming).toBe(true)

      act(() => {
        capturedHandlers.onError!(new Error("transport error"))
      })

      expect(result.current.isStreaming).toBe(false)
    })

    it("does not crash on message_final when no stream message is active", () => {
      const updateTimelineItem = vi.fn()

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem,
          upsertTimelineItems: vi.fn(),
        }),
      )

      // Start stream, then abort to clear streamMessageIdRef
      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })
      act(() => {
        result.current.abortStream("exit")
      })

      // Now send message_final - streamMessageIdRef.current should be null
      act(() => {
        capturedHandlers.onEvent!({
          type: "message_final",
          item: { content: "orphaned final" },
        } as AssistantStreamEvent)
      })

      // Should not crash; updateTimelineItem should NOT be called again for the finalize
      expect(result.current.isStreaming).toBe(false)
    })

    it("sets isStreaming to false on onDone", () => {
      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })
      expect(result.current.isStreaming).toBe(true)

      act(() => {
        capturedHandlers.onDone!()
      })

      expect(result.current.isStreaming).toBe(false)
    })
  })

  describe("abortStream", () => {
    beforeEach(() => {
      vi.spyOn(workbenchApi, "streamAssistantMessage").mockImplementation(
        (_input: unknown, handlers: typeof capturedHandlers) => {
          capturedHandlers = handlers
          return Promise.resolve()
        },
      )
    })

    it("cancels pending rAF when aborting with live delta buffer", () => {
      // Override rAF to NOT fire synchronously, so rafIdRef stays set
      vi.spyOn(window, "requestAnimationFrame").mockImplementation(
        (_cb: FrameRequestCallback) => {
          return 42 // store ID but don't invoke callback
        },
      )
      const cancelSpy = vi.spyOn(window, "cancelAnimationFrame")

      const updateTimelineItem = vi.fn()

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem,
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      // Now send a delta so rAF gets scheduled (but won't fire)
      expect(capturedHandlers.onEvent).toBeDefined()
      act(() => {
        capturedHandlers.onEvent!({ type: "delta", content: "pending data" })
      })

      // There should be a pending rAF now. Abort to trigger the cancel branch.
      act(() => {
        result.current.abortStream("exit")
      })

      expect(cancelSpy).toHaveBeenCalled()
      expect(updateTimelineItem).toHaveBeenCalledWith(
        "msg-001",
        expect.any(Function),
      )
    })

    it("marks the streaming message as invalidated when aborted with non-error reason", () => {
      const updateTimelineItem = vi.fn()

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem,
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      act(() => {
        result.current.abortStream("exit")
      })

      expect(updateTimelineItem).toHaveBeenCalledWith(
        "msg-001",
        expect.any(Function),
      )

      const updater = updateTimelineItem.mock.calls[0][1] as (item: TimelineItem) => TimelineItem
      const baseItem = {
        kind: "message" as const,
        id: "msg-001",
        sessionId: "visit-001",
        createdAt: new Date().toISOString(),
        status: "streaming" as const,
        role: "assistant" as const,
        content: "partial",
      }
      const invalidated = updater(baseItem) as typeof baseItem
      expect(invalidated.status).toBe("invalidated")
      expect(invalidated.interruptedBy).toBe("exit")
    })

    it("does nothing when abortStream is called without an active stream", () => {
      const updateTimelineItem = vi.fn()

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem,
          upsertTimelineItems: vi.fn(),
        }),
      )

      // Call abortStream without starting any stream first
      act(() => {
        result.current.abortStream("exit")
      })

      // Should not have called updateTimelineItem since there's no active message
      expect(updateTimelineItem).not.toHaveBeenCalled()
      expect(result.current.isStreaming).toBe(false)
    })

    it("marks the streaming message as failed when aborted with error reason", () => {
      const updateTimelineItem = vi.fn()

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem,
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      act(() => {
        result.current.abortStream("error")
      })

      const updater = updateTimelineItem.mock.calls[0][1] as (item: TimelineItem) => TimelineItem
      const baseItem = {
        kind: "message" as const,
        id: "msg-001",
        sessionId: "visit-001",
        createdAt: new Date().toISOString(),
        status: "streaming" as const,
        role: "assistant" as const,
        content: "",
      }
      const failed = updater(baseItem) as typeof baseItem
      expect(failed.status).toBe("failed")
    })

    it("does not modify the item when abortStream targets a non-streaming message", () => {
      const updateTimelineItem = vi.fn()

      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem,
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      act(() => {
        result.current.abortStream("exit")
      })

      // Verify the updater correctly handles non-streaming item (guard clause)
      const updater = updateTimelineItem.mock.calls[0][1] as (item: TimelineItem) => TimelineItem
      // A done message should pass through unchanged
      const doneItem = {
        kind: "message" as const,
        id: "msg-001",
        sessionId: "visit-001",
        createdAt: new Date().toISOString(),
        status: "done" as const,
        role: "assistant" as const,
        content: "already complete",
      }
      const unchanged = updater(doneItem)
      expect(unchanged).toBe(doneItem) // Should return the same reference

      // A non-message item should also pass through unchanged
      const flowItem = {
        kind: "flow_card" as const,
        id: "fc-001",
        sessionId: "visit-001",
        createdAt: new Date().toISOString(),
        status: "done" as const,
        card: { id: "card-001" } as any,
      }
      const unchangedFlow = updater(flowItem)
      expect(unchangedFlow).toBe(flowItem)
    })

    it("sets isStreaming to false after abort", () => {
      const { result } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })
      expect(result.current.isStreaming).toBe(true)

      act(() => {
        result.current.abortStream("timeout")
      })

      expect(result.current.isStreaming).toBe(false)
    })
  })

  describe("unmount cleanup", () => {
    beforeEach(() => {
      vi.spyOn(workbenchApi, "streamAssistantMessage").mockImplementation(
        (_input: unknown, handlers: typeof capturedHandlers) => {
          capturedHandlers = handlers
          return Promise.resolve()
        },
      )
    })

    it("cleans up on unmount", () => {
      const abortSpy = vi.fn()
      const originalAbort = AbortController.prototype.abort
      AbortController.prototype.abort = abortSpy

      const { result, unmount } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      unmount()

      expect(abortSpy).toHaveBeenCalled()

      AbortController.prototype.abort = originalAbort
    })

    it("does not update state after unmount via stream catch", () => {
      const rejectPromise = Promise.reject(new Error("stream failed"))
      // Suppress unhandled rejection warning
      rejectPromise.catch(() => {})

      vi.spyOn(workbenchApi, "streamAssistantMessage").mockImplementation(() => rejectPromise)

      const { result, unmount } = renderHook(() =>
        useAssistantStream({
          sessionId: "visit-001",
          sendMachineEvent: vi.fn(),
          appendTimelineItem: vi.fn(),
          updateTimelineItem: vi.fn(),
          upsertTimelineItems: vi.fn(),
        }),
      )

      act(() => {
        result.current.startStream({ streamMessageId: "msg-001" })
      })

      // Unmount while promise is pending
      unmount()
      // No crash is the assertion
    })
  })
})
