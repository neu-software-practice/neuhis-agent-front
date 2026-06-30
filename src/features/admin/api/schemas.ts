/**
 * Admin 模块校验 schema（Zod v4）。
 */
import { z } from "zod/v4"

export const adminLoginInputSchema = z.object({
  username: z.string().min(2, "用户名至少 2 个字符"),
  password: z.string().min(4, "密码至少 4 个字符"),
})

export const adminUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.enum(["super_admin", "operator"]),
  displayName: z.string(),
  createdAt: z.string(),
})

export const adminTokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
})

export const adminAuthResponseSchema = z.object({
  tokens: adminTokenPairSchema,
  user: adminUserSchema,
})

export const dashboardStatsSchema = z.object({
  totalPatients: z.number(),
  totalSessions: z.number(),
  activeSessions: z.number(),
  todayNewPatients: z.number(),
  todayNewSessions: z.number(),
})

export const adminPatientItemSchema = z.object({
  id: z.string(),
  realName: z.string(),
  phone: z.string(),
  gender: z.string(),
  birthDate: z.string(),
  createdAt: z.string(),
  sessionCount: z.number(),
})

export const adminSessionItemSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  title: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export function paginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  })
}

export const systemSettingsSchema = z.object({
  siteName: z.string(),
  maxConcurrentSessions: z.number(),
  sessionTimeoutMinutes: z.number(),
  enableRegistration: z.boolean(),
})

export type AdminLoginInputSchema = z.infer<typeof adminLoginInputSchema>
