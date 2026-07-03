import { describe, expect, it } from "vitest"

import { formatDate, formatDateTime, formatDuration, formatTime } from "@/lib/time"

// Fixed instant: 2026-07-02T10:30:00.000Z
const FIXED_ISO = "2026-07-02T10:30:00.000Z"
const FIXED_TS = Date.parse(FIXED_ISO)
const FIXED_DATE = new Date(FIXED_ISO)

/**
 * Extracts the wall-clock "HH:mm" that Intl produces in the current timezone
 * for the fixed instant, so assertions are timezone-independent.
 */
function wallClockTime(): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(FIXED_DATE)
}

describe("formatDateTime", () => {
  it("formats an ISO string into a human-readable date-time", () => {
    const result = formatDateTime(FIXED_ISO)
    // zh-CN uses "/" as the date separator.
    expect(result).toContain("2026")
    expect(result).toMatch(/\d{2}:\d{2}$/)
  })

  it("accepts a numeric timestamp", () => {
    expect(formatDateTime(FIXED_TS)).toBe(formatDateTime(FIXED_ISO))
  })

  it("accepts a Date object", () => {
    expect(formatDateTime(FIXED_DATE)).toBe(formatDateTime(FIXED_ISO))
  })

  it("returns an empty string for an invalid date string", () => {
    expect(formatDateTime("not-a-date")).toBe("")
  })

  it("returns an empty string for NaN timestamp", () => {
    expect(formatDateTime(NaN)).toBe("")
  })
})

describe("formatDate", () => {
  it("formats an ISO string into a date-only string", () => {
    const result = formatDate(FIXED_ISO)
    expect(result).toContain("2026")
    expect(result).not.toContain(":")
  })

  it("accepts a numeric timestamp", () => {
    expect(formatDate(FIXED_TS)).toBe(formatDate(FIXED_ISO))
  })

  it("accepts a Date object", () => {
    expect(formatDate(FIXED_DATE)).toBe(formatDate(FIXED_ISO))
  })

  it("returns an empty string for an invalid date string", () => {
    expect(formatDate("invalid")).toBe("")
  })
})

describe("formatTime", () => {
  it("formats an ISO string into a time-only string matching the local wall clock", () => {
    expect(formatTime(FIXED_ISO)).toBe(wallClockTime())
  })

  it("accepts a numeric timestamp", () => {
    expect(formatTime(FIXED_TS)).toBe(wallClockTime())
  })

  it("accepts a Date object", () => {
    expect(formatTime(FIXED_DATE)).toBe(wallClockTime())
  })

  it("returns an empty string for an invalid date string", () => {
    expect(formatTime("nope")).toBe("")
  })
})

describe("formatDuration", () => {
  it("formats a positive duration into mm:ss", () => {
    expect(formatDuration(90 * 1000)).toBe("01:30")
  })

  it("formats zero as 00:00", () => {
    expect(formatDuration(0)).toBe("00:00")
  })

  it("treats negative durations as zero", () => {
    expect(formatDuration(-5000)).toBe("00:00")
  })

  it("pads single-digit minutes and seconds", () => {
    expect(formatDuration(61 * 1000)).toBe("01:01")
  })

  it("handles large durations", () => {
    expect(formatDuration(3599 * 1000)).toBe("59:59")
  })

  it("drops sub-second precision", () => {
    expect(formatDuration(1500)).toBe("00:01")
  })
})
