import { describe, expect, it } from "vitest"

import { buttonVariants } from "@/components/ui/button-variants"

describe("buttonVariants CVA", () => {
  it("returns a string (class list) for default variant/size", () => {
    const result = buttonVariants()
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("includes base classes in every variant", () => {
    const result = buttonVariants()
    expect(result).toContain("inline-flex")
    expect(result).toContain("items-center")
    expect(result).toContain("justify-center")
  })

  it("applies default variant classes when no variant specified", () => {
    const result = buttonVariants()
    expect(result).toContain("bg-primary")
    expect(result).toContain("text-primary-foreground")
  })

  it("applies outline variant classes", () => {
    const result = buttonVariants({ variant: "outline" })
    expect(result).toContain("border-border")
    expect(result).toContain("bg-background")
  })

  it("applies secondary variant classes", () => {
    const result = buttonVariants({ variant: "secondary" })
    expect(result).toContain("bg-secondary")
    expect(result).toContain("text-secondary-foreground")
  })

  it("applies ghost variant classes", () => {
    const result = buttonVariants({ variant: "ghost" })
    expect(result).toContain("hover:bg-muted")
  })

  it("applies destructive variant classes", () => {
    const result = buttonVariants({ variant: "destructive" })
    expect(result).toContain("text-destructive")
  })

  it("applies link variant classes", () => {
    const result = buttonVariants({ variant: "link" })
    expect(result).toContain("text-primary")
    expect(result).toContain("hover:underline")
  })

  it("applies size classes for default size", () => {
    const result = buttonVariants({ size: "default" })
    expect(result).toContain("h-9")
    expect(result).toContain("px-3")
  })

  it("applies size classes for xs size", () => {
    const result = buttonVariants({ size: "xs" })
    expect(result).toContain("h-6")
    expect(result).toContain("text-xs")
  })

  it("applies size classes for sm size", () => {
    const result = buttonVariants({ size: "sm" })
    expect(result).toContain("h-8")
  })

  it("applies size classes for lg size", () => {
    const result = buttonVariants({ size: "lg" })
    expect(result).toContain("h-10")
    expect(result).toContain("px-4")
  })

  it("applies icon size classes", () => {
    const result = buttonVariants({ size: "icon" })
    expect(result).toContain("size-9")
  })

  it("applies icon-xs size classes", () => {
    const result = buttonVariants({ size: "icon-xs" })
    expect(result).toContain("size-6")
  })

  it("applies icon-sm size classes", () => {
    const result = buttonVariants({ size: "icon-sm" })
    expect(result).toContain("size-8")
  })

  it("applies icon-lg size classes", () => {
    const result = buttonVariants({ size: "icon-lg" })
    expect(result).toContain("size-10")
  })

  it("merges custom className", () => {
    const result = buttonVariants({ className: "custom-class" })
    expect(result).toContain("custom-class")
  })

  it("combines variant and size classes", () => {
    const result = buttonVariants({ variant: "outline", size: "lg" })
    expect(result).toContain("border-border")
    expect(result).toContain("h-10")
  })
})
