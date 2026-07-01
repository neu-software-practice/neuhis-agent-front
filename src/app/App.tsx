import { AnimatedOutlet } from "@/components/ui/page-transition"
import { AppProviders } from "@/app/providers"

/**
 * 应用根布局。
 *
 * 作为 Data Router 的根 Component，注入全局 Provider 并渲染子路由。
 * 移动端单列承载约束在 globals.css 与各页面 PageShell 中处理，
 * 此处不做任何业务数据拼装。
 *
 * 使用 AnimatedOutlet 替代 Outlet，为顶层路由切换提供过渡动画。
 */
export default function App() {
  return (
    <AppProviders>
      <AnimatedOutlet />
    </AppProviders>
  )
}
