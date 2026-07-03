import { describe, expect, it } from "vitest"

import type { ApiTransport, RequestOptions, StreamHandlers } from "@/lib/api/transport"

describe("transport type contracts", () => {
  it("RequestOptions allows searchParams with mixed value types", () => {
    const options: RequestOptions = {
      searchParams: {
        page: 1,
        active: true,
        q: "search",
        empty: null,
        missing: undefined,
      },
      headers: { "X-Custom": "value" },
    }
    expect(options.searchParams).toBeDefined()
    expect(options.searchParams?.page).toBe(1)
    expect(options.searchParams?.active).toBe(true)
  })

  it("RequestOptions works with minimal fields", () => {
    const options: RequestOptions = {}
    expect(options.searchParams).toBeUndefined()
    expect(options.headers).toBeUndefined()
  })

  it("StreamHandlers supports all callback signatures", () => {
    const handlers: StreamHandlers<string> = {
      onOpen: () => {},
      onEvent: (event) => {},
      onError: (error) => {},
      onDone: () => {},
    }
    expect(handlers.onOpen).toBeTypeOf("function")
    expect(handlers.onEvent).toBeTypeOf("function")
    expect(handlers.onError).toBeTypeOf("function")
    expect(handlers.onDone).toBeTypeOf("function")
  })

  it("StreamHandlers works with no callbacks", () => {
    const handlers: StreamHandlers<unknown> = {}
    expect(handlers.onOpen).toBeUndefined()
  })

  it("ApiTransport interface shape is satisfied by a mock implementation", () => {
    const mockTransport: ApiTransport = {
      get: async () => ({}) as never,
      post: async () => ({}) as never,
      put: async () => ({}) as never,
      patch: async () => ({}) as never,
      delete: async () => ({}) as never,
      stream: async () => {},
    }
    expect(mockTransport).toBeDefined()
    expect(typeof mockTransport.get).toBe("function")
    expect(typeof mockTransport.post).toBe("function")
    expect(typeof mockTransport.stream).toBe("function")
  })
})
