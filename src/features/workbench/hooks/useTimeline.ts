import { useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"

import { workbenchQueries } from "@/features/workbench/api/queries"
import { flattenTimelinePages } from "@/features/workbench/utils/timeline-merge"
import type { TimelineItem } from "@/features/workbench/api"
import type { SessionId } from "@/lib/api/types"

export interface UseTimelineResult {
  items: TimelineItem[]
  fetchNextPage: () => void
  hasMore: boolean
  isFetching: boolean
  isLoading: boolean
}

/**
 * 时间线数据管理 hook。
 *
 * 使用 useInfiniteQuery 加载分页时间线，将 pages 扁平化为有序数组。
 * 暴露 fetchNextPage / hasMore 供 ChatTimeline 的 Virtuoso 使用。
 */
export function useTimeline(sessionId: SessionId): UseTimelineResult {
  const query = useInfiniteQuery(workbenchQueries.timeline({ sessionId }))
  const pages = query.data?.pages

  const items = useMemo(() => {
    if (!pages) return []
    return flattenTimelinePages(pages)
  }, [pages])

  return {
    items,
    fetchNextPage: query.fetchNextPage,
    hasMore: query.hasNextPage ?? false,
    isFetching: query.isFetchingNextPage,
    isLoading: query.isLoading,
  }
}
