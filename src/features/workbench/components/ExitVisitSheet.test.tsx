import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ExitConsequence } from "@/features/workbench/hooks/useExitSettlement"
import { ExitVisitSheet } from "@/features/workbench/components/ExitVisitSheet"

// Mock window.matchMedia for useIsDesktop hook
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

const baseConsequence: ExitConsequence = {
  kind: "no_fee",
  text: "本次问诊将直接结束，不产生费用。",
}

describe("ExitVisitSheet", () => {
  it("renders the sheet with consequence text when open", () => {
    render(
      <ExitVisitSheet
        open={true}
        onOpenChange={vi.fn()}
        consequence={baseConsequence}
        onConfirm={vi.fn()}
        onSuspend={vi.fn()}
      />,
    )

    expect(screen.getByText("离开问诊")).toBeInTheDocument()
    expect(
      screen.getByText("本次问诊将直接结束，不产生费用。"),
    ).toBeInTheDocument()
    expect(
      screen.getByText("暂离问诊不会结算，可随时回来继续。"),
    ).toBeInTheDocument()
  })

  it("does not render content when open is false", () => {
    render(
      <ExitVisitSheet
        open={false}
        onOpenChange={vi.fn()}
        consequence={baseConsequence}
        onConfirm={vi.fn()}
        onSuspend={vi.fn()}
      />,
    )

    expect(screen.queryByText("离开问诊")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "结束问诊" }),
    ).not.toBeInTheDocument()
  })

  it("renders all three action buttons", () => {
    render(
      <ExitVisitSheet
        open={true}
        onOpenChange={vi.fn()}
        consequence={baseConsequence}
        onConfirm={vi.fn()}
        onSuspend={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "结束问诊" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "暂离问诊" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "返回问诊" }),
    ).toBeInTheDocument()
  })

  it("invokes onConfirm and closes sheet when '结束问诊' is clicked", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <ExitVisitSheet
        open={true}
        onOpenChange={onOpenChange}
        consequence={baseConsequence}
        onConfirm={onConfirm}
        onSuspend={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "结束问诊" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("invokes onSuspend and closes sheet when '暂离问诊' is clicked", async () => {
    const user = userEvent.setup()
    const onSuspend = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <ExitVisitSheet
        open={true}
        onOpenChange={onOpenChange}
        consequence={baseConsequence}
        onConfirm={vi.fn()}
        onSuspend={onSuspend}
      />,
    )

    await user.click(screen.getByRole("button", { name: "暂离问诊" }))
    expect(onSuspend).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("invokes onOpenChange(false) when '返回问诊' is clicked", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <ExitVisitSheet
        open={true}
        onOpenChange={onOpenChange}
        consequence={baseConsequence}
        onConfirm={vi.fn()}
        onSuspend={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "返回问诊" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("renders refundable consequence text", () => {
    const consequence: ExitConsequence = {
      kind: "refundable",
      amount: 50,
      text: "已支付的 ¥50 将原路退回，通常 1-3 个工作日到账。",
    }

    render(
      <ExitVisitSheet
        open={true}
        onOpenChange={vi.fn()}
        consequence={consequence}
        onConfirm={vi.fn()}
        onSuspend={vi.fn()}
      />,
    )

    expect(screen.getByText(/已支付的 ¥50/)).toBeInTheDocument()
  })

  it("renders executed_no_refund consequence text", () => {
    const consequence: ExitConsequence = {
      kind: "executed_no_refund",
      text: "已执行的项目不产生额外费用。",
    }

    render(
      <ExitVisitSheet
        open={true}
        onOpenChange={vi.fn()}
        consequence={consequence}
        onConfirm={vi.fn()}
        onSuspend={vi.fn()}
      />,
    )

    expect(
      screen.getByText("已执行的项目不产生额外费用。"),
    ).toBeInTheDocument()
  })

  it("renders medication_dispensed consequence text", () => {
    const consequence: ExitConsequence = {
      kind: "medication_dispensed",
      text: "药品已发放，如有问题请联系药师。",
    }

    render(
      <ExitVisitSheet
        open={true}
        onOpenChange={vi.fn()}
        consequence={consequence}
        onConfirm={vi.fn()}
        onSuspend={vi.fn()}
      />,
    )

    expect(
      screen.getByText("药品已发放，如有问题请联系药师。"),
    ).toBeInTheDocument()
  })

  it("renders in desktop mode without crashing", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(
      <ExitVisitSheet
        open={true}
        onOpenChange={vi.fn()}
        consequence={baseConsequence}
        onConfirm={vi.fn()}
        onSuspend={vi.fn()}
      />,
    )

    expect(screen.getByText("离开问诊")).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it("renders with aria-label='退出问诊'", () => {
    render(
      <ExitVisitSheet
        open={true}
        onOpenChange={vi.fn()}
        consequence={baseConsequence}
        onConfirm={vi.fn()}
        onSuspend={vi.fn()}
      />,
    )

    const dialog = document.querySelector('[aria-label="退出问诊"]')
    expect(dialog).toBeInTheDocument()
  })
})
