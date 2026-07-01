/**
 * Admin API facade。
 *
 * 封装管理后台所有接口调用：认证、仪表盘、患者管理、会话管理、系统设置。
 */
import { getTransport } from "@/lib/api"

import type { PatientProfile } from "@/features/patient/api/types"
import type { VisitSession } from "@/features/visits/api/types"
import type {
  AdminAuthResponse,
  AdminLoginInput,
  AdminPatientItem,
  AdminSessionItem,
  AdminTokenPair,
  DashboardStats,
  PaginatedResponse,
  SystemSettings,
} from "./types"

export const adminApi = {
  // ─── Auth ───────────────────────────────────────────────────────────

  /** 管理员账号密码登录。 */
  login(input: AdminLoginInput): Promise<AdminAuthResponse> {
    return getTransport().post<AdminAuthResponse>("/admin/auth/login", input)
  },

  /** 退出登录，服务端撤销 refreshToken。 */
  logout(refreshToken: string): Promise<{ success: boolean }> {
    return getTransport().post<{ success: boolean }>("/admin/auth/logout", { refreshToken })
  },

  /** 使用 refreshToken 获取新 token 对。 */
  refresh(refreshToken: string): Promise<{ tokens: AdminTokenPair }> {
    return getTransport().post<{ tokens: AdminTokenPair }>(
      "/admin/auth/refresh",
      { refreshToken },
    )
  },

  // ─── Dashboard ──────────────────────────────────────────────────────

  /** 获取仪表盘统计数据。 */
  getDashboardStats(): Promise<DashboardStats> {
    return getTransport().get<DashboardStats>("/admin/dashboard/stats")
  },

  // ─── Patients ───────────────────────────────────────────────────────

  /** 分页查询患者列表。 */
  listPatients(
    params?: { page?: number; pageSize?: number; search?: string },
  ): Promise<PaginatedResponse<AdminPatientItem>> {
    return getTransport().get<PaginatedResponse<AdminPatientItem>>(
      "/admin/patients",
      { searchParams: params as Record<string, string | number | undefined> },
    )
  },

  /** 获取单个患者详情（返回完整 PatientProfile）。 */
  getPatient(id: string): Promise<PatientProfile> {
    return getTransport().get<PatientProfile>(`/admin/patients/${id}`)
  },

  // ─── Sessions ───────────────────────────────────────────────────────

  /** 分页查询会话列表。 */
  listSessions(
    params?: {
      page?: number
      pageSize?: number
      status?: string
      patientId?: string
    },
  ): Promise<PaginatedResponse<AdminSessionItem>> {
    return getTransport().get<PaginatedResponse<AdminSessionItem>>(
      "/admin/sessions",
      { searchParams: params as Record<string, string | number | undefined> },
    )
  },

  /** 获取单个会话详情（返回完整 VisitSession）。 */
  getSession(id: string): Promise<VisitSession> {
    return getTransport().get<VisitSession>(`/admin/sessions/${id}`)
  },

  // ─── Settings ───────────────────────────────────────────────────────

  /** 获取系统设置。 */
  getSettings(): Promise<SystemSettings> {
    return getTransport().get<SystemSettings>("/admin/settings")
  },

  /** 更新系统设置（部分更新）。 */
  updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    return getTransport().put<SystemSettings>("/admin/settings", settings)
  },
}
