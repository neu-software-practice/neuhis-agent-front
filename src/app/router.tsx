import { createBrowserRouter } from "react-router"

import App from "@/app/App"
import { AppErrorBoundary } from "@/app/error-boundary"
import { AuthGuard } from "@/features/auth/components/AuthGuard"
import HomeLayout from "@/layouts/HomeLayout"
import LoginPage from "@/pages/auth/LoginPage"
import RegisterPage from "@/pages/auth/RegisterPage"
import HistoryPage from "@/pages/home/HistoryPage"
import HomePage from "@/pages/home/HomePage"
import AddressPage from "@/pages/home/AddressPage"
import BillingPage from "@/pages/home/BillingPage"
import MedicalOrdersPage from "@/pages/home/MedicalOrdersPage"
import ProfilePage from "@/pages/home/ProfilePage"
import NewWorkbenchPage from "@/pages/workbench/NewWorkbenchPage"
import ReadonlyVisitPage from "@/pages/workbench/ReadonlyVisitPage"
import WorkbenchPage from "@/pages/workbench/WorkbenchPage"
import {
  newWorkbenchLoader,
  readonlyVisitLoader,
  workbenchLoader,
} from "@/pages/workbench/workbench-loaders"

/**
 * 应用路由表。
 *
 * 采用 React Router Data Router：createBrowserRouter 自 react-router 导入，
 * DOM 环境的 RouterProvider 在 main.tsx 中自 react-router/dom 导入。
 * loader 仅做参数解析与轻量校验，不推进业务状态。
 *
 * 公开路由：/login、/register（未登录可访问）。
 * 受保护路由：其余所有页面通过 AuthGuard 路由守卫，未登录重定向至 /login。
 * 首页系列（/、/history、/profile）包裹 HomeLayout（PC 端侧边导航 + 内容区）。
 * 工作台系列保持独立全屏布局。
 */
export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    ErrorBoundary: AppErrorBoundary,
    children: [
      // ── 公开路由（无需登录） ──
      { path: "login", Component: LoginPage },
      { path: "register", Component: RegisterPage },

      // ── 受保护路由 ──
      {
        Component: AuthGuard,
        children: [
          {
            // 首页系列 — PC 端使用 DesktopShell（左侧导航 + 内容区）
            Component: HomeLayout,
            children: [
              { index: true, Component: HomePage },
              { path: "history", Component: HistoryPage },
              { path: "billing", Component: BillingPage },
              { path: "medical-orders", Component: MedicalOrdersPage },
              { path: "addresses", Component: AddressPage },
              { path: "profile", Component: ProfilePage },
            ],
          },
          {
            path: "workbench/new",
            loader: newWorkbenchLoader,
            Component: NewWorkbenchPage,
          },
          {
            path: "workbench/:sessionId",
            loader: workbenchLoader,
            Component: WorkbenchPage,
          },
          {
            path: "history/:sessionId",
            loader: readonlyVisitLoader,
            Component: ReadonlyVisitPage,
          },
        ],
      },
    ],
  },
])
