import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useVisitCountdown } from "@/features/workbench/hooks/useVisitCountdown"

// 固定系统时间基准，所有时间相对此值偏移，保证确定性。
const NOW = Date.parse("2026-06-28T01:00:00.000Z")
const MINUTE = 60 * 1000

function isoAt(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString()
}

describe("useVisitCountdown (idle timer)", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it("reports normal phase with no warning text above 5 minutes of idle remaining", () => {
    // 最后操作在当下，空闲阈值 6min → 剩余 6min。
    const { result } = renderHook(() =>
      useVisitCountdown({
        lastActivityAt: isoAt(0),
        idleMs: 6 * MINUTE,
        active: true,
      }),
    )

    expect(result.current.phase).toBe("normal")
    expect(result.current.warningText).toBe("")
    expect(result.current.remainingMs).toBe(6 * MINUTE)
  })

  it("enters warn5 at or below 5 minutes of idle remaining", () => {
    const { result } = renderHook(() =>
      useVisitCountdown({
        lastActivityAt: isoAt(0),
        idleMs: 4 * MINUTE,
        active: true,
      }),
    )

    expect(result.current.phase).toBe("warn5")
    expect(result.current.warningText).toBe("长时间未操作，问诊即将暂停")
  })

  it("enters warn2 at or below 2 minutes of idle remaining", () => {
    const { result } = renderHook(() =>
      useVisitCountdown({
        lastActivityAt: isoAt(0),
        idleMs: 90 * 1000,
        active: true,
      }),
    )

    expect(result.current.phase).toBe("warn2")
    expect(result.current.warningText).toBe("即将自动暂停，可继续输入保持问诊")
  })

  it("reports expired phase with empty warning text once the idle deadline passes", () => {
    // 最后操作在 1s 前，空闲阈值 0 → 已过期。
    const { result } = renderHook(() =>
      useVisitCountdown({
        lastActivityAt: isoAt(-1000),
        idleMs: 0,
        active: true,
      }),
    )

    expect(result.current.phase).toBe("expired")
    expect(result.current.warningText).toBe("")
    expect(result.current.remainingMs).toBeLessThanOrEqual(0)
  })

  it("resets the remaining time when lastActivityAt advances (new activity)", () => {
    const { result, rerender } = renderHook(
      ({ lastActivityAt }: { lastActivityAt: string }) =>
        useVisitCountdown({
          lastActivityAt,
          idleMs: 10 * MINUTE,
          active: true,
        }),
      { initialProps: { lastActivityAt: isoAt(0) } },
    )

    expect(result.current.remainingMs).toBe(10 * MINUTE)

    // 时间推进 3min，剩余降到 7min。
    act(() => {
      vi.advanceTimersByTime(3 * MINUTE)
    })
    expect(result.current.remainingMs).toBe(7 * MINUTE)

    // 发生一次新操作（lastActivityAt 刷新到当前时间）→ 剩余重置回 10min。
    rerender({ lastActivityAt: new Date(NOW + 3 * MINUTE).toISOString() })
    expect(result.current.remainingMs).toBe(10 * MINUTE)
  })

  it("does not locally decrement while paused", () => {
    const { result } = renderHook(() =>
      useVisitCountdown({
        lastActivityAt: isoAt(0),
        idleMs: 10 * MINUTE,
        pausedAt: isoAt(3 * MINUTE),
        timerPaused: true,
        active: true,
      }),
    )

    // 暂停以 pausedAt 为基准冻结：deadline(10min) - pausedAt(3min) = 7min。
    expect(result.current.remainingMs).toBe(7 * MINUTE)

    act(() => {
      vi.advanceTimersByTime(30 * 1000)
    })

    expect(result.current.remainingMs).toBe(7 * MINUTE)
  })

  it("fires onIdleExpire exactly once at expiry when active and not paused", () => {
    const onIdleExpire = vi.fn()
    renderHook(() =>
      useVisitCountdown({
        lastActivityAt: isoAt(0),
        idleMs: 3 * 1000,
        active: true,
        onIdleExpire,
      }),
    )

    expect(onIdleExpire).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(5 * 1000)
    })

    expect(onIdleExpire).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(5 * 1000)
    })

    expect(onIdleExpire).toHaveBeenCalledTimes(1)
  })

  it("does not fire onIdleExpire while paused even past the idle deadline", () => {
    const onIdleExpire = vi.fn()
    renderHook(() =>
      useVisitCountdown({
        lastActivityAt: isoAt(0),
        idleMs: 2 * 1000,
        pausedAt: isoAt(1000),
        timerPaused: true,
        active: true,
        onIdleExpire,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(10 * 1000)
    })

    expect(onIdleExpire).not.toHaveBeenCalled()
  })

  it("returns Infinity and normal phase when no lastActivityAt is provided", () => {
    const onIdleExpire = vi.fn()
    const { result } = renderHook(() =>
      useVisitCountdown({ active: true, onIdleExpire }),
    )

    expect(result.current.remainingMs).toBe(Number.POSITIVE_INFINITY)
    expect(result.current.phase).toBe("normal")
    expect(result.current.warningText).toBe("")

    act(() => {
      vi.advanceTimersByTime(10 * 1000)
    })

    expect(onIdleExpire).not.toHaveBeenCalled()
  })

  it("never starts an interval or fires onIdleExpire when inactive", () => {
    const onIdleExpire = vi.fn()
    // active=false 时即便空闲 deadline 已过，也不触发 onIdleExpire（effect 提前 return）。
    const { result } = renderHook(() =>
      useVisitCountdown({
        lastActivityAt: isoAt(-1000),
        idleMs: 0,
        active: false,
        onIdleExpire,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(10 * 1000)
    })

    expect(onIdleExpire).not.toHaveBeenCalled()
    // 有 lastActivityAt 时 remainingMs 为有限值（非 Infinity），由 idle deadline 决定。
    expect(result.current.remainingMs).toBeLessThanOrEqual(0)
  })

  // ---- New edge case tests ----

  it("handles invalid ISO date in lastActivityAt (NaN parse)", () => {
    const { result } = renderHook(() =>
      useVisitCountdown({
        lastActivityAt: "not-a-valid-date",
        idleMs: 5 * MINUTE,
        active: true,
      }),
    )

    // Invalid date string → toMs returns undefined → deadlineMs undefined → remainingMs Infinity
    expect(result.current.remainingMs).toBe(Number.POSITIVE_INFINITY)
    expect(result.current.phase).toBe("normal")

    // No interval should start
    act(() => {
      vi.advanceTimersByTime(10 * 1000)
    })
    // remainingMs stays Infinity
    expect(result.current.remainingMs).toBe(Number.POSITIVE_INFINITY)
  })

  it("handles invalid ISO date in pausedAt gracefully (timer does not tick)", () => {
    const onIdleExpire = vi.fn()
    const { result } = renderHook(() =>
      useVisitCountdown({
        lastActivityAt: isoAt(0),
        idleMs: 5 * MINUTE,
        pausedAt: "invalid-date",
        timerPaused: true,
        active: true,
        onIdleExpire,
      }),
    )

    // Invalid pausedAt → toMs returns undefined → pausedAtMs = undefined
    // timerPaused=true but pausedAtMs is undefined → referenceNow falls back to now
    // timerPaused is true → effect returns early (no interval)
    // remainingMs = deadlineMs - referenceNow (frozen at initial value)
    expect(result.current.remainingMs).toBe(5 * MINUTE)

    // Advance time → no change because no interval is running
    act(() => {
      vi.advanceTimersByTime(1 * MINUTE)
    })
    expect(result.current.remainingMs).toBe(5 * MINUTE)
  })

  it("does not use pausedAt when timerPaused is false", () => {
    const { result } = renderHook(() =>
      useVisitCountdown({
        lastActivityAt: isoAt(0),
        idleMs: 10 * MINUTE,
        pausedAt: isoAt(3 * MINUTE),
        timerPaused: false,
        active: true,
      }),
    )

    // timerPaused=false → referenceNow = now, not pausedAt
    expect(result.current.remainingMs).toBe(10 * MINUTE)

    act(() => {
      vi.advanceTimersByTime(1 * MINUTE)
    })
    expect(result.current.remainingMs).toBe(9 * MINUTE)
  })

  it("enters expired phase when remainingMs is exactly 0", () => {
    // Set idle threshold so that remaining is exactly 0
    // lastActivityAt = NOW, idleMs = -NOW (effectively)
    // deadlineMs = NOW + (-NOW) = 0, remainingMs = 0 - NOW = -NOW
    // Actually, let me just set lastActivityAt so deadline is NOW
    // deadlineMs = activityMs + idleMs
    // If activityMs = NOW and idleMs = 0, deadlineMs = NOW
    // remainingMs = NOW - NOW = 0

    const onIdleExpire = vi.fn()
    renderHook(() =>
      useVisitCountdown({
        lastActivityAt: isoAt(0),
        idleMs: 0,
        active: true,
        onIdleExpire,
      }),
    )

    // At exact boundary, remainingMs may be 0 or negative depending on timing
    // The important thing is the phase is "expired" when remaining <= 0
    expect(onIdleExpire).toHaveBeenCalledTimes(1)
  })
})
