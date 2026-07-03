import { beforeEach, describe, expect, it } from "vitest"

import { mockDb } from "@/mocks/api/mock-db"
import {
  handleAdminLogin,
  handleAdminLogout,
  handleAdminRefresh,
  handleGetAdminPatient,
  handleGetAdminSession,
  handleGetDashboardStats,
  handleGetSystemSettings,
  handleListAdminPatients,
  handleListAdminSessions,
  handleUpdateSystemSettings,
} from "@/mocks/api/handlers/admin-handlers"

describe("admin handlers", () => {
  beforeEach(() => {
    mockDb.reset()
  })

  describe("handleAdminLogin", () => {
    it("logs in admin with correct credentials", () => {
      const result = handleAdminLogin({ username: "admin", password: "admin123" })
      expect(result.tokens.accessToken).toContain("mock-admin-access")
      expect(result.user.username).toBe("admin")
    })

    it("rejects wrong credentials", () => {
      expect(() =>
        handleAdminLogin({ username: "admin", password: "wrong" }),
      ).toThrow()
    })
  })

  describe("handleAdminLogout", () => {
    it("does not throw", () => {
      expect(() => handleAdminLogout({ refreshToken: "any" })).not.toThrow()
    })

    it("handles missing token", () => {
      expect(() => handleAdminLogout({})).not.toThrow()
    })
  })

  describe("handleAdminRefresh", () => {
    it("refreshes admin token", async () => {
      const login = handleAdminLogin({ username: "admin", password: "admin123" })
      await new Promise((r) => setTimeout(r, 2))
      const result = handleAdminRefresh({ refreshToken: login.tokens.refreshToken })
      expect(result.tokens.accessToken).toBeTruthy()
    })

    it("rejects invalid token", () => {
      expect(() => handleAdminRefresh({ refreshToken: "invalid" })).toThrow()
    })
  })

  describe("handleGetDashboardStats", () => {
    it("returns dashboard stats", () => {
      const result = handleGetDashboardStats()
      expect(result.totalPatients).toBeGreaterThan(0)
      expect(result.totalSessions).toBeGreaterThan(0)
    })
  })

  describe("handleListAdminPatients", () => {
    it("returns paginated patients", () => {
      const result = handleListAdminPatients({ page: "1", pageSize: "10" })
      expect(result.items).toBeDefined()
      expect(result.total).toBeGreaterThan(0)
    })

    it("filters by search", () => {
      const result = handleListAdminPatients({ search: "李明" })
      expect(result.total).toBeGreaterThan(0)
    })

    it("handles undefined params", () => {
      const result = handleListAdminPatients(undefined)
      expect(result.items).toBeDefined()
    })
  })

  describe("handleGetAdminPatient", () => {
    it("returns patient by ID", () => {
      const result = handleGetAdminPatient("patient-mock-001")
      expect(result.id).toBe("patient-mock-001")
    })

    it("throws for nonexistent patient", () => {
      expect(() => handleGetAdminPatient("nonexistent")).toThrow()
    })
  })

  describe("handleListAdminSessions", () => {
    it("returns paginated sessions", () => {
      const result = handleListAdminSessions({ page: "1", pageSize: "10" })
      expect(result.items).toBeDefined()
      expect(result.total).toBeGreaterThan(0)
    })

    it("filters by status", () => {
      const result = handleListAdminSessions({ status: "completed" })
      for (const s of result.items) {
        expect(s.status).toBe("completed")
      }
    })

    it("handles undefined params", () => {
      const result = handleListAdminSessions(undefined)
      expect(result.items).toBeDefined()
    })
  })

  describe("handleGetAdminSession", () => {
    it("returns session by ID", () => {
      const result = handleGetAdminSession("visit-mock-active")
      expect(result.id).toBe("visit-mock-active")
    })

    it("throws for nonexistent session", () => {
      expect(() => handleGetAdminSession("nonexistent")).toThrow()
    })
  })

  describe("handleGetSystemSettings", () => {
    it("returns system settings", () => {
      const result = handleGetSystemSettings()
      expect(result.siteName).toBeTruthy()
      expect(result.maxConcurrentSessions).toBeGreaterThan(0)
    })
  })

  describe("handleUpdateSystemSettings", () => {
    it("updates settings", () => {
      const result = handleUpdateSystemSettings({ siteName: "新名称" })
      expect(result.siteName).toBe("新名称")
    })

    it("rejects invalid settings", () => {
      expect(() =>
        handleUpdateSystemSettings({ maxConcurrentSessions: -1 }),
      ).toThrow()
    })
  })
})
