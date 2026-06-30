import { useShallow } from "zustand/shallow"

import { useAdminAuthStore } from "@/features/admin/store/admin-auth-store"

export function useAdminAuth() {
  return useAdminAuthStore(
    useShallow((state) => ({
      isAuthenticated: state.isAuthenticated,
      user: state.user,
    })),
  )
}
