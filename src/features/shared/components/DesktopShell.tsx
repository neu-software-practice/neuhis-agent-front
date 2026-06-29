import type { ReactNode } from "react"

import { AppBottomTabs } from "@/features/shared/components/AppBottomTabs"
import { AppSidebar } from "@/features/shared/components/AppSidebar"

interface DesktopShellProps {
  children: ReactNode
}

/**
 * PC/Mobile 自适应布局壳。
 *
 * - PC（≥768px）：左侧固定 sidebar + 右侧内容区撑满
 * - Mobile（<768px）：纯内容区 + 底部 AppBottomTabs
 *
 * 用于首页系列（首页、历史、个人中心），工作台有独立布局不使用此壳。
 */
export function DesktopShell({ children }: DesktopShellProps) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* PC 侧边导航 */}
      <AppSidebar />

      {/* 主内容区 */}
      <div className="flex min-h-dvh flex-1 flex-col">
        <main className="flex-1">{children}</main>

        {/* Mobile 底部导航 */}
        <footer className="sticky bottom-0 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
          <AppBottomTabs />
        </footer>
      </div>
    </div>
  )
}
