import { useAdminAuthStore } from "@/features/admin/store/admin-auth-store"

export function useAdminAuth() {
  const { isAuthenticated, user } = useAdminAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    user: state.user,
  }))

  return { isAuthenticated, user }
}
