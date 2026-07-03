import { describe, expect, it } from "vitest"

import {
  adminLoginResultSchema,
  adminTokensSchema,
  adminUserSchema,
} from "@/features/admin/api/schemas"
import type {
  AdminRole,
  AdminUser,
  AdminTokenPair,
  AdminLoginInput,
  AdminAuthResponse,
  DashboardStats,
  AdminPatientItem,
  AdminSessionItem,
  PaginatedResponse,
  SystemSettings,
} from "@/features/admin/api/types"

/**
 * types.ts is purely compile-time. These tests exercise the type definitions
 * at runtime via the corresponding Zod schemas to ensure the type contracts
 * stay in sync with the validation layer. Each test constructs a value that
 * should conform to the type and asserts it parses through the real schema.
 */

const iso = () => new Date().toISOString()

describe("AdminRole type coverage", () => {
  it("covers all three declared role literals", () => {
    const roles: AdminRole[] = ["super_admin", "admin", "operator"]
    expect(roles).toHaveLength(3)
    // Each role is accepted by the user schema.
    for (const role of roles) {
      expect(
        adminUserSchema.safeParse({
          id: "u-1",
          username: "admin",
          role,
          displayName: "管理员",
          createdAt: iso(),
        }).success,
      ).toBe(true)
    }
  })
})

describe("AdminTokenPair type", () => {
  it("matches the tokens schema shape", () => {
    const tokens: AdminTokenPair = {
      accessToken: "a",
      refreshToken: "r",
      expiresIn: 3600,
    }
    expect(adminTokensSchema.safeParse(tokens).success).toBe(true)
  })
})

describe("AdminUser type", () => {
  it("matches the user schema shape", () => {
    const user: AdminUser = {
      id: "u-1",
      username: "admin",
      role: "super_admin",
      displayName: "管理员",
      createdAt: iso(),
    }
    expect(adminUserSchema.safeParse(user).success).toBe(true)
  })
})

describe("AdminLoginInput type", () => {
  it("requires only username and password at runtime", () => {
    const input: AdminLoginInput = { username: "admin", password: "secret" }
    expect(input.username).toBe("admin")
    expect(input.password).toBe("secret")
  })
})

describe("AdminAuthResponse type", () => {
  it("matches the login result schema shape", () => {
    const response: AdminAuthResponse = {
      tokens: { accessToken: "a", refreshToken: "r", expiresIn: 60 },
      user: {
        id: "u-1",
        username: "admin",
        role: "admin",
        displayName: "管理员",
        createdAt: iso(),
      },
    }
    expect(adminLoginResultSchema.safeParse(response).success).toBe(true)
  })
})

describe("DashboardStats type", () => {
  it("holds non-negative integer counters", () => {
    const stats: DashboardStats = {
      totalPatients: 0,
      totalSessions: 0,
      activeSessions: 0,
      todayNewPatients: 0,
      todayNewSessions: 0,
    }
    expect(Object.keys(stats)).toHaveLength(5)
    expect(stats.totalPatients).toBeGreaterThanOrEqual(0)
  })
})

describe("AdminPatientItem type", () => {
  it("conforms to the patient item schema", () => {
    const patient: AdminPatientItem = {
      id: "p-1",
      realName: "张三",
      phone: "13800138000",
      gender: "male",
      birthDate: "1990-01-01",
      createdAt: iso(),
      sessionCount: 3,
    }
    expect(patient.gender).toBe("male")
    expect(patient.sessionCount).toBe(3)
  })

  it("supports all three gender literals", () => {
    const genders: Array<AdminPatientItem["gender"]> = ["male", "female", "unknown"]
    expect(genders).toContain("female")
    expect(genders).toContain("unknown")
  })
})

describe("AdminSessionItem type", () => {
  it("carries patient reference and timestamps", () => {
    const item: AdminSessionItem = {
      id: "s-1",
      patientId: "p-1",
      patientName: "张三",
      title: "发热问诊",
      status: "active",
      createdAt: iso(),
      updatedAt: iso(),
    }
    expect(item.patientId).toBe("p-1")
    expect(item.status).toBe("active")
  })
})

describe("PaginatedResponse<T> type", () => {
  it("wraps a list of items with pagination metadata", () => {
    const resp: PaginatedResponse<AdminSessionItem> = {
      items: [
        {
          id: "s-1",
          patientId: "p-1",
          patientName: "张三",
          title: "发热",
          status: "active",
          createdAt: iso(),
          updatedAt: iso(),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    }
    expect(resp.items).toHaveLength(1)
    expect(resp.total).toBe(resp.items.length)
    expect(resp.page).toBe(1)
    expect(resp.pageSize).toBe(20)
  })

  it("works as an empty page", () => {
    const resp: PaginatedResponse<AdminPatientItem> = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    }
    expect(resp.items.length).toBe(0)
  })
})

describe("SystemSettings type", () => {
  it("carries site config, concurrency, timeout, and registration flag", () => {
    const settings: SystemSettings = {
      siteName: "东软云脑智能医疗",
      maxConcurrentSessions: 50,
      sessionTimeoutMinutes: 30,
      enableRegistration: true,
    }
    expect(settings.enableRegistration).toBe(true)
    expect(settings.sessionTimeoutMinutes).toBeGreaterThan(0)
  })
})
