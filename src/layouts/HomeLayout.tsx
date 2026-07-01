import { AnimatedOutlet } from "@/components/ui/page-transition"
import { DesktopShell } from "@/features/shared/components/DesktopShell"

/**
 * 首页系列 Layout Route。
 *
 * 包裹 DesktopShell（PC 侧边导航 + Mobile 底部导航），
 * 子路由通过 AnimatedOutlet 渲染，并在路由切换时触发页面过渡动画。
 */
export default function HomeLayout() {
  return (
    <DesktopShell>
      <AnimatedOutlet />
    </DesktopShell>
  )
}
