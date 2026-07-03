import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useDebounce } from "@/hooks/useDebounce"

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500))
    expect(result.current).toBe("hello")
  })

  it("updates the value after the specified delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: "first", delay: 500 } },
    )

    expect(result.current).toBe("first")

    rerender({ value: "second", delay: 500 })
    // Before the delay elapses the value should not have changed.
    expect(result.current).toBe("first")

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe("second")
  })

  it("debounces rapid changes and only applies the latest value", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } },
    )

    // Rapidly change the value several times within the delay window.
    rerender({ value: "b", delay: 300 })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    rerender({ value: "c", delay: 300 })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    rerender({ value: "d", delay: 300 })

    // Still within the final delay window → value should not have updated yet.
    expect(result.current).toBe("a")

    act(() => {
      vi.advanceTimersByTime(300)
    })
    // Only the latest value should be applied.
    expect(result.current).toBe("d")
  })

  it("clears the previous timer when the value changes", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout")
    const { rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: "x", delay: 200 } },
    )

    rerender({ value: "y", delay: 200 })
    // The cleanup function of the previous effect should have called clearTimeout.
    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it("cleans up the timer on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout")
    const { unmount } = renderHook(() => useDebounce("value", 200))

    act(() => {
      vi.advanceTimersByTime(100)
    })
    unmount()
    // Unmount should trigger the cleanup and clear the pending timer.
    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it("respects a delay of 0", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 0 } },
    )

    rerender({ value: "b", delay: 0 })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe("b")
  })

  it("reacts to a change in the delay prop", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 100 } },
    )

    // Increase the delay before the first timer fires.
    rerender({ value: "b", delay: 1000 })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    // The old 100ms timer was cleared; the new 1000ms timer has not fired yet.
    expect(result.current).toBe("a")

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe("b")
  })
})
