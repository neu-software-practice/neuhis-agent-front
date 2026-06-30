/**
 * 管理后台布局壳。
 *
 * PC-only 布局：左侧固定 AdminSidebar + 右侧内容区撑满。
 * 作为路由布局组件使用，通过 <Outlet /> 渲染子路由。
 */
import { Outlet } from "react-router"

import { AdminSidebar } from "@/features/admin/components/AdminSidebar"

export function AdminShell() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <AdminSidebar />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
