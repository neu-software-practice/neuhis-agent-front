import { describe, expect, it } from "vitest"

import { assertNever, cn } from "@/lib/utils"

describe("cn", () => {
  it("merges multiple class names into a single string", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("filters out falsy values", () => {
    expect(cn("foo", false, undefined, null, "", "bar")).toBe("foo bar")
  })

  it("returns an empty string when all inputs are falsy", () => {
    expect(cn(false, undefined, null, "")).toBe("")
  })

  it("deduplicates conflicting Tailwind classes using twMerge", () => {
    // twMerge should keep the later padding utility.
    expect(cn("p-4", "p-8")).toBe("p-8")
  })

  it("handles conditional class joining", () => {
    const active = true
    expect(cn("base", active && "active")).toBe("base active")
  })
})

describe("assertNever", () => {
  it("throws an error when called", () => {
    expect(() => assertNever("unexpected" as never)).toThrow(
      /Unexpected value reached assertNever/,
    )
  })

  it("uses a custom message when provided", () => {
    expect(() => assertNever("x" as never, "custom message")).toThrow(
      "custom message",
    )
  })

  it("stringifies the value in the default message", () => {
    expect(() => assertNever(42 as never)).toThrow("42")
  })
})
