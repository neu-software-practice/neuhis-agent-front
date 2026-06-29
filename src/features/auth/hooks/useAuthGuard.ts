/**
 * Auth 守卫 hook。
 *
 * 读取 auth-store 的认证状态，返回是否已认证。
 * 搭配 AuthGuard 组件使用，或用于条件渲染。
 */
import { useAuthStore } from "@/features/auth/store/auth-store"

export function useAuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)

  return { isAuthenticated, user }
}
