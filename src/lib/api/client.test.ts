import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api/config", () => ({
  apiConfig: {
    mode: "http",
    baseUrl: "http://localhost/api",
    mockDelayMs: 0,
  },
}))

import { createHttpTransport } from "@/lib/api/client"
import { useAdminAuthStore } from "@/features/admin/store/admin-auth-store"
import { useAuthStore } from "@/features/auth/store/auth-store"

interface RecordedRequest {
  url: string
  method: string
  headers: Headers
  body?: string
}

const recordedRequests: RecordedRequest[] = []
const responseQueue: Response[] = []

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function successEnvelope(data: unknown) {
  return {
    success: true,
    data,
    error: null,
    meta: null,
  }
}

function errorEnvelope(code: string, message: string) {
  return {
    success: false,
    data: null,
    error: { code, message },
    meta: null,
  }
}

function queueResponse(body: unknown, status = 200) {
  responseQueue.push(jsonResponse(body, status))
}

function installFetchMock() {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let url: string
      let method: string
      let headers: Headers
      let body: string | undefined

      if (input instanceof Request) {
        url = input.url
        method = input.method
        headers = new Headers(input.headers)
        const text = await input.clone().text()
        body = text || undefined
      } else {
        url = String(input)
        method = init?.method ?? "GET"
        headers = new Headers(init?.headers)
        body = typeof init?.body === "string" ? init.body : undefined
      }

      recordedRequests.push({ url, method, headers, body })

      const response = responseQueue.shift()
      if (!response) {
        throw new Error(`No mock response queued for ${method} ${url}`)
      }
      return response
    },
  )

  vi.stubGlobal("fetch", fetchMock)
}

function resetAuthStores() {
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
  })
  useAdminAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
  })
}

describe("createHttpTransport auth headers", () => {
  beforeEach(() => {
    recordedRequests.length = 0
    responseQueue.length = 0
    localStorage.clear()
    resetAuthStores()
    installFetchMock()
  })

  it("uses the admin token for protected admin requests", async () => {
    useAuthStore.setState({ accessToken: "patient-access-token" })
    useAdminAuthStore.setState({ accessToken: "admin-access-token" })
    queueResponse(successEnvelope({ totalPatients: 1 }))

    await createHttpTransport().get("/admin/dashboard/stats")

    expect(recordedRequests[0].url).toContain("/api/admin/dashboard/stats")
    expect(recordedRequests[0].headers.get("authorization")).toBe(
      "Bearer admin-access-token",
    )
  })

  it("does not inject an access token for admin login or refresh", async () => {
    useAdminAuthStore.setState({ accessToken: "admin-access-token" })
    queueResponse(successEnvelope({ tokens: {}, user: {} }))
    queueResponse(successEnvelope({ tokens: {} }))

    const transport = createHttpTransport()
    await transport.post("/admin/auth/login", { username: "admin", password: "admin123" })
    await transport.post("/admin/auth/refresh", { refreshToken: "admin-refresh-token" })

    expect(recordedRequests).toHaveLength(2)
    expect(recordedRequests[0].headers.get("authorization")).toBeNull()
    expect(recordedRequests[1].headers.get("authorization")).toBeNull()
  })

  it("keeps patient requests on the patient token", async () => {
    useAuthStore.setState({ accessToken: "patient-access-token" })
    useAdminAuthStore.setState({ accessToken: "admin-access-token" })
    queueResponse(successEnvelope({ id: "patient-001" }))

    await createHttpTransport().get("/patients/patient-001/context")

    expect(recordedRequests[0].url).toContain("/api/patients/patient-001/context")
    expect(recordedRequests[0].headers.get("authorization")).toBe(
      "Bearer patient-access-token",
    )
  })

  it("refreshes admin tokens through the admin refresh endpoint and retries", async () => {
    useAuthStore.setState({ accessToken: "patient-access-token" })
    useAdminAuthStore.setState({
      accessToken: "stale-admin-access-token",
      refreshToken: "admin-refresh-token",
      isAuthenticated: true,
    })
    queueResponse(errorEnvelope("UNAUTHORIZED", "expired admin token"), 401)
    queueResponse(
      successEnvelope({
        tokens: {
          accessToken: "fresh-admin-access-token",
          refreshToken: "fresh-admin-refresh-token",
          expiresIn: 3600,
        },
      }),
    )
    queueResponse(successEnvelope({ totalPatients: 3 }))

    await createHttpTransport().get("/admin/dashboard/stats")

    expect(recordedRequests).toHaveLength(3)
    expect(recordedRequests[0].headers.get("authorization")).toBe(
      "Bearer stale-admin-access-token",
    )
    expect(recordedRequests[1].url).toContain("/api/admin/auth/refresh")
    expect(recordedRequests[1].headers.get("authorization")).toBeNull()
    expect(recordedRequests[1].body).toContain("admin-refresh-token")
    expect(recordedRequests[2].headers.get("authorization")).toBe(
      "Bearer fresh-admin-access-token",
    )
    expect(useAdminAuthStore.getState().accessToken).toBe("fresh-admin-access-token")
    expect(useAuthStore.getState().accessToken).toBe("patient-access-token")
  })

  it("clears only admin auth when admin refresh fails", async () => {
    useAuthStore.setState({
      accessToken: "patient-access-token",
      refreshToken: "patient-refresh-token",
      isAuthenticated: true,
    })
    useAdminAuthStore.setState({
      accessToken: "stale-admin-access-token",
      refreshToken: "admin-refresh-token",
      isAuthenticated: true,
    })
    queueResponse(errorEnvelope("UNAUTHORIZED", "expired admin token"), 401)
    queueResponse(errorEnvelope("INVALID_REFRESH_TOKEN", "invalid refresh token"), 401)

    await expect(createHttpTransport().get("/admin/settings")).rejects.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    })

    expect(useAdminAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAdminAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().accessToken).toBe("patient-access-token")
  })
})
