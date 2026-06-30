/**
 * 管理后台路由级认证守卫。
 *
 * 作为布局路由组件包裹受保护的管理后台子路由。
 * 未认证时 redirect 到 /admin/login，携带 redirectTo 参数以便登录后回跳。
 */
import { Navigate, Outlet, useLocation } from "react-router"

import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth"

export function AdminGuard() {
  const { isAuthenticated } = useAdminAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    const redirectTo = encodeURIComponent(
      location.pathname + location.search,
    )
    return <Navigate to={`/admin/login?redirectTo=${redirectTo}`} replace />
  }

  return <Outlet />
}
