import { memo } from "react"
import { AlertCircle } from "lucide-react"

import type { MessageTimelineItem } from "@/features/workbench/api"
import { cn } from "@/lib/utils"

type InterruptedBy = NonNullable<MessageTimelineItem["interruptedBy"]>

const interruptedLabels: Record<InterruptedBy, string> = {
  emergency: "急症打断",
  timeout: "超时终止",
  exit: "主动退出",
}

interface MessageBubbleProps {
  item: MessageTimelineItem
}

/**
 * 消息气泡。
 *
 * 区分患者（右对齐/primary 背景）和助手（左对齐/muted 背景）。
 * - streaming：末尾显示闪烁光标
 * - failed：错误图标 + "发送失败"
 * - invalidated：半透明降级显示
 * - interruptedBy：右上角小 badge
 */
export const MessageBubble = memo(function MessageBubble({
  item,
}: MessageBubbleProps) {
  const isPatient = item.role === "patient"
  const isAssistant = item.role === "assistant"

  return (
    <div
      className={cn(
        "flex flex-col",
        isPatient ? "items-end" : "items-start",
      )}
    >
      {/* 打断标记 */}
      {item.interruptedBy ? (
        <span className="mb-0.5 text-[10px] text-muted-foreground">
          {interruptedLabels[item.interruptedBy]}
        </span>
      ) : null}

      {/* 气泡主体 */}
      <div
        className={cn(
          "relative max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isPatient &&
            "bg-primary text-primary-foreground rounded-br-md",
          isAssistant &&
            "bg-muted text-foreground rounded-bl-md",
          item.status === "invalidated" && "opacity-40",
        )}
      >
        {/* 消息文本 */}
        <span className="whitespace-pre-wrap break-words">
          {item.content}
          {item.status === "streaming" ? (
            <span className="inline-flex h-4 w-2 animate-pulse bg-foreground/60 ml-0.5 rounded-sm" />
          ) : null}
        </span>

        {/* 发送失败提示 */}
        {item.status === "failed" ? (
          <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="size-3" />
            <span>发送失败</span>
          </div>
        ) : null}
      </div>
    </div>
  )
})
