# 前端 API 合约与 Mock 设计

更新时间：2026-06-26

## 背景

本项目处于前端先行的分析与设计阶段。Agent 聊天界面、流程卡片、检验缴费、确诊处置、复诊和全局打断都需要稳定的数据契约支撑，不以后端先完成接口设计为前置条件。

因此 API 合约由本前端工程先定义，并以该合约实现 mock。后续后端接入时，应优先按本工程沉淀的 REST/SSE 合约实现或协商调整；前端只在 contract 变更处做显式迁移，不把页面组件改成临时接口适配代码。

为了避免页面组件直接依赖临时 mock 数据，项目需要先建立统一请求层：

- 对页面、hooks、状态机暴露稳定的业务 API。
- 前端先定义 REST/SSE contract，mock 和真实 HTTP transport 共用同一份类型与 schema。
- 底层可切换真实 HTTP 请求或本地 mock 数据。
- 后端接入时以 contract 对齐为主，必要时只在 adapter/transport 层处理字段映射，不重写 UI。
- 与 TanStack Query、XState、SSE 流式聊天保持清晰边界。

## 目标

1. 业务代码只调用统一 API，不直接调用 `fetch`、`ky` 或 mock 函数。
2. 同一份 API 类型同时服务真实请求和 mock 请求。
3. 支持按环境切换：`mock`、`http`，未来可扩展 `msw`。
4. 普通查询、mutation、流式聊天分别封装，但对外保持统一入口。
5. mock 数据能模拟异步延迟、错误、流程状态变化，支撑前端独立开发。
6. 在前端工程内定义首版 REST/SSE 接口契约，包括 endpoint、method、请求 schema、响应 schema、错误模型和流式事件。
7. 项目结项时产出一套可交付的 REST API 文档，作为后端实现、联调和验收依据。

## 非目标

- 不在本阶段实现完整医疗业务规则。
- 不在前端工程中实现真实医疗系统、支付系统、检验设备或药房系统。
- 不把 mock 数据写死在 React 组件里。
- 不用 Zustand 存储服务端数据缓存。

## 总体架构

```text
UI Components
  -> feature hooks / state machine services
    -> api facade
      -> transport selector
        -> http transport: ky + fetch-event-source
        -> mock transport: in-memory fixtures + async delay
```

分层职责：

- UI：只负责渲染和交互，不知道数据来自服务器还是 mock。
- feature hooks：组合 TanStack Query、mutation、API 调用。
- state machine services：XState 只发送事件和调用 API service，不直接拼请求。
- api facade：对外暴露稳定业务方法。
- transport：处理真实 HTTP 或 mock 数据来源。

## 目录规划

```text
src/
  lib/
    api/
      client.ts              # ky 实例、HTTP 错误规范化
      config.ts              # API_MODE、BASE_URL、mock 延迟配置
      errors.ts              # ApiError 类型和转换函数
      transport.ts           # Transport 接口、getTransport()
      types.ts               # 通用 Result、分页、ID 类型
      query-client.ts        # TanStack QueryClient
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
      mock-transport.ts      # 实现 Transport
      mock-db.ts             # 内存数据与状态推进
      stream-simulator.ts    # 逐段触发 SSE 事件
  features/
    patient/
      api/                   # patientApi facade（index/queries/schemas/types）
    visits/
      api/                   # visitsApi facade
    workbench/
      api/                   # workbenchApi facade（含 SSE stream 封装）
```

> 此目录形态与 `detailed-design.md` §3 对齐：按 `patient` / `visits` / `workbench` 三个 feature 组织，不再用旧的 `chat` / `visit-flow` 分包。

## 环境变量

建议使用 Vite 环境变量：

```env
VITE_API_MODE=mock
VITE_API_BASE_URL=/api
VITE_MOCK_DELAY_MS=400
```

取值约定：

- `VITE_API_MODE=mock`：默认开发模式，使用本地 mock transport。
- `VITE_API_MODE=http`：使用真实服务器 HTTP transport。
- `VITE_API_BASE_URL`：真实接口前缀。
- `VITE_MOCK_DELAY_MS`：mock 延迟，帮助 UI 暴露 loading 状态。

生产构建默认应使用 `http`。如果需要演示环境使用 mock，必须显式配置。

## Transport 接口

统一请求层核心是 transport 接口。业务 facade 依赖接口，不依赖具体实现。

```ts
export interface ApiTransport {
  get<T>(path: string, options?: RequestOptions): Promise<T>
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>
  delete<T>(path: string, options?: RequestOptions): Promise<T>
  stream(path: string, body: unknown, handlers: StreamHandlers): Promise<void>
}
```

`http transport`：

- 普通 JSON 请求用 `ky`。
- baseUrl、timeout、headers、错误解析在 `client.ts` 统一处理。
- 流式请求用 `@microsoft/fetch-event-source`。

`mock transport`：

- 根据 `path + method` 路由到本地 handler。
- 返回 Promise，并注入可配置延迟。
- 使用内存 mock-db 保存会话、消息、流程状态。
- 可模拟 4xx/5xx、超时、急症打断、支付成功/失败。

## API Facade 设计

业务对外只暴露按领域组织的 API。facade 按 **patient / visits / workbench** 三域组织，与 `detailed-design.md` §6.4 完全一致（早期草案的 `chat / visit / patient` 已废弃）：

```ts
export const api = {
  patient: patientApi,
  visits: visitsApi,
  workbench: workbenchApi,
}
```

域划分理由：

- `patient`：身份核验、患者上下文与资料维护，与具体会话无关。
- `visits`：会话生命周期（列表、创建、复诊、只读快照），即"会话级别"操作。
- `workbench`：单次会话进行中的工作台操作（时间线、发言、流式、卡片动作、计时、退出），即"会话内部"操作。

示例方法（完整签名见 `detailed-design.md` §6.4）：

```ts
patientApi.verifyIdentity(input)
patientApi.getPatientContext(patientId)
patientApi.updatePatientProfile(input)

visitsApi.listSessions(input)
visitsApi.getSession(sessionId)
visitsApi.createSession(input)
visitsApi.createFollowUp(input)
visitsApi.getReadonlySnapshot(sessionId)

workbenchApi.getSession(sessionId)
workbenchApi.listTimeline(input)
workbenchApi.sendMessage(input)
workbenchApi.streamAssistantMessage(input, handlers)
workbenchApi.submitLabDecision(input)
workbenchApi.submitPayment(input)
workbenchApi.submitTreatmentAction(input)
workbenchApi.askLockedQuestion(input)
workbenchApi.classifyFollowUpIntent(input)
workbenchApi.askCompletedConsultation(input, handlers)
workbenchApi.exitVisit(input)
workbenchApi.pauseVisitTimer(input)
workbenchApi.resumeVisitTimer(input)
```

> `visitsApi.getSession` 与 `workbenchApi.getSession` 共享同一 endpoint 与响应类型：`visitsApi` 侧用于历史/导航场景的一次性读取，`workbenchApi` 侧用于工作台内与 timeline 联动的读取与缓存。两者保留是为各自 feature 的 query key 内聚，底层实现可复用。

命名规则：

- 读数据：`get*`、`list*`
- 创建：`create*`
- 用户动作：`submit*`
- 流式：`stream*`
- 不使用 `fetch*` 暴露给业务层，因为底层不一定是真实 fetch。

## 前端先行 REST/SSE 合约

REST/SSE 合约由前端维护，mock transport、MSW handler 和真实 HTTP transport 都必须围绕同一套 contract 实现。后端联调时以该 contract 为基线，若需要调整字段或状态枚举，必须同步更新 schema、mock 数据、契约测试和结项 REST API 文档。

facade 与 detailed-design §6.4 保持一致，按 `patient` / `visits` / `workbench` 三组组织。下表标注每个 endpoint 落在哪个 facade 方法，以及与 medAgent 后端的对应关系（详见后文「与 medAgent 后端的映射」）。

首批 endpoint：

| 领域 | Method | Endpoint | 用途 | Facade | medAgent 对应 |
| --- | --- | --- | --- | --- | --- |
| patient | `POST` | `/patients/verify` | 身份核验，返回患者摘要和历史病史可读范围 | `patientApi.verifyIdentity` | 后端职责（鉴权网关） |
| patient | `GET` | `/patients/:patientId/context` | 读取新出诊/复诊上下文（病史、过敏史、上次诊断摘要） | `patientApi.getPatientContext` | 渲染进 `POST /sessions` 的 `profile`/`prior` |
| patient | `PATCH` | `/patients/:patientId/profile` | 更新患者基础资料、过敏史、长期用药 | `patientApi.updatePatientProfile` | 后端职责 |
| visit | `POST` | `/visits` | 创建新出诊 session | `visitsApi.createSession` | `POST /sessions`（`initial:true`） |
| visit | `POST` | `/visits/:sessionId/follow-up` | 由已完成会话创建复诊 session（携带父会话纪要） | `visitsApi.createFollowUp` | `POST /sessions`（`initial:false`, `prior:[record]`） |
| visit | `GET` | `/visits` | 查询历史就诊列表 | `visitsApi.listSessions` | 后端持久化（`GET /record` 导出后存库） |
| visit | `GET` | `/visits/:sessionId` | 查询会话详情、当前流程状态、摘要 | `visitsApi.getSession` / `workbenchApi.getSession` | 由前端流程状态维护 + `GET /record` 快照 |
| visit | `GET` | `/visits/:sessionId/snapshot` | 只读回看完整快照（时间线 + 结论 + 终止原因） | `visitsApi.getReadonlySnapshot` | `GET /record`（`SessionRecord`） |
| chat | `GET` | `/visits/:sessionId/timeline` | 分页查询聊天消息和流程卡片混排时间线 | `workbenchApi.listTimeline` | 由 `SessionRecord.turns` 投影 |
| chat | `POST` | `/visits/:sessionId/messages` | 发送患者消息，返回本轮消息占位和流程状态 | `workbenchApi.sendMessage` | `POST /sessions/{id}/patient-say` |
| chat | `POST` | `/visits/:sessionId/assistant-stream` | SSE 流式生成 AI 回复和流程卡片事件 | `workbenchApi.streamAssistantMessage` | `patient-say` 的 `Step` 包装为 SSE 事件 |
| lab | `POST` | `/visits/:sessionId/lab-decision` | 提交是否检验、暂不决定、不查等动作 | `workbenchApi.submitLabDecision` | 前端卡片交互（后端职责），accepted 后驱动检验 |
| lab | `POST` | `/visits/:sessionId/lab-results` | 回填检验结果，触发 Agent 重新分析 | `workbenchApi`（内部，mock/后端驱动） | `POST /sessions/{id}/test-results` |
| payment | `POST` | `/visits/:sessionId/payments` | 创建或确认检验/药品支付 | `workbenchApi.submitPayment` | 后端药品/支付子系统 |
| treatment | `POST` | `/visits/:sessionId/treatment-actions` | 提交取药方式、仅医嘱确认等处置执行动作 | `workbenchApi.submitTreatmentAction` | `POST /sessions/{id}/purchase-result` |
| consult | `POST` | `/visits/:sessionId/consult` | 完成态咨询类提问，AI 基于本次记录作答，不触发复诊 | `workbenchApi.askConsultation` | `GET /record` 上下文 + 一次 LLM 问答 |
| consult | `POST` | `/visits/:sessionId/lock-question` | 锁定态疑问通道，AI 就当前卡片作答，不推进主流程 | `workbenchApi.askLockQuestion` | 旁路 LLM 问答（不进主决策） |
| intent | `POST` | `/visits/:sessionId/classify-intent` | 完成态输入意图分类：咨询 / 复诊 / 不确定 | `workbenchApi.classifyFollowUpIntent` | AI 意图分类（走 LLM） |
| visit | `POST` | `/visits/:sessionId/timer` | 暂停 / 恢复整次导诊总计时 | `workbenchApi.pauseVisitTimer` / `resumeVisitTimer` | 纯前端机制（medAgent 无总计时） |
| visit | `POST` | `/visits/:sessionId/vitals` | 上报体征给急症守护 | `workbenchApi`（按需，mock/后端驱动） | `POST /sessions/{id}/vitals` |
| visit | `POST` | `/visits/:sessionId/exit` | 主动退出并生成结算结果 | `workbenchApi.exitVisit` | `DELETE /sessions/{id}`（结算为后端职责） |

> 确诊结果不再单独走 `GET /diagnosis`：诊断作为 `flow_card(kind:diagnosis)` 经 SSE `card` 事件下发，并落入时间线，与 medAgent `Step` 驱动一致。如需单独查询，从 `getReadonlySnapshot` 取。

「能走 AI 尽量走 AI」落点：完成态咨询（`/consult`）、锁定态疑问通道（`/lock-question`）、完成态意图分类（`/classify-intent`）均由 LLM 承载，而非规则匹配；mock 阶段以关键词桩模拟，HTTP 阶段对接 medAgent 旁路问答 / 分类能力。

分页约定：

- 时间线分页按 `cursor` 查询更早数据，响应返回 `items`、`nextCursor`、`hasMore`。
- `TimelineItem` 是 REST 响应中的稳定展示单元，消息、系统事件、流程卡、终止卡都必须落到同一条时间线。
- mock 和真实 HTTP 都必须保证 `TimelineItem.id` 稳定，避免虚拟列表重挂载。

SSE 事件约定：

- `delta`：AI 文本增量。
- `message_final`：AI 消息最终文本和 message id。
- `card`：新增或更新流程卡。
- `state`：流程状态变更。
- `emergency`：急症打断。
- `done`：本轮流式结束。
- `error`：流式错误，结构遵循统一 `ApiError`。

medAgent `Step.kind` 到 SSE 事件的映射（HTTP 模式下由 transport/adapter 层完成，mock 模式直接产出同样事件）：

| medAgent Step.kind | SSE 产出 | 前端表现 |
| --- | --- | --- |
| `ASK` | `delta` * n + `message_final` | AI 追问气泡 |
| `NEED_TESTS` | `card(kind:lab_decision)` + `state` | 是否检验阻塞卡（项目固定血常规） |
| `DRUG_QUERY` | `state` 仅内部状态（对用户透明） | 不渲染卡片，可选「正在核对药品规格」系统事件 |
| `PURCHASE` | `card(kind:medication_fulfillment)` + `state` | 购药/取药确认卡（含盒数） |
| `EMERGENCY` | `emergency` | 急症 Overlay |
| `DONE` | `card(kind:diagnosis)` + `card(kind:completed_visit)` 或 `card(kind:advice_only)` + `done` | 诊断卡 + 完成/医嘱卡 |

> `DRUG_QUERY` 对用户透明：前端不出确认卡，后端 / mock 收到后自行查规格并回填 `drug-info`，引擎续跑到 `PURCHASE`。
> medAgent 处置只有 `MEDICATION` / `ADVICE_ONLY` / `REFERRAL`，**无院内自动化治疗执行**；需院内操作 / 手术的情形后端直接给 `REFERRAL`，前端落成终止卡（`reason: referral`）。前端不存在「自动化治疗」执行分支。

结项 REST API 文档要求：

- 结项时在 `agent-workspace/special-designs/rest-api.md` 产出完整 REST API 文档。
- 文档必须包含 endpoint 清单、鉴权/患者身份上下文、请求参数、响应结构、错误码、分页、SSE 事件、状态枚举和典型时序。
- REST API 文档以本前端工程已实现并通过 mock/契约测试的 schema 为准，不另起一套口头协议。

## TanStack Query 接入

所有远端/契约状态通过 queryOptions/mutationOptions 统一封装。mock 模式和 HTTP 模式对 hook 层表现一致。

```ts
export const workbenchQueries = {
  session: (sessionId: SessionId) =>
    queryOptions({
      queryKey: ['workbench', 'session', sessionId],
      queryFn: () => workbenchApi.getSession(sessionId),
    }),
}
```

约定：

- query key 由 feature 内集中定义。
- 组件不手写 query key 字符串。
- mutation 成功后由 feature hook 统一 invalidate 或 setQueryData。
- XState 需要读取服务端状态时，优先调用 facade；需要缓存时由 hook 层处理。

## Zod Schema 与类型

每个 feature 的 API 输入/输出都应有 schema：

```text
features/chat/api/schemas.ts
features/chat/api/types.ts
```

约定：

- 请求入参 schema 用于表单提交和 API 调用前校验。
- 响应 schema 用于 mock 数据和 HTTP 响应解析。
- TypeScript 类型从 Zod 推导，避免类型和运行时校验分裂。

## Mock 数据策略

mock 不只是静态 JSON，应能推进流程。

mock-db 初始包含：

- 一个默认患者。
- 一个默认问诊 session。
- 若干聊天消息。
- 当前流程状态。
- 检验项目、支付单、诊断卡、处置卡 fixtures。

mock handler 行为：

- `sendMessage` 追加用户消息和 AI 消息。
- `submitLabDecision` 根据同意/拒绝/暂不决定推进流程。
- `submitPayment` 生成支付成功结果和检验结果。
- `exitVisit` 标记 session 为退出结算。
- `streamAssistantMessage` 按 token/chunk 逐段回调，模拟 SSE。

## 流式聊天设计

流式接口不直接放进 TanStack Query。原因是 SSE 是过程型数据，不是普通可缓存响应。

建议封装：

```ts
workbenchApi.streamAssistantMessage(
  input,
  {
    signal,
    onOpen,
    onDelta,
    onCard,
    onDone,
    onError,
  },
)
```

事件约定：

- `delta`：AI 文本增量。
- `card`：服务端按前端 contract 要求新增或更新流程卡。
- `done`：本轮生成结束。
- `error`：流式错误。

mock transport 也实现同样回调，组件和状态机不关心来源。

## 错误模型

统一错误类型：

```ts
export interface ApiError {
  code: string
  message: string
  status?: number
  details?: unknown
  retriable?: boolean
}
```

错误来源：

- HTTP 非 2xx。
- Zod 响应解析失败。
- mock handler 主动抛错。
- SSE 中断或后端错误事件。

UI 不直接展示底层错误原文，由 feature 层转换为患者可理解的提示。

## 与 XState 的关系

XState 负责流程状态，不负责缓存。

状态机可以调用：

- `workbenchApi.submitLabDecision`
- `workbenchApi.submitPayment`
- `workbenchApi.streamAssistantMessage`
- `workbenchApi.exitVisit`

状态机接收结果后发送事件：

- `LAB_ACCEPTED` / `LAB_SKIPPED` / `LAB_VETOED`
- `LAB_PAYMENT_SUCCEEDED` / `MEDICATION_PAID`
- `DIAGNOSIS_READY`
- `TREATMENT_DECIDED`
- `EMERGENCY_DETECTED` / `EMERGENCY_CONFIRMED` / `EMERGENCY_DISMISSED`
- `TRANSFER_REQUIRED`
- `EXIT_CONFIRMED`

事件命名以 `detailed-design.md` §7.3 的 `VisitMachineEvent` 为准，本节只示意调用关系。这样流程跳转可追踪，API 来源可替换。

## 与 medAgent 后端的映射与边界

medAgent（`references/medAgent`）是后端嵌入的 AI 决策引擎，只产出结构化决策（`Step`），不执行副作用。本前端 contract 不直接调用 medAgent，而是面向**后端业务层**；后端业务层把前端动作翻译成 medAgent 调用，并把 `Step` 翻译回前端的 SSE 事件 / 流程卡。映射关系如下：

| 前端 endpoint / 动作 | medAgent 对应 | 说明 |
| --- | --- | --- |
| `POST /visits`（createSession / createFollowUp） | `POST /sessions`（`initial` + `prior`） | 初诊/复诊判定由后端决定；复诊把历史 `SessionRecord` 放入 `prior` |
| `POST /visits/:id/messages` + assistant-stream | `POST /sessions/{id}/patient-say` → `Step` | 后端把 `Step.kind` 翻成 SSE 事件（见下表） |
| `POST /visits/:id/lab-decision`（accepted） | （无直接对应） | medAgent 只在 `NEED_TESTS` 下发检验；"是否检验/暂不决定/不查"是**前端 + 后端业务层**的卡片交互，medAgent 不感知"暂不决定" |
| `POST /visits/:id/payments`（检验费） | 缴费成功后后端 → `POST /sessions/{id}/test-results` | 支付是后端职责，回填检验结果才驱动 medAgent 续跑 |
| `POST /visits/:id/payments`（药品费）+ fulfillment | 后端 → `POST /sessions/{id}/purchase-result` | `DRUG_QUERY` 查规格对用户透明，`PURCHASE` 才是用户确认点 |
| `GET /visits/:id/diagnosis` / 诊断卡 | `Step.Result.diagnosis`（`DONE` 时） | 诊断随 `DONE` 的 `Result` 返回 |
| `POST /visits/:id/follow-up-intent` | 前端 / 后端业务层 | 完成态咨询/复诊意图分类，medAgent 无此能力，由独立 LLM 分类 |
| `POST /visits/:id/exit` | `DELETE /sessions/{id}`（+ 后端结算） | 退出结算、退款由后端业务层处理，medAgent 仅销毁会话 |

`Step.kind` → 前端 SSE / 卡片：

| medAgent `Step.kind` | 前端表现 |
| --- | --- |
| `ASK` | `delta` / `message_final` 流式医生追问 |
| `NEED_TESTS`（恒血常规） | `card(lab_decision)` → 同意后 `card(payment)` |
| `DRUG_QUERY` | 对用户透明，不产生卡片（后端内部查规格） |
| `PURCHASE` | `card(medication_fulfillment)` 购药确认（药名 + 盒数） |
| `EMERGENCY` | `emergency` 事件 → `EmergencyOverlay` |
| `DONE` | `card(diagnosis)` + `card(advice_only)` / 药品卡，`state(completed)` |

关键边界（已知差异，须在 contract 与 mock 中体现）：

- **无院内治疗执行（暂）**：medAgent 处置只有 `MEDICATION` / `ADVICE_ONLY` / `REFERRAL`，需院内操作/手术直接 `REFERRAL`。需求与 UI 文档保留"自动化治疗"分支，本期由前端 / mock 演示，待后端补充治疗执行能力后接入；在仅有三选一的 HTTP 后端下，治疗类情形按 `REFERRAL` 映射为终止卡 `reason: referral` 或 `capability_insufficient`。
- **无总计时**：medAgent 无总超时强制转诊。前端总超时是纯前端 / mock 机制，HTTP 模式由前端发起 `exitVisit` 或后端转诊收口。
- **急症会话即关闭**：medAgent 命中急症后会话关闭，前端"误报申诉恢复"（`emergencyPending`）只在前端 / mock 成立；HTTP 模式若需可恢复语义，须后端 contract 显式支持（如不关闭会话或重开续诊）。
- **检验固定血常规**：当前 `NEED_TESTS` 恒为血常规，检验卡可据此简化，但 schema 仍保留 `test_items` 数组以备扩展。
- **"暂不决定 / 不查"是前端语义**：medAgent 不感知这两个动作，由前端 + 后端业务层在调用 medAgent 之前消化（暂不决定＝不调用 patient-say 推进；不查＝跳过检验直接续问/确诊）。

## 与 MSW 的关系

短期优先实现 `mock transport`，因为 contract 由前端先行定义，前端可以直接围绕统一 facade 推进业务界面和状态机。

MSW 后续用于更接近真实网络的测试，并验证 REST/SSE contract：

- 组件集成测试。
- E2E 测试。
- 验证 ky/http transport 的错误处理。
- 验证结项 REST API 文档中的 endpoint、状态码和错误模型。

长期推荐：

- 开发阶段：`VITE_API_MODE=mock` 使用 mock transport。
- 接口联调：`VITE_API_MODE=http` 使用真实服务端，并按前端 contract 做契约测试。
- 测试阶段：unit 使用 mock transport，integration 使用 MSW。

## 实施计划

### 第一阶段：前端 API contract 与请求层骨架

- 定义首版 REST/SSE contract：endpoint、method、schema、错误模型、SSE 事件。
- 创建 `src/lib/api/*`。
- 实现 `ApiTransport`、`getTransport()`、`ApiError`。
- 实现 ky http transport。
- 实现 mock transport 的基础路由、延迟和错误注入。
- 增加 `.env.example`。

### 第二阶段：会话与问诊 API

- 定义 patient/visits/workbench 的 types 和 schemas。
- 实现 `patientApi`、`visitsApi`、`workbenchApi` facade。
- 实现 mock fixtures 和 mock-db。
- 实现 `streamAssistantMessage` 的 mock 流式输出。
- 让 mock handler 严格复用 REST/SSE contract schema，不新增 mock-only 字段。

### 第三阶段：Query 封装

- 创建 QueryClient。
- 定义 queryOptions/mutationOptions。
- 补充首批 hook：`useWorkbenchSession`、`useFlowCardAction`、`useVisitHistory`。

### 第四阶段：测试

- 为 mock transport 写单元测试。
- 为 API facade 写契约测试：同一测试可跑 mock/http mock server。
- 为错误转换和 Zod 解析失败写测试。

### 第五阶段：结项 REST API 文档

- 从已实现的 schema、mock handler、MSW handler 和契约测试整理 REST API 文档。
- 输出 `agent-workspace/special-designs/rest-api.md`。
- 文档需能支持后端按 endpoint 独立实现，并支持 QA 按典型流程验收。

## 验收标准

- UI 组件不直接导入 `ky`、`fetch`、mock fixtures。
- 切换 `VITE_API_MODE` 不需要改业务组件。
- mock 模式可以完整跑通一次问诊主流程。
- HTTP 模式必须按前端 contract 发起请求；若服务端字段不同，只在 adapter/transport 层显式映射。
- 所有 mock 响应都通过同一套 Zod schema 校验。
- 结项时存在完整 REST API 文档，并能追溯到前端实现的 schema 和契约测试。
- `pnpm test`、`pnpm lint`、`pnpm build` 通过。

## 风险与注意事项

- 后端接入时如果不能直接采用前端 contract，必须增加 adapter 层并同步更新契约测试，避免 UI 层散落字段兼容逻辑。
- mock-db 必须保持简单，避免演变成另一个复杂后端。
- 医疗流程状态不能只靠 mock handler 隐式推进，关键状态仍应进入 XState。
- 流式响应要始终支持 AbortController，避免退出或急症打断后仍继续写入消息。
