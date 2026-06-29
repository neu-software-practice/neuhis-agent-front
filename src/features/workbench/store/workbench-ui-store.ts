import { create } from "zustand"

interface WorkbenchUiState {
  contextDrawerOpen: boolean
  rightSummaryCollapsed: boolean
  atTimelineBottom: boolean
  lockQuestionSheetOpen: boolean
  lockQuestionCardId?: string
  // 超时到期阻断 Overlay 显隐：由 useVisitCountdown.onExpire 置位，机器收 VISIT_TIMEOUT。
  timeoutOverlayOpen: boolean
  // 退出结算 Sheet 显隐：由 Header 退出按钮置位，确认时调用方提交 exitVisit。
  // 注意：急症 Overlay 显隐由机器 `emergencyPending` 状态派生，不在此设 flag。
  exitSheetOpen: boolean
  setContextDrawerOpen: (open: boolean) => void
  setRightSummaryCollapsed: (collapsed: boolean) => void
  setAtTimelineBottom: (atBottom: boolean) => void
  setLockQuestionSheet: (open: boolean, cardId?: string) => void
  setTimeoutOverlayOpen: (open: boolean) => void
  setExitSheetOpen: (open: boolean) => void
}

export const useWorkbenchUiStore = create<WorkbenchUiState>((set) => ({
  contextDrawerOpen: false,
  rightSummaryCollapsed: false,
  atTimelineBottom: true,
  lockQuestionSheetOpen: false,
  lockQuestionCardId: undefined,
  timeoutOverlayOpen: false,
  exitSheetOpen: false,
  setContextDrawerOpen: (open) => set({ contextDrawerOpen: open }),
  setRightSummaryCollapsed: (collapsed) => set({ rightSummaryCollapsed: collapsed }),
  setAtTimelineBottom: (atBottom) => set({ atTimelineBottom: atBottom }),
  setLockQuestionSheet: (open, cardId) =>
    set({ lockQuestionSheetOpen: open, lockQuestionCardId: cardId }),
  setTimeoutOverlayOpen: (open) => set({ timeoutOverlayOpen: open }),
  setExitSheetOpen: (open) => set({ exitSheetOpen: open }),
}))
