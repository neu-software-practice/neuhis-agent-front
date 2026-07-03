import { describe, expect, it } from "vitest"

import {
  adminLoginInputSchema,
  adminRoleSchema,
  adminUserSchema,
  adminTokensSchema,
  adminLoginResultSchema,
  adminLogoutInputSchema,
  adminLogoutResultSchema,
  adminRefreshInputSchema,
  adminRefreshResultSchema,
  dashboardStatsSchema,
  adminPatientQuerySchema,
  adminPatientGenderSchema,
  adminPatientItemSchema,
  adminPatientListResultSchema,
  adminSessionQuerySchema,
  adminSessionItemSchema,
  adminSessionListResultSchema,
  systemSettingsSchema,
  updateSystemSettingsInputSchema,
  updateSystemSettingsResultSchema,
} from "@/features/admin/api/schemas"

const iso = () => new Date().toISOString()

describe("adminLoginInputSchema", () => {
  it("accepts a valid username + password pair", () => {
    const result = adminLoginInputSchema.safeParse({
      username: "admin",
      password: "secret123",
    })
    expect(result.success).toBe(true)
  })

  it("trims surrounding whitespace on username and password", () => {
    const result = adminLoginInputSchema.safeParse({
      username: "  admin  ",
      password: "  secret  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.username).toBe("admin")
      expect(result.data.password).toBe("secret")
    }
  })

  it("rejects an empty username", () => {
    const result = adminLoginInputSchema.safeParse({ username: "", password: "secret" })
    expect(result.success).toBe(false)
  })

  it("rejects an empty password", () => {
    const result = adminLoginInputSchema.safeParse({ username: "admin", password: "" })
    expect(result.success).toBe(false)
  })

  it("rejects missing fields", () => {
    expect(adminLoginInputSchema.safeParse({}).success).toBe(false)
    expect(adminLoginInputSchema.safeParse({ username: "admin" }).success).toBe(false)
    expect(adminLoginInputSchema.safeParse({ password: "secret" }).success).toBe(false)
  })
})

describe("adminRoleSchema", () => {
  it.each(["super_admin", "admin", "operator"])("accepts role %s", (role) => {
    expect(adminRoleSchema.safeParse(role).success).toBe(true)
  })

  it("rejects an unknown role", () => {
    expect(adminRoleSchema.safeParse("superuser").success).toBe(false)
  })
})

describe("adminUserSchema", () => {
  function buildUser() {
    return {
      id: "u-1",
      username: "admin",
      role: "super_admin" as const,
      displayName: "系统管理员",
      createdAt: iso(),
    }
  }

  it("accepts a valid admin user", () => {
    expect(adminUserSchema.safeParse(buildUser()).success).toBe(true)
  })

  it("rejects an empty id", () => {
    expect(adminUserSchema.safeParse({ ...buildUser(), id: "" }).success).toBe(false)
  })

  it("rejects an invalid createdAt datetime", () => {
    expect(
      adminUserSchema.safeParse({ ...buildUser(), createdAt: "not-a-date" }).success,
    ).toBe(false)
  })

  it("rejects an invalid role", () => {
    expect(
      adminUserSchema.safeParse({ ...buildUser(), role: "ghost" }).success,
    ).toBe(false)
  })
})

describe("adminTokensSchema", () => {
  function buildTokens() {
    return {
      accessToken: "eyJhbGciOi",
      refreshToken: "refresh-abc",
      expiresIn: 3600,
    }
  }

  it("accepts a valid token pair", () => {
    expect(adminTokensSchema.safeParse(buildTokens()).success).toBe(true)
  })

  it("rejects a non-positive expiresIn", () => {
    expect(
      adminTokensSchema.safeParse({ ...buildTokens(), expiresIn: 0 }).success,
    ).toBe(false)
    expect(
      adminTokensSchema.safeParse({ ...buildTokens(), expiresIn: -1 }).success,
    ).toBe(false)
  })

  it("rejects a non-integer expiresIn", () => {
    expect(
      adminTokensSchema.safeParse({ ...buildTokens(), expiresIn: 1.5 }).success,
    ).toBe(false)
  })

  it("rejects an empty accessToken", () => {
    expect(
      adminTokensSchema.safeParse({ ...buildTokens(), accessToken: "" }).success,
    ).toBe(false)
  })
})

describe("adminLoginResultSchema", () => {
  it("accepts a valid login result", () => {
    const result = adminLoginResultSchema.safeParse({
      tokens: { accessToken: "a", refreshToken: "r", expiresIn: 60 },
      user: {
        id: "u-1",
        username: "admin",
        role: "admin",
        displayName: "管理员",
        createdAt: iso(),
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects when tokens are invalid", () => {
    const result = adminLoginResultSchema.safeParse({
      tokens: { accessToken: "", refreshToken: "r", expiresIn: 60 },
      user: {
        id: "u-1",
        username: "admin",
        role: "admin",
        displayName: "管理员",
        createdAt: iso(),
      },
    })
    expect(result.success).toBe(false)
  })
})

describe("adminLogoutInputSchema", () => {
  it("accepts a non-empty refreshToken", () => {
    expect(adminLogoutInputSchema.safeParse({ refreshToken: "r" }).success).toBe(true)
  })

  it("rejects an empty refreshToken", () => {
    expect(adminLogoutInputSchema.safeParse({ refreshToken: "" }).success).toBe(false)
  })
})

describe("adminLogoutResultSchema", () => {
  it("accepts success: true", () => {
    expect(adminLogoutResultSchema.safeParse({ success: true }).success).toBe(true)
  })

  it("rejects success: false (literal true)", () => {
    expect(adminLogoutResultSchema.safeParse({ success: false }).success).toBe(false)
  })
})

describe("adminRefreshInputSchema", () => {
  it("accepts a non-empty refreshToken", () => {
    expect(adminRefreshInputSchema.safeParse({ refreshToken: "r" }).success).toBe(true)
  })

  it("rejects an empty refreshToken", () => {
    expect(adminRefreshInputSchema.safeParse({ refreshToken: "" }).success).toBe(false)
  })
})

describe("adminRefreshResultSchema", () => {
  it("accepts a valid token pair wrapper", () => {
    const result = adminRefreshResultSchema.safeParse({
      tokens: { accessToken: "a", refreshToken: "r", expiresIn: 60 },
    })
    expect(result.success).toBe(true)
  })
})

describe("dashboardStatsSchema", () => {
  function buildStats() {
    return {
      totalPatients: 100,
      totalSessions: 500,
      activeSessions: 10,
      todayNewPatients: 3,
      todayNewSessions: 7,
    }
  }

  it("accepts valid dashboard stats", () => {
    expect(dashboardStatsSchema.safeParse(buildStats()).success).toBe(true)
  })

  it("accepts zero values", () => {
    expect(
      dashboardStatsSchema.safeParse({
        totalPatients: 0,
        totalSessions: 0,
        activeSessions: 0,
        todayNewPatients: 0,
        todayNewSessions: 0,
      }).success,
    ).toBe(true)
  })

  it("rejects negative values", () => {
    expect(
      dashboardStatsSchema.safeParse({ ...buildStats(), totalPatients: -1 }).success,
    ).toBe(false)
  })

  it("rejects non-integer values", () => {
    expect(
      dashboardStatsSchema.safeParse({ ...buildStats(), totalPatients: 1.5 }).success,
    ).toBe(false)
  })
})

describe("adminPatientQuerySchema", () => {
  it("applies defaults for page and pageSize", () => {
    const result = adminPatientQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.pageSize).toBe(20)
      expect(result.data.search).toBeUndefined()
    }
  })

  it("coerces string page/pageSize to numbers", () => {
    const result = adminPatientQuerySchema.safeParse({ page: "3", pageSize: "50" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(3)
      expect(result.data.pageSize).toBe(50)
    }
  })

  it("rejects pageSize over 100", () => {
    expect(
      adminPatientQuerySchema.safeParse({ pageSize: 200 }).success,
    ).toBe(false)
  })

  it("rejects non-positive page", () => {
    expect(adminPatientQuerySchema.safeParse({ page: 0 }).success).toBe(false)
  })

  it("accepts an optional search string", () => {
    const result = adminPatientQuerySchema.safeParse({ search: "张三" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.search).toBe("张三")
    }
  })
})

describe("adminPatientGenderSchema", () => {
  it.each(["male", "female", "unknown"])("accepts gender %s", (g) => {
    expect(adminPatientGenderSchema.safeParse(g).success).toBe(true)
  })

  it("rejects an unknown gender", () => {
    expect(adminPatientGenderSchema.safeParse("other").success).toBe(false)
  })
})

describe("adminPatientItemSchema", () => {
  function buildPatient() {
    return {
      id: "p-1",
      realName: "张三",
      phone: "13800138000",
      gender: "male" as const,
      birthDate: "1990-01-01",
      createdAt: iso(),
      sessionCount: 5,
    }
  }

  it("accepts a valid patient item", () => {
    expect(adminPatientItemSchema.safeParse(buildPatient()).success).toBe(true)
  })

  it("rejects negative sessionCount", () => {
    expect(
      adminPatientItemSchema.safeParse({ ...buildPatient(), sessionCount: -1 }).success,
    ).toBe(false)
  })

  it("rejects invalid gender", () => {
    expect(
      adminPatientItemSchema.safeParse({ ...buildPatient(), gender: "other" }).success,
    ).toBe(false)
  })

  it("rejects invalid createdAt datetime", () => {
    expect(
      adminPatientItemSchema.safeParse({ ...buildPatient(), createdAt: "bad" }).success,
    ).toBe(false)
  })
})

describe("adminPatientListResultSchema", () => {
  it("accepts a valid paginated patient list", () => {
    const result = adminPatientListResultSchema.safeParse({
      items: [
        {
          id: "p-1",
          realName: "张三",
          phone: "13800138000",
          gender: "male",
          birthDate: "1990-01-01",
          createdAt: iso(),
          sessionCount: 2,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    })
    expect(result.success).toBe(true)
  })

  it("accepts an empty items array", () => {
    const result = adminPatientListResultSchema.safeParse({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })
    expect(result.success).toBe(true)
  })

  it("rejects a negative total", () => {
    const result = adminPatientListResultSchema.safeParse({
      items: [],
      total: -1,
      page: 1,
      pageSize: 20,
    })
    expect(result.success).toBe(false)
  })
})

describe("adminSessionQuerySchema", () => {
  it("applies defaults for page and pageSize", () => {
    const result = adminSessionQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.pageSize).toBe(20)
    }
  })

  it("accepts optional status and patientId", () => {
    const result = adminSessionQuerySchema.safeParse({
      status: "active",
      patientId: "p-1",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("active")
      expect(result.data.patientId).toBe("p-1")
    }
  })

  it("rejects pageSize over 100", () => {
    expect(
      adminSessionQuerySchema.safeParse({ pageSize: 500 }).success,
    ).toBe(false)
  })
})

describe("adminSessionItemSchema", () => {
  function buildSession() {
    return {
      id: "s-1",
      patientId: "p-1",
      patientName: "张三",
      title: "发热问诊",
      status: "active",
      createdAt: iso(),
      updatedAt: iso(),
    }
  }

  it("accepts a valid session item", () => {
    expect(adminSessionItemSchema.safeParse(buildSession()).success).toBe(true)
  })

  it("rejects an empty title", () => {
    expect(
      adminSessionItemSchema.safeParse({ ...buildSession(), title: "" }).success,
    ).toBe(false)
  })

  it("rejects an invalid updatedAt datetime", () => {
    expect(
      adminSessionItemSchema.safeParse({ ...buildSession(), updatedAt: "bad" }).success,
    ).toBe(false)
  })
})

describe("adminSessionListResultSchema", () => {
  it("accepts a valid paginated session list", () => {
    const result = adminSessionListResultSchema.safeParse({
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
      pageSize: 10,
    })
    expect(result.success).toBe(true)
  })

  it("rejects non-positive page", () => {
    const result = adminSessionListResultSchema.safeParse({
      items: [],
      total: 0,
      page: 0,
      pageSize: 10,
    })
    expect(result.success).toBe(false)
  })
})

describe("systemSettingsSchema", () => {
  function buildSettings() {
    return {
      siteName: "东软云脑智能医疗",
      maxConcurrentSessions: 50,
      sessionTimeoutMinutes: 30,
      enableRegistration: true,
    }
  }

  it("accepts valid system settings", () => {
    expect(systemSettingsSchema.safeParse(buildSettings()).success).toBe(true)
  })

  it("rejects non-positive maxConcurrentSessions", () => {
    expect(
      systemSettingsSchema.safeParse({ ...buildSettings(), maxConcurrentSessions: 0 }).success,
    ).toBe(false)
  })

  it("rejects non-positive sessionTimeoutMinutes", () => {
    expect(
      systemSettingsSchema.safeParse({ ...buildSettings(), sessionTimeoutMinutes: 0 }).success,
    ).toBe(false)
  })

  it("rejects non-boolean enableRegistration", () => {
    expect(
      systemSettingsSchema.safeParse({ ...buildSettings(), enableRegistration: "yes" }).success,
    ).toBe(false)
  })

  it("rejects empty siteName", () => {
    expect(
      systemSettingsSchema.safeParse({ ...buildSettings(), siteName: "" }).success,
    ).toBe(false)
  })
})

describe("updateSystemSettingsInputSchema (partial)", () => {
  it("accepts a full settings object", () => {
    const result = updateSystemSettingsInputSchema.safeParse({
      siteName: "新名称",
      maxConcurrentSessions: 100,
      sessionTimeoutMinutes: 60,
      enableRegistration: false,
    })
    expect(result.success).toBe(true)
  })

  it("accepts a partial update (only siteName)", () => {
    const result = updateSystemSettingsInputSchema.safeParse({
      siteName: "新名称",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.siteName).toBe("新名称")
      expect(result.data.maxConcurrentSessions).toBeUndefined()
    }
  })

  it("accepts an empty object (no fields to update)", () => {
    expect(updateSystemSettingsInputSchema.safeParse({}).success).toBe(true)
  })

  it("still validates provided fields (rejects invalid maxConcurrentSessions)", () => {
    const result = updateSystemSettingsInputSchema.safeParse({
      maxConcurrentSessions: -5,
    })
    expect(result.success).toBe(false)
  })
})

describe("updateSystemSettingsResultSchema", () => {
  it("accepts a full valid settings object", () => {
    const result = updateSystemSettingsResultSchema.safeParse({
      siteName: "东软云脑",
      maxConcurrentSessions: 50,
      sessionTimeoutMinutes: 30,
      enableRegistration: true,
    })
    expect(result.success).toBe(true)
  })

  it("rejects an incomplete object (required fields)", () => {
    const result = updateSystemSettingsResultSchema.safeParse({
      siteName: "东软云脑",
    })
    expect(result.success).toBe(false)
  })
})
