import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ApiTransport } from "@/lib/api/transport"

// We mock the getTransport factory so adminApi calls route through a
// controllable fake transport instead of the real HTTP/mock implementation.
const mockTransport: ApiTransport = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  stream: vi.fn(),
}

vi.mock("@/lib/api", () => ({
  getTransport: () => mockTransport,
}))

// Import after the mock is declared so the module under test picks it up.
import { adminApi } from "@/features/admin/api/admin-api"

const iso = () => new Date().toISOString()

describe("adminApi facade", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Auth ──────────────────────────────────────────────────────────

  describe("login", () => {
    it("POSTs credentials to /admin/auth/login and returns the auth response", async () => {
      const response = {
        tokens: { accessToken: "a", refreshToken: "r", expiresIn: 3600 },
        user: {
          id: "u-1",
          username: "admin",
          role: "super_admin",
          displayName: "管理员",
          createdAt: iso(),
        },
      }
      vi.mocked(mockTransport.post).mockResolvedValueOnce(response)

      const result = await adminApi.login({ username: "admin", password: "secret" })

      expect(mockTransport.post).toHaveBeenCalledWith("/admin/auth/login", {
        username: "admin",
        password: "secret",
      })
      expect(result).toEqual(response)
    })
  })

  describe("logout", () => {
    it("POSTs the refreshToken to /admin/auth/logout", async () => {
      vi.mocked(mockTransport.post).mockResolvedValueOnce({ success: true })

      const result = await adminApi.logout("refresh-abc")

      expect(mockTransport.post).toHaveBeenCalledWith("/admin/auth/logout", {
        refreshToken: "refresh-abc",
      })
      expect(result).toEqual({ success: true })
    })
  })

  describe("refresh", () => {
    it("POSTs the refreshToken to /admin/auth/refresh and returns new tokens", async () => {
      const tokens = { accessToken: "new-a", refreshToken: "new-r", expiresIn: 7200 }
      vi.mocked(mockTransport.post).mockResolvedValueOnce({ tokens })

      const result = await adminApi.refresh("old-refresh")

      expect(mockTransport.post).toHaveBeenCalledWith("/admin/auth/refresh", {
        refreshToken: "old-refresh",
      })
      expect(result.tokens.accessToken).toBe("new-a")
      expect(result.tokens.refreshToken).toBe("new-r")
    })
  })

  // ─── Dashboard ────────────────────────────────────────────────────

  describe("getDashboardStats", () => {
    it("GETs /admin/dashboard/stats and returns the stats object", async () => {
      const stats = {
        totalPatients: 100,
        totalSessions: 500,
        activeSessions: 10,
        todayNewPatients: 3,
        todayNewSessions: 7,
      }
      vi.mocked(mockTransport.get).mockResolvedValueOnce(stats)

      const result = await adminApi.getDashboardStats()

      expect(mockTransport.get).toHaveBeenCalledWith("/admin/dashboard/stats")
      expect(result.totalPatients).toBe(100)
      expect(result.activeSessions).toBe(10)
    })
  })

  // ─── Patients ─────────────────────────────────────────────────────

  describe("listPatients", () => {
    it("GETs /admin/patients with default (undefined) search params when called with no args", async () => {
      const page = { items: [], total: 0, page: 1, pageSize: 20 }
      vi.mocked(mockTransport.get).mockResolvedValueOnce(page)

      await adminApi.listPatients()

      expect(mockTransport.get).toHaveBeenCalledWith("/admin/patients", {
        searchParams: undefined,
      })
    })

    it("passes page, pageSize, and search as searchParams", async () => {
      const page = { items: [], total: 0, page: 2, pageSize: 10 }
      vi.mocked(mockTransport.get).mockResolvedValueOnce(page)

      await adminApi.listPatients({ page: 2, pageSize: 10, search: "张三" })

      expect(mockTransport.get).toHaveBeenCalledWith("/admin/patients", {
        searchParams: { page: 2, pageSize: 10, search: "张三" },
      })
    })
  })

  describe("getPatient", () => {
    it("GETs /admin/patients/:id", async () => {
      const profile = { id: "p-1", realName: "张三" }
      vi.mocked(mockTransport.get).mockResolvedValueOnce(profile)

      const result = await adminApi.getPatient("p-1")

      expect(mockTransport.get).toHaveBeenCalledWith("/admin/patients/p-1")
      expect(result.id).toBe("p-1")
    })
  })

  // ─── Sessions ─────────────────────────────────────────────────────

  describe("listSessions", () => {
    it("GETs /admin/sessions with no params when called without arguments", async () => {
      const page = { items: [], total: 0, page: 1, pageSize: 20 }
      vi.mocked(mockTransport.get).mockResolvedValueOnce(page)

      await adminApi.listSessions()

      expect(mockTransport.get).toHaveBeenCalledWith("/admin/sessions", {
        searchParams: undefined,
      })
    })

    it("passes page, pageSize, status, and patientId as searchParams", async () => {
      const page = { items: [], total: 0, page: 1, pageSize: 10 }
      vi.mocked(mockTransport.get).mockResolvedValueOnce(page)

      await adminApi.listSessions({
        page: 1,
        pageSize: 10,
        status: "active",
        patientId: "p-1",
      })

      expect(mockTransport.get).toHaveBeenCalledWith("/admin/sessions", {
        searchParams: { page: 1, pageSize: 10, status: "active", patientId: "p-1" },
      })
    })
  })

  describe("getSession", () => {
    it("GETs /admin/sessions/:id", async () => {
      const session = { id: "s-1", status: "active" }
      vi.mocked(mockTransport.get).mockResolvedValueOnce(session)

      const result = await adminApi.getSession("s-1")

      expect(mockTransport.get).toHaveBeenCalledWith("/admin/sessions/s-1")
      expect(result.id).toBe("s-1")
    })
  })

  // ─── Settings ─────────────────────────────────────────────────────

  describe("getSettings", () => {
    it("GETs /admin/settings", async () => {
      const settings = {
        siteName: "东软云脑",
        maxConcurrentSessions: 50,
        sessionTimeoutMinutes: 30,
        enableRegistration: true,
      }
      vi.mocked(mockTransport.get).mockResolvedValueOnce(settings)

      const result = await adminApi.getSettings()

      expect(mockTransport.get).toHaveBeenCalledWith("/admin/settings")
      expect(result.siteName).toBe("东软云脑")
    })
  })

  describe("updateSettings", () => {
    it("PUTs a partial settings body to /admin/settings and returns the updated settings", async () => {
      const updated = {
        siteName: "新名称",
        maxConcurrentSessions: 100,
        sessionTimeoutMinutes: 60,
        enableRegistration: false,
      }
      vi.mocked(mockTransport.put).mockResolvedValueOnce(updated)

      const result = await adminApi.updateSettings({ siteName: "新名称" })

      expect(mockTransport.put).toHaveBeenCalledWith("/admin/settings", {
        siteName: "新名称",
      })
      expect(result.siteName).toBe("新名称")
    })
  })
})
