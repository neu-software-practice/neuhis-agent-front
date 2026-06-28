import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface PageShellProps {
  /** 页面主体内容。 */
  children: ReactNode
  /** 可选顶部栏，例如标题、返回按钮。 */
  header?: ReactNode
  /** 可选底部固定区域，例如底部导航。 */
  footer?: ReactNode
  /** 主体滚动容器附加 class。 */
  className?: string
}

/**
 * 通用页面壳：移动端优先的单列布局，提供安全区、统一背景和滚动主体。
 *
 * 不包含任何业务判断，仅负责布局承载。首页、历史、我的等页面复用此壳。
 */
export function PageShell({ children, header, footer, className }: PageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {header ? (
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {header}
        </header>
      ) : null}
      <main className={cn("flex-1 overflow-y-auto", className)}>{children}</main>
      {footer ? (
        <footer className="sticky bottom-0 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
          {footer}
        </footer>
      ) : null}
    </div>
  )
}
