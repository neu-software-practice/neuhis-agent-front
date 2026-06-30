/**
 * 管理后台页面 lazy 导入。
 *
 * 独立文件以避免 react-refresh/only-export-components lint 警告。
 */
import { lazy } from "react"

export const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage"))
export const AdminGuard = lazy(() =>
  import("@/features/admin/components/AdminGuard").then((m) => ({
    default: m.AdminGuard,
  })),
)
export const AdminShell = lazy(() =>
  import("@/features/admin/components/AdminShell").then((m) => ({
    default: m.AdminShell,
  })),
)
export const DashboardPage = lazy(() => import("@/pages/admin/DashboardPage"))
export const PatientListPage = lazy(
  () => import("@/pages/admin/PatientListPage"),
)
export const SessionListPage = lazy(
  () => import("@/pages/admin/SessionListPage"),
)
export const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"))
