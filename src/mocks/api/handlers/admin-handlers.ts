import { mockDb } from "@/mocks/api/mock-db"
import { adminLoginInputSchema } from "@/features/admin/api/schemas"

/**
 * POST /admin/auth/login
 */
export function handleAdminLogin(body: unknown) {
  const { username, password } = adminLoginInputSchema.parse(body)
  return mockDb.adminLogin({ username, password })
}

/**
 * POST /admin/auth/logout
 */
export function handleAdminLogout(body: unknown) {
  const { refreshToken } = body as { refreshToken?: string }
  if (refreshToken) {
    mockDb.adminLogout(refreshToken)
  }
  return { success: true }
}

/**
 * POST /admin/auth/refresh
 */
export function handleAdminRefresh(body: unknown) {
  const { refreshToken } = body as { refreshToken: string }
  return mockDb.adminRefreshToken(refreshToken)
}

/**
 * GET /admin/dashboard/stats
 */
export function handleGetDashboardStats() {
  return mockDb.getAdminDashboardStats()
}

/**
 * GET /admin/patients
 */
export function handleListAdminPatients(params?: Record<string, unknown>) {
  const page = Number(params?.page) || 1
  const pageSize = Number(params?.pageSize) || 20
  const search = (params?.search as string) || undefined
  return mockDb.listAdminPatients({ page, pageSize, search })
}

/**
 * GET /admin/patients/:id
 */
export function handleGetAdminPatient(id: string) {
  return mockDb.getAdminPatient(id)
}

/**
 * GET /admin/sessions
 */
export function handleListAdminSessions(params?: Record<string, unknown>) {
  const page = Number(params?.page) || 1
  const pageSize = Number(params?.pageSize) || 20
  const status = (params?.status as string) || undefined
  const patientId = (params?.patientId as string) || undefined
  return mockDb.listAdminSessions({ page, pageSize, status, patientId })
}

/**
 * GET /admin/sessions/:id
 */
export function handleGetAdminSession(id: string) {
  return mockDb.getAdminSession(id)
}

/**
 * GET /admin/settings
 */
export function handleGetSystemSettings() {
  return mockDb.getSystemSettings()
}

/**
 * PUT /admin/settings
 */
export function handleUpdateSystemSettings(body: unknown) {
  return mockDb.updateSystemSettings(body as Record<string, unknown>)
}
