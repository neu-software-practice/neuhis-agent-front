import { Pencil } from "lucide-react"
import { Chip } from "@heroui/react"

import { cn } from "@/lib/utils"

interface InputAssistChip {
  id: string
  label: string
  type: "draft" | "quick_answer"
}

interface InputAssistPanelProps {
  chips: InputAssistChip[]
  visible?: boolean
  onChipClick: (chip: InputAssistChip) => void
  className?: string
}

/**
 * 输入辅助面板。
 *
 * 显示建议 chips，最大 2 行可水平滚动。
 * - draft 类型：outline 样式，点击填入输入框
 * - quick_answer 类型：filled 样式，点击直接发送
 * 两种 chip 类型视觉上必须可区分，且永不混排在同一行。
 */
export function InputAssistPanel({
  chips,
  visible = false,
  onChipClick,
  className,
}: InputAssistPanelProps) {
  if (!visible || chips.length === 0) return null

  const draftChips = chips.filter((c) => c.type === "draft")
  const quickAnswerChips = chips.filter((c) => c.type === "quick_answer")

  return (
    <div className={cn("flex flex-col gap-1.5 overflow-hidden px-4 py-2", className)}>
      {/* draft chips 行 */}
      {draftChips.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {draftChips.map((chip) => (
            <Chip
              key={chip.id}
              variant="secondary"
              size="sm"
              onClick={() => onChipClick(chip)}
              className="cursor-pointer shrink-0"
            >
              <Pencil className="size-3" />
              {chip.label}
            </Chip>
          ))}
        </div>
      ) : null}

      {/* quick_answer chips 行 */}
      {quickAnswerChips.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {quickAnswerChips.map((chip) => (
            <Chip
              key={chip.id}
              variant="primary"
              color="accent"
              size="sm"
              onClick={() => onChipClick(chip)}
              className="cursor-pointer shrink-0"
            >
              {chip.label}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  )
}
