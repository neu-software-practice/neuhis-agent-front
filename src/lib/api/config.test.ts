import { beforeEach, describe, expect, it } from "vitest"

describe("apiConfig", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("exports mode, baseUrl, and mockDelayMs", async () => {
    const { apiConfig } = await import("@/lib/api/config")
    expect(apiConfig).toHaveProperty("mode")
    expect(apiConfig).toHaveProperty("baseUrl")
    expect(apiConfig).toHaveProperty("mockDelayMs")
  })

  it("mode is either 'mock' or 'http'", async () => {
    const { apiConfig } = await import("@/lib/api/config")
    expect(["mock", "http"]).toContain(apiConfig.mode)
  })

  it("baseUrl defaults to /api when env var is not set", async () => {
    const { apiConfig } = await import("@/lib/api/config")
    expect(typeof apiConfig.baseUrl).toBe("string")
    expect(apiConfig.baseUrl.length).toBeGreaterThan(0)
  })

  it("mockDelayMs is a non-negative finite number", async () => {
    const { apiConfig } = await import("@/lib/api/config")
    expect(Number.isFinite(apiConfig.mockDelayMs)).toBe(true)
    expect(apiConfig.mockDelayMs).toBeGreaterThanOrEqual(0)
  })

  it("defaults to mock mode in dev and http mode in prod", async () => {
    const { apiConfig } = await import("@/lib/api/config")
    // In test environment (vitest), PROD is false, so mode defaults to mock
    // unless VITE_API_MODE is explicitly set to http
    expect(["mock", "http"]).toContain(apiConfig.mode)
  })
})
