import { create } from "zustand"

interface WorkbenchUiState {
  contextDrawerOpen: boolean
  rightSummaryCollapsed: boolean
  atTimelineBottom: boolean
  lockQuestionSheetOpen: boolean
  lockQuestionCardId?: string
  setContextDrawerOpen: (open: boolean) => void
  setRightSummaryCollapsed: (collapsed: boolean) => void
  setAtTimelineBottom: (atBottom: boolean) => void
  setLockQuestionSheet: (open: boolean, cardId?: string) => void
}

export const useWorkbenchUiStore = create<WorkbenchUiState>((set) => ({
  contextDrawerOpen: false,
  rightSummaryCollapsed: false,
  atTimelineBottom: true,
  lockQuestionSheetOpen: false,
  lockQuestionCardId: undefined,
  setContextDrawerOpen: (open) => set({ contextDrawerOpen: open }),
  setRightSummaryCollapsed: (collapsed) => set({ rightSummaryCollapsed: collapsed }),
  setAtTimelineBottom: (atBottom) => set({ atTimelineBottom: atBottom }),
  setLockQuestionSheet: (open, cardId) =>
    set({ lockQuestionSheetOpen: open, lockQuestionCardId: cardId }),
}))
