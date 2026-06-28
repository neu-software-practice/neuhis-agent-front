import { History, House, User } from "lucide-react"
import { NavLink } from "react-router"

import { cn } from "@/lib/utils"

interface TabItem {
  to: string
  label: string
  icon: typeof House
  /** 是否仅在精确路径匹配时高亮。 */
  end?: boolean
}

const TABS: readonly TabItem[] = [
  { to: "/", label: "首页", icon: House, end: true },
  { to: "/history", label: "历史", icon: History },
  { to: "/profile", label: "我的", icon: User },
]

/**
 * 移动端优先的底部主导航。
 *
 * 使用 React Router NavLink 维持激活态，icon 均附带可见文字标签，
 * 不承载任何业务数据，仅做页面间导航。
 */
export function AppBottomTabs() {
  return (
    <nav aria-label="主导航" className="flex items-stretch">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          <Icon className="size-5" aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
