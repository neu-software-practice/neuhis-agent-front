import { describe, expect, it, vi } from "vitest"

describe("lib/api barrel exports", () => {
  it("exports getTransport as a function", async () => {
    const { getTransport } = await import("@/lib/api")
    expect(typeof getTransport).toBe("function")
  })

  it("exports resetTransportForTests as a function", async () => {
    const { resetTransportForTests } = await import("@/lib/api")
    expect(typeof resetTransportForTests).toBe("function")
  })

  it("getTransport returns a transport object with all required methods", async () => {
    vi.resetModules()
    // Force mock mode for deterministic transport
    vi.stubEnv("VITE_API_MODE", "mock")
    vi.stubEnv("VITE_MOCK_DELAY_MS", "0")

    const { getTransport, resetTransportForTests } = await import("@/lib/api")
    resetTransportForTests()

    const transport = getTransport()
    expect(transport).toBeDefined()
    expect(typeof transport.get).toBe("function")
    expect(typeof transport.post).toBe("function")
    expect(typeof transport.patch).toBe("function")
    expect(typeof transport.put).toBe("function")
    expect(typeof transport.delete).toBe("function")
    expect(typeof transport.stream).toBe("function")

    resetTransportForTests()
    vi.unstubAllEnvs()
  })

  it("getTransport returns the same instance on repeated calls (singleton)", async () => {
    vi.resetModules()
    vi.stubEnv("VITE_API_MODE", "mock")
    vi.stubEnv("VITE_MOCK_DELAY_MS", "0")

    const { getTransport, resetTransportForTests } = await import("@/lib/api")
    resetTransportForTests()

    const first = getTransport()
    const second = getTransport()
    expect(first).toBe(second)

    resetTransportForTests()
    vi.unstubAllEnvs()
  })

  it("resetTransportForTests allows creating a new transport instance", async () => {
    vi.resetModules()
    vi.stubEnv("VITE_API_MODE", "mock")
    vi.stubEnv("VITE_MOCK_DELAY_MS", "0")

    const { getTransport, resetTransportForTests } = await import("@/lib/api")
    resetTransportForTests()

    const first = getTransport()
    resetTransportForTests()
    const second = getTransport()
    expect(first).not.toBe(second)

    resetTransportForTests()
    vi.unstubAllEnvs()
  })
})
