import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ContextSummaryDrawer } from "@/features/workbench/components/ContextSummaryDrawer"

describe("ContextSummaryDrawer", () => {
  it("renders the drawer heading when open", () => {
    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByText("问诊上下文")).toBeInTheDocument()
  })

  it("does not render drawer content when open is false", () => {
    render(
      <ContextSummaryDrawer
        open={false}
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.queryByText("问诊上下文")).not.toBeInTheDocument()
  })

  it("renders patient name row when provided", () => {
    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={vi.fn()}
        patientName="张三"
      />,
    )

    expect(screen.getByText("患者")).toBeInTheDocument()
    expect(screen.getByText("张三")).toBeInTheDocument()
  })

  it("does not render patient name row when not provided", () => {
    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.queryByText("患者")).not.toBeInTheDocument()
  })

  it("does not render patient name row when patientName is empty string", () => {
    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={vi.fn()}
        patientName=""
      />,
    )

    expect(screen.queryByText("患者")).not.toBeInTheDocument()
  })

  it("renders chief complaint row when provided", () => {
    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={vi.fn()}
        chiefComplaint="发热两天"
      />,
    )

    expect(screen.getByText("主诉")).toBeInTheDocument()
    expect(screen.getByText("发热两天")).toBeInTheDocument()
  })

  it("does not render chief complaint row when not provided", () => {
    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.queryByText("主诉")).not.toBeInTheDocument()
  })

  it("does not render chief complaint row when chiefComplaint is empty string", () => {
    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={vi.fn()}
        chiefComplaint=""
      />,
    )

    expect(screen.queryByText("主诉")).not.toBeInTheDocument()
  })

  it("renders last activity time row when provided", () => {
    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={vi.fn()}
        lastActivityAt="2026-06-28T01:50:00.000Z"
      />,
    )

    expect(screen.getByText("最后操作时间")).toBeInTheDocument()
  })

  it("displays formatted last activity time", () => {
    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={vi.fn()}
        lastActivityAt="2026-06-28T01:50:00.000Z"
      />,
    )

    // Should display formatted date (locale-dependent, so check label is present)
    expect(screen.getByText("最后操作时间")).toBeInTheDocument()
    // The formatted time should contain "28" (day) and "01" or "50" (time)
    expect(screen.getByText(/28/)).toBeInTheDocument()
    expect(screen.getByText(/:50/)).toBeInTheDocument()
  })

  it("renders raw iso string when lastActivityAt is invalid date format", () => {
    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={vi.fn()}
        lastActivityAt="not-a-date"
      />,
    )

    // formatActivityTime returns the raw string for invalid dates
    expect(screen.getByText("最后操作时间")).toBeInTheDocument()
    expect(screen.getByText("not-a-date")).toBeInTheDocument()
  })

  it("does not render last activity time row when lastActivityAt is empty string", () => {
    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={vi.fn()}
        lastActivityAt=""
      />,
    )

    expect(screen.queryByText("最后操作时间")).not.toBeInTheDocument()
  })

  it("does not render last activity time row when not provided", () => {
    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.queryByText("最后操作时间")).not.toBeInTheDocument()
  })

  it("renders all info rows when all props provided", () => {
    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={vi.fn()}
        patientName="张三"
        chiefComplaint="发热两天"
        lastActivityAt="2026-06-28T01:50:00.000Z"
      />,
    )

    expect(screen.getByText("患者")).toBeInTheDocument()
    expect(screen.getByText("张三")).toBeInTheDocument()
    expect(screen.getByText("主诉")).toBeInTheDocument()
    expect(screen.getByText("发热两天")).toBeInTheDocument()
    expect(screen.getByText("最后操作时间")).toBeInTheDocument()
  })

  it("calls onOpenChange when drawer is closed", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <ContextSummaryDrawer
        open={true}
        onOpenChange={onOpenChange}
      />,
    )

    // Press Escape to close the drawer
    await user.keyboard("{Escape}")
    expect(onOpenChange).toHaveBeenCalled()
  })
})
