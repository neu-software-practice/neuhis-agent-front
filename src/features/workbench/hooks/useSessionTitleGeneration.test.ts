import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { VisitSession } from "@/features/visits/api/types"
import { useSessionTitleGeneration } from "@/features/workbench/hooks/useSessionTitleGeneration"

const mockMutate = vi.fn()
const mockUseMutation = vi.fn()
const mockGetQueryData = vi.fn()
const mockSetQueryData = vi.fn()
const mockInvalidateQueries = vi.fn()

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    getQueryData: mockGetQueryData,
    setQueryData: mockSetQueryData,
    invalidateQueries: mockInvalidateQueries,
  }),
  useMutation: (opts: { mutationFn: () => void; onSuccess: (result: unknown) => void }) => {
    mockUseMutation(opts)
    return { mutate: mockMutate }
  },
}))

function makeSession(overrides: Partial<VisitSession> = {}): VisitSession {
  return {
    id: "visit-001",
    patientId: "patient-mock-001",
    patientName: "测试患者",
    entryType: "new",
    status: "chatting",
    startedAt: "2026-06-28T01:00:00.000Z",
    updatedAt: "2026-06-28T01:05:00.000Z",
    askRound: 1,
    askRoundLimit: 6,
    labRound: 0,
    labRoundLimit: 2,
    timerPaused: false,
    summary: {
      chiefComplaint: "发热",
    },
    ...overrides,
  }
}

describe("useSessionTitleGeneration", () => {
  beforeEach(() => {
    mockMutate.mockReset()
    mockUseMutation.mockReset()
    mockGetQueryData.mockReset()
    mockSetQueryData.mockReset()
    mockInvalidateQueries.mockReset()
  })

  afterEach(() => {
    mockMutate.mockReset()
    mockUseMutation.mockReset()
    mockGetQueryData.mockReset()
    mockSetQueryData.mockReset()
    mockInvalidateQueries.mockReset()
  })

  it("does not trigger title generation while streaming is true", () => {
    mockGetQueryData.mockReturnValue(makeSession())

    renderHook(() => useSessionTitleGeneration("visit-001", true))

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("does not trigger title generation when streaming stays false (no transition)", () => {
    mockGetQueryData.mockReturnValue(makeSession())

    renderHook(() => useSessionTitleGeneration("visit-001", false))

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("triggers title generation when streaming transitions from true to false", () => {
    mockGetQueryData.mockReturnValue(makeSession({ askRound: 1 }))

    const { rerender } = renderHook(
      ({ isStreaming }) => useSessionTitleGeneration("visit-001", isStreaming),
      { initialProps: { isStreaming: true } },
    )

    expect(mockMutate).not.toHaveBeenCalled()

    rerender({ isStreaming: false })

    expect(mockMutate).toHaveBeenCalledTimes(1)
  })

  it("does not trigger title generation if session is not found in cache", () => {
    mockGetQueryData.mockReturnValue(undefined)

    const { rerender } = renderHook(
      ({ isStreaming }) => useSessionTitleGeneration("visit-001", isStreaming),
      { initialProps: { isStreaming: true } },
    )

    rerender({ isStreaming: false })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("does not trigger title generation if session already has a title", () => {
    mockGetQueryData.mockReturnValue(
      makeSession({ summary: { title: "已有标题" } }),
    )

    const { rerender } = renderHook(
      ({ isStreaming }) => useSessionTitleGeneration("visit-001", isStreaming),
      { initialProps: { isStreaming: true } },
    )

    rerender({ isStreaming: false })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("does not trigger title generation if askRound is less than 1", () => {
    mockGetQueryData.mockReturnValue(makeSession({ askRound: 0 }))

    const { rerender } = renderHook(
      ({ isStreaming }) => useSessionTitleGeneration("visit-001", isStreaming),
      { initialProps: { isStreaming: true } },
    )

    rerender({ isStreaming: false })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("does not trigger title generation more than once per session", () => {
    mockGetQueryData.mockReturnValue(makeSession({ askRound: 1 }))

    const { rerender } = renderHook(
      ({ isStreaming }) => useSessionTitleGeneration("visit-001", isStreaming),
      { initialProps: { isStreaming: true } },
    )

    rerender({ isStreaming: false })
    expect(mockMutate).toHaveBeenCalledTimes(1)

    // Second transition should not trigger again
    rerender({ isStreaming: true })
    rerender({ isStreaming: false })

    expect(mockMutate).toHaveBeenCalledTimes(1)
  })

  it("triggers title generation for different session IDs independently", () => {
    mockGetQueryData.mockImplementation((key: string[]) => {
      const sessionId = key[key.length - 1]
      return makeSession({ id: sessionId, askRound: 1 })
    })

    const { rerender: rerender1 } = renderHook(
      ({ isStreaming }) => useSessionTitleGeneration("visit-001", isStreaming),
      { initialProps: { isStreaming: true } },
    )

    const { rerender: rerender2 } = renderHook(
      ({ isStreaming }) => useSessionTitleGeneration("visit-002", isStreaming),
      { initialProps: { isStreaming: true } },
    )

    rerender1({ isStreaming: false })
    rerender2({ isStreaming: false })

    expect(mockMutate).toHaveBeenCalledTimes(2)
  })

  it("updates session cache with generated title on success", () => {
    const session = makeSession({ askRound: 1 })
    mockGetQueryData.mockReturnValue(session)

    let onSuccess: (result: { title: string }) => void = () => {}
    mockUseMutation.mockImplementation((opts: { onSuccess: (result: { title: string }) => void }) => {
      onSuccess = opts.onSuccess
      return { mutate: mockMutate }
    })

    const { rerender } = renderHook(
      ({ isStreaming }) => useSessionTitleGeneration("visit-001", isStreaming),
      { initialProps: { isStreaming: true } },
    )

    rerender({ isStreaming: false })

    // Simulate mutation success
    onSuccess({ title: "AI 生成的标题" })

    expect(mockSetQueryData).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
    )
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["visits", "list"],
    })
  })

  it("does not trigger when streaming transitions from false to true (not a completion)", () => {
    mockGetQueryData.mockReturnValue(makeSession({ askRound: 1 }))

    const { rerender } = renderHook(
      ({ isStreaming }) => useSessionTitleGeneration("visit-001", isStreaming),
      { initialProps: { isStreaming: false } },
    )

    rerender({ isStreaming: true })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("does not trigger on initial render with streaming=false", () => {
    mockGetQueryData.mockReturnValue(makeSession({ askRound: 1 }))

    renderHook(() => useSessionTitleGeneration("visit-001", false))

    expect(mockMutate).not.toHaveBeenCalled()
  })

  // ---- New edge case tests ----

  it("covers the `if (!old) return old` branch in setQueryData callback", () => {
    // This tests the onSuccess handler where setQueryData receives
    // a callback and the cached old data is undefined/null.
    const session = makeSession({ askRound: 1 })
    mockGetQueryData.mockReturnValue(session)

    let capturedOnSuccess: (result: { title: string }) => void = () => {}
    mockUseMutation.mockImplementation(
      (opts: { onSuccess: (result: { title: string }) => void }) => {
        capturedOnSuccess = opts.onSuccess
        return { mutate: mockMutate }
      },
    )

    const { rerender } = renderHook(
      ({ isStreaming }) => useSessionTitleGeneration("visit-001", isStreaming),
      { initialProps: { isStreaming: true } },
    )

    rerender({ isStreaming: false })

    // Make setQueryData's updater receive null/undefined
    mockSetQueryData.mockImplementation(
      (_key: unknown, updater: (old: unknown) => unknown) => {
        const result = updater(null)
        // If old is null, updater should return null
        expect(result).toBeNull()
      },
    )

    capturedOnSuccess({ title: "标题" })

    // Should not crash, setQueryData updater should handle null old value
    expect(mockInvalidateQueries).toHaveBeenCalled()
  })

  it("covers the setQueryData updater with existing session data (truthy old)", () => {
    // This tests the onSuccess setQueryData updater where old data IS present,
    // covering the `return { ...old, summary: { ...old.summary, title: result.title } }` path.
    const session = makeSession({ askRound: 1 })
    mockGetQueryData.mockReturnValue(session)

    let onSuccess: (result: { title: string }) => void = () => {}
    mockUseMutation.mockImplementation(
      (opts: { onSuccess: (result: { title: string }) => void }) => {
        onSuccess = opts.onSuccess
        return { mutate: mockMutate }
      },
    )

    const { rerender } = renderHook(
      ({ isStreaming }) => useSessionTitleGeneration("visit-001", isStreaming),
      { initialProps: { isStreaming: true } },
    )

    rerender({ isStreaming: false })

    // Replace mockSetQueryData to actually invoke the updater with old session data
    let updatedSession: VisitSession | undefined
    mockSetQueryData.mockImplementation(
      (_key: unknown, updater: (old: VisitSession | undefined) => VisitSession | undefined) => {
        updatedSession = updater(session)
      },
    )

    onSuccess({ title: "AI 总结标题" })

    expect(updatedSession).toBeDefined()
    expect(updatedSession!.summary.title).toBe("AI 总结标题")
    // Original summary fields should be preserved
    expect(updatedSession!.summary.chiefComplaint).toBe("发热")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["visits", "list"],
    })
  })
})
