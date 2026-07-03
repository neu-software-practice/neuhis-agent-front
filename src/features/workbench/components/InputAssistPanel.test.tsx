import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { InputAssistPanel } from "@/features/workbench/components/InputAssistPanel"

const draftChip = { id: "draft-1", label: "草稿建议", type: "draft" as const }
const quickAnswerChip = {
  id: "qa-1",
  label: "快捷回答",
  type: "quick_answer" as const,
}
const secondDraftChip = {
  id: "draft-2",
  label: "另一个草稿",
  type: "draft" as const,
}

describe("InputAssistPanel", () => {
  it("renders nothing when visible is false", () => {
    const { container } = render(
      <InputAssistPanel
        chips={[draftChip, quickAnswerChip]}
        visible={false}
        onChipClick={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when visible but chips is empty", () => {
    const { container } = render(
      <InputAssistPanel chips={[]} visible onChipClick={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when both visible is false and chips is empty", () => {
    const { container } = render(
      <InputAssistPanel chips={[]} visible={false} onChipClick={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("renders both draft and quick_answer labels when visible", () => {
    render(
      <InputAssistPanel
        chips={[draftChip, quickAnswerChip]}
        visible
        onChipClick={vi.fn()}
      />,
    )

    expect(screen.getByText(draftChip.label)).toBeInTheDocument()
    expect(screen.getByText(quickAnswerChip.label)).toBeInTheDocument()
  })

  it("renders only draft chips when only draft chips are provided", () => {
    render(
      <InputAssistPanel
        chips={[draftChip]}
        visible
        onChipClick={vi.fn()}
      />,
    )

    expect(screen.getByText(draftChip.label)).toBeInTheDocument()
    expect(
      screen.queryByText(quickAnswerChip.label),
    ).not.toBeInTheDocument()
  })

  it("renders only quick_answer chips when only quick_answer chips are provided", () => {
    render(
      <InputAssistPanel
        chips={[quickAnswerChip]}
        visible
        onChipClick={vi.fn()}
      />,
    )

    expect(screen.getByText(quickAnswerChip.label)).toBeInTheDocument()
    expect(screen.queryByText(draftChip.label)).not.toBeInTheDocument()
  })

  it("renders multiple draft chips", () => {
    render(
      <InputAssistPanel
        chips={[draftChip, secondDraftChip]}
        visible
        onChipClick={vi.fn()}
      />,
    )

    expect(screen.getByText(draftChip.label)).toBeInTheDocument()
    expect(screen.getByText(secondDraftChip.label)).toBeInTheDocument()
  })

  it("renders Pencil icon in draft chips", () => {
    const { container } = render(
      <InputAssistPanel
        chips={[draftChip]}
        visible
        onChipClick={vi.fn()}
      />,
    )

    // Pencil icon renders as an SVG
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("invokes onChipClick with the exact chip object for each chip type", async () => {
    // Behavior distinction note: InputAssistPanel does not itself decide
    // "fill input" (draft) vs "auto-send" (quick_answer). It only surfaces
    // the clicked chip — including its `type` — back to the caller, letting
    // the caller branch on `chip.type`. The meaningful unit-level assertion
    // is therefore that onChipClick receives the chip with the correct type.
    const user = userEvent.setup()
    const onChipClick = vi.fn()

    render(
      <InputAssistPanel
        chips={[draftChip, quickAnswerChip]}
        visible
        onChipClick={onChipClick}
      />,
    )

    await user.click(screen.getByText(draftChip.label))
    expect(onChipClick).toHaveBeenCalledWith(draftChip)
    expect(onChipClick.mock.calls[0][0].type).toBe("draft")

    await user.click(screen.getByText(quickAnswerChip.label))
    expect(onChipClick).toHaveBeenCalledWith(quickAnswerChip)
    expect(onChipClick.mock.calls[1][0].type).toBe("quick_answer")

    expect(onChipClick).toHaveBeenCalledTimes(2)
  })

  it("applies custom className", () => {
    const { container } = render(
      <InputAssistPanel
        chips={[draftChip]}
        visible
        onChipClick={vi.fn()}
        className="custom-panel"
      />,
    )

    const panel = container.firstChild as HTMLElement
    expect(panel.className).toContain("custom-panel")
    expect(panel.className).toContain("flex")
    expect(panel.className).toContain("flex-col")
  })
})
