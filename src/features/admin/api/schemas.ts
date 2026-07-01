/**
 * Admin 模块校验 schema（Zod v4）。
 */
import { z } from "zod/v4"

// ─── 管理员认证 ───

export const adminLoginInputSchema = z.object({
  username: z.string().trim().min(1, "用户名不能为空"),
  password: z.string().trim().min(1, "密码不能为空"),
})

export const adminRoleSchema = z.enum(["super_admin", "admin", "operator"])

export const adminUserSchema = z.object({
  id: z.string().trim().min(1),
  username: z.string().trim().min(1),
  role: adminRoleSchema,
  displayName: z.string().trim().min(1),
  createdAt: z.string().datetime(),
})

export const adminTokensSchema = z.object({
  accessToken: z.string().trim().min(1),
  refreshToken: z.string().trim().min(1),
  expiresIn: z.number().int().positive(),
})

export const adminLoginResultSchema = z.object({
  tokens: adminTokensSchema,
  user: adminUserSchema,
})

export const adminLogoutInputSchema = z.object({
  refreshToken: z.string().trim().min(1),
})

export const adminLogoutResultSchema = z.object({
  success: z.literal(true),
})

export const adminRefreshInputSchema = z.object({
  refreshToken: z.string().trim().min(1),
})

export const adminRefreshResultSchema = z.object({
  tokens: adminTokensSchema,
})

// ─── 仪表盘 ───

export const dashboardStatsSchema = z.object({
  totalPatients: z.number().int().min(0),
  totalSessions: z.number().int().min(0),
  activeSessions: z.number().int().min(0),
  todayNewPatients: z.number().int().min(0),
  todayNewSessions: z.number().int().min(0),
})

// ─── 患者管理 ───

export const adminPatientQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
})

export const adminPatientGenderSchema = z.enum(["male", "female", "unknown"])

export const adminPatientItemSchema = z.object({
  id: z.string().trim().min(1),
  realName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  gender: adminPatientGenderSchema,
  birthDate: z.string().trim().min(1),
  createdAt: z.string().datetime(),
  sessionCount: z.number().int().min(0),
})

export const adminPatientListResultSchema = z.object({
  items: z.array(adminPatientItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})

// ─── 问诊记录管理 ───

export const adminSessionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().trim().optional(),
  patientId: z.string().trim().optional(),
})

export const adminSessionItemSchema = z.object({
  id: z.string().trim().min(1),
  patientId: z.string().trim().min(1),
  patientName: z.string().trim().min(1),
  title: z.string().trim().min(1),
  status: z.string().trim().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const adminSessionListResultSchema = z.object({
  items: z.array(adminSessionItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})

// ─── 系统设置 ───

export const systemSettingsSchema = z.object({
  siteName: z.string().trim().min(1),
  maxConcurrentSessions: z.number().int().positive(),
  sessionTimeoutMinutes: z.number().int().positive(),
  enableRegistration: z.boolean(),
})

export const updateSystemSettingsInputSchema = systemSettingsSchema.partial()

export const updateSystemSettingsResultSchema = systemSettingsSchema

export type AdminLoginInputSchema = z.infer<typeof adminLoginInputSchema>
