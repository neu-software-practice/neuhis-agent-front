# 项目地图

更新时间：2026-06-30（管理后台 admin panel + CompletedExitSheet 修复 + rest-api-patch-v8）

## 项目定位

NEUHIS Agent 前端——基于 React + HeroUI 3 + Magic UI 的 AI 诊疗 Agent 聊天界面。核心体验围绕患者与 AI 的连续问诊、流程卡片决策、检验缴费、确诊处置、急症打断、空闲挂起和主动退出结算展开。

## 技术栈

| 类别 | 选型 |
|------|------|
| 构建 | Vite |
| 语言 | TypeScript |
| UI 框架 | React 19 |
| 路由 | React Router 8（Data Router） |
| 样式 | Tailwind CSS 4 |
| 基础组件 | HeroUI 3 |
| 按需组件 | shadcn + Magic UI |
| 图标 | lucide-react |
| 服务端状态 | TanStack Query |
| 客户端状态 | Zustand |
| 业务流程编排 | XState v5 |
| HTTP 客户端 | ky |
| AI 流式响应 | @microsoft/fetch-event-source |
| 表单 | React Hook Form |
| Schema 校验 | Zod |
| 动效 | motion |
| 测试 | Vitest + Testing Library |

## 源码结构

```text
.
├── index.html                        # 入口 HTML，标题「东软云脑智能医疗」
├── vite.config.ts                    # Vite 构建配置
├── vitest.config.ts                  # Vitest 测试配置
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js                  # ESLint 配置
├── components.json                   # shadcn CLI 配置
├── .env.example                      # VITE_API_MODE / VITE_API_BASE_URL / VITE_MOCK_DELAY_MS
│
├── src/
│   ├── main.tsx                      # React 入口，RouterProvider + globals.css
│   ├── globals.css                   # Tailwind 4 + HeroUI + oklch 主题变量 + 基线样式
│   │
│   ├── app/
│   │   ├── App.tsx                   # Data Router 根布局，AppProviders + <Outlet>
│   │   ├── providers.tsx             # QueryClientProvider + 开发态 devtools
│   │   ├── router.tsx                # createBrowserRouter 路由表（公开/守卫/工作台）
│   │   └── error-boundary.tsx        # 路由级错误边界，404 + 通用兜底
│   │
│   ├── layouts/
│   │   └── HomeLayout.tsx            # 首页系列 Layout Route，包裹 DesktopShell + Outlet
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx         # 手机号+密码登录，Zod 校验，成功后跳转
│   │   │   └── RegisterPage.tsx      # 注册：手机号+密码+性别+生日+可选姓名
│   │   ├── home/
│   │   │   ├── HomePage.tsx          # 首页：活跃会话 + 症状快速填充 + 创建新会话
│   │   │   ├── HistoryPage.tsx       # 历史就诊：筛选 tab + SessionCard 列表
│   │   │   ├── BillingPage.tsx       # 账单记录：筛选 tab + TanStack Query 列表 + 空态
│   │   │   ├── MedicalOrdersPage.tsx # 医嘱记录：历史医嘱/用药记录列表
│   │   │   ├── AddressPage.tsx       # 收货地址管理：默认地址置顶 + CRUD + 空态
│   │   │   └── ProfilePage.tsx       # 个人中心：PatientSummaryCard + 可编辑医疗信息 + 地址入口预览 + 账单入口 + 医嘱入口 + 退出登录
│   │   ├── workbench/
│   │   │   ├── NewWorkbenchPage.tsx   # 自动创建会话（初诊/复诊）→ 跳转工作台
│   │   │   ├── NewWorkbenchPage.test.tsx
│   │   │   ├── WorkbenchPage.tsx      # 进行中工作台：总装 shell + overlays + 倒计时
│   │   │   ├── ReadonlyVisitPage.tsx  # 只读回看：快照时间线，无输入，不触发主循环
│   │   │   └── workbench-loaders.ts   # 路由 loader，参数解析与轻量校验
│   │   └── admin/
│   │       ├── lazy.ts               # React.lazy 导入（避免 react-refresh lint）
│   │       ├── AdminLoginPage.tsx    # 管理员登录（用户名+密码）
│   │       ├── DashboardPage.tsx     # 仪表盘（5 项统计卡片）
│   │       ├── PatientListPage.tsx   # 患者管理（搜索+分页表格）
│   │       ├── SessionListPage.tsx   # 问诊记录（状态筛选+分页表格）
│   │       └── SettingsPage.tsx      # 系统设置（表单+开关）
│   │
│   ├── components/ui/
│   │   ├── button.tsx                # shadcn 风格 Button（CVA + Radix Slot）
│   │   ├── button-variants.ts        # 6 variant × 8 size CVA 定义
│   │   ├── date-picker.tsx           # HeroUI DatePicker 封装，接收/发射 YYYY-MM-DD 字符串
│   │   └── region-selector.tsx       # 省市区三级联动 Select（china-area-data + HeroUI Select/ListBox）
│   │
│   ├── types/
│   │   └── china-area-data.d.ts      # china-area-data 包类型声明
│   │
│   ├── lib/
│   │   ├── utils.ts                  # cn（clsx + tw-merge）+ assertNever 穷尽检查
│   │   ├── zod-error-map.ts          # Zod 全局中文错误映射（覆盖 too_small 等默认英文提示）
│   │   ├── query-client.ts           # 全局 QueryClient 单例
│   │   ├── ids.ts                    # createLocalId(prefix) 纯前端 ID 生成
│   │   ├── time.ts                   # zh-CN 时间格式化（formatDateTime/Date/Time/Duration）
│   │   ├── ui-message.ts            # ApiError → 患者可懂 UiMessage 归一化映射
│   │   ├── use-is-desktop.ts         # useIsDesktop() hook：viewport ≥ 768px
│   │   └── api/
│   │       ├── config.ts             # API_MODE / BASE_URL / MOCK_DELAY 环境变量读取
│   │       ├── types.ts              # ApiError、ID 品牌类型、状态枚举、PageResult<T>
│   │       ├── errors.ts             # ApiException、toApiError、ZodError 转换
│   │       ├── errors.test.ts
│   │       ├── transport.ts          # ApiTransport 接口 + RequestOptions + StreamHandlers（GET/POST/PUT/PATCH/DELETE）
│   │       ├── client.ts             # ky HTTP transport：JWT 注入、401 refresh retry、SSE、PUT
│   │       ├── schemas.test.ts
│   │       └── index.ts              # getTransport() mock/http 选择器
│   │
│   ├── features/
│   │   ├── api.ts                    # 统一 api facade：api.billing / api.medicalOrders / api.patient / api.visits / api.workbench
│   │   │
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   ├── types.ts          # AuthUser、TokenPair、LoginInput、RegisterInput 等
│   │   │   │   ├── schemas.ts        # loginInputSchema、registerInputSchema（Zod）
│   │   │   │   ├── auth-api.ts       # authApi facade：login / register / refresh / logout
│   │   │   │   └── index.ts
│   │   │   ├── store/
│   │   │   │   └── auth-store.ts     # Zustand + persist：tokens、user、login/logout actions
│   │   │   ├── hooks/
│   │   │   │   └── useAuthGuard.ts   # 认证状态读取 hook
│   │   │   ├── components/
│   │   │   │   └── AuthGuard.tsx     # 路由级守卫，未认证 redirect /login
│   │   │   └── index.ts             # barrel export
│   │   │
│   │   ├── patient/
│   │   │   ├── api/
│   │   │   │   ├── types.ts          # PatientProfile、PatientContext、UpdatePatientProfileInput
│   │   │   │   ├── schemas.ts        # 患者相关 Zod schemas + parse helpers
│   │   │   │   ├── address-types.ts  # Address、地址 CRUD 输入类型
│   │   │   │   ├── address-schemas.ts# 地址簿 Zod schemas + parse helpers
│   │   │   │   ├── queries.ts        # TanStack Query queryOptions / mutationOptions（含地址簿）
│   │   │   │   └── index.ts          # patientApi facade（verify / getContext / updateProfile）
│   │   │   └── components/
│   │   │       ├── PatientSummaryCard.tsx   # 患者档案摘要卡片
│   │   │       ├── EditableChipList.tsx     # 可编辑 Chip 列表（添加/删除/保存/取消）
│   │   │       ├── AddressCard.tsx          # 收货地址展示/操作卡片
│   │   │       └── AddressFormModal.tsx     # 新增/编辑收货地址 Modal
│   │   │
│   │   ├── billing/
│   │   │   ├── api/
│   │   │   │   ├── types.ts          # BillingRecord、ListBillingRecordsResult 类型
│   │   │   │   ├── schemas.ts        # 账单记录 Zod schemas + parse helpers
│   │   │   │   ├── queries.ts        # TanStack Query queryOptions
│   │   │   │   ├── queries.ts        # TanStack Query queryOptions
│   │   │   │   └── index.ts          # billingApi facade（listRecords）
│   │   │   └── components/
│   │   │       └── BillingRecordCard.tsx # 账单条目卡片
│   │   │
│   │   ├── medical-orders/
│   │   │   ├── api/
│   │   │   │   ├── types.ts          # MedicalOrderRecord、ListMedicalOrdersResult 类型
│   │   │   │   ├── schemas.ts        # 医嘱记录 Zod schemas + parse helpers
│   │   │   │   └── index.ts          # medicalOrdersApi facade（listRecords）
│   │   │
│   │   ├── visits/
│   │   │   ├── api/
│   │   │   │   ├── types.ts          # VisitSession、CreateSessionInput、VisitSnapshot 等
│   │   │   │   ├── schemas.ts        # 会话相关 Zod schemas + 跨字段 refine
│   │   │   │   ├── queries.ts        # TanStack Query factories
│   │   │   │   └── index.ts          # visitsApi facade（list / get / create / followUp / snapshot）
│   │   │   └── components/
│   │   │       ├── SessionCard.tsx         # 就诊会话卡片，状态驱动操作按钮
│   │   │       └── VisitStatusBadge.tsx    # VisitStatus → StatusPill 映射
│   │   │
│   │   ├── workbench/
│   │   │   ├── api/
│   │   │   │   ├── types.ts               # 工作台 REST 输入/输出类型 + FlowCardAction 联合
│   │   │   │   ├── schemas.ts             # 工作台 REST schemas（sendMessage / lab / payment …）
│   │   │   │   ├── timeline-types.ts      # FlowCard / TimelineItem / AssistantStreamEvent 类型
│   │   │   │   ├── timeline-schemas.ts    # FlowCard（9 kinds）/ TimelineItem / SSE 事件 schemas
│   │   │   │   ├── queries.ts             # TanStack Query factories（timeline infinite、mutations）
│   │   │   │   ├── index.ts              # workbenchApi facade + re-exports
│   │   │   │   └── workbench-api.test.ts  # mock 全链路集成测试（15 tests）
│   │   │   │
│   │   │   ├── machine/
│   │   │   │   ├── visit-machine.types.ts  # VisitMachineContext + VisitMachineEvent（30+ 事件）
│   │   │   │   ├── visit-machine.guards.ts # 状态机守卫函数
│   │   │   │   ├── visit-machine.actions.ts# XState assign actions
│   │   │   │   ├── visit-machine.ts        # XState v5 visitMachine（18 状态）
│   │   │   │   └── visit-machine.test.ts   # 状态机单元测试
│   │   │   │
│   │   │   ├── store/
│   │   │   │   ├── composer-store.ts       # 输入草稿 store（按 sessionId）
│   │   │   │   └── workbench-ui-store.ts   # UI 状态 flags（drawer / overlay / sheet 显隐）
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useWorkbenchSession.ts       # 工作台总装 hook（query + machine + stream + actions）
│   │   │   │   ├── useTimeline.ts               # useInfiniteQuery 时间线 + flatten
│   │   │   │   ├── useAssistantStream.ts        # SSE 流管理（delta rAF 合并、card→event 映射）
│   │   │   │   ├── useAssistantStream.test.tsx
│   │   │   │   ├── useFlowCardAction.ts         # 流程卡操作（乐观→API→cache 同步→机器事件）
│   │   │   │   ├── useFlowCardAction.test.ts
│   │   │   │   ├── useVisitCountdown.ts         # 空闲计时（normal/warn5/warn2/expired）
│   │   │   │   ├── useVisitCountdown.test.ts
│   │   │   │   ├── useExitSettlement.ts         # 退出后果四档文案派生
│   │   │   │   └── useExitSettlement.test.ts
│   │   │   │
│   │   │   ├── utils/
│   │   │   │   ├── card-normalizers.ts     # FlowCardAction → API 输入、Card → MachineEvent 映射
│   │   │   │   ├── timeline-merge.ts       # timeline item 工厂 + merge/upsert 纯函数
│   │   │   │   └── timeline-merge.test.ts
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── ChatTimeline.tsx         # react-virtuoso 虚拟滚动时间线
│   │   │   │   ├── TimelineRow.tsx          # kind 分发器 → Bubble / Card / Event / Terminal
│   │   │   │   ├── MessageBubble.tsx        # 患者/助手消息气泡（streaming cursor / failed）
│   │   │   │   ├── SystemEventRow.tsx       # 居中系统事件（图标 + 标题 + 描述）
│   │   │   │   ├── AssistantThinkingRow.tsx # AI 分析脉冲指示器
│   │   │   │   ├── TerminalEventRow.tsx     # 终诊事件卡片（reason → 图标/颜色）
│   │   │   │   ├── InputDock.tsx            # 主输入区（Textarea 自动增长 + 发送按钮）
│   │   │   │   ├── InputAssistPanel.tsx     # 输入辅助 chip 面板（draft / quick_answer）
│   │   │   │   ├── InputAssistPanel.test.tsx
│   │   │   │   ├── LockBar.tsx             # 阻断状态栏（锁图标 + 逃生按钮）
│   │   │   │   ├── LockQuestionSheet.tsx    # 阻断疑问输入 Drawer
│   │   │   │   ├── WorkbenchShell.tsx       # 工作台布局壳（named slot props）
│   │   │   │   ├── WorkbenchHeader.tsx      # 顶部栏（AI 头像 + 操作按钮）
│   │   │   │   ├── WorkbenchSidebar.tsx     # PC 右侧上下文摘要栏
│   │   │   │   ├── ContextSummaryBar.tsx    # 移动端可折叠上下文摘要条
│   │   │   │   ├── ContextSummaryDrawer.tsx # 上下文详情 Drawer
│   │   │   │   ├── EmergencyOverlay.tsx     # 急症打断 Modal（确认/误报）
│   │   │   │   ├── SuspendOverlay.tsx       # 空闲挂起 Modal（继续问诊）
│   │   │   │   ├── CompletedExitSheet.tsx   # 已完成问诊退出 Drawer（仅导航，无状态转移）
│   │   │   │   ├── ExitVisitSheet.tsx       # 退出结算 Drawer（后果文案 + 确认）
│   │   │   │   └── PauseVisitSheet.tsx      # 暂离确认 Drawer
│   │   │   │
│   │   │   └── flow-cards/
│   │   │       ├── FlowCardRenderer.tsx          # kind 穷尽分发（9 种卡 + assertNever）
│   │   │       ├── FlowCardRenderer.test.tsx
│   │   │       ├── LabDecisionCard.tsx           # 检验决策卡（同意/不查/暂不）
│   │   │       ├── LabExecutionCard.tsx          # 检验执行进度（5 步指示器 + 结果）
│   │   │       ├── PaymentCard.tsx               # 支付卡（明细 + 支付/暂缓）
│   │   │       ├── DiagnosisCard.tsx             # 诊断卡（结论/置信度/依据/风险）
│   │   │       ├── TreatmentPlanCard.tsx         # 处置方案卡（类型/能力/动作清单）
│   │   │       ├── TreatmentExecutionCard.tsx    # 治疗执行卡（状态推进 + 动态按钮）
│   │   │       ├── MedicationFulfillmentCard.tsx # 取药/配送卡（药品清单 + 地址选择配送）
│   │   │       ├── AddressPickerModal.tsx        # 配送地址选择 Modal
│   │   │       ├── AdviceOnlyCard.tsx            # 医嘱卡（建议 + 已知晓确认）
│   │   │       ├── CompletedVisitCard.tsx        # 完成卡（诊断/处置摘要 + 随访）
│   │   │       └── TerminalCard.tsx              # 终止展示卡（reason + 保存摘要）
│   │   │
│   │   ├── admin/
│   │   │   ├── api/
│   │   │   │   ├── types.ts          # AdminUser, AdminTokenPair, DashboardStats 等类型
│   │   │   │   ├── schemas.ts        # Zod v4 校验 schema + paginatedResponseSchema 工厂
│   │   │   │   └── admin-api.ts      # adminApi facade（login/logout/refresh/CRUD）
│   │   │   ├── store/
│   │   │   │   └── admin-auth-store.ts # Zustand + persist, key "neuhis-admin-auth"
│   │   │   ├── hooks/
│   │   │   │   └── useAdminAuth.ts   # 管理员认证状态 selector hook
│   │   │   └── components/
│   │   │       ├── AdminGuard.tsx    # 管理员路由守卫（未认证→/admin/login）
│   │   │       ├── AdminShell.tsx    # 管理后台布局壳（sidebar + main）
│   │   │       └── AdminSidebar.tsx  # 管理后台左侧导航栏
│   │   │
│   │   └── shared/components/
│   │       ├── PageShell.tsx          # 通用页面壳（sticky header + 滚动主区 + footer）
│   │       ├── EmptyState.tsx         # 通用空态/占位
│   │       ├── StatusPill.tsx         # 通用状态标签（tone 色彩映射）
│   │       ├── AppBottomTabs.tsx      # 底部导航（Mobile only，md:hidden）
│   │       ├── AppSidebar.tsx         # 左侧导航（Desktop only，hidden md:flex）
│   │       └── DesktopShell.tsx       # 响应式布局壳（sidebar + bottom-tabs 切换）
│   │
│   ├── mocks/api/
│   │   ├── mock-db.ts               # 内存状态数据库（完整问诊生命周期 + auth）
│   │   ├── mock-transport.ts        # ApiTransport mock 实现（路由分发 + 延迟）
│   │   ├── stream-simulator.ts      # SSE 流模拟（delta / card / emergency / done）
│   │   ├── fixtures/
│   │   │   ├── patient.ts           # mockPatient + mockPatientContext 种子数据
│   │   │   ├── visits.ts            # mockActiveSession + mockCompletedSession
│   │   │   ├── timeline.ts          # mockActiveTimeline + mockCompletedTimeline
│   │   │   └── flow-cards.ts        # 各类 FlowCard 工厂函数
│   │   └── handlers/
│   │       ├── address-handlers.ts  # 地址簿 CRUD 路由处理
│   │       ├── auth-handlers.ts     # auth 路由处理
│   │       ├── billing-handlers.ts  # 账单记录查询处理
│   │       ├── chat-handlers.ts     # workbench 动作处理（消息/流程卡/退出/急症…）
│   │       ├── admin-handlers.ts   # 管理后台 10 个端点处理
│   │       ├── patient-handlers.ts  # 患者端点处理
│   │       └── visit-handlers.ts    # 会话 CRUD 处理
│   │
│   └── test/
│       └── setup.ts                 # Vitest + jest-dom 初始化
│
├── agent-workspace/                  # 开发辅助文档工作区
└── references/                       # 第三方库源码浅克隆（.gitignore）
```

## 路由表

| 路径 | 页面 | 守卫 |
|------|------|------|
| `/login` | LoginPage | 公开 |
| `/register` | RegisterPage | 公开 |
| `/` | HomePage | AuthGuard + HomeLayout |
| `/history` | HistoryPage | AuthGuard + HomeLayout |
| `/billing` | BillingPage | AuthGuard + HomeLayout |
| `/medical-orders` | MedicalOrdersPage | AuthGuard + HomeLayout |
| `/addresses` | AddressPage | AuthGuard + HomeLayout |
| `/profile` | ProfilePage | AuthGuard + HomeLayout |
| `/workbench/new` | NewWorkbenchPage | AuthGuard |
| `/workbench/:sessionId` | WorkbenchPage | AuthGuard |
| `/history/:sessionId` | ReadonlyVisitPage | AuthGuard |
| `/admin/login` | AdminLoginPage | 公开 |
| `/admin/dashboard` | DashboardPage | AdminGuard + AdminShell |
| `/admin/patients` | PatientListPage | AdminGuard + AdminShell |
| `/admin/sessions` | SessionListPage | AdminGuard + AdminShell |
| `/admin/settings` | SettingsPage | AdminGuard + AdminShell |

## 状态机（visitMachine）

18 个状态，建模完整问诊流程：

```
loadingContext → chatting ⇄ analyzing
  → labDecision → labPayment → labExecution
  → diagnosis → treatmentDecision
    → medicationPayment → medicationFulfillment → completed
    → treatmentExecution → completed
    → adviceOnly → completed
    → terminated(referral)
  → completed

全局打断（优先级高→低）：
  emergencyPending（急症）> exitSettlement（退出）> suspended（空闲挂起）

已完成问诊（completed）的退出行为：使用 CompletedExitSheet（仅「返回首页」/「留在当前页」导航），
不经过 ExitVisitSheet，不触发状态机事件或 API 调用。
```

## 数据流架构

```
页面组件
  └─ useWorkbenchSession (总装 hook)
       ├─ TanStack Query: session + timeline infinite
       ├─ XState: visitMachine (流程编排)
       ├─ useAssistantStream (SSE 流 → timeline cache + machine events)
       ├─ useFlowCardAction (卡片操作 → API → cache + machine)
       ├─ useVisitCountdown (空闲计时)
       └─ useExitSettlement (退出后果派生)

API 层
  └─ features/api.ts (统一 facade)
       ├─ billing / medicalOrders / patient / visits / workbench API modules
       └─ lib/api/ (transport 抽象)
            ├─ mock-transport (开发环境)
            └─ ky HTTP transport (生产环境)
```

## 响应式布局

- **Mobile**（< 768px）：单列全高 + 底部 AppBottomTabs + ContextSummaryBar
- **Desktop**（≥ 768px）：左侧 AppSidebar (220px) + 中间内容区 + 工作台右侧 WorkbenchSidebar (240px)
- 切换全部通过 Tailwind `md:` 前缀，纯 CSS 驱动

## 测试文件索引

| 文件 | 覆盖范围 |
|------|----------|
| `workbench-api.test.ts` | mock 全链路：创建会话、SSE、检验/支付/治疗三路径、急症 |
| `visit-machine.test.ts` | hydration、阻塞态、检验链路、急症恢复/确认、超时、处置分支 |
| `useFlowCardAction.test.ts` | 支付事件映射、失败不推进 |
| `useAssistantStream.test.tsx` | 急症流中断 invalidated |
| `useVisitCountdown.test.ts` | 空闲计时阶段转换、暂停冻结 |
| `useExitSettlement.test.ts` | 四档退出后果派生 |
| `timeline-merge.test.ts` | flatten、乐观消息、流式追加、upsert |
| `FlowCardRenderer.test.tsx` | 9 种 card kind 分发 + onAction |
| `InputAssistPanel.test.tsx` | chip 渲染与点击回调 |
| `NewWorkbenchPage.test.tsx` | 复诊创建 + cache 预热 + 超时重试 |
| `schemas.test.ts` | Zod schema refinement 规则 |
| `errors.test.ts` | toApiError / toUiMessage 各分支 |

## 当前未完成

- 缺浏览器端 E2E 测试（jsdom 层已有，端到端走查未补齐）
- 支付失败重试 UI 未单独实现（mock 已支持链路，UI 交互待补）
- MSW handler 未实现；测试走 mock transport

## 文档索引

- [完整交互流程](./interaction-flow.md)
- [核心交互流程](./core-interaction-flow.md)
- [患者端需求分析](./requirements-analysis.md)
- [UI 设计文档](./ui-designs.md)
- [前端详细设计](./detailed-design.md)
- [组件代码设计通用约定](./component-code-conventions.md)
- [技术选型](./tech-selection.md)
- [前端 API 合约与 Mock 设计](./special-designs/api.md)
- [结项 REST/SSE API 文档](./special-designs/rest-api.md)
- [REST API Patch v2](./special-designs/rest-api-patch-v2.md)
- [REST API Patch v3（JWT 认证）](./special-designs/rest-api-patch-v3.md)
- [REST API Patch v4（会话标题生成）](./special-designs/rest-api-patch-v4.md)
- [REST API Patch v5（地址簿与药品配送地址）](./special-designs/rest-api-patch-v5.md)
- [REST API Patch v6（账单记录查询）](./special-designs/rest-api-patch-v6.md)
- [REST API Patch v7（医嘱记录查询）](./special-designs/rest-api-patch-v7.md)
- [REST API Patch v8（管理后台）](./special-designs/rest-api-patch-v8.md)
- [QA Wave 1 走查记录](./qa/wave-1.md)
- [medAgent 后端参考](./medagent-backend.md)
