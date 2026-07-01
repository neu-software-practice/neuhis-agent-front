/** Admin 模块类型定义 */

export type AdminRole = "super_admin" | "admin" | "operator"

export interface AdminUser {
  id: string
  username: string
  role: AdminRole
  displayName: string
  createdAt: string
}

export interface AdminTokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AdminLoginInput {
  username: string
  password: string
}

export interface AdminAuthResponse {
  tokens: AdminTokenPair
  user: AdminUser
}

export interface DashboardStats {
  totalPatients: number
  totalSessions: number
  activeSessions: number
  todayNewPatients: number
  todayNewSessions: number
}

export interface AdminPatientItem {
  id: string
  realName: string
  phone: string
  gender: "male" | "female" | "unknown"
  birthDate: string
  createdAt: string
  sessionCount: number
}

export interface AdminSessionItem {
  id: string
  patientId: string
  patientName: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface SystemSettings {
  siteName: string
  maxConcurrentSessions: number
  sessionTimeoutMinutes: number
  enableRegistration: boolean
}
