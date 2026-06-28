# 项目地图

更新时间：2026-06-28（P3 完成）

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
      home/HomePage.tsx      # 首页：TanStack Query 活跃会话 + 症状快速填充 + 创建新会话
      home/HistoryPage.tsx   # 历史就诊：筛选 tab + TanStack Query 列表 + SessionCard
      home/ProfilePage.tsx   # 个人中心：TanStack Query 患者上下文 + PatientSummaryCard
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
      patient/components/    # PatientSummaryCard（患者档案摘要卡片）
      visits/api/            # 会话 schema、types、facade、query/mutation options
      visits/components/     # VisitStatusBadge（就诊状态标签）、SessionCard（就诊会话卡片）
      workbench/api/         # 时间线/流程卡/SSE schema、types、facade、query/mutation options
      workbench/machine/     # XState visitMachine、事件/上下文类型、guards、actions、状态机测试
      workbench/store/       # Zustand stores：composer-store（输入草稿）、workbench-ui-store（UI 状态）
      workbench/components/  # 工作台 UI 组件：ChatTimeline、MessageBubble、TimelineRow、SystemEventRow、TerminalEventRow、AssistantThinkingRow、InputDock、InputAssistPanel、LockBar、LockQuestionSheet
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

### P3.1 首页 / 历史 / 个人中心登录态页面

- 新增 `src/features/visits/components/VisitStatusBadge.tsx`：将 VisitStatus 映射为 StatusPill 的 tone 和中文文案。
- 新增 `src/features/visits/components/SessionCard.tsx`：使用 HeroUI Card compound 展示会话摘要，根据状态显示继续就诊/发起复诊/回看记录按钮。
- 新增 `src/features/patient/components/PatientSummaryCard.tsx`：患者档案摘要卡片，展示姓名/性别/年龄/电话/过敏史/慢性病/长期用药。
- 重写 `src/pages/home/HomePage.tsx`：接入 `visitsQueries.list` 获取全部会话，本地过滤活跃会话显示 SessionCard；症状输入区 + 常见症状快速填充（发烧、咳嗽等六个 chip）+ `useMutation(visitsMutations.createSession())` 创建新会话，fallback 为 draft 跳转。
- 重写 `src/pages/home/HistoryPage.tsx`：接入 `visitsQueries.list`，四个筛选 tab（全部/进行中/已完成/已终止），列表渲染 SessionCard，支持继续就诊/复诊/回看导航。
- 重写 `src/pages/home/ProfilePage.tsx`：接入 `patientQueries.context("patient-mock-001")`，展示 PatientSummaryCard + 既往病史 + 上次就诊摘要，支持 loading skeleton 和 error EmptyState 重试。
- P3.1 验证：`pnpm lint` 通过。

### P3.2 工作台 Shell 和顶层布局组件

- 新增 `src/features/workbench/components/WorkbenchShell.tsx`：工作台布局壳，使用显式命名 slot props（header/timeline/input/overlays）。Mobile 默认单列全高，PC 居中主列（max-w-[640px]）+ 右侧边栏（240px）。
- 新增 `src/features/workbench/components/WorkbenchHeader.tsx`：顶部栏，左侧 AI 头像 + 名称，右侧超时警告、暂停/恢复、紧急盾牌、退出按钮。移动端按优先级互斥显示，PC 端全部可见。
- 新增 `src/features/workbench/components/ContextSummaryBar.tsx`：可折叠上下文摘要条，单行显示 "患者: {name} | 主诉: {complaint} | 第{n}轮"，点击打开 Drawer。
- 新增 `src/features/workbench/components/ContextSummaryDrawer.tsx`：基于 HeroUI v3 Drawer 的上下文详情，展示患者姓名、主诉、轮次/上限、超时时间。
- 重写 `src/pages/workbench/WorkbenchPage.tsx`：接入 `visitsQueries.session` 加载会话数据，展示 loading/error（EmptyState）/data 三态。数据就绪后装配 WorkbenchShell，时间线和输入区域为临时占位（P3.3/P4.1 替换）。
- 重写 `src/pages/workbench/NewWorkbenchPage.tsx`：挂载时自动创建会话（useMutation），支持初诊和复诊（followUpFrom），创建成功后 navigate 到 `/workbench/:sessionId`，展示 loading/error（含重试按钮）态。
- P3.2 验证：`pnpm lint`、`pnpm test` 通过。

### P3.3 工作台 Timeline、消息气泡和输入组件

- 新增 `src/features/workbench/store/composer-store.ts`：Zustand store，管理输入草稿，按 sessionId 持久化。
- 新增 `src/features/workbench/store/workbench-ui-store.ts`：Zustand store，管理工作台 UI 状态（上下文抽屉、右侧边栏折叠、时间线底部跟踪、阻断疑问 Sheet）。
- 新增 `src/features/workbench/components/ChatTimeline.tsx`：基于 react-virtuoso 的虚拟滚动时间线，支持加载更多、底部跟踪、浮动"回到底部"按钮。
- 新增 `src/features/workbench/components/TimelineRow.tsx`：timeline item kind 分发器（memo），含 assertNever 穷尽检查。
- 新增 `src/features/workbench/components/MessageBubble.tsx`：患者/助手消息气泡（memo），支持 streaming 光标、failed 错误提示、invalidated 降级显示、interruptedBy 打断标记。
- 新增 `src/features/workbench/components/SystemEventRow.tsx`：居中系统事件行，事件类型对应 lucide 图标。
- 新增 `src/features/workbench/components/AssistantThinkingRow.tsx`：AI 分析指示器，脉冲动画 + Brain 图标。
- 新增 `src/features/workbench/components/TerminalEventRow.tsx`：终诊事件卡片，reason 对应图标和颜色，支持转诊科室建议。
- 新增 `src/features/workbench/components/InputDock.tsx`：主输入区，HeroUI Textarea 多行自动增长，Enter 发送/Shift+Enter 换行。
- 新增 `src/features/workbench/components/InputAssistPanel.tsx`：输入辅助 chip 面板，draft（outline）和 quick_answer（filled）分两行不混排。
- 新增 `src/features/workbench/components/LockBar.tsx`：阻断状态栏，锁图标 + 原因 + 两个逃生按钮（上报急症、疑问）。
- 新增 `src/features/workbench/components/LockQuestionSheet.tsx`：阻断疑问输入 Drawer，HeroUI Drawer 底部弹出，包含 Textarea 和提交/取消按钮。
- TimelineRow 依赖 `FlowCardRenderer`（P3.4 创建），已在 P3.4 合入后解决。
- P3.3 验证：`pnpm lint` 通过。

### P3.4 流程卡叶子组件

- 新增 `src/features/workbench/flow-cards/FlowCardRenderer.tsx`：按 `card.kind` 穷尽分发 9 种流程卡，使用 `assertNever` 收口。
- 新增交互式卡片（含 onAction）：`LabDecisionCard`（检验项目/原因/费用，同意/不查/暂不决定）、`PaymentCard`（支付明细/医保/自费，确认支付/暂不缴费）、`MedicationFulfillmentCard`（药品清单/自取/配送）、`TreatmentExecutionCard`（治疗预约/排队/执行，动态动作按钮）、`AdviceOnlyCard`（医嘱/观察项/复诊建议，已知晓确认）。
- 新增展示式卡片（无操作）：`LabExecutionCard`（执行状态 + 结果摘要）、`DiagnosisCard`（诊断/置信度/依据来源/风险信号）、`TreatmentPlanCard`（处置方案/能力判断/动作清单，患者不选分支）、`CompletedVisitCard`（诊断摘要/处置摘要/随访提醒）。
- 新增非 FlowCard 终止展示：`TerminalCard`（按 reason 区分图标/颜色/文案，转诊科室，保存摘要按钮）。
- 新增 `src/features/workbench/api/types.ts` 中 `FlowCardAction` discriminated union 类型（7 种 action）。
- 所有卡片使用 HeroUI v3 Card compound pattern、memo 包裹、`formatDate` 时间戳、`onAction` 回调（不调 API）。
- P3.4 验证：`pnpm lint`、`pnpm tsc --noEmit` 通过。

## 当前未完成

- 页面已接入 `patientQueries`、`visitsQueries`，但工作台时间线和输入仍为占位，待 P4.1 `useWorkbenchSession` 总装后替换为真实组件。
- mock 主链路已覆盖新出诊、检验同意、支付、诊断、用药取药、退出、急症复检等基础路径；支付失败、自动化治疗完整路径、完成后复诊/咨询仍需在 P4/P5 扩展测试。
- `visitMachine` 已有骨架与关键测试，但还未接入 `useWorkbenchSession`、`useAssistantStream` 和真实 UI；P4.1 负责总装。
- 尚未产出结项 `special-designs/rest-api.md`；等 schema、MSW/契约测试和 UI 主流程稳定后整理。
