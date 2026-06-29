import { Outlet } from "react-router"

import { DesktopShell } from "@/features/shared/components/DesktopShell"

/**
 * 首页系列 Layout Route。
 *
 * 包裹 DesktopShell（PC 侧边导航 + Mobile 底部导航），
 * 子路由通过 Outlet 渲染。
 */
export default function HomeLayout() {
  return (
    <DesktopShell>
      <Outlet />
    </DesktopShell>
  )
}
