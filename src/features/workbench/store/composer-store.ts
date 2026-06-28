import { create } from "zustand"

interface ComposerState {
  draftsBySession: Record<string, string>
  setDraft: (sessionId: string, value: string) => void
  clearDraft: (sessionId: string) => void
}

export const useComposerStore = create<ComposerState>((set) => ({
  draftsBySession: {},
  setDraft: (sessionId, value) =>
    set((s) => ({ draftsBySession: { ...s.draftsBySession, [sessionId]: value } })),
  clearDraft: (sessionId) =>
    set((s) => {
      const next = { ...s.draftsBySession }
      delete next[sessionId]
      return { draftsBySession: next }
    }),
}))
