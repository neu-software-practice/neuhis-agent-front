# 项目地图

更新时间：2026-06-28

## 项目定位

NEUHIS Agent 前端是一个 React + HeroUI 3 + Magic UI 的 AI 诊疗 Agent 聊天界面。核心体验围绕患者与 AI 的连续问诊、流程卡片决策、检验缴费、确诊处置、急症打断、超时升级和主动退出结算展开。

## 当前代码结构

```text
.
  index.html                 # 标题已更新为「东软云脑智能医疗」
  src/
    main.tsx                 # React 入口，挂载 RouterProvider + globals.css
    globals.css              # Tailwind 4、HeroUI、shadcn 设计变量 + 移动端单列布局基线
    app/
      App.tsx                # Data Router 根布局，注入 AppProviders + <Outlet>
      providers.tsx          # AppProviders：QueryClientProvider + 开发态 devtools
      router.tsx             # createBrowserRouter 路由表
      error-boundary.tsx     # 路由级错误边界，患者可理解兜底页
    pages/
      home/HomePage.tsx      # 首页占位：症状输入 + 开始问诊跳转
      home/HistoryPage.tsx   # 历史占位骨架
      home/ProfilePage.tsx   # 个人中心占位骨架
      workbench/NewWorkbenchPage.tsx    # 新建问诊占位（解析 draft/followUpFrom）
      workbench/WorkbenchPage.tsx       # 进行中工作台占位（解析 sessionId）
      workbench/ReadonlyVisitPage.tsx   # 只读回看占位
      workbench/workbench-loaders.ts    # 路由 loader，仅参数解析与轻量校验
    features/shared/components/
      PageShell.tsx          # 通用页面壳：移动端单列 + 安全区 + header/footer slot
      EmptyState.tsx         # 通用空态 / 占位组件
      StatusPill.tsx         # 通用状态标签（通用 tone，不绑业务枚举）
      AppBottomTabs.tsx      # 底部主导航（NavLink：首页/历史/我的）
    components/ui/button.tsx # shadcn 风格 Button
    components/ui/button-variants.ts # Button 样式 variants
    lib/utils.ts             # cn 工具 + assertNever 穷尽检查
    lib/query-client.ts      # 全局 QueryClient 单例
    lib/ids.ts               # 纯前端本地 ID 生成
    lib/time.ts              # 时间格式化工具
    test/setup.ts            # Vitest + jest-dom 初始化
  agent-workspace/
    special-designs/api.md  # 前端 API 合约与 Mock 设计，含 REST/SSE contract 和结项 REST 文档要求
    interaction-flow.md      # 患者端完整业务流程、检验子流程、急症/超时/退出机制、Agent 决策主循环
    core-interaction-flow.md # 核心卡片流转、阻塞卡、完成后自动复诊和全局打断/升级机制
    requirements-analysis.md # 患者端需求分析，基于交互流程文档拆解范围、规则和验收
    ui-designs.md            # UI 设计文档，含患者视角原则、页面清单、路由映射、ASCII 草图、输入辅助和跳转关系
    detailed-design.md       # 前端详细设计，含目录分层、组件拆分、API facade、状态机、hooks、mock 和测试策略
    component-code-conventions.md # 组件代码设计通用约定，含 props、事件、状态来源、HeroUI/Magic UI、测试约定
    development-plan.md      # 详细开发计划，含 P0-P6 编号任务、依赖关系和 subagent 并行调度建议
    special-decisions.md     # 用户对 agent 下达的特殊要求记录
    tech-selection.md        # 前端技术选型文档
    map.md                   # 当前项目地图
    无人医院_患者端_交互原型.html
  references/                # 第三方库源码浅克隆留档，已被 .gitignore 忽略
```

## 已确定技术栈

- 构建：Vite
- 语言：TypeScript
- UI：React 19
- 路由：React Router 8
- 样式：Tailwind CSS 4
- 基础组件：HeroUI 3
- 按需组件：shadcn + Magic UI
- 图标：lucide-react
- 服务端状态：TanStack Query
- 客户端状态：Zustand
- 业务流程编排：XState
- HTTP 客户端：ky
- AI 流式响应：@microsoft/fetch-event-source
- 表单：React Hook Form
- Schema 校验：Zod
- 动效基础：motion
- 测试：Vitest + Testing Library + MSW

## 文档索引

- [完整交互流程](./interaction-flow.md)
- [核心交互流程](./core-interaction-flow.md)
- [患者端需求分析](./requirements-analysis.md)
- [UI 设计文档](./ui-designs.md)
- [前端详细设计](./detailed-design.md)
- [组件代码设计通用约定](./component-code-conventions.md)
- [详细开发计划](./development-plan.md)
- [技术选型](./tech-selection.md)
- [前端 API 合约与 Mock 设计](./special-designs/api.md)

## 本次完成（P1 全局基础骨架）

- P1.1 应用入口与路由骨架：新增 `src/app/{App,providers,router,error-boundary}.tsx`，采用 React Router Data Router（`createBrowserRouter` + `RouterProvider`），建立 `/`、`/history`、`/profile`、`/workbench/new`、`/workbench/:sessionId`、`/history/:sessionId` 路由；新增 `src/pages/home/{HomePage,HistoryPage,ProfilePage}.tsx` 与 `src/pages/workbench/{NewWorkbenchPage,WorkbenchPage,ReadonlyVisitPage}.tsx` 占位骨架；`workbench-loaders.ts` 只做参数解析与轻量校验，不预取业务数据、不推进状态。
- P1.2 全局 Provider 与 QueryClient：新增 `src/lib/query-client.ts` 单例；`AppProviders` 接入 `QueryClientProvider` 与开发态 `ReactQueryDevtools`，遵循 HeroUI 3 约定不加 `HeroUIProvider`。
- P1.3 全局样式清理与布局基线：`main.tsx` 改为 `RouterProvider` + 统一引入 `globals.css`；删除 Vite 示例 `App.tsx`、`App.css`、`index.css`、`assets/{hero.png,react.svg,vite.svg}`；`globals.css` `@layer base` 补移动端单列、安全区、`#root` 最小高度基线；`index.html` 标题改为「东软云脑智能医疗」。
- P1.4 通用工具与共享 UI 基础：`lib/utils.ts` 补 `assertNever`；新增 `lib/ids.ts`（`createLocalId`）、`lib/time.ts`；新增 `features/shared/components/{PageShell,EmptyState,StatusPill,AppBottomTabs}.tsx`，均为弱业务组件，`StatusPill` 用通用 tone 不绑定业务枚举，`AppBottomTabs` 用 `NavLink` 渲染 首页/历史/我的。
- 验证：`pnpm lint`、`pnpm build`（tsc -b + vite build）、`pnpm test` 均通过（暂无测试文件）。

## 本次未完成

- 未落地任何业务数据结构（`VisitSession`、`TimelineItem`、`FlowCard` 等）；P1 按计划只做最小运行壳。
- 未创建 `features/*/api`、`mocks`、状态机；留给 P2 数据先行地基。
- 页面均为占位骨架，未接入 feature query / mutation 与真实业务逻辑。
- 未新增测试文件；测试随 P2 起旁路推进。
- 下一步：P2.0 数据契约清单和样例矩阵，由 `api-contract` 单点启动。
