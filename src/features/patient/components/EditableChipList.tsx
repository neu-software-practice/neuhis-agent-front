import { type ReactNode, useCallback, useRef, useState } from "react"
import { Chip } from "@heroui/react"
import { Loader2, Pencil, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EditableChipListProps {
  /** Section 标签。 */
  label: string
  /** 当前条目列表。 */
  items: string[]
  /** Chip 颜色。 */
  color?: "danger" | "warning" | "default"
  /** 标签前图标。 */
  icon?: ReactNode
  /** 是否处于编辑模式。 */
  editing: boolean
  /** 点击进入编辑。 */
  onEdit: () => void
  /** 保存编辑结果。 */
  onSave: (items: string[]) => void
  /** 取消编辑。 */
  onCancel: () => void
  /** 保存中 loading 态。 */
  saving?: boolean
}

/**
 * 可编辑的 Chip 列表。
 *
 * - 展示模式：chip 列表 + 右上角编辑按钮
 * - 编辑模式：chip 可删除 + 输入框添加新条目 + 保存/取消
 */
export function EditableChipList({
  label,
  items,
  color = "default",
  icon,
  editing,
  onEdit,
  onSave,
  onCancel,
  saving = false,
}: EditableChipListProps) {
  // 编辑模式下的本地副本
  const [localItems, setLocalItems] = useState<string[]>(items)
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // 进入编辑时同步 items
  const handleEdit = useCallback(() => {
    setLocalItems(items)
    setInputValue("")
    onEdit()
  }, [items, onEdit])

  const handleRemove = useCallback((index: number) => {
    setLocalItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    // 防重复
    if (localItems.includes(trimmed)) {
      setInputValue("")
      return
    }
    setLocalItems((prev) => [...prev, trimmed])
    setInputValue("")
    inputRef.current?.focus()
  }, [inputValue, localItems])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleAdd()
      }
    },
    [handleAdd],
  )

  const handleSave = useCallback(() => {
    // 保存前先把输入框里的内容加进去（补齐"输入后直接点保存"的交互）
    const trimmed = inputValue.trim()
    const finalItems = trimmed && !localItems.includes(trimmed)
      ? [...localItems, trimmed]
      : localItems
    onSave(finalItems)
    // 如果自动补齐了输入框内容，清除输入框
    if (finalItems !== localItems) {
      setInputValue("")
    }
  }, [localItems, onSave, inputValue])

  const handleCancel = useCallback(() => {
    setLocalItems(items)
    setInputValue("")
    onCancel()
  }, [items, onCancel])

  return (
    <section>
      {/* 标题行 */}
      <div className="mb-1.5 flex items-center justify-between">
        <div
          className={cn(
            "flex items-center gap-1 text-sm font-medium",
            color === "danger" && "text-red-600 dark:text-red-400",
            color !== "danger" && "text-foreground",
          )}
        >
          {icon}
          <span>{label}</span>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`编辑${label}`}
          >
            <Pencil className="size-3.5" />
          </button>
        ) : null}
      </div>

      {/* 展示模式 */}
      {!editing ? (
        <>
          {items.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {items.map((item) => (
                <Chip key={item} color={color} variant="soft" size="sm">
                  {item}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              暂无记录，点击编辑添加
            </p>
          )}
        </>
      ) : null}

      {/* 编辑模式 */}
      {editing ? (
        <div className="flex flex-col gap-3">
          {/* 可删除 chips */}
          {localItems.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {localItems.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="relative inline-flex items-center"
                >
                  <Chip color={color} variant="soft" size="sm">
                    {item}
                  </Chip>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-foreground/80 text-background transition-colors hover:bg-foreground"
                    aria-label={`删除 ${item}`}
                  >
                    <X className="size-2.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">列表为空</p>
          )}

          {/* 添加输入 */}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入后按回车或点击添加"
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={saving}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleAdd}
              disabled={!inputValue.trim() || saving}
            >
              <Plus className="size-4" />
              添加
            </Button>
          </div>

          {/* 保存/取消 */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  保存中…
                </>
              ) : (
                "保存"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={saving}
            >
              取消
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
