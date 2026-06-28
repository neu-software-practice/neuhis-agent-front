import { cn } from "@/lib/utils"

interface WorkbenchShellProps {
  header: React.ReactNode
  timeline: React.ReactNode
  input: React.ReactNode
  overlays?: React.ReactNode
  className?: string
}

/**
 * 工作台布局壳。
 *
 * 使用显式命名 slot props 替代 children，确保各区域职责清晰。
 * - Mobile（默认）：单列全高，header 固定顶部，timeline 撑满可滚动，input 底部固定。
 * - PC（>=768px）：居中主列（max-w-[640px]）+ 右侧可折叠边栏（240px）。
 */
export function WorkbenchShell({
  header,
  timeline,
  input,
  overlays,
  className,
}: WorkbenchShellProps) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-dvh flex-col bg-background text-foreground",
        "md:flex-row md:gap-4 md:px-4",
        className,
      )}
    >
      {/* 主列：header + timeline + input */}
      <div className="flex flex-1 flex-col md:mx-auto md:max-w-[640px]">
        {/* header：顶部固定 */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {header}
        </header>

        {/* timeline：撑满可滚动区域 */}
        <main className="flex-1 overflow-y-auto">{timeline}</main>

        {/* input：底部固定 */}
        <footer className="sticky bottom-0 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
          {input}
        </footer>
      </div>

      {/* PC 右侧边栏（未来扩展：上下文摘要、用药提醒等） */}
      <aside className="hidden md:block md:w-[240px] md:shrink-0" />

      {/* 全局覆盖层：Drawer、Sheet、Modal 等 */}
      {overlays}
    </div>
  )
}
