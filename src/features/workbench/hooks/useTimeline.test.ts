import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ListTimelineResult } from "@/features/workbench/api"
import type { TimelineItem } from "@/features/workbench/api"
import { useTimeline } from "@/features/workbench/hooks/useTimeline"

const mockUseInfiniteQuery = vi.fn()

vi.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: (opts: unknown) => mockUseInfiniteQuery(opts),
  infiniteQueryOptions: (opts: unknown) => opts,
}))

function makeItem(id: string, createdAt: string): TimelineItem {
  return {
    kind: "message",
    id,
    sessionId: "s1",
    status: "done",
    role: "patient",
    content: id,
    createdAt,
  }
}

function makePage(items: TimelineItem[]): ListTimelineResult {
  return { items, hasMore: false }
}

describe("useTimeline", () => {
  beforeEach(() => {
    mockUseInfiniteQuery.mockReset()
  })

  afterEach(() => {
    mockUseInfiniteQuery.mockReset()
  })

  it("returns empty items when query has no data", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: undefined,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useTimeline("s1"))

    expect(result.current.items).toEqual([])
  })

  it("flattens pages into a sorted items array", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          makePage([
            makeItem("c", "2026-06-28T03:00:00.000Z"),
            makeItem("a", "2026-06-28T01:00:00.000Z"),
          ]),
          makePage([
            makeItem("d", "2026-06-28T04:00:00.000Z"),
            makeItem("b", "2026-06-28T02:00:00.000Z"),
          ]),
        ],
        pageParams: [undefined],
      },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useTimeline("s1"))

    expect(result.current.items.map((i) => i.id)).toEqual(["a", "b", "c", "d"])
  })

  it("returns empty items when pages are empty", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [], pageParams: [undefined] },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useTimeline("s1"))

    expect(result.current.items).toEqual([])
  })

  it("exposes hasMore from query result", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [makePage([])], pageParams: [undefined] },
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useTimeline("s1"))

    expect(result.current.hasMore).toBe(true)
  })

  it("defaults hasMore to false when hasNextPage is undefined", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [makePage([])], pageParams: [undefined] },
      fetchNextPage: vi.fn(),
      hasNextPage: undefined,
      isFetchingNextPage: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useTimeline("s1"))

    expect(result.current.hasMore).toBe(false)
  })

  it("exposes isFetching from isFetchingNextPage", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [makePage([])], pageParams: [undefined] },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: true,
      isLoading: false,
    })

    const { result } = renderHook(() => useTimeline("s1"))

    expect(result.current.isFetching).toBe(true)
  })

  it("exposes isLoading from query result", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: undefined,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: true,
    })

    const { result } = renderHook(() => useTimeline("s1"))

    expect(result.current.isLoading).toBe(true)
  })

  it("exposes fetchNextPage as fetchNextPage", () => {
    const fetchNextPage = vi.fn()
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [makePage([])], pageParams: [undefined] },
      fetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useTimeline("s1"))

    result.current.fetchNextPage()
    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it("flattens a single page correctly", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [makePage([makeItem("a", "2026-06-28T01:00:00.000Z")])],
        pageParams: [undefined],
      },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useTimeline("s1"))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].id).toBe("a")
  })
})
