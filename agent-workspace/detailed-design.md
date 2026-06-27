# 前端详细设计

更新时间：2026-06-27

产品名：**东软云脑智能医疗**

## 1. 设计目标

本文承接 `requirements-analysis.md`、`ui-designs.md`、`tech-selection.md` 与 `special-designs/api.md`，将患者端前端落地为可实施的代码设计。重点回答：

- 目录与模块如何拆分。
- 页面、业务组件、基础组件如何分层。
- API facade 如何设计，如何同时支撑 mock 与真实 HTTP。
- XState、TanStack Query、Zustand、React Router 如何各司其职。
- 聊天流式输出、流程卡片、阻塞锁定、急症打断、超时、退出结算如何在代码中协作。

本文不替代 UI 设计稿，不定义最终医学文案、真实支付能力、真实检验设备和后端实现。后续编码时以本文作为模块边界和首版实现路线。

## 2. 总体架构

前端采用“路由页面 + feature 模块 + API facade + 状态机”的分层结构：

```text
React Router Data Router
  -> route pages
    -> feature containers / hooks
      -> UI components
      -> XState visit machine
      -> TanStack Query
        -> api facade
          -> transport selector
            -> mock transport
            -> http transport
```

职责边界：

| 层 | 职责 | 不负责 |
| --- | --- | --- |
| `app` | Provider、路由表、全局错误边界、应用启动 | 业务数据拼装 |
| `pages` | 路由级页面组合，处理导航和页面骨架 | 直接调用底层 transport |
| `features` | 业务组件、hooks、状态机、query options、schema | 全局布局和无关 UI |
| `components/ui` | 可复用基础 UI 与复制进项目的 Magic UI/shadcn 组件 | 业务流程判断 |
| `lib/api` | transport、错误、通用类型、query client | 具体页面状态 |
| `mocks` | mock db、fixtures、mock handlers | 页面渲染 |

核心原则：

- 页面组件不直接调用 `fetch`、`ky` 或 mock 函数。
- 服务端拥有的数据走 API facade 和 TanStack Query。
- 复杂流程跳转走 XState，不散落在 React 组件的 `if/else` 中。
- Zustand 只保存纯前端 UI 状态和草稿，不长期镜像服务端响应。
- 时间线统一渲染 `TimelineItem[]`，消息、流程卡、系统事件、终止卡不拆成多个滚动区域。

## 3. 推荐目录结构

```text
src/
  app/
    App.tsx
    providers.tsx
    router.tsx
    routes.ts
    error-boundary.tsx
  pages/
    home/
      HomePage.tsx
      HistoryPage.tsx
      ProfilePage.tsx
    workbench/
      WorkbenchPage.tsx
      NewWorkbenchPage.tsx
      ReadonlyVisitPage.tsx
      workbench-loaders.ts
  features/
    patient/
      api/
        index.ts
        queries.ts
        schemas.ts
        types.ts
      components/
        IdentityGate.tsx
        PatientSummaryCard.tsx
      hooks/
        useIdentityGate.ts
    visits/
      api/
        index.ts
        queries.ts
        schemas.ts
        types.ts
      components/
        SessionCard.tsx
        SessionList.tsx
        VisitStatusBadge.tsx
      hooks/
        useVisitHistory.ts
    workbench/
      api/
        index.ts
        queries.ts
        schemas.ts
        types.ts
      components/
        WorkbenchShell.tsx
        WorkbenchHeader.tsx
        ContextSummaryBar.tsx
        ContextSummaryDrawer.tsx
        ChatTimeline.tsx
        TimelineRow.tsx
        MessageBubble.tsx
        SystemEventRow.tsx
        AssistantThinkingRow.tsx
        InputDock.tsx
        InputAssistPanel.tsx
        LockBar.tsx
        LockQuestionSheet.tsx
        EmergencyOverlay.tsx
        TimeoutOverlay.tsx
        ExitVisitSheet.tsx
      flow-cards/
        FlowCardRenderer.tsx
        LabDecisionCard.tsx
        PaymentCard.tsx
        LabExecutionCard.tsx
        DiagnosisCard.tsx
        TreatmentPlanCard.tsx
        MedicationFulfillmentCard.tsx
        TreatmentExecutionCard.tsx
        AdviceOnlyCard.tsx
        CompletedVisitCard.tsx
        TerminalCard.tsx
      hooks/
        useWorkbenchSession.ts
        useTimeline.ts
        useChatComposer.ts
        useAssistantStream.ts
        useFlowCardAction.ts
        useVisitCountdown.ts
        useExitSettlement.ts
      machine/
        visit-machine.ts
        visit-machine.types.ts
        visit-machine.guards.ts
        visit-machine.actions.ts
      store/
        composer-store.ts
        workbench-ui-store.ts
      utils/
        timeline-merge.ts
        card-normalizers.ts
    shared/
      components/
        AppBottomTabs.tsx
        PageShell.tsx
        EmptyState.tsx
        StatusPill.tsx
  components/
    ui/
      button.tsx
      button-variants.ts
      typing-animation.tsx
      text-animate.tsx
  lib/
    api/
      client.ts
      config.ts
      errors.ts
      transport.ts
      types.ts
    query-client.ts
    time.ts
    ids.ts
    utils.ts
  mocks/
    api/
      fixtures/
        patient.ts
        visits.ts
        timeline.ts
        flow-cards.ts
      handlers/
        patient-handlers.ts
        visit-handlers.ts
        chat-handlers.ts
      mock-db.ts
      mock-transport.ts
      stream-simulator.ts
  test/
    setup.ts
    factories/
      visit.ts
      timeline.ts
```

落地顺序可以分阶段推进，初期允许只创建会被第一批页面使用的文件，但命名和模块边界应保持上述形态。

## 4. 应用入口与路由

### 4.1 入口文件

`src/main.tsx` 只负责挂载 React：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { router } from './app/router'
import './globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

`HeroUI 3` 不需要应用级 Provider。全局 Provider 主要放 TanStack Query、开发工具和未来可能的鉴权上下文。

### 4.2 Provider

`src/app/providers.tsx`：

```tsx
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV ? <ReactQueryDevtools /> : null}
    </QueryClientProvider>
  )
}
```

约定：

- 不在 Provider 内创建业务 store。
- `queryClient` 从 `src/lib/query-client.ts` 导出单例。
- 生产环境不默认展示 React Query Devtools。

### 4.3 路由模式

项目采用 React Router Data Router，集中使用 `createBrowserRouter` 和 `RouterProvider`。`createBrowserRouter` 从 `react-router` 导入，DOM 环境的 `RouterProvider` 从 `react-router/dom` 导入。原因：

- 当前项目仍是 Vite SPA，暂不引入 React Router Framework Mode。
- Data Router 能提供 route object、loader、error boundary、pending navigation 等能力。
- 业务数据仍主要走 API facade + TanStack Query，loader 只做路由级预检、参数解析和必要预取。

`src/app/router.tsx`：

```tsx
export const router = createBrowserRouter([
  {
    path: '/',
    Component: App,
    ErrorBoundary: AppErrorBoundary,
    children: [
      { index: true, Component: HomePage },
      { path: 'history', Component: HistoryPage },
      { path: 'profile', Component: ProfilePage },
      {
        path: 'workbench/new',
        loader: newWorkbenchLoader,
        Component: NewWorkbenchPage,
      },
      {
        path: 'workbench/:sessionId',
        loader: workbenchLoader,
        Component: WorkbenchPage,
      },
      {
        path: 'history/:sessionId',
        loader: readonlyVisitLoader,
        Component: ReadonlyVisitPage,
      },
    ],
  },
])
```

路由规则：

- `/`：首页 Landing。
- `/history`：完整历史列表。
- `/profile`：个人资料和设置。
- `/workbench/new`：新建问诊入口，可读取 `searchParams` 中的症状草稿、复诊来源等。
- `/workbench/:sessionId`：继续就诊或复诊后的工作台。
- `/history/:sessionId`：只读记录详情，不触发 Agent 主循环。

loader 只做：

- 校验 `sessionId` 参数格式。
- 解析 `entryType`、`draft`、`followUpFrom` 等 query 参数。
- 通过 `queryClient.ensureQueryData` 预取关键轻量数据。
- 必要时 `redirect('/')` 或抛出 route error。

不在 loader 中做：

- 长时间 SSE。
- 支付 mutation。
- 状态机主流程推进。
- 页面组件内部可以通过 hooks 重新订阅 Query 数据。

## 5. 类型与领域模型

类型优先按 feature 管理，跨 feature 共享的基础类型放 `src/lib/api/types.ts`。

### 5.1 基础类型

```ts
export type PatientId = string
export type SessionId = string
export type TimelineItemId = string
export type FlowCardId = string

export interface PageResult<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
}

export interface ApiError {
  code: string
  message: string
  status?: number
  details?: unknown
  retriable?: boolean
}
```

### 5.2 会话模型

```ts
export type VisitEntryType = 'new' | 'follow_up'

export type VisitStatus =
  | 'loading_context'
  | 'chatting'
  | 'analyzing'
  | 'blocked'
  | 'diagnosis'
  | 'treatment'
  | 'completed'
  | 'transferred'
  | 'emergency_terminated'
  | 'exited'

export interface VisitSession {
  id: SessionId
  patientId: PatientId
  entryType: VisitEntryType
  status: VisitStatus
  startedAt: string
  updatedAt: string
  endedAt?: string
  timeoutAt?: string
  askRound: number
  askRoundLimit: number
  labRound: number
  labRoundLimit: number
  parentSessionId?: SessionId
  terminalReason?: TerminalReason
  activeCardId?: FlowCardId
  summary: VisitSummary
}
```

说明（服务端 `VisitStatus` 与机器态的粒度关系）：

- `VisitStatus` 是**服务端持久化的粗粒度状态**，机器态（§7.3）是前端更细的运行态。两者不要求一一对应。
- `blocked` 是聚合态：表示“有阻塞卡待处理”，但具体停在 `labDecision` / `labPayment` / `medicationPayment` / `medicationFulfillment` 哪一态，由 `activeCardId` 指向的 flow card 的 `kind` 反推（hydration 规则见 §8.3）。
- `treatment` 同样是聚合态，覆盖 `medicationPayment` / `medicationFulfillment` / `treatmentExecution` / `adviceOnly`。
- `transferred` / `emergency_terminated` / `exited` 都映射到机器 `terminated` 态，由 `terminalReason` 区分；新增 `terminalReason` 取值与 §5.3 的 `TerminalReason` 同源。
- 复诊会话用 `parentSessionId` 关联上次会话，对齐 medAgent 复诊“回传 `prior` 历史纪要”的机制（见 api.md）。

### 5.3 时间线模型

```ts
export type TimelineItem =
  | MessageTimelineItem
  | FlowCardTimelineItem
  | SystemEventTimelineItem
  | TerminalTimelineItem

export interface TimelineItemBase {
  id: TimelineItemId
  sessionId: SessionId
  createdAt: string
  status: 'pending' | 'streaming' | 'done' | 'failed' | 'invalidated'
}

export interface MessageTimelineItem extends TimelineItemBase {
  kind: 'message'
  role: 'patient' | 'assistant'
  content: string
  localKey?: string
  interruptedBy?: 'emergency' | 'timeout' | 'exit'
}

export interface FlowCardTimelineItem extends TimelineItemBase {
  kind: 'flow_card'
  card: FlowCard
}

export interface SystemEventTimelineItem extends TimelineItemBase {
  kind: 'system_event'
  eventType:
    | 'context_loaded'
    | 'agent_thinking'
    | 'lab_result_received'
    | 'payment_succeeded'
    | 'drug_purchased'
    | 'follow_up_started'
    | 'emergency_dismissed'
    | 'exit_settled'
  title: string
  description?: string
}

export interface TerminalTimelineItem extends TimelineItemBase {
  kind: 'terminal'
  reason: TerminalReason
  title: string
  description?: string
  suggestedDepartment?: string
}
```

`TerminalReason` 统一定义在 `src/lib/api/types.ts`：

```ts
export type TerminalReason =
  | 'emergency'
  | 'timeout'
  | 'ask_limit_reached'
  | 'lab_limit_reached'
  | 'referral'
  | 'capability_insufficient'
  | 'exited'
```

约定：

- 急症终止、超时升级、转诊（达上限 / 本院能力不足 / 后端 `REFERRAL`）、退出结算都落成同一条 `TerminalTimelineItem`，由 `reason` 区分文案与去向。
- `suggestedDepartment` 仅 `referral` 类终止使用，由后端 / mock 在 `DONE(final=REFERRAL)` 或上限终止时给出。
- 急症误报恢复不产生终止卡，而是插入 `eventType: 'emergency_dismissed'` 的系统事件。

时间线 key 规则：

- 每个 item 的 React key 使用 `id` 或稳定的 `localKey`。
- 乐观消息发送后，即使服务端回填真实 ID，也不能导致整行重挂载。
- 流式 AI 消息只更新当前一条 item 的 `content` 和 `status`。

### 5.4 流程卡模型

```ts
export type FlowCardKind =
  | 'lab_decision'
  | 'payment'
  | 'lab_execution'
  | 'diagnosis'
  | 'treatment_plan'
  | 'medication_fulfillment'
  | 'treatment_execution'
  | 'advice_only'
  | 'completed_visit'

export type FlowCardStatus =
  | 'pending'
  | 'accepted'
  | 'skipped'
  | 'vetoed'
  | 'paid'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'invalidated'

export interface FlowCardBase {
  id: FlowCardId
  sessionId: SessionId
  kind: FlowCardKind
  status: FlowCardStatus
  blocking: boolean
  title: string
  createdAt: string
  handledAt?: string
  lockReason?: string
}
```

每种卡片使用 discriminated union 扩展：

- `LabDecisionCardData`：检验项目、原因、鉴别目标、费用预估。
- `PaymentCardData`：支付用途 `purpose: 'lab' | 'medication'`、明细、医保、自费、支付状态。
- `LabExecutionCardData`：检验执行状态（待缴费 / 执行中 / 等待结果 / 已回填）、结果摘要。
- `DiagnosisCardData`：诊断、依据、依据来源、风险信号。
- `TreatmentPlanCardData`：处置类型（`medication` / `treatment` / `advice_only`）、本院能力判断、执行动作清单；`referral` 不落处置卡，直接走终止卡。
- `MedicationFulfillmentCardData`：药品清单、盒数、取药方式（自取 / 配送）、缴费与履约状态。
- `TreatmentExecutionCardData`：治疗项目、能力判断、预约 / 排队 / 执行状态、注意事项、可执行动作。
- `AdviceOnlyCardData`：医嘱、观察项、复诊建议。
- `CompletedVisitCardData`：本次诊断、处置摘要、随访 / 复诊提醒。

说明：

- 转诊（`referral`）、达上限、本院能力不足、超时、急症、退出统一走 §5.3 的 `TerminalTimelineItem`，不再有独立的 `TransferCardData` 流程卡。
- **自动化治疗分支为产品保留功能，当前 medAgent 决策引擎不具备执行能力。** medAgent 处置仅 `MEDICATION` / `ADVICE_ONLY` / `REFERRAL` 三类，需院内操作 / 手术直接 `REFERRAL`。前端仍保留 `treatment_execution` 卡和 `submitTreatmentExecution` facade，代表后端业务层 / mock 的治疗预约、排队、执行能力；HTTP 联调时若后端业务层尚未补齐该能力，`treatment` 意图按 `referral` 或 `capability_insufficient` 收口。详见 §6.4、§10、`special-designs/api.md`。

## 6. API Facade 设计

### 6.1 目标

API facade 是业务层唯一调用入口。它屏蔽 mock、HTTP、SSE 实现差异，并稳定支撑组件、hooks 和状态机。

```text
features/*/api/index.ts
  -> getTransport()
    -> mockTransport
    -> httpTransport
```

### 6.2 配置

`src/lib/api/config.ts`：

```ts
export type ApiMode = 'mock' | 'http'

export const apiConfig = {
  mode: (import.meta.env.VITE_API_MODE ?? 'mock') as ApiMode,
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  mockDelayMs: Number(import.meta.env.VITE_MOCK_DELAY_MS ?? 400),
}
```

### 6.3 Transport

`src/lib/api/transport.ts`：

```ts
export interface RequestOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
}

export interface StreamHandlers<TEvent = StreamEvent> {
  signal?: AbortSignal
  onOpen?: () => void
  onEvent: (event: TEvent) => void
  onError?: (error: ApiError) => void
  onDone?: () => void
}

export interface ApiTransport {
  get<T>(path: string, options?: RequestOptions): Promise<T>
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>
  delete<T>(path: string, options?: RequestOptions): Promise<T>
  stream<TEvent>(path: string, body: unknown, handlers: StreamHandlers<TEvent>): Promise<void>
}
```

HTTP transport：

- 普通 JSON 请求使用 `ky`。
- `client.ts` 统一配置 `prefixUrl`、timeout、retry、headers、错误转换。
- SSE 使用 `@microsoft/fetch-event-source`，支持 POST body 和 `AbortController`。

mock transport：

- 使用 `mock-db.ts` 保存内存状态。
- handlers 按 `method + path pattern` 路由。
- `stream-simulator.ts` 逐段触发 `delta`、`card`、`state`、`done`。
- 支持模拟支付失败、急症命中、超时、网络错误。

### 6.4 Facade 命名

统一导出：

```ts
export const api = {
  patient: patientApi,
  visits: visitsApi,
  workbench: workbenchApi,
}
```

`patientApi`：

```ts
verifyIdentity(input: VerifyIdentityInput): Promise<VerifyIdentityResult>
getPatientContext(patientId: PatientId): Promise<PatientContext>
updatePatientProfile(input: UpdatePatientProfileInput): Promise<PatientProfile>
```

`visitsApi`：

```ts
listSessions(input: ListSessionsInput): Promise<PageResult<VisitSessionSummary>>
getSession(sessionId: SessionId): Promise<VisitSession>
createSession(input: CreateSessionInput): Promise<CreateSessionResult>
createFollowUp(input: CreateFollowUpInput): Promise<CreateSessionResult>
getReadonlySnapshot(sessionId: SessionId): Promise<VisitSnapshot>
```

`workbenchApi`：

```ts
getSession(sessionId: SessionId): Promise<VisitSession>
listTimeline(input: ListTimelineInput): Promise<PageResult<TimelineItem>>
sendMessage(input: SendMessageInput): Promise<SendMessageResult>
streamAssistantMessage(input: StreamAssistantInput, handlers: StreamHandlers<AssistantStreamEvent>): Promise<void>
submitLabDecision(input: SubmitLabDecisionInput): Promise<FlowActionResult>
submitPayment(input: SubmitPaymentInput): Promise<FlowActionResult>
submitFulfillment(input: SubmitFulfillmentInput): Promise<FlowActionResult>
submitTreatmentExecution(input: SubmitTreatmentExecutionInput): Promise<FlowActionResult>
ackAdvice(input: AckAdviceInput): Promise<FlowActionResult>
askLockedQuestion(input: AskLockedQuestionInput, handlers: StreamHandlers<AssistantStreamEvent>): Promise<void>
classifyFollowUpIntent(input: ClassifyIntentInput): Promise<ClassifyIntentResult>
streamConsultationReply(input: ConsultationInput, handlers: StreamHandlers<AssistantStreamEvent>): Promise<void>
reportVitals(input: ReportVitalsInput): Promise<EmergencyRecheckResult>
exitVisit(input: ExitVisitInput): Promise<ExitSettlementResult>
pauseVisitTimer(input: PauseVisitTimerInput): Promise<VisitSession>
resumeVisitTimer(input: ResumeVisitTimerInput): Promise<VisitSession>
```

> 说明：
> - 移除原 `submitTreatmentAction` 笼统方法，按患者实际动作拆为 `submitPayment`（检验费 / 药品费复用同一支付动作，由卡片 `purpose` 区分）、`submitFulfillment`（取药方式：自取 / 配送）、`submitTreatmentExecution`（自动化治疗预约 / 到号 / 执行确认）、`ackAdvice`（仅医嘱确认）。
> - `submitTreatmentExecution` 不直接对应 medAgent。它属于后端业务层 / mock 的治疗执行能力，用于产品保留的自动化治疗分支；HTTP 模式下后端若尚未支持该分支，不应产出 `plan: 'treatment'`，而应返回 `referral` 或 `capability_insufficient` 终止。
> - `askLockedQuestion`：阻塞卡锁定期间“我有疑问”通道，流式回复但不推进主流程（对应 UI §3.4）。
> - `classifyFollowUpIntent` / `streamConsultationReply`：完成态输入的意图分类与咨询回答，**优先走 AI**（对应 UI §3.7 的咨询 / 复诊 / 不确定三分类）。
> - `reportVitals`：锁定态或普通问诊中由患者主动上报“我现在很不舒服”等体征/急症信号，触发急症守护复检；若复检命中，后续仍以 `EMERGENCY_DETECTED` 事件进入急症覆盖态。

命名约定：

- 读取：`get*`、`list*`。
- 创建：`create*`。
- 用户动作：`submit*`。
- 流式：`stream*`。
- 不向业务层暴露 `fetch*` 命名。

### 6.5 Zod Schema

每个 API 方法必须有输入与响应 schema。类型从 schema 推导：

```ts
export const sendMessageInputSchema = z.object({
  sessionId: sessionIdSchema,
  content: z.string().trim().min(1).max(2000),
  clientMessageId: z.string(),
})

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>
```

使用规则：

- UI 表单提交前校验输入 schema。
- HTTP 响应和 mock fixtures 都过响应 schema。
- schema 失败转成统一 `ApiError`，避免脏数据进入组件。
- schema 命名统一为 `{methodName}InputSchema` / `{methodName}ResultSchema`，无入参的查询只保留 result schema。
- `FlowCard`、`TimelineItem`、`AssistantStreamEvent` 必须使用 discriminated union，并以 `kind` / `type` 字段做分发。

首批 schema 清单：

| facade 方法 / 对象 | 输入 schema | 响应 schema | 关键约束 |
| --- | --- | --- | --- |
| `patientApi.verifyIdentity` | `verifyIdentityInputSchema` | `verifyIdentityResultSchema` | 身份证 / 手机等敏感字段只在输入中出现，响应只给患者摘要和可读上下文范围 |
| `patientApi.getPatientContext` | `patientIdSchema` | `patientContextSchema` | 新出诊可无 `priorVisit`；复诊必须包含上次诊断、检验、处置摘要 |
| `patientApi.updatePatientProfile` | `updatePatientProfileInputSchema` | `patientProfileSchema` | 过敏史、长期用药允许空数组，不允许 `undefined` 和空字符串混用 |
| `visitsApi.listSessions` | `listSessionsInputSchema` | `pageResult(visitSessionSummarySchema)` | `cursor` 可选，`items` 按 `updatedAt` 倒序 |
| `visitsApi.getSession` / `workbenchApi.getSession` | `sessionIdSchema` | `visitSessionSchema` | `VisitStatus`、`terminalReason`、`activeCardId` 必须互相自洽 |
| `visitsApi.createSession` | `createSessionInputSchema` | `createSessionResultSchema` | `entryType: 'new'` 时不得传 `parentSessionId` |
| `visitsApi.createFollowUp` | `createFollowUpInputSchema` | `createSessionResultSchema` | 必须传 `parentSessionId`，响应新 session 的 `entryType` 固定为 `follow_up` |
| `visitsApi.getReadonlySnapshot` | `sessionIdSchema` | `visitSnapshotSchema` | 只读快照包含 timeline、诊断 / 终止摘要，不包含可执行动作 |
| `workbenchApi.listTimeline` | `listTimelineInputSchema` | `pageResult(timelineItemSchema)` | item id 稳定，分页查询更早数据 |
| `workbenchApi.sendMessage` | `sendMessageInputSchema` | `sendMessageResultSchema` | `clientMessageId` 用于乐观消息回填 |
| `workbenchApi.streamAssistantMessage` | `streamAssistantInputSchema` | `assistantStreamEventSchema` | SSE 事件只允许 `delta/message_final/card/state/emergency/done/error` |
| `workbenchApi.submitLabDecision` | `submitLabDecisionInputSchema` | `flowActionResultSchema` | `decision: 'accepted' | 'skipped' | 'vetoed'` |
| `workbenchApi.submitPayment` | `submitPaymentInputSchema` | `flowActionResultSchema` | `purpose: 'lab' | 'medication'`，支付失败返回可重试错误和卡片状态 |
| `workbenchApi.submitFulfillment` | `submitFulfillmentInputSchema` | `flowActionResultSchema` | `mode: 'pickup' | 'delivery'` |
| `workbenchApi.submitTreatmentExecution` | `submitTreatmentExecutionInputSchema` | `flowActionResultSchema` | `action: 'schedule' | 'confirm_arrival' | 'start' | 'complete' | 'cancel'`；`cancel` 进入退出 / 转诊收口，不静默完成 |
| `workbenchApi.ackAdvice` | `ackAdviceInputSchema` | `flowActionResultSchema` | 确认后必须生成完成卡或完成态系统事件 |
| `workbenchApi.askLockedQuestion` | `askLockedQuestionInputSchema` | `assistantStreamEventSchema` | 回复进 timeline，但不得改变当前阻塞卡状态 |
| `workbenchApi.classifyFollowUpIntent` | `classifyIntentInputSchema` | `classifyIntentResultSchema` | `intent: 'consultation' | 'follow_up' | 'uncertain'`，低置信度返回 `uncertain` |
| `workbenchApi.streamConsultationReply` | `consultationInputSchema` | `assistantStreamEventSchema` | 只允许消息事件，不允许下发流程卡 |
| `workbenchApi.reportVitals` | `reportVitalsInputSchema` | `emergencyRecheckResultSchema` | 命中时返回急症来源和建议，不命中时不解除阻塞 |
| `workbenchApi.exitVisit` | `exitVisitInputSchema` | `exitSettlementResultSchema` | 结算结果必须说明已发生不可逆动作和退款 / 留档后果 |
| `workbenchApi.pauseVisitTimer` / `resumeVisitTimer` | `visitTimerInputSchema` | `visitSessionSchema` | 暂离不暂停急症守护，只影响总超时本地显示 |

### 6.6 TanStack Query 封装

query key 由 feature 集中定义：

```ts
export const workbenchKeys = {
  all: ['workbench'] as const,
  session: (sessionId: SessionId) => [...workbenchKeys.all, 'session', sessionId] as const,
  timeline: (sessionId: SessionId) => [...workbenchKeys.all, 'timeline', sessionId] as const,
}
```

query options：

```ts
export const workbenchQueries = {
  session: (sessionId: SessionId) =>
    queryOptions({
      queryKey: workbenchKeys.session(sessionId),
      queryFn: () => workbenchApi.getSession(sessionId),
    }),
  timeline: (input: ListTimelineInput) =>
    infiniteQueryOptions({
      queryKey: workbenchKeys.timeline(input.sessionId),
      initialPageParam: input.cursor,
      queryFn: ({ pageParam }) =>
        workbenchApi.listTimeline({ ...input, cursor: pageParam }),
      getNextPageParam: (page) => (page.hasMore ? page.nextCursor : undefined),
    }),
}
```

约定：

- 组件不手写 query key。
- mutation 成功后在 hook 内 `setQueryData` 或 `invalidateQueries`。
- SSE 不直接放进 Query，流式过程由 `useAssistantStream` 管理，最终结果再同步到 timeline cache。

## 7. 状态管理设计

### 7.1 状态分工

| 数据 | 所属层 |
| --- | --- |
| 会话详情、历史列表、时间线分页、支付状态 | TanStack Query |
| 问诊流程状态、阻塞规则、全局打断优先级 | XState |
| 输入草稿、辅助面板展开、侧栏折叠、滚动位置标记 | Zustand |
| 表单内部字段、校验错误 | React Hook Form |
| 流式消息的临时 chunk | `useAssistantStream` 内部 reducer，并同步 Query cache |

### 7.2 Zustand store

`composer-store.ts`：

```ts
interface ComposerState {
  draftsBySession: Record<SessionId, string>
  setDraft: (sessionId: SessionId, value: string) => void
  clearDraft: (sessionId: SessionId) => void
}
```

`workbench-ui-store.ts`：

```ts
interface WorkbenchUiState {
  contextDrawerOpen: boolean
  rightSummaryCollapsed: boolean
  atTimelineBottom: boolean
  emergencyTooltipSeen: boolean
  setAtTimelineBottom: (value: boolean) => void
}
```

约定：

- store 不保存完整 `VisitSession` 和 `TimelineItem[]`。
- store 按 UI 领域拆分，不建一个巨型 `appStore`。

### 7.3 XState visit machine

状态机放 `features/workbench/machine/visit-machine.ts`。它不替代 API，不直接保存大体量响应，只保存流程上下文和当前阻塞点。

主要状态：

```text
loadingContext
chatting
analyzing
labDecision
labPayment
labExecution
diagnosis
treatmentDecision
medicationPayment
medicationFulfillment
treatmentExecution    # 自动化治疗：待后端能力，首版 mock 演示
adviceOnly
completed
emergencyPending      # 可恢复：急症 Overlay 待患者确认/申诉
terminated            # 终止态，由 context.terminalReason 区分去向
exitSettlement
exited
```

说明：

- 处置分支映射：`medication → medicationPayment → medicationFulfillment`、`advice_only → adviceOnly`、`treatment → treatmentExecution`、`referral → terminated(reason: referral)`。
- **`treatmentExecution`（自动化治疗）是产品保留分支，当前 medAgent 决策引擎不实现院内治疗执行**（处置只 `MEDICATION` / `ADVICE_ONLY` / `REFERRAL`，需操作/手术直接 `REFERRAL`）。首版由前端 / mock 通过 `submitTreatmentExecution` 演示预约、排队、执行和完成；本院不具备能力时进 `terminated(reason: capability_insufficient)`。接 HTTP 时该分支须等后端业务层补齐治疗执行 contract，否则后端只会回 `REFERRAL`。详见 api.md「与 medAgent 后端的映射与边界」。
- 急症拆成两态：`emergencyPending` 是**可恢复**的覆盖态，对应 UI §4.1 的误报申诉（“情况已缓解/描述的是过去”）；患者确认“前往急诊”才落入 `terminated(reason: emergency)`。`context.previousStateBeforeOverlay` 仅在 `emergencyPending` 期间有效。
- `terminated` 统一承载急症确认、超时、达上限、本院能力不足 / 后端 `REFERRAL`、退出结算后的终止，由 `context.terminalReason` 区分，与时间线的 `TerminalTimelineItem.reason` 对应。
- 注意：medAgent 急症命中后**后端会话即关闭**（见接入指南 §10）。前端 `emergencyPending` 的“恢复”只在前端 / mock 层成立；接 HTTP 时若需可恢复语义，须由后端 contract 显式支持“申诉不关闭会话”，否则恢复后只能新开会话续诊。此约束记入待确认问题。

全局事件优先级：

1. `EMERGENCY_DETECTED`
2. `EXIT_REQUESTED`
3. `VISIT_TIMEOUT`
4. 阻塞卡动作
5. 普通消息与分析推进

状态机上下文：

```ts
interface VisitMachineContext {
  sessionId: SessionId
  currentCardId?: FlowCardId
  previousStateBeforeOverlay?: string
  terminalReason?: TerminalReason
  askRound: number
  labRound: number
  blocking: boolean
  streamRequestId?: string
}
```

事件示例：

```ts
type VisitMachineStateValue =
  | 'loadingContext'
  | 'chatting'
  | 'analyzing'
  | 'labDecision'
  | 'labPayment'
  | 'labExecution'
  | 'diagnosis'
  | 'treatmentDecision'
  | 'medicationPayment'
  | 'medicationFulfillment'
  | 'treatmentExecution'
  | 'adviceOnly'
  | 'completed'
  | 'emergencyPending'
  | 'terminated'
  | 'exitSettlement'
  | 'exited'

type VisitMachineEvent =
  | {
      type: 'HYDRATE'
      state: VisitMachineStateValue
      session: VisitSession
      currentCardId?: FlowCardId
      terminalReason?: TerminalReason
    }
  | { type: 'CONTEXT_LOADED'; session: VisitSession }
  | { type: 'MESSAGE_SENT'; content: string; clientMessageId: string }
  | { type: 'AGENT_ANALYSIS_STARTED' }
  | { type: 'LAB_CARD_RAISED'; cardId: FlowCardId }
  | { type: 'LAB_ACCEPTED'; cardId: FlowCardId }
  | { type: 'LAB_SKIPPED'; cardId: FlowCardId }
  | { type: 'LAB_VETOED'; cardId: FlowCardId }
  | { type: 'LAB_PAYMENT_SUCCEEDED'; cardId: FlowCardId }
  | { type: 'PAYMENT_FAILED'; cardId: FlowCardId; purpose: 'lab' | 'medication' }
  | { type: 'PAYMENT_DEFERRED'; cardId: FlowCardId; purpose: 'lab' | 'medication' }
  | { type: 'LAB_RESULT_RECEIVED' }
  | { type: 'DIAGNOSIS_READY'; cardId: FlowCardId }
  | { type: 'TREATMENT_DECIDED'; cardId: FlowCardId; plan: 'medication' | 'treatment' | 'advice_only' | 'referral' }
  | { type: 'MEDICATION_PAID'; cardId: FlowCardId }
  | { type: 'MEDICATION_FULFILLED'; cardId: FlowCardId }
  | { type: 'TREATMENT_SCHEDULED'; cardId: FlowCardId }
  | { type: 'TREATMENT_ARRIVED'; cardId: FlowCardId }
  | { type: 'TREATMENT_STARTED'; cardId: FlowCardId }
  | { type: 'TREATMENT_COMPLETED'; cardId: FlowCardId }
  | { type: 'ADVICE_ACKNOWLEDGED'; cardId: FlowCardId }
  | { type: 'VISIT_COMPLETED' }
  | { type: 'FOLLOW_UP_MESSAGE_SENT'; content: string }
  | { type: 'EMERGENCY_RECHECK_REQUESTED'; cardId?: FlowCardId }
  | { type: 'EMERGENCY_DETECTED'; source: string }
  | { type: 'EMERGENCY_CONFIRMED' }        // 确认前往急诊 -> terminated
  | { type: 'EMERGENCY_DISMISSED' }        // 误报申诉 -> 恢复 previousStateBeforeOverlay
  | { type: 'VISIT_TIMEOUT' }
  | { type: 'TRANSFER_REQUIRED'; reason: TerminalReason }  // 达上限 / 本院能力不足 / REFERRAL
  | { type: 'EXIT_REQUESTED' }
  | { type: 'EXIT_CONFIRMED' }
  | { type: 'EXIT_SETTLED' }
```

实现约定：

- guards 放 `visit-machine.guards.ts`，例如 `isBlockingCardPending`、`canSendMessage`。
- actions 放 `visit-machine.actions.ts`，例如 `assignCurrentCard`、`markTerminalReason`。
- API 调用由 hook 或 machine actor 包装，不在 UI 组件里直接推进状态。
- `HYDRATE` 仅由 `useWorkbenchSession` 在会话恢复时发送，用于一次性把服务端粗粒度状态和当前 pending 卡片映射成机器态；它不触发业务副作用。
- `EMERGENCY_RECHECK_REQUESTED` 不解除当前阻塞卡。hook 调用 `workbenchApi.reportVitals` 后，若后端 / mock 判定急症命中，再发送 `EMERGENCY_DETECTED`；若未命中，只插入普通系统事件或提示。
- 急症进入 `emergencyPending` 时，action 先保存 `previousStateBeforeOverlay` 并 abort 当前 SSE；`EMERGENCY_DISMISSED` 恢复该状态并插入 `emergency_dismissed` 系统事件，`EMERGENCY_CONFIRMED` 清空它并进入 `terminated`。
- `TREATMENT_DECIDED` 的 `plan` 决定下一态：`medication → medicationPayment`、`treatment → treatmentExecution`、`advice_only → adviceOnly`、`referral → terminated`。前端不暴露处置分支选择按钮，`plan` 来自后端 / SSE。
- `treatment` 分支（自动化治疗）当前无 medAgent 支撑，由后端业务层 / mock 演示；HTTP 模式下后端若未实现院内治疗，会以 `referral` 替代，前端需兼容两种返回。`treatmentExecution` 内部通过 `TREATMENT_SCHEDULED`、`TREATMENT_ARRIVED`、`TREATMENT_STARTED` 更新卡片状态，`TREATMENT_COMPLETED → completed`，本院不具备能力时发 `TRANSFER_REQUIRED(reason: capability_insufficient) → terminated`。

首批状态转移矩阵：

| 当前态 | 事件 | 目标态 | 主要动作 |
| --- | --- | --- | --- |
| `loadingContext` | `CONTEXT_LOADED` / `HYDRATE` | 目标机器态 | 初始化 context、写入当前卡 |
| `chatting` | `MESSAGE_SENT` | `analyzing` | 插入患者乐观消息，启动本轮 SSE |
| `analyzing` | `LAB_CARD_RAISED` | `labDecision` | 插入检验决策卡，锁定输入 |
| `analyzing` | `DIAGNOSIS_READY` | `diagnosis` | 插入诊断卡 |
| `analyzing` | `TRANSFER_REQUIRED` | `terminated` | 写入 `terminalReason` 和终止卡 |
| `labDecision` | `LAB_ACCEPTED` | `labPayment` | 更新检验卡处理结果，生成缴费卡 |
| `labDecision` | `LAB_SKIPPED` | `analyzing` | 标记不查，恢复 Agent 汇总分析 |
| `labDecision` | `LAB_VETOED` | `chatting` | 标记暂不决定，解除锁定 |
| `labPayment` | `LAB_PAYMENT_SUCCEEDED` | `labExecution` | 更新支付卡，生成检验执行卡 |
| `labPayment` | `PAYMENT_FAILED` | `labPayment` | 标记支付失败，保留重试 / 更换方式 / 暂不缴费 |
| `labPayment` | `PAYMENT_DEFERRED(purpose=lab)` | `chatting` | 标记暂不缴费，解除锁定 |
| `labExecution` | `LAB_RESULT_RECEIVED` | `analyzing` | 插入检验结果摘要，回到 Agent 汇总 |
| `diagnosis` | `TREATMENT_DECIDED(plan=medication)` | `medicationPayment` | 生成药品支付 / 取药相关卡 |
| `diagnosis` | `TREATMENT_DECIDED(plan=advice_only)` | `adviceOnly` | 生成仅医嘱卡 |
| `diagnosis` | `TREATMENT_DECIDED(plan=treatment)` | `treatmentExecution` | 生成自动化治疗执行卡 |
| `diagnosis` | `TREATMENT_DECIDED(plan=referral)` | `terminated` | 写入转诊终止卡 |
| `medicationPayment` | `MEDICATION_PAID` | `medicationFulfillment` | 更新药品支付状态 |
| `medicationPayment` | `PAYMENT_FAILED` | `medicationPayment` | 标记支付失败，保留重试 / 更换方式 |
| `medicationPayment` | `PAYMENT_DEFERRED(purpose=medication)` | `exitSettlement` | 药品暂不缴费需经退出 / 挂起结算收口 |
| `medicationFulfillment` | `MEDICATION_FULFILLED` | `completed` | 生成完成卡 |
| `treatmentExecution` | `TREATMENT_SCHEDULED` / `TREATMENT_ARRIVED` / `TREATMENT_STARTED` | `treatmentExecution` | 更新治疗卡状态，不解锁主输入 |
| `treatmentExecution` | `TREATMENT_COMPLETED` | `completed` | 生成完成卡 |
| `adviceOnly` | `ADVICE_ACKNOWLEDGED` | `completed` | 留痕并生成完成卡 |
| `completed` | `FOLLOW_UP_MESSAGE_SENT` | `loadingContext` | 创建复诊 session 并加载上下文 |
| 任意非终止态 | `EMERGENCY_DETECTED` | `emergencyPending` | abort SSE、禁用输入和卡片 |
| `emergencyPending` | `EMERGENCY_DISMISSED` | 前态 | 恢复前态，插入误报恢复系统事件 |
| `emergencyPending` | `EMERGENCY_CONFIRMED` | `terminated` | 写入急症终止卡 |
| 任意非终止态 | `VISIT_TIMEOUT` | `terminated` | 写入超时终止卡 |
| 任意非终止态 | `EXIT_REQUESTED` | `exitSettlement` | 打开退出结算 Sheet |
| `exitSettlement` | `EXIT_SETTLED` | `terminated` | 写入退出终止卡和快照 |

## 8. 页面与组件拆分

### 8.1 首页模块

`HomePage` 组合：

```text
HomePage
  PageShell
  ContinueSessionCard
  SymptomStartPanel
  AppBottomTabs
```

组件职责：

- `ContinueSessionCard`：展示进行中会话，点击进入 `/workbench/:sessionId`。
- `SymptomStartPanel`：输入症状草稿，常见症状草稿 chip，开始问诊。
- `AppBottomTabs`：首页、历史、我的导航。

首页逻辑：

- `useLatestActiveSession()` 读取最近进行中会话。
- `useCreateSessionEntry()` 根据输入创建新会话或跳转 `/workbench/new?draft=...`。
- 未登录或未核验时进入 `IdentityGate`，完成后继续原动作。

### 8.2 历史模块

`HistoryPage` 组合：

```text
HistoryPage
  HistoryFilterBar
  SessionList
    SessionCard
  AppBottomTabs
```

`SessionCard` 动作：

- 进行中：`继续就诊` -> `/workbench/:sessionId`。
- 已完成：`发起复诊` -> `createFollowUp` 后进入新 session。
- 任意状态：`回看记录` -> `/history/:sessionId`。

历史列表只展示完整历史，不在工作台重复嵌入。

### 8.3 工作台页面

`WorkbenchPage` 只负责取得 `sessionId` 并组装 container：

```tsx
export function WorkbenchPage() {
  const { sessionId } = useParams()
  return <WorkbenchContainer sessionId={parseSessionId(sessionId)} />
}
```

`WorkbenchContainer` 组合：

```text
WorkbenchContainer
  WorkbenchShell
    WorkbenchHeader
    ContextSummaryBar
    ChatTimeline
    InputAssistPanel
    LockBar
    LockQuestionSheet
    InputDock
    EmergencyOverlay
    TimeoutOverlay
    ExitVisitSheet
```

`useWorkbenchSession(sessionId)`：

- 读取 session query。
- 启动 visit machine。
- 把服务端状态映射为 machine 事件。
- 提供 `sendMessage`、`submitCardAction`、`requestExit` 等业务动作。

会话恢复（hydration）规则：

`/workbench/:sessionId` 继续就诊或复诊恢复时，服务端只给粗粒度 `VisitStatus`，需结合“当前未处理卡片”反推机器态：

1. 读取 `session`（含 `status`、`terminalReason`）和 timeline 首页，取出最后一条 `status: 'pending'` 的 `FlowCardTimelineItem` 作为 `currentCard`。
2. `status` 非 `blocked` 时直接映射：`chatting/analyzing/diagnosis/completed → ` 同名机器态；`transferred/emergency_terminated/exited → terminated`（用 `terminalReason` 定去向）。
3. `status === 'blocked'` 时由 `currentCard.kind` 决定具体阻塞态：`lab_decision → labDecision`、`payment → labPayment` 或 `medicationPayment`（看卡片 `purpose`）、`lab_execution → labExecution`、`medication_fulfillment → medicationFulfillment`、`treatment_execution → treatmentExecution`。
4. 找不到对应未处理卡片时回退到 `chatting`，并记一条系统事件提示“已恢复到对话”，避免卡在无卡的 `blocked`。
5. 恢复不重放历史事件，只用一次性 `HYDRATE` 把机器置于目标态；后续推进仍走正常事件。

### 8.4 时间线组件

`ChatTimeline`：

- 使用 `react-virtuoso` 渲染动态高度列表。
- 接收扁平且已排序的 `TimelineItem[]`。
- 通过 `startReached` 加载更早历史。
- 用户在底部附近时跟随新消息。
- 用户上滑时不强制跳到底部，显示“回到底部”按钮。

`TimelineRow`：

```tsx
function TimelineRow({ item }: { item: TimelineItem }) {
  switch (item.kind) {
    case 'message':
      return <MessageBubble item={item} />
    case 'flow_card':
      return <FlowCardRenderer card={item.card} />
    case 'system_event':
      return <SystemEventRow item={item} />
    case 'terminal':
      return <TerminalEventRow item={item} />
  }
}
```

性能约定：

- `TimelineRow`、`MessageBubble`、各卡片组件使用 `memo`。
- `itemContent` 不读取整份 session。
- 流式 chunk 按 animation frame 合并，避免每 token 触发完整重渲染。
- 大卡片只接收卡片字段和动作 callback。

### 8.5 输入组件

`InputDock`：

- HeroUI `Input` 或 `Textarea` + icon button。
- 发送按钮使用 lucide `Send` 图标。
- 左侧 `+` 打开补充资料 Sheet。
- 阻塞卡待处理时禁用主输入，仅保留 `LockBar` 提供的逃生入口。
- 完成态占位提示“输入问题或描述变化”。

`LockBar`（阻塞卡锁定态，对应 UI §3.4 双逃生通道）：

- 主输入禁用时显示，给出锁定原因（`card.lockReason`）。
- 逃生入口一：`我现在很不舒服` —— 触发 `vitals` 上报 / 急症复检，不发普通消息。机器上发送 `EMERGENCY_RECHECK_REQUESTED`，由 hook 调 `workbenchApi.reportVitals` 让后端守护重判。
- 逃生入口二：`我有疑问` —— 打开 `LockQuestionSheet` 最小输入，走 `askLockedQuestion` 锁定态问答，AI 回复进时间线但**不推进主流程状态**，阻塞卡保持 pending。
- 锁定态问答中若分类出明确退出意图（如“不想做了”），等同卡片 `skip_lab`（不查）动作，由 `useFlowCardAction` 解除阻塞，而非新增状态分支。

`LockQuestionSheet`：

- HeroUI `Drawer`/`Sheet` 最小文本输入。
- 仅在阻塞态可开；提交走 `workbenchApi.askLockedQuestion({ sessionId, cardId, content }, handlers)`，由 hook 把回复写入时间线。
- 回复不改变 `blocking`，仅作信息澄清。

`InputAssistPanel`：

- 常见症状草稿 chip。
- AI 追问快速回答 chip。
- 完成态咨询/复诊 chip。
- 不同点击行为必须视觉区分。

Chip 行为：

- 草稿 chip：写入输入框，不自动发送。
- 快速回答 chip：点击即发送完整回答。
- 同一行不混合两种行为。

### 8.6 流程卡组件

统一入口：

```tsx
export function FlowCardRenderer({ card }: { card: FlowCard }) {
  switch (card.kind) {
    case 'lab_decision':
      return <LabDecisionCard card={card} />
    case 'payment':
      return <PaymentCard card={card} />
    case 'lab_execution':
      return <LabExecutionCard card={card} />
    case 'diagnosis':
      return <DiagnosisCard card={card} />
    case 'treatment_plan':
      return <TreatmentPlanCard card={card} />
    case 'medication_fulfillment':
      return <MedicationFulfillmentCard card={card} />
    case 'treatment_execution':
      return <TreatmentExecutionCard card={card} />
    case 'advice_only':
      return <AdviceOnlyCard card={card} />
    case 'completed_visit':
      return <CompletedVisitCard card={card} />
    default:
      return assertNever(card)
  }
}
```

卡片通用 props：

```ts
interface FlowCardProps<TCard extends FlowCard> {
  card: TCard
  disabled?: boolean
  onAction?: (action: FlowCardAction) => void
}
```

卡片编码规则：

- 所有卡片使用 HeroUI `Card` compound pattern，例如 `Card.Header`、`Card.Content`。
- 按钮使用 HeroUI `Button`，交互事件优先使用 `onPress`。
- 卡片内部不调用 API，动作通过 `onAction` 抛给 hook。
- 已处理卡片保持可读，主动作按钮隐藏或 disabled，展示处理结果和时间。
- 阻塞卡设置 `blocking: true`，由 machine 和 `LockBar` 共同锁定输入。

### 8.7 全局覆盖态

`EmergencyOverlay`：

- 监听 machine `emergencyPending` 态（可恢复）。
- 展示最高优先级 Modal。
- 进入时 abort 当前 SSE、禁用卡片动作和输入。
- “我已知晓，前往急诊”发送 `EMERGENCY_CONFIRMED`，进入 `terminated(reason: emergency)` 并追加终止卡。
- “情况已缓解/描述的是过去”发送 `EMERGENCY_DISMISSED`，恢复 `previousStateBeforeOverlay` 并插入 `emergency_dismissed` 系统事件（不产生终止卡）。
- 注意接 HTTP 时后端会话已关闭的约束（见 §7.3）。

`TimeoutOverlay`：

- 来自 `useVisitCountdown` 或服务端状态。
- 确认后发送 `VISIT_TIMEOUT`，进入 `terminated(reason: timeout)`，时间线追加 `reason: timeout` 的终止卡。

`ExitVisitSheet`：

- 任意非终止态可打开。
- `useExitSettlement` 先查询或计算退出后果。
- 确认后调用 `workbenchApi.exitVisit`，成功后进入 `exited` 或历史回看。

## 9. 关键 Hook 设计

### 9.1 `useWorkbenchSession`

职责：

- 绑定 session query、timeline query、visit machine。
- 暴露页面所需状态：`session`、`timelineItems`、`currentState`、`blockingCard`。
- 提供业务动作：`sendMessage`、`submitFlowAction`、`pauseVisit`、`resumeVisit`、`requestExit`。

返回形态：

```ts
interface UseWorkbenchSessionResult {
  session?: VisitSession
  items: TimelineItem[]
  state: VisitMachineSnapshot
  blockingCard?: FlowCard
  loading: boolean
  error?: ApiError
  actions: {
    sendMessage: (content: string) => Promise<void>
    submitFlowAction: (action: FlowCardAction) => Promise<void>
    requestExit: () => void
    confirmExit: () => Promise<void>
    pauseVisit: () => Promise<void>
    resumeVisit: () => Promise<void>
    reportVitals: (input: ReportVitalsInput) => Promise<void>
  }
}
```

### 9.2 `useAssistantStream`

职责：

- 发送患者消息后启动 SSE。
- 持有 `AbortController`。
- 处理 `delta`、`message_final`、`card`、`state`、`emergency`、`done`、`error`。
- 把增量内容写入 timeline query cache。
- 在急症、退出、超时时 abort。

事件处理：

```text
delta -> appendAssistantDelta
message_final -> finalizeAssistantMessage
card -> upsertFlowCardItem + send machine event
state -> send machine event
emergency -> send EMERGENCY_DETECTED
done -> clear stream state
error -> mark streaming message failed
```

### 9.3 `useFlowCardAction`

职责：

- 接收卡片 action。
- 根据 action 类型选择 facade 方法。
- 成功后更新 timeline cache、session cache，并发送 machine event。
- 失败时保留卡片 pending，展示可重试错误。

卡片 action：

```ts
type FlowCardAction =
  | { type: 'accept_lab'; cardId: FlowCardId }
  | { type: 'skip_lab'; cardId: FlowCardId }
  | { type: 'veto_lab'; cardId: FlowCardId }
  | { type: 'submit_payment'; cardId: FlowCardId; paymentMethodId: string }
  | { type: 'defer_payment'; cardId: FlowCardId }
  | { type: 'choose_fulfillment'; cardId: FlowCardId; mode: 'pickup' | 'delivery' }
  | { type: 'submit_treatment_execution'; cardId: FlowCardId; action: 'schedule' | 'confirm_arrival' | 'start' | 'complete' | 'cancel' }
  | { type: 'ack_advice'; cardId: FlowCardId }
  | { type: 'ask_card_question'; cardId: FlowCardId; content: string }
  | { type: 'save_terminal_summary'; cardId: FlowCardId }
```

action 到 facade 的映射：

- `accept_lab` / `skip_lab` / `veto_lab` -> `submitLabDecision`（`decision: accepted | skipped | vetoed`）。
- `submit_payment` / `defer_payment` -> `submitPayment`，检验费与药费复用同一 `payment` 卡，由 `PaymentCardData.purpose: 'lab' | 'medication'` 区分；失败发送 `PAYMENT_FAILED`，暂不缴费发送 `PAYMENT_DEFERRED`。
- `choose_fulfillment` -> `submitFulfillment`（对应 medAgent `MEDICATION` 取药方式确认）。
- `submit_treatment_execution` -> `submitTreatmentExecution`（自动化治疗预约 / 到号 / 开始 / 完成 / 取消；仅 mock 或已补齐治疗执行 contract 的后端业务层会出现）。
- `ack_advice` -> `ackAdvice`（对应 `ADVICE_ONLY` 知晓 / 留痕）。
- `ask_card_question` -> `askLockedQuestion` 锁定态疑问通道（见 §8.5），流式回复但不推进主流程；若问句表达明确放弃意图，按 `skip_lab` 处理。
- `save_terminal_summary` -> 终止卡的"保存问诊摘要"，读取 `getReadonlySnapshot`，不改变状态。

### 9.4 `useVisitCountdown`

职责：

- 根据 `session.timeoutAt`、暂停状态和服务端时间偏移计算剩余时间。
- 剩余 5 分钟和 2 分钟时给顶栏不同文案。
- 到时发送 `VISIT_TIMEOUT`。
- 暂离后不继续本地递减，恢复时重新以 session 数据为准。

## 10. 业务流程时序

### 10.1 新建问诊

```text
HomePage 输入症状
  -> navigate('/workbench/new?draft=...')
  -> newWorkbenchLoader 解析 draft
  -> WorkbenchContainer 调用 createSession
  -> session cache 写入
  -> machine CONTEXT_LOADED
  -> draft 写入 composer store 或作为首条提示
  -> WB-CHATTING
```

### 10.2 发送消息与流式回复

```text
InputDock send
  -> composer 清空草稿
  -> timeline cache 插入 patient optimistic item
  -> workbenchApi.sendMessage
  -> timeline cache 插入 assistant streaming item
  -> streamAssistantMessage
  -> delta 更新 streaming item
  -> card/state/emergency 驱动 machine
  -> done finalize
```

失败策略：

- `sendMessage` 失败：患者消息标记 failed，可重试。
- stream 中断：AI 消息标记 failed，提供重新生成。
- 用户主动退出、急症、超时：abort stream，消息标记 invalidated 或 interrupted。

### 10.3 是否检验卡

```text
SSE card(lab_decision)
  -> timeline upsert lab decision card
  -> machine LAB_CARD_RAISED
  -> InputDock disabled
  -> LockBar visible
患者同意
  -> submitLabDecision({ decision: 'accepted' })
  -> card accepted
  -> payment card raised
患者不查
  -> submitLabDecision({ decision: 'skipped' })
  -> card skipped
  -> machine 进入 analyzing 或 diagnosis
患者暂不决定
  -> submitLabDecision({ decision: 'vetoed' })
  -> card vetoed
  -> machine 回到 chatting
```

### 10.4 缴费与检验结果回填

```text
PaymentCard submit
  -> submitPayment
  -> processing
  -> paid
  -> LabExecutionCard/SystemEvent
  -> mock 或后端回填 lab_result_received
  -> timeline 插入检验摘要
  -> machine LAB_RESULT_RECEIVED
  -> Agent 重新 analyzing
```

### 10.5 确诊与处置

```text
SSE state(diagnosis) + card(diagnosis)
  -> DiagnosisCard
  -> machine DIAGNOSIS_READY -> treatmentDecision
SSE card(treatment_plan) + TREATMENT_DECIDED{ plan }
  -> TreatmentPlanCard（只展示 AI 决策，不让患者选分支）
  -> plan = medication:
       MedicationFulfillmentCard / PaymentCard(purpose: medication)
       -> submitPayment -> MEDICATION_PAID -> medicationFulfillment
       -> submitFulfillment(choose_fulfillment) -> MEDICATION_FULFILLED
       -> CompletedVisitCard -> VISIT_COMPLETED
  -> plan = advice_only:
       AdviceOnlyCard
       -> ackAdvice -> ADVICE_ACKNOWLEDGED
       -> CompletedVisitCard -> VISIT_COMPLETED
  -> plan = treatment:（待后端能力，本期 mock 演示）
       TreatmentExecutionCard（治疗项目 / 预约 / 排队 / 执行状态）
       -> 本院具备能力: submitTreatmentExecution(schedule)
       -> TREATMENT_SCHEDULED -> 排队
       -> submitTreatmentExecution(confirm_arrival)
       -> TREATMENT_ARRIVED -> 到号
       -> submitTreatmentExecution(start)
       -> TREATMENT_STARTED -> 执行中
       -> submitTreatmentExecution(complete)
       -> TREATMENT_COMPLETED
       -> CompletedVisitCard -> VISIT_COMPLETED
       -> 本院不具备: TRANSFER_REQUIRED(reason: capability_insufficient) -> terminated
  -> plan = referral:
       TRANSFER_REQUIRED(reason: referral) -> terminated
```

说明：

- medAgent 的 `DRUG_QUERY`（查药品规格）对患者透明，前端不渲染卡片，仅 mock / 后端在内部完成后直接给出 `PURCHASE` 对应的 `medication_fulfillment` / `payment` 卡。
- `treatment`（院内自动化治疗执行）分支**当前 medAgent 不支持**（其处置仅 medication / advice_only / referral）。本期按需求与 UI 文档保留该分支并以 mock 演示，待后端业务层补充治疗执行能力后接入；HTTP 模式下后端若仍只返回三选一，则该分支不会出现，需在能力判断处直接走 `capability_insufficient` 或 `referral` 终止。

### 10.6 完成后输入

```text
completed 状态输入
  -> workbenchApi.classifyFollowUpIntent（AI 意图分类，见 §6.4）
  -> consultation: 走 streamConsultationReply，AI 基于本次记录回答，仍 completed，不触发复诊
  -> follow_up: createFollowUp，跳转新 session（FOLLOW_UP_MESSAGE_SENT）
  -> uncertain: 内联提示患者选择"咨询本次"或"开始复诊"
```

说明：意图分类对齐 UI §3.7「能走 AI 尽量走 AI」，由后端 / mock 用模型判定咨询 / 复诊 / 不确定；置信度低返回 `uncertain`，前端不擅自决定。

### 10.7 急症、超时、退出

急症：

```text
任何新信息或 SSE emergency
  -> EMERGENCY_DETECTED
  -> abort stream
  -> disable input/cards
  -> emergencyPending（保存 previousStateBeforeOverlay）
  -> EmergencyOverlay
  -> 确认前往急诊: EMERGENCY_CONFIRMED -> terminated(reason: emergency) + 终止留痕
  -> 误报申诉: EMERGENCY_DISMISSED -> 恢复前态 + 插入 emergency_dismissed 系统事件
```

> 注：medAgent 急症命中即关闭后端会话；误报恢复目前只在前端 / mock 成立，HTTP 模式下若后端已关闭会话，恢复后需新开会话续诊（见 §7.3 与待确认问题）。

超时：

```text
useVisitCountdown 到时或服务端 state(timeout)
  -> VISIT_TIMEOUT
  -> TimeoutOverlay
  -> 确认后 TRANSFER_REQUIRED(reason: timeout) -> terminated
  -> TerminalTimelineItem(reason: timeout)
```

> 注：总超时是纯前端 / mock 机制（medAgent 无总计时强制转诊），HTTP 模式由前端发起 `exitVisit` 或转诊处理收口。

退出：

```text
Header X
  -> EXIT_REQUESTED
  -> ExitVisitSheet
  -> EXIT_CONFIRMED
  -> exitVisit mutation
  -> EXIT_SETTLED -> terminated(reason: exited)
  -> 保存快照，跳历史或展示结束态
```

## 11. UI 编码规范

### 11.1 HeroUI

- 使用 HeroUI 3，不添加 `HeroUIProvider`。
- 使用 compound component 写法，如 `Card.Header`、`Card.Content`。
- 按钮交互优先 `onPress`。
- 语义 variants 优先于硬编码颜色。
- 圆角、间距、色值等视觉参数不在本文写死，统一走 HeroUI `cardVariants` 默认值与 `globals.css` 的设计 token；`ui-designs.md` 刻意不定义具体视觉值，本文同样不越界。需要全局统一时只在 token / variants 层覆盖一次，不在业务组件内联。

### 11.2 图标与按钮

- 按钮内图标优先使用 `lucide-react`。
- 发送、退出、暂离、补充、展开、锁定、警示等都使用图标配合可访问文本。
- 移动端窄空间中使用 icon button，并用 tooltip 或 `aria-label` 保持可理解。

### 11.3 Magic UI

首批只建议用于：

- AI 正在生成的短文本反馈。
- 上下文加载的轻量文字动效。
- 诊断依据或处置建议的短入场。

不用于大面积背景装饰，不改变工作台主信息层级。

### 11.4 样式

- `src/globals.css` 负责 Tailwind 4、HeroUI styles、字体和设计变量。
- 后续应移除 Vite 示例残留的 `src/index.css` 全局布局影响，避免 `#root` 固定宽度和示例色彩污染业务页面。
- 页面布局使用 Tailwind class，复杂状态样式可以封装为小组件。
- 不在业务组件中内联大量颜色，医疗安全状态使用语义 token。

## 12. Mock 设计

### 12.1 mock-db

`mock-db.ts` 保存：

- 默认患者。
- 进行中会话。
- 已完成会话。
- 已转诊会话。
- 时间线 items。
- flow cards。
- 支付单、检验单、诊断、处置方案。

数据更新必须通过 mock handler 方法，不在组件中直接修改 fixtures。

### 12.2 场景开关

开发期建议支持 query 参数或本地配置切换场景：

| 场景 | 用途 |
| --- | --- |
| `normal_no_lab` | 不检验直接确诊 |
| `lab_success` | 检验、支付、结果回填完整链路 |
| `payment_failed` | 支付失败与重试 |
| `ask_limit_reached` | 追问轮次达到上限后转大医院 |
| `lab_limit_reached` | 检验轮次达到上限后转大医院 |
| `medication_success` | 用药、药品缴费、取药 / 配送完成 |
| `advice_only` | 仅医嘱确认后完成 |
| `treatment_success` | 自动化治疗预约、排队、执行、完成 |
| `capability_insufficient` | 本院不具备治疗能力，生成终止卡 |
| `emergency` | SSE 中途急症打断 |
| `timeout` | 总超时终止 |
| `exit_refund` | 已缴费未执行退出退款 |
| `follow_up_context` | 复诊读取上次完整诊断、检验、处置摘要 |
| `completed_follow_up` | 完成后自动复诊 |

### 12.3 MSW

测试阶段使用 MSW mock 网络层。MSW handler 与 facade schema 共用类型，避免单测 mock 与开发 mock 分裂。

## 13. 测试策略

优先覆盖风险高的流程，不追求首版全量快照。

单元测试：

- schema parse 成功和失败。
- `timeline-merge` 的乐观消息、服务端回填、流式更新、card upsert。
- visit machine 的关键事件转移。
- `useVisitCountdown` 的 5 分钟、2 分钟、超时边界。

组件测试：

- `InputAssistPanel` 草稿 chip 与快速回答 chip 行为不同。
- 阻塞卡出现后主输入禁用，LockBar 显示。
- `FlowCardRenderer` 根据 kind 分发正确卡片。
- `CompletedVisitCard` 咨询和复诊入口。
- `TreatmentExecutionCard` 的预约、到号、执行、完成动作不会暴露处置分支选择。

集成测试：

- 新建问诊 -> 发送消息 -> SSE 生成检验卡 -> 同意 -> 缴费 -> 结果回填 -> 确诊。
- 暂不决定后输入恢复。
- 追问上限、检验上限、本院能力不足都生成终止卡。
- 用药、仅医嘱、自动化治疗三条处置路径都能进入完成卡。
- 急症事件 abort stream 并展示 Overlay。
- 退出结算按当前不可逆动作展示后果。
- 历史页继续就诊、发起复诊、只读回看导航。

## 14. 实施里程碑

### M1 基础骨架

- 替换 Vite 示例页。
- 建立 `app/router.tsx`、`app/providers.tsx`、`lib/api`、`lib/query-client.ts`。
- 建立 mock transport 和首批 fixtures。
- 首页、历史、工作台空骨架可导航。

### M2 工作台主链路

- 实现 `WorkbenchShell`、`ChatTimeline`、`InputDock`。
- 实现 `useWorkbenchSession`、`useAssistantStream`。
- 跑通发送消息、AI 流式回复、系统事件。

### M3 阻塞卡与检验

- 实现 `FlowCardRenderer`、检验决策卡、缴费卡、检验执行卡。
- 接入 XState 阻塞锁定。
- mock 支持同意、不查、暂不决定、支付成功和失败。

### M4 确诊、处置、完成和复诊

- 实现诊断卡、处置卡、完成卡、终止卡（含转诊 / 超时 / 能力不足）。
- 完成后输入意图分类与复诊创建。
- 历史列表可回看完整快照。

### M5 全局机制

- 急症 Overlay、超时 Overlay、退出 Sheet。
- SSE abort 和卡片失效处理。
- 终止原因留痕。

### M6 质量补齐

- 关键流程测试。
- 响应式适配。
- 移除示例 CSS 污染。
- 输出结项 REST API 文档前的 schema 整理。

## 15. 首版不实现内容

- 真实身份核验、真实支付、真实检验设备、真实药房和配送接口。
- 医生端、药师端、检验科后台。
- 处方审核、法务合规文本完整闭环。
- 真实急症规则库和医疗知识库。
- SSR、RSC、React Router Framework Mode。

首版必须实现的是可运行的患者端闭环 mock：入口、问诊、流式回复、阻塞卡、检验、确诊、处置、完成、历史、急症/超时/退出基础机制。

## 16. 与现有文档的关系

- `ui-designs.md` 定义页面结构和交互草图，本文定义代码落地方式。
- `special-designs/api.md` 定义 REST/SSE contract 方向，本文定义 facade、transport、schema 和 hook 接入方式。
- `tech-selection.md` 定义选型理由，本文定义这些技术在模块中的使用边界。
- `requirements-analysis.md` 定义业务验收，本文把验收拆成里程碑和测试重点。
