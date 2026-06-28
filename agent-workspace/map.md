# 项目地图

更新时间：2026-06-28（P4 主链路联动补完）

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

### P4.1-P4.4 主链路联动（完成态分流打通）

- 新增 `src/features/workbench/hooks/useWorkbenchSession.ts`：工作台总装 hook，组合 Query cache（session + timeline infinite query）、XState visit machine actor（useActorRef + useSelector）、hydration 逻辑（session status + currentCard.kind → 机器态映射）、sendMessage（乐观消息 + SSE 流式）、submitFlowAction（useFlowCardAction 分发）、exit/pause/resume/reportVitals actions。
- 新增 `src/features/workbench/hooks/useTimeline.ts`：时间线数据管理，useInfiniteQuery + flattenTimelinePages。
- 新增 `src/features/workbench/hooks/useAssistantStream.ts`：SSE 流管理 hook，通过回调与外部通信（sendMachineEvent / appendTimelineItem / updateTimelineItem）。实现 delta RAF 批量合并、9 种 card kind → machine event 映射、AbortController 生命周期、error/done/emergency 处理。
- 新增 `src/features/workbench/hooks/useFlowCardAction.ts`：流程卡动作分发 hook，乐观更新（processing）→ API 调用 → 成功更新 cache + 发事件 → 失败回滚（pending）。支付类按 purpose 区分 LAB_PAYMENT_SUCCEEDED / MEDICATION_PAID / PAYMENT_DEFERRED。
- 新增 `src/features/workbench/utils/timeline-merge.ts`：纯函数工具——flattenTimelinePages、createOptimisticPatientMessage、createStreamingAssistantMessage、appendMessageDelta、finalizeStreamingMessage、upsertFlowCardItem、createSystemEventItem、createTerminalItem、generateClientMessageId。
- 新增 `src/features/workbench/utils/card-normalizers.ts`：纯函数工具——toLabDecisionInput / toPaymentInput / toFulfillmentInput / toTreatmentExecutionInput / toAckAdviceInput、mapActionToSuccessEvent、getCardActionLabel、isBlockingCard、getLockReason。
- 修改 `src/pages/workbench/WorkbenchPage.tsx`：使用 useWorkbenchSession 总装 hook；时间线接入 ChatTimeline（含 onAction 透传）；输入区域根据 blockingCard 条件渲染 LockBar（含真实的 reportEmergency / askQuestion 回调）或 InputDock；InputDock 接入 `isStreaming` 发送态；completed 状态下支持咨询/复诊分流后的页面跳转。
- 修改 `src/features/workbench/components/ChatTimeline.tsx`：新增 onAction prop 透传给 TimelineRow。
- 修改 `src/features/workbench/components/TimelineRow.tsx`：新增 onAction prop 透传给 FlowCardRenderer。
- 补充 `src/features/workbench/hooks/useFlowCardAction.ts`：流程卡 action 成功后合并 `result.timelineItems`，并按返回卡片/时间线事件推进状态机，避免仅替换原卡导致阻塞态丢失。
- 补充 `src/features/workbench/hooks/useAssistantStream.ts`：支持 `assistant` 与 `consultation` 两类流任务，completed 会话咨询可复用流式展示。
- 补充 `src/features/workbench/hooks/useWorkbenchSession.ts`：completed 会话输入接入 `classifyFollowUpIntent`，咨询不创建新 session，新症状/复诊意图创建 follow-up session 并跳转。
- 补充 `src/features/workbench/utils/card-normalizers.ts`：新增 `mapCardToMachineEvent` / `mapTimelineItemToMachineEvent`，统一卡片到状态机事件映射。
- 补充 `src/features/workbench/machine/visit-machine.ts`：加入 `ADVICE_CARD_RAISED`、`MEDICATION_PAYMENT_RAISED`、`TREATMENT_EXECUTION_RAISED` 相关过渡。
- 补充 `src/mocks/api/mock-db.ts`：支付暂缓写入 `invalidated` 与系统提示；发送消息复用已有 streaming placeholder，避免重复占位消息。
- P4 验证：`pnpm tsc --noEmit`、`pnpm test`、`pnpm build` 均通过。

### P4 补完：自动化治疗、流中断和验收测试

- 补充 `src/mocks/api/fixtures/flow-cards.ts`：`createTreatmentPlanCard` 支持 `medication` / `treatment` / `advice_only` / `referral` 四类计划；新增 `createTreatmentExecutionCard`；`createDiagnosisCard` 支持无检验证据诊断，避免患者不查后伪造 `lab_result`。
- 补充 `src/mocks/api/mock-db.ts`：检验支付后按 mock 文本意图分流到用药、仅医嘱、自动化治疗三条路径；自动化治疗支持预约、确认到号、开始执行、确认完成并生成完成卡；仅医嘱路径复用 advice card，完成后进入 completed。
- 修改 `src/features/workbench/flow-cards/TreatmentExecutionCard.tsx`：治疗执行卡不再因中间态 `processing` 丢失后续操作，按钮依据 `executionStatus` / `availableActions` 连续推进。
- 修改 `src/features/workbench/hooks/useAssistantStream.ts` 与 `src/features/workbench/hooks/useWorkbenchSession.ts`：`abortStream(reason)` 在退出、急症、超时 / 错误中断时将 streaming 消息标记为 `invalidated` 或 `failed`，避免时间线残留永久 streaming。
- 补充 `src/features/workbench/machine/visit-machine.ts`：`adviceOnly` 状态可接收 `ADVICE_CARD_RAISED` 并更新当前阻塞卡，确保 lab 支付后直接进入仅医嘱卡时 LockBar 正确。
- 扩展 `src/features/workbench/api/workbench-api.test.ts`：API/mock 层覆盖用药路径、仅医嘱路径、自动化治疗路径、不查检验无 lab evidence、完成后咨询不创建复诊、完成后新症状创建带 parentSessionId 的 follow-up、急症 stream event。
- P4 补完验证：`pnpm tsc --noEmit`、`pnpm test`（2 files / 15 tests）、`pnpm build` 均通过；`pnpm build` 仍存在 Vite chunk size 提示，非本次 P4 阻断项。

### P4 审查修复：支付事件、急症流和复诊 hydration

- 修复 `src/features/workbench/hooks/useFlowCardAction.ts`：支付成功 / 失败的状态机事件改为基于被操作的原支付卡 `purpose` 判定，避免“检验支付成功后返回药品支付卡”被误判成 `MEDICATION_PAID`；支付失败现在发出 `PAYMENT_FAILED`，不推进后续流程。
- 修复 `src/features/workbench/hooks/useAssistantStream.ts`：stream 收到急症事件时立即把当前 assistant streaming 占位消息标记为 `invalidated`，并记录 `interruptedBy: emergency`，避免急症流没有 `message_final` 时残留永久 streaming。
- 修复 `src/features/workbench/hooks/useWorkbenchSession.ts`：hydration guard 改为按 `sessionId` 记录，完成态创建复诊并在同一 WorkbenchPage 内跳转时会重新按新 session 水合状态机。
- 新增 `src/features/workbench/hooks/useFlowCardAction.test.ts`：覆盖检验支付成功、药品支付成功、支付失败三类状态机事件映射。
- 新增 `src/features/workbench/hooks/useAssistantStream.test.tsx`：覆盖急症 stream 中断时 streaming 占位消息 invalidated。
- 本次验证：`pnpm lint`、`pnpm tsc --noEmit`、`pnpm test`（4 files / 19 tests）、`pnpm build` 均通过；`pnpm build` 仍存在 Vite chunk size 提示，非本次修复阻断项。
- 本次仍未实现：P5 范围内的急症 Overlay、超时 Overlay、退出 Sheet、locked-question 流；浏览器端完整 UI 流程测试仍未补齐。

### P4 审查修复：死代码清理与 LockQuestionSheet 接入

- 移除 `src/features/workbench/utils/card-normalizers.ts` 中未被引用的 `mapActionToSuccessEvent` 与 `toPaymentInput` 函数（前者对 `submit_payment` 错误硬编码 `LAB_PAYMENT_SUCCEEDED`，实际由 `useFlowCardAction.ts` 局部版本按 `purpose` 正确分发）。
- 移除 `SubmitPaymentInput` 的 import（仅 `toPaymentInput` 使用）。
- 在 `src/pages/workbench/WorkbenchPage.tsx` 的 overlays slot 中接入 `LockQuestionSheet`，使 LockBar 的 "疑问" 逃生按钮完整闭环：打开 Sheet → 输入疑问 → 提交（经 `sendMessage` 发送，阻塞态下机器不推进主流程）→ 关闭 Sheet。
- 本次验证：`pnpm lint`、`pnpm tsc --noEmit`、`pnpm test`（4 files / 19 tests）、`pnpm build` 均通过。

## 当前未完成

- mock 主链路已覆盖用药、仅医嘱、自动化治疗三条 P4 路径；支付失败重试 UI、locked-question SSE 流、急症 Overlay、超时 Overlay、退出 Sheet 留给 P5。
- 完成后复诊/咨询已接入工作台主输入，并有 API/mock 层与关键 hook 回归测试覆盖；尚缺浏览器端 UI 流程测试覆盖。
- 尚未产出结项 `special-designs/rest-api.md`；等 schema、MSW/契约测试和 UI 主流程稳定后整理。

## P4 实现完成度审查（2026-06-28）

本次审查对照 `development-plan.md` 中 P4.1–P4.4 全部任务逐项审计，结论：**P4 主链路联动已实质性完成**，`pnpm tsc --noEmit`、`pnpm test`（4 files / 19 tests）、`pnpm build` 均通过。

### P4.1 `useWorkbenchSession` 集成 — ✅ 完成

| 验收项 | 状态 | 位置 |
|---|---|---|
| 组合 session query + timeline infinite query | ✅ | `useWorkbenchSession.ts:286-296` |
| 启动 visit machine 并 hydration | ✅ | `useWorkbenchSession.ts:299-348`；按 sessionId 防重复水合 |
| 输出 session / items / state / blockingCard / loading / error / actions | ✅ | 返回 `UseWorkbenchSessionResult` |
| 继续就诊恢复到正确机器态 | ✅ | `resolveHydrationTarget`：17 种状态映射 + card.kind 反推 |
| 找不到 pending 卡回退 chatting + 系统提示 | ✅ | 插入 `createSystemEventItem("当前阻塞卡片已失效")` |
| 不重新定义数据结构，纯组合层 | ✅ | 无自定义 session/timeline 类型 |
| completed 会话消息分流（咨询 / 复诊 / 兜底） | ✅ | `handleCompletedMessage`：`classifyFollowUpIntent` → 三条分支 |

### P4.2 发送消息和 SSE 流式回复 — ✅ 完成

| 验收项 | 状态 | 位置 |
|---|---|---|
| 发送时乐观插入患者消息 + 服务端回填替换 | ✅ | `sendMessage` 创建 optimistic → API → replaceItemInPages |
| 创建 streaming assistant 占位 | ✅ | `createStreamingAssistantMessage` 追加 |
| delta 由 RAF 批量合并 | ✅ | `pendingDeltaRef` + `requestAnimationFrame(flushDelta)` |
| 全部 SSE 事件类型处理（delta / message_final / card / state / emergency / done / error） | ✅ | `useAssistantStream.ts:210-310` switch |
| card 事件 → `mapCardToMachineEvent` → 9 种 card.kind 全覆盖 | ✅ | `card-normalizers.ts:112-135` |
| abort stream 时标记 streaming 消息 invalidated / failed | ✅ | `markInterrupted`：exit/emergency/timeout → invalidated；error → failed |
| emergency 事件立即 invalidated + 系统事件 + 状态机 | ✅ | `markCurrentStreamInterrupted("emergency")` 在追加系统事件之前 |
| 支持 assistant / consultation 双模式 | ✅ | `startStream({ mode })` → `streamAssistantMessage` / `streamConsultationReply` |
| 组件卸载清理 AbortController + RAF | ✅ | `useEffect` return cleanup |

### P4.3 阻塞卡、检验和支付链路 — ✅ 完成

| 验收项 | 状态 | 位置 |
|---|---|---|
| `useFlowCardAction` 完整生命周期（乐观 → API → 成功/回滚） | ✅ | `handleAction`：processing → API → markHandledCard + upsertItems / rollback |
| submitLabDecision：同意/不查/暂不决定 | ✅ | accept_lab / skip_lab / veto_lab → `workbenchApi.submitLabDecision` |
| submitPayment：支付/暂缓 + purpose 判定 | ✅ | `collectFlowActionSuccessEvents` 按 submittedCard.purpose 分发 LAB/MEDICATION/FAILED |
| 支付失败不推进流程 | ✅ | PAYMENT_FAILED → labPayment/medicationPayment 自循环 |
| 成功后合并 result.timelineItems | ✅ | `upsertTimelineItems(result.timelineItems)` |
| 阻塞卡 pending 时 WorkbenchPage 渲染 LockBar（非 InputDock） | ✅ | WorkbenchPage:146-165 |
| LockBar 的 reportEmergency / askQuestion 回调真实可用 | ✅ | 接 `actions.reportVitals` / `useWorkbenchUiStore.setLockQuestionSheet` |

### P4.4 确诊、处置、完成和复诊 — ✅ 完成

| 验收项 | 状态 | 位置 |
|---|---|---|
| 诊断卡接入 | ✅ | `DIAGNOSIS_READY` → diagnosis 态 |
| 处置方案卡按 plan 四路分发 | ✅ | visit-machine guards：treatmentMedication / treatmentExecution / treatmentAdviceOnly / treatmentReferral |
| 用药分支：药品支付 → 取药配送 → 完成卡 | ✅ | mock-db `inferTreatmentPlan` 默认返回 "medication" 路径 |
| 仅医嘱分支：确认医嘱 → 完成卡 | ✅ | mock-db 关键词（观察/医嘱/不用药）→ advice_only → ack → completed |
| 自动化治疗分支：预约 → 到号 → 执行 → 确认完成 | ✅ | mock-db 关键词（雾化/理疗）→ treatment_execution 四步推进 |
| 不查检验无 lab_result 证据 | ✅ | test 验证 diagnosisCard.evidenceSources 不含 "lab_result" |
| classifyFollowUpIntent → 咨询不创建新 session | ✅ | test 验证 session 数量不变 |
| classifyFollowUpIntent → 复诊创建带 parentSessionId 的 session | ✅ | test 验证 entryType="follow_up" + parentSessionId |
| 完成态输入兜底提示 | ✅ | 非咨询/复诊 → 插入系统事件 "请补充复诊意图" |
| TreatmentExecutionCard 按钮按 executionStatus 连续推进 | ✅ | `TreatmentExecutionCard.tsx` 按 availableActions 动态渲染 |

### 状态机 P4 补充 — ✅ 完成

| 新增事件/过渡 | 目标状态 | 状态 |
|---|---|---|
| `ADVICE_CARD_RAISED` | diagnosis / treatmentDecision / adviceOnly | ✅ |
| `MEDICATION_PAYMENT_RAISED` | medicationPayment | ✅ |
| `TREATMENT_EXECUTION_RAISED` | treatmentExecution | ✅ |
| `PAYMENT_FAILED` + purpose guard | labPayment / medicationPayment 自循环 | ✅ |
| `PAYMENT_DEFERRED` + purpose guard | chatting（清理阻塞） | ✅ |
| `TREATMENT_SCHEDULED / ARRIVED / STARTED / COMPLETED` | treatmentExecution 内 action | ✅ |

### 测试覆盖

| 文件 | 测试数 | 覆盖范围 |
|---|---|---|
| `workbench-api.test.ts` | 15 | mock 全链路：创建会话+SSE、检验决策+支付、用药/仅医嘱/自动化治疗三条路径、不查无检验证据、完成后咨询、完成后复诊、急症 stream |
| `useFlowCardAction.test.ts` | 3 | 检验支付成功事件映射、药品支付成功事件映射、支付失败不推进 |
| `useAssistantStream.test.tsx` | 1 | 急症流中断时 streaming 占位消息 invalidated |

### 审查发现的次要问题

1. **`card-normalizers.ts` 存在死代码**：`mapActionToSuccessEvent`（75-109 行）与 `toPaymentInput`（33-40 行）未被任何模块导入。`useFlowCardAction.ts` 有自身的局部版本且正确返回 null 给支付类 action。card-normalizers 版本对 `submit_payment` 错误硬编码 `LAB_PAYMENT_SUCCEEDED`，但因为是死代码，不影响运行时行为。建议在后续清理轮次移除。

2. **`LockBar.onAskQuestion` 设置了 store 状态但 WorkbenchPage 未渲染 `LockQuestionSheet`**：该 Sheet 组件已存在于 `P3.3`，但 WorkbenchPage 的 overlays slot 仅渲染了 `ContextSummaryDrawer`。不影响 P4 阻塞卡主链路（LockBar 的两个逃生按钮均可点击触发状态变更），完整 Sheet 交互留给 P5。

### 明确不在 P4 范围（留给 P5）

- `EmergencyOverlay` 急症打断 UI
- `TimeoutOverlay` 超时打断 UI
- `ExitVisitSheet` 退出结算 Sheet
- `useVisitCountdown` 实时倒计时 hook（顶栏仅展示静态超时文案）
- `LockQuestionSheet` 在 WorkbenchPage 的渲染接入
- `ReadonlyVisitPage` 只读回看完整实现
- 支付失败重试 UI
- 浏览器端完整 UI 流程测试（jsdom 层 hook 单测已有）
