import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock dependencies that client.ts imports
const mockFetchEventSource = vi.fn()
const mockKyCreate = vi.fn()
const mockKyInstance = vi.fn()

vi.mock("@microsoft/fetch-event-source", () => ({
  fetchEventSource: (...args: unknown[]) => mockFetchEventSource(...args),
}))

vi.mock("ky", () => ({
  default: {
    create: (...args: unknown[]) => mockKyCreate(...args),
  },
}))

vi.mock("@/lib/api/config", () => ({
  apiConfig: {
    baseUrl: "/api",
    mode: "http",
    mockDelayMs: 0,
  },
}))

// Use the real errors module so ApiException handling in toApiError works correctly.
// Only the transport layer (ky) and config are mocked.

vi.mock("@/lib/api/parse-json", () => ({
  extractAllJson: <T>(text: string): T[] => {
    try {
      return [JSON.parse(text)]
    } catch {
      return []
    }
  },
  parseFirstJson: <T>(text: string): T => JSON.parse(text),
}))

vi.mock("@/features/auth/store/auth-store", () => ({
  useAuthStore: {
    getState: () => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateTokens: vi.fn(),
    }),
  },
}))

// Helper to create a mock ky response (returns object with .text() method)
function makeKyResponse(jsonBody: unknown) {
  return {
    text: async () => JSON.stringify(jsonBody),
  }
}

describe("createHttpTransport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKyCreate.mockReturnValue(mockKyInstance)
  })

  it("creates a ky instance with correct config", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(makeKyResponse({ success: true, data: { ok: true } }))

    createHttpTransport()
    expect(mockKyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        prefix: "/api",
        timeout: 30000,
      }),
    )
  })

  it("get method calls request with correct path", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(makeKyResponse({ success: true, data: { result: "value" } }))

    const transport = createHttpTransport()
    const result = await transport.get("/test-path")

    expect(mockKyInstance).toHaveBeenCalledWith(
      "test-path",
      expect.objectContaining({ method: "get" }),
    )
    expect(result).toEqual({ result: "value" })
  })

  it("post method sends body as JSON", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(makeKyResponse({ success: true, data: { id: "1" } }))

    const transport = createHttpTransport()
    const result = await transport.post("/items", { name: "test" })

    expect(mockKyInstance).toHaveBeenCalledWith(
      "items",
      expect.objectContaining({
        method: "post",
        json: { name: "test" },
      }),
    )
    expect(result).toEqual({ id: "1" })
  })

  it("patch method sends body correctly", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(makeKyResponse({ success: true, data: { updated: true } }))

    const transport = createHttpTransport()
    const result = await transport.patch("/items/1", { name: "updated" })

    expect(mockKyInstance).toHaveBeenCalledWith(
      "items/1",
      expect.objectContaining({
        method: "patch",
        json: { name: "updated" },
      }),
    )
    expect(result).toEqual({ updated: true })
  })

  it("put method sends body correctly", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(makeKyResponse({ success: true, data: { replaced: true } }))

    const transport = createHttpTransport()
    const result = await transport.put("/items/1", { name: "replaced" })

    expect(mockKyInstance).toHaveBeenCalledWith(
      "items/1",
      expect.objectContaining({
        method: "put",
        json: { name: "replaced" },
      }),
    )
    expect(result).toEqual({ replaced: true })
  })

  it("delete method works without body", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(
      makeKyResponse({ success: true, data: { deleted: true } }),
    )

    const transport = createHttpTransport()
    const result = await transport.delete("/items/1")

    expect(mockKyInstance).toHaveBeenCalledWith(
      "items/1",
      expect.objectContaining({ method: "delete" }),
    )
    expect(result).toEqual({ deleted: true })
  })

  it("passes searchParams correctly", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(makeKyResponse({ success: true, data: [] }))

    const transport = createHttpTransport()
    await transport.get("/items", {
      searchParams: { page: 1, active: true, q: "test" },
    })

    expect(mockKyInstance).toHaveBeenCalledWith(
      "items",
      expect.objectContaining({
        searchParams: { page: "1", active: "true", q: "test" },
      }),
    )
  })

  it("filters out null and undefined searchParams", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(makeKyResponse({ success: true, data: [] }))

    const transport = createHttpTransport()
    await transport.get("/items", {
      searchParams: { valid: "yes", empty: null, missing: undefined },
    })

    expect(mockKyInstance).toHaveBeenCalledWith(
      "items",
      expect.objectContaining({
        searchParams: { valid: "yes" },
      }),
    )
  })

  it("strips leading slash from path", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(makeKyResponse({ success: true, data: {} }))

    const transport = createHttpTransport()
    await transport.get("/some/path")

    expect(mockKyInstance).toHaveBeenCalledWith(
      "some/path",
      expect.any(Object),
    )
  })

  it("unwraps envelope format responses with PascalCase to camelCase conversion", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(
      makeKyResponse({
        success: true,
        data: { UserId: "u1", UserName: "Test" },
        error: null,
      }),
    )

    const transport = createHttpTransport()
    const result = await transport.get("/user")

    expect(result).toEqual({ userId: "u1", userName: "Test" })
  })

  it("passes through non-envelope responses", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(
      makeKyResponse({ id: "1", name: "flat" }),
    )

    const transport = createHttpTransport()
    const result = await transport.get("/flat")

    expect(result).toEqual({ id: "1", name: "flat" })
  })

  it("throws on envelope with success=false", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(
      makeKyResponse({
        success: false,
        data: { id: "ignored" },
        error: { code: "NOT_FOUND", message: "Resource not found" },
      }),
    )

    const transport = createHttpTransport()

    // throwApiError wraps the ApiError in an ApiException;
    // the relevant error code/message live on the .error property.
    await expect(transport.get("/missing")).rejects.toMatchObject({
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
      },
    })
  })

  it("throws on envelope with error field even if success=true", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(
      makeKyResponse({
        success: true,
        data: { id: "ignored" },
        error: { code: "SERVER_ERROR", message: "Internal error" },
      }),
    )

    const transport = createHttpTransport()

    await expect(transport.get("/error")).rejects.toMatchObject({
      error: {
        code: "SERVER_ERROR",
      },
    })
  })

  it("passes custom headers from options", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockKyInstance.mockReturnValue(makeKyResponse({ success: true, data: {} }))

    const transport = createHttpTransport()
    await transport.get("/items", {
      headers: { "X-Custom": "value" },
    })

    expect(mockKyInstance).toHaveBeenCalledWith(
      "items",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Custom": "value" }),
      }),
    )
  })

  it("stream method calls fetchEventSource with correct params", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockFetchEventSource.mockResolvedValue(undefined)

    const transport = createHttpTransport()
    await transport.stream(
      "/visits/1/assistant-stream",
      { content: "hello" },
      { onOpen: vi.fn(), onEvent: vi.fn(), onError: vi.fn(), onDone: vi.fn() },
    )

    expect(mockFetchEventSource).toHaveBeenCalledWith(
      "/api/visits/1/assistant-stream",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "hello" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        openWhenHidden: true,
      }),
    )
  })

  it("stream reports an error when the opened response is not an SSE stream", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockFetchEventSource.mockImplementationOnce(async (_url, init) => {
      await init.onopen?.(
        new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
    })

    const onError = vi.fn()
    const transport = createHttpTransport()
    await transport.stream(
      "/visits/1/assistant-stream",
      {},
      { onError },
    )

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_STREAM_RESPONSE" }),
    )
  })

  it("stream method passes signal to fetchEventSource", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockFetchEventSource.mockResolvedValue(undefined)

    const controller = new AbortController()
    const transport = createHttpTransport()
    await transport.stream(
      "/visits/1/stream",
      {},
      { signal: controller.signal, onDone: vi.fn() },
    )

    expect(mockFetchEventSource).toHaveBeenCalledWith(
      "/api/visits/1/stream",
      expect.objectContaining({
        signal: controller.signal,
      }),
    )
  })

  it("stream method calls onDone after successful completion", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    mockFetchEventSource.mockResolvedValue(undefined)

    const onDone = vi.fn()
    const transport = createHttpTransport()
    await transport.stream(
      "/visits/1/stream",
      {},
      { onDone },
    )

    expect(onDone).toHaveBeenCalled()
  })

  it("stream handles aborted signal without calling onError", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    const abortError = new Error("aborted")
    mockFetchEventSource.mockRejectedValue(abortError)

    const controller = new AbortController()
    controller.abort()

    const onError = vi.fn()
    const transport = createHttpTransport()
    await transport.stream(
      "/visits/1/stream",
      {},
      { signal: controller.signal, onError },
    )

    expect(onError).not.toHaveBeenCalled()
  })

  it("stream calls onError on non-aborted failure", async () => {
    const { createHttpTransport } = await import("@/lib/api/client")

    const networkError = new Error("network failure")
    mockFetchEventSource.mockRejectedValue(networkError)

    const onError = vi.fn()
    const transport = createHttpTransport()
    await transport.stream(
      "/visits/1/stream",
      {},
      { onError },
    )

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "UNKNOWN_ERROR" }),
    )
  })
})
