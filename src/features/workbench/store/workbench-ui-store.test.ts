import { beforeEach, describe, expect, it } from "vitest"

import { useWorkbenchUiStore } from "@/features/workbench/store/workbench-ui-store"

describe("workbench-ui-store", () => {
  beforeEach(() => {
    // Reset to initial state between tests.
    useWorkbenchUiStore.setState({
      contextDrawerOpen: false,
      rightSummaryCollapsed: false,
      atTimelineBottom: true,
      lockQuestionSheetOpen: false,
      lockQuestionCardId: undefined,
      timeoutOverlayOpen: false,
      exitSheetOpen: false,
      pauseSheetOpen: false,
    })
  })

  it("has the expected initial state", () => {
    const s = useWorkbenchUiStore.getState()
    expect(s.contextDrawerOpen).toBe(false)
    expect(s.rightSummaryCollapsed).toBe(false)
    expect(s.atTimelineBottom).toBe(true)
    expect(s.lockQuestionSheetOpen).toBe(false)
    expect(s.lockQuestionCardId).toBeUndefined()
    expect(s.timeoutOverlayOpen).toBe(false)
    expect(s.exitSheetOpen).toBe(false)
    expect(s.pauseSheetOpen).toBe(false)
  })

  describe("setContextDrawerOpen", () => {
    it("opens the context drawer", () => {
      useWorkbenchUiStore.getState().setContextDrawerOpen(true)
      expect(useWorkbenchUiStore.getState().contextDrawerOpen).toBe(true)
    })

    it("closes the context drawer", () => {
      useWorkbenchUiStore.getState().setContextDrawerOpen(true)
      useWorkbenchUiStore.getState().setContextDrawerOpen(false)
      expect(useWorkbenchUiStore.getState().contextDrawerOpen).toBe(false)
    })
  })

  describe("setRightSummaryCollapsed", () => {
    it("collapses and expands the right summary", () => {
      const { setRightSummaryCollapsed } = useWorkbenchUiStore.getState()
      setRightSummaryCollapsed(true)
      expect(useWorkbenchUiStore.getState().rightSummaryCollapsed).toBe(true)
      setRightSummaryCollapsed(false)
      expect(useWorkbenchUiStore.getState().rightSummaryCollapsed).toBe(false)
    })
  })

  describe("setAtTimelineBottom", () => {
    it("toggles the atTimelineBottom flag", () => {
      const { setAtTimelineBottom } = useWorkbenchUiStore.getState()
      setAtTimelineBottom(false)
      expect(useWorkbenchUiStore.getState().atTimelineBottom).toBe(false)
      setAtTimelineBottom(true)
      expect(useWorkbenchUiStore.getState().atTimelineBottom).toBe(true)
    })
  })

  describe("setLockQuestionSheet", () => {
    it("opens the lock question sheet with a cardId", () => {
      useWorkbenchUiStore.getState().setLockQuestionSheet(true, "card-001")
      const state = useWorkbenchUiStore.getState()
      expect(state.lockQuestionSheetOpen).toBe(true)
      expect(state.lockQuestionCardId).toBe("card-001")
    })

    it("closes the lock question sheet and clears cardId", () => {
      const { setLockQuestionSheet } = useWorkbenchUiStore.getState()
      setLockQuestionSheet(true, "card-001")
      setLockQuestionSheet(false)
      const state = useWorkbenchUiStore.getState()
      expect(state.lockQuestionSheetOpen).toBe(false)
      expect(state.lockQuestionCardId).toBeUndefined()
    })

    it("sets cardId to undefined when omitted", () => {
      const { setLockQuestionSheet } = useWorkbenchUiStore.getState()
      setLockQuestionSheet(true, "card-001")
      setLockQuestionSheet(true)
      expect(useWorkbenchUiStore.getState().lockQuestionCardId).toBeUndefined()
    })
  })

  describe("setTimeoutOverlayOpen", () => {
    it("shows and hides the timeout overlay", () => {
      const { setTimeoutOverlayOpen } = useWorkbenchUiStore.getState()
      setTimeoutOverlayOpen(true)
      expect(useWorkbenchUiStore.getState().timeoutOverlayOpen).toBe(true)
      setTimeoutOverlayOpen(false)
      expect(useWorkbenchUiStore.getState().timeoutOverlayOpen).toBe(false)
    })
  })

  describe("setExitSheetOpen", () => {
    it("shows and hides the exit sheet", () => {
      const { setExitSheetOpen } = useWorkbenchUiStore.getState()
      setExitSheetOpen(true)
      expect(useWorkbenchUiStore.getState().exitSheetOpen).toBe(true)
      setExitSheetOpen(false)
      expect(useWorkbenchUiStore.getState().exitSheetOpen).toBe(false)
    })
  })

  describe("setPauseSheetOpen", () => {
    it("shows and hides the pause sheet", () => {
      const { setPauseSheetOpen } = useWorkbenchUiStore.getState()
      setPauseSheetOpen(true)
      expect(useWorkbenchUiStore.getState().pauseSheetOpen).toBe(true)
      setPauseSheetOpen(false)
      expect(useWorkbenchUiStore.getState().pauseSheetOpen).toBe(false)
    })
  })

  it("supports multiple independent state changes", () => {
    const state = useWorkbenchUiStore.getState()
    state.setContextDrawerOpen(true)
    state.setRightSummaryCollapsed(true)
    state.setTimeoutOverlayOpen(true)
    const result = useWorkbenchUiStore.getState()
    expect(result.contextDrawerOpen).toBe(true)
    expect(result.rightSummaryCollapsed).toBe(true)
    expect(result.timeoutOverlayOpen).toBe(true)
    // Unchanged fields retain their values.
    expect(result.atTimelineBottom).toBe(true)
    expect(result.exitSheetOpen).toBe(false)
  })
})
