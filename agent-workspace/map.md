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
    lib/api/
      config.ts              # API_MODE / BASE_URL / mock 延迟配置
      types.ts               # ApiError、ID、分页、状态枚举等通用契约
      errors.ts              # ApiException、错误标准化、Zod 错误转换
      transport.ts           # ApiTransport、RequestOptions、StreamHandlers
      client.ts              # ky HTTP transport + fetch-event-source SSE 骨架
      index.ts               # getTransport() mock/http 选择器
    features/
      api.ts                 # 统一 api facade 聚合：patient / visits / workbench
      patient/api/           # 患者 schema、types、facade、query/mutation options
      visits/api/            # 会话 schema、types、facade、query/mutation options
      workbench/api/         # 时间线/流程卡/SSE schema、types、facade、query/mutation options
      workbench/machine/     # XState visitMachine、事件/上下文类型、guards、actions、状态机测试
    mocks/api/
      fixtures/              # patient / visits / timeline / flow-cards fixture 工厂
      handlers/              # patient / visit / chat mock handler
      mock-db.ts             # 内存 mock 状态与流程推进
      mock-transport.ts      # ApiTransport mock 实现
      stream-simulator.ts    # assistant-stream / lock-question / consult mock SSE
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

## 阶段完成记录

### P1 全局基础骨架

- 完成应用入口、Data Router 路由表、AppProviders、QueryClient、全局样式基线和共享弱业务组件。
- 页面仍是占位骨架，loader 只做参数解析和轻量校验，不预取业务数据、不推进流程状态。
- P1 验证：`pnpm lint`、`pnpm build`、`pnpm test` 通过。

### P2.0-P2.4 契约、mock 和 API facade

- 新增 `.env.example`，包含 `VITE_API_MODE`、`VITE_API_BASE_URL`、`VITE_MOCK_DELAY_MS`。
- 新增 `src/lib/api/*`：统一 `ApiTransport`、mock/http transport 选择、ky HTTP transport 骨架、SSE transport 骨架、统一 `ApiError` 与 Zod 解析错误转换。
- 新增 `patient / visits / workbench` 三域 schema、types、facade、query options 和 mutation options；类型从 Zod schema 推导，`FlowCard`、`TimelineItem`、`AssistantStreamEvent` 使用 discriminated union。
- 新增 `src/features/api.ts` 聚合 `api.patient`、`api.visits`、`api.workbench`，业务层后续不直接调用 transport。
- 新增 `src/mocks/api/*`：fixtures、handler、mock-db、mock transport 和 stream simulator。mock 可创建新问诊、创建复诊、读取历史、读取时间线、发送消息、流式产出 `delta/message_final/card/state/done`、推进检验决策、检验支付、药品支付、取药完成、仅医嘱、意图分类、急症复检、主动退出、暂停/恢复计时。
- 新增 `src/features/workbench/api/workbench-api.test.ts`，覆盖 mock facade 创建会话、发送消息、流式下发检验卡、检验决策和支付推进。
- P2 验证：`pnpm test`、`pnpm lint`、`pnpm build` 均通过。

### P2.5 XState 状态机骨架

- 新增 `src/features/workbench/machine/{visit-machine,visit-machine.types,visit-machine.guards,visit-machine.actions}.ts`。
- 建立 `loadingContext`、`chatting`、`analyzing`、`labDecision`、`labPayment`、`labExecution`、`diagnosis`、`treatmentDecision`、`medicationPayment`、`medicationFulfillment`、`treatmentExecution`、`adviceOnly`、`completed`、`emergencyPending`、`terminated`、`exitSettlement`、`exited` 全部状态。
- `VisitMachineContext` 只保存 `sessionId`、当前卡 ID、终止原因、计时暂停标记、轮次、stream request id、急症覆盖态前态等必要流程上下文；不保存完整 `VisitSession`、timeline 或 card 数据。
- 已实现 `HYDRATE` 直接恢复到目标机器态，且不触发 API 副作用；阻塞态下 `MESSAGE_SENT` 不推进主流程。
- 已实现全局打断优先级骨架：急症进入 `emergencyPending` 并保存前态，确认后 `terminated(reason: emergency)`，误报恢复前态；超时 / 转诊进入 `terminated`；主动退出进入 `exitSettlement` 后 `exited`。
- 已补 `src/features/workbench/machine/visit-machine.test.ts`，覆盖 hydration、阻塞态消息不推进、检验卡链路、急症恢复 / 确认、超时优先级和处置分支跳转。
- P2.5 验证：`pnpm test`、`pnpm lint`、`pnpm build` 均通过。

## 当前未完成

- 页面仍未接入 `patientQueries`、`visitsQueries`、`workbenchQueries`；`P3` 开始后不得再使用临时页面对象。
- mock 主链路已覆盖新出诊、检验同意、支付、诊断、用药取药、退出、急症复检等基础路径；支付失败、自动化治疗完整路径、完成后复诊/咨询仍需在 P4/P5 扩展测试。
- `visitMachine` 已有骨架与关键测试，但还未接入 `useWorkbenchSession`、`useAssistantStream` 和真实 UI；P4.1 负责总装。
- 尚未产出结项 `special-designs/rest-api.md`；等 schema、MSW/契约测试和 UI 主流程稳定后整理。
