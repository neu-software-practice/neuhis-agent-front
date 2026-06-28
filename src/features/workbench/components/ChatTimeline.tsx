import { useCallback, useState } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { Virtuoso } from "react-virtuoso"

import type { TimelineItem } from "@/features/workbench/api"
import { TimelineRow } from "@/features/workbench/components/TimelineRow"
import { cn } from "@/lib/utils"

interface ChatTimelineProps {
  items: TimelineItem[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  className?: string
}

/**
 * 虚拟滚动对话时间线。
 *
 * 使用 react-virtuoso 实现高性能列表渲染。
 * - 底部跟踪：atBottomStateChange 感知用户是否在底部
 * - 加载更多：startReached 触发 onLoadMore
 * - 浮动 "回到底部" 按钮
 */
export function ChatTimeline({
  items,
  loading = false,
  hasMore = false,
  onLoadMore,
  className,
}: ChatTimelineProps) {
  const [atBottom, setAtBottom] = useState(true)

  const handleAtBottomChange = useCallback(
    (at: boolean) => {
      setAtBottom(at)
    },
    [],
  )

  const handleStartReached = useCallback(() => {
    if (hasMore && !loading && onLoadMore) {
      onLoadMore()
    }
  }, [hasMore, loading, onLoadMore])

  /** 回到底部 */
  const scrollToBottom = useCallback(() => {
    const virtuosoEl = document.querySelector("[data-virtuoso-scroller]")
    if (virtuosoEl) {
      virtuosoEl.scrollTop = virtuosoEl.scrollHeight
    }
  }, [])

  // 空状态
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-16 text-muted-foreground",
          className,
        )}
      >
        <span className="text-sm">暂无对话</span>
      </div>
    )
  }

  return (
    <div className={cn("relative h-full", className)}>
      <Virtuoso
        data={items}
        itemContent={(_index, item) => (
          <div className="px-4 py-1.5">
            <TimelineRow item={item} />
          </div>
        )}
        startReached={handleStartReached}
        atBottomStateChange={handleAtBottomChange}
        followOutput="auto"
        increaseViewportBy={{ top: 200, bottom: 200 }}
        components={{
          Header: () => {
            if (hasMore) {
              return (
                <div className="flex justify-center py-3 text-xs text-muted-foreground">
                  加载更多...
                </div>
              )
            }
            return null
          },
          Footer: () => {
            if (loading) {
              return (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )
            }
            return null
          },
        }}
      />

      {/* 浮动 "回到底部" 按钮 */}
      {!atBottom ? (
        <button
          type="button"
          onClick={scrollToBottom}
          className={cn(
            "absolute bottom-4 left-1/2 z-10",
            "flex size-10 -translate-x-1/2 items-center justify-center",
            "rounded-full border border-border bg-background shadow-md",
            "text-muted-foreground transition-colors hover:text-foreground",
            "cursor-pointer",
          )}
          aria-label="回到底部"
        >
          <ChevronDown className="size-5" />
        </button>
      ) : null}
    </div>
  )
}
