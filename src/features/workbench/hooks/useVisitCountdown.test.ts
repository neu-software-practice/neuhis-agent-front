import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useVisitCountdown } from "@/features/workbench/hooks/useVisitCountdown"

// 固定系统时间基准，所有 deadline 相对此值偏移，保证确定性。
const NOW = Date.parse("2026-06-28T01:00:00.000Z")
const MINUTE = 60 * 1000

function isoAt(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString()
}

describe("useVisitCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it("reports normal phase with no warning text above 5 minutes", () => {
    const { result } = renderHook(() =>
      useVisitCountdown({ timeoutAt: isoAt(6 * MINUTE), active: true }),
    )

    expect(result.current.phase).toBe("normal")
    expect(result.current.warningText).toBe("")
    expect(result.current.remainingMs).toBe(6 * MINUTE)
  })

  it("enters warn5 at or below 5 minutes", () => {
    const { result } = renderHook(() =>
      useVisitCountdown({ timeoutAt: isoAt(4 * MINUTE), active: true }),
    )

    expect(result.current.phase).toBe("warn5")
    expect(result.current.warningText).toBe("问诊时间即将结束")
  })

  it("enters warn2 at or below 2 minutes", () => {
    const { result } = renderHook(() =>
      useVisitCountdown({ timeoutAt: isoAt(90 * 1000), active: true }),
    )

    expect(result.current.phase).toBe("warn2")
    expect(result.current.warningText).toBe("即将超时，请尽快完成")
  })

  it("reports expired phase with empty warning text once the deadline passes", () => {
    const { result } = renderHook(() =>
      useVisitCountdown({ timeoutAt: isoAt(-1000), active: true }),
    )

    expect(result.current.phase).toBe("expired")
    expect(result.current.warningText).toBe("")
    expect(result.current.remainingMs).toBeLessThanOrEqual(0)
  })

  it("does not locally decrement while paused", () => {
    const { result } = renderHook(() =>
      useVisitCountdown({
        timeoutAt: isoAt(10 * MINUTE),
        pausedAt: isoAt(3 * MINUTE),
        timerPaused: true,
        active: true,
      }),
    )

    // 暂停以 pausedAt 为基准：10min - 3min = 7min 冻结。
    expect(result.current.remainingMs).toBe(7 * MINUTE)

    act(() => {
      vi.advanceTimersByTime(30 * 1000)
    })

    expect(result.current.remainingMs).toBe(7 * MINUTE)
  })

  it("fires onExpire exactly once at expiry when active and not paused", () => {
    const onExpire = vi.fn()
    renderHook(() =>
      useVisitCountdown({
        timeoutAt: isoAt(3 * 1000),
        active: true,
        onExpire,
      }),
    )

    expect(onExpire).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(5 * 1000)
    })

    expect(onExpire).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(5 * 1000)
    })

    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it("does not fire onExpire while paused even past the deadline", () => {
    const onExpire = vi.fn()
    renderHook(() =>
      useVisitCountdown({
        timeoutAt: isoAt(2 * 1000),
        pausedAt: isoAt(1000),
        timerPaused: true,
        active: true,
        onExpire,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(10 * 1000)
    })

    expect(onExpire).not.toHaveBeenCalled()
  })

  it("returns Infinity and normal phase when no timeoutAt is provided", () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() =>
      useVisitCountdown({ active: true, onExpire }),
    )

    expect(result.current.remainingMs).toBe(Number.POSITIVE_INFINITY)
    expect(result.current.phase).toBe("normal")
    expect(result.current.warningText).toBe("")

    act(() => {
      vi.advanceTimersByTime(10 * 1000)
    })

    expect(onExpire).not.toHaveBeenCalled()
  })

  it("never starts an interval or fires onExpire when inactive", () => {
    const onExpire = vi.fn()
    // active=false 时即便 deadline 已过，也不触发 onExpire（effect 提前 return）。
    const { result } = renderHook(() =>
      useVisitCountdown({
        timeoutAt: isoAt(-1000),
        active: false,
        onExpire,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(10 * 1000)
    })

    expect(onExpire).not.toHaveBeenCalled()
    // 有 timeoutAt 时 remainingMs 为有限值（非 Infinity），由 deadline 决定。
    expect(result.current.remainingMs).toBeLessThanOrEqual(0)
  })
})
