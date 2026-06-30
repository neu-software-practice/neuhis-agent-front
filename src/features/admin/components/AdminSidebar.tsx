import { LayoutDashboard, LogOut, MessageSquare, Settings, Users } from "lucide-react"
import { NavLink, useNavigate } from "react-router"

import claudeLogo from "@/assets/claude.webp"
import { useAdminAuthStore } from "@/features/admin/store/admin-auth-store"
import { cn } from "@/lib/utils"

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: "/admin/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { to: "/admin/patients", label: "患者管理", icon: Users },
  { to: "/admin/sessions", label: "问诊记录", icon: MessageSquare },
  { to: "/admin/settings", label: "系统设置", icon: Settings },
]

/**
 * 管理后台左侧固定导航栏。
 *
 * 始终可见（admin 仅 PC 端），使用 NavLink 维持激活态。
 */
export function AdminSidebar() {
  const navigate = useNavigate()

  function handleLogout() {
    useAdminAuthStore.getState().logout()
    navigate("/admin/login")
  }

  return (
    <aside className="hidden md:flex md:w-[220px] md:shrink-0 md:flex-col md:border-r md:border-border md:bg-sidebar">
      {/* Logo / 产品名 */}
      <div className="flex h-14 items-center gap-2 px-5">
        <img src={claudeLogo} alt="Logo" className="size-8 rounded-lg" />
        <span className="text-sm font-semibold text-sidebar-foreground">
          东软云脑智能医疗
        </span>
      </div>

      {/* 导航列表 */}
      <nav aria-label="管理导航" className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )
            }
          >
            <Icon className="size-5" aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 底部：管理后台标识 + 退出 */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-sidebar-foreground/50">
          <span>管理后台</span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 rounded px-1.5 py-1 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            aria-label="退出登录"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            <span>退出</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
