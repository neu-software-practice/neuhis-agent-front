import { History, House, User } from "lucide-react"
import { NavLink } from "react-router"

import { cn } from "@/lib/utils"

interface NavItem {
  to: string
  label: string
  icon: typeof House
  end?: boolean
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "首页", icon: House, end: true },
  { to: "/history", label: "历史", icon: History },
  { to: "/profile", label: "我的", icon: User },
]

/**
 * PC 端左侧固定导航栏。
 *
 * 仅在 md (≥768px) 断点以上可见，替代移动端底部 AppBottomTabs。
 * 使用 NavLink 维持激活态，布局为竖向导航列表。
 */
export function AppSidebar() {
  return (
    <aside className="hidden md:flex md:w-[220px] md:shrink-0 md:flex-col md:border-r md:border-border md:bg-sidebar">
      {/* Logo / 产品名 */}
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          云
        </div>
        <span className="text-sm font-semibold text-sidebar-foreground">
          东软云脑智能医疗
        </span>
      </div>

      {/* 导航列表 */}
      <nav aria-label="主导航" className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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

      {/* 底部占位（未来可放患者信息/退出） */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/50">
          <User className="size-4" aria-hidden="true" />
          <span>患者端</span>
        </div>
      </div>
    </aside>
  )
}
