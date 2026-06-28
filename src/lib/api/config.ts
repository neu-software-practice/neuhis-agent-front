export type ApiMode = "mock" | "http"

function readApiMode(): ApiMode {
  const raw = import.meta.env.VITE_API_MODE
  if (raw === "mock" || raw === "http") {
    return raw
  }

  return import.meta.env.PROD ? "http" : "mock"
}

function readMockDelayMs(): number {
  const raw = Number(import.meta.env.VITE_MOCK_DELAY_MS ?? 400)
  return Number.isFinite(raw) && raw >= 0 ? raw : 400
}

export const apiConfig = {
  mode: readApiMode(),
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api",
  mockDelayMs: readMockDelayMs(),
}
