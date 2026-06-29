/**
 * 路由级认证守卫。
 *
 * 作为布局路由组件包裹受保护的子路由。
 * 未认证时 redirect 到 /login，携带 redirectTo 参数以便登录后回跳。
 */
import { Navigate, Outlet, useLocation } from "react-router"

import { useAuthGuard } from "@/features/auth/hooks/useAuthGuard"

export function AuthGuard() {
  const { isAuthenticated } = useAuthGuard()
  const location = useLocation()

  if (!isAuthenticated) {
    const redirectTo = encodeURIComponent(
      location.pathname + location.search,
    )
    return <Navigate to={`/login?redirectTo=${redirectTo}`} replace />
  }

  return <Outlet />
}
