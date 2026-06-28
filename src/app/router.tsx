import { createBrowserRouter } from "react-router"

import App from "@/app/App"
import { AppErrorBoundary } from "@/app/error-boundary"
import HistoryPage from "@/pages/home/HistoryPage"
import HomePage from "@/pages/home/HomePage"
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
 */
export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    ErrorBoundary: AppErrorBoundary,
    children: [
      { index: true, Component: HomePage },
      { path: "history", Component: HistoryPage },
      { path: "profile", Component: ProfilePage },
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
])
