import { useCallback } from "react"
import { Loader2, Send } from "lucide-react"
import { TextArea } from "@heroui/react"

import { cn } from "@/lib/utils"

interface InputDockProps {
  value: string
  placeholder?: string
  disabled?: boolean
  sending?: boolean
  blocked?: boolean
  onValueChange: (value: string) => void
  onSend: () => void
}

/**
 * 主输入区。
 *
 * - HeroUI Textarea 支持多行输入（1-4 行自动增长）
 * - Enter 发送，Shift+Enter 换行
 * - blocked 时显示空状态（由 LockBar 替代输入）
 * - 底部安全区域 padding
 */
export function InputDock({
  value,
  placeholder = "输入消息...",
  disabled = false,
  sending = false,
  blocked = false,
  onValueChange,
  onSend,
}: InputDockProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter 发送（不含 Shift），Shift+Enter 换行
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        if (value.trim() && !disabled && !sending) {
          onSend()
        }
      }
    },
    [value, disabled, sending, onSend],
  )

  const handleSendClick = useCallback(() => {
    if (value.trim() && !disabled && !sending) {
      onSend()
    }
  }, [value, disabled, sending, onSend])

  // blocked 时完全隐藏输入区
  if (blocked) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-end gap-2 px-4 py-3",
        "pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
      )}
    >
      <TextArea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={disabled ? "输入已禁用" : placeholder}
        disabled={disabled}
        rows={1}
        onKeyDown={handleKeyDown}
        className="flex-1 min-h-[44px]"
      />

      {/* 发送按钮 */}
      <button
        type="button"
        disabled={!value.trim() || sending || disabled}
        onClick={handleSendClick}
        className={cn(
          "flex size-[44px] shrink-0 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground transition-all",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "cursor-pointer",
        )}
        aria-label="发送"
      >
        {sending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Send className="size-5" />
        )}
      </button>
    </div>
  )
}
