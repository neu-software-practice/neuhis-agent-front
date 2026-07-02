import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import { useTimeline } from "@/features/workbench/hooks/useTimeline"

// Mock the API layer to avoid real network calls
vi.mock("@/features/workbench/api", () => ({
  workbenchApi: {
    listTimeline: vi.fn().mockResolvedValue({
      items: [],
      hasMore: false,
    }),
  },
}))

const sessionId = "visit-test"

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe("useTimeline", () => {
  it("returns items and pagination fields", () => {
    const { result } = renderHook(() => useTimeline(sessionId), {
      wrapper: makeWrapper(),
    })
    expect(result.current.items).toEqual([])
    expect(result.current.hasMore).toBe(false)
    expect(typeof result.current.fetchNextPage).toBe("function")
  })

  it("accepts refetchInterval parameter without error", () => {
    const { result } = renderHook(
      () => useTimeline(sessionId, 5000),
      { wrapper: makeWrapper() },
    )
    expect(result.current.items).toEqual([])
  })

  it("accepts false for refetchInterval", () => {
    const { result } = renderHook(
      () => useTimeline(sessionId, false),
      { wrapper: makeWrapper() },
    )
    expect(result.current.items).toEqual([])
  })

  it("accepts undefined for refetchInterval (backward compatible)", () => {
    const { result } = renderHook(
      () => useTimeline(sessionId, undefined),
      { wrapper: makeWrapper() },
    )
    expect(result.current.items).toEqual([])
  })
})
