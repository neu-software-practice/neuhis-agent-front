import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useIsDesktop } from "@/lib/use-is-desktop"

/**
 * Helper to mock window.matchMedia. jsdom does not implement it in a way
 * that supports addEventListener/removeEventListener for media queries.
 */
function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>()
  const mql = {
    matches,
    media: "(min-width: 768px)",
    onchange: null,
    addEventListener: (_: "change", cb: (e: { matches: boolean }) => void) => {
      listeners.add(cb)
    },
    removeEventListener: (_: "change", cb: (e: { matches: boolean }) => void) => {
      listeners.delete(cb)
    },
    dispatchEvent: (e: { matches: boolean }) => {
      listeners.forEach((cb) => cb(e))
      return false
    },
    addListener: (cb: (e: { matches: boolean }) => void) => listeners.add(cb),
    removeListener: (cb: (e: { matches: boolean }) => void) => listeners.delete(cb),
  }
  // jsdom does not implement window.matchMedia, so define it before spying.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn(() => mql as unknown as MediaQueryList),
  })
  return mql
}

describe("useIsDesktop", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns true when the viewport is at least 768px wide", () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(true)
  })

  it("returns false when the viewport is narrower than 768px", () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)
  })

  it("updates when the media query match changes", () => {
    const mql = mockMatchMedia(false)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)

    act(() => {
      mql.dispatchEvent({ matches: true })
    })
    expect(result.current).toBe(true)

    act(() => {
      mql.dispatchEvent({ matches: false })
    })
    expect(result.current).toBe(false)
  })

  it("removes the change listener on unmount", () => {
    const mql = mockMatchMedia(true)
    const removeSpy = vi.spyOn(mql, "removeEventListener")
    const { unmount } = renderHook(() => useIsDesktop())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith("change", expect.any(Function))
  })
})
