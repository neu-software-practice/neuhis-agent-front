import { beforeEach, describe, expect, it } from "vitest"

import { useComposerStore } from "@/features/workbench/store/composer-store"

describe("composer-store", () => {
  beforeEach(() => {
    // Reset store state between tests.
    useComposerStore.setState({ draftsBySession: {} })
  })

  it("initializes with an empty drafts map", () => {
    expect(useComposerStore.getState().draftsBySession).toEqual({})
  })

  it("sets a draft for a session", () => {
    useComposerStore.getState().setDraft("visit-001", "hello")
    expect(useComposerStore.getState().draftsBySession).toEqual({
      "visit-001": "hello",
    })
  })

  it("overwrites an existing draft for the same session", () => {
    const { setDraft } = useComposerStore.getState()
    setDraft("visit-001", "first")
    setDraft("visit-001", "second")
    expect(useComposerStore.getState().draftsBySession["visit-001"]).toBe("second")
  })

  it("keeps drafts from other sessions when setting a new one", () => {
    const { setDraft } = useComposerStore.getState()
    setDraft("visit-001", "a")
    setDraft("visit-002", "b")
    expect(useComposerStore.getState().draftsBySession).toEqual({
      "visit-001": "a",
      "visit-002": "b",
    })
  })

  it("clears a specific session draft", () => {
    const { setDraft, clearDraft } = useComposerStore.getState()
    setDraft("visit-001", "a")
    setDraft("visit-002", "b")
    clearDraft("visit-001")
    expect(useComposerStore.getState().draftsBySession).toEqual({
      "visit-002": "b",
    })
  })

  it("clearing a non-existent session is a no-op", () => {
    const { setDraft, clearDraft } = useComposerStore.getState()
    setDraft("visit-001", "a")
    clearDraft("visit-missing")
    expect(useComposerStore.getState().draftsBySession).toEqual({
      "visit-001": "a",
    })
  })

  it("can set an empty string draft", () => {
    const { setDraft } = useComposerStore.getState()
    setDraft("visit-001", "abc")
    setDraft("visit-001", "")
    expect(useComposerStore.getState().draftsBySession["visit-001"]).toBe("")
  })
})
