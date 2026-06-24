# 统一 API 请求层设计

更新时间：2026-06-24

## 背景

后端当前尚未开始开发，但前端需要尽快推进 Agent 聊天界面、流程卡片、支付/检验/确诊等交互。为了避免页面组件直接依赖临时 mock 数据，项目需要先建立统一请求层：

- 对页面、hooks、状态机暴露稳定的业务 API。
- 底层可切换真实服务器请求或本地 mock 数据。
- 后端接口就绪后，尽量只替换 transport 或 endpoint 映射，不重写 UI。
- 与 TanStack Query、XState、SSE 流式聊天保持清晰边界。

## 目标

1. 业务代码只调用统一 API，不直接调用 `fetch`、`ky` 或 mock 函数。
2. 同一份 API 类型同时服务真实请求和 mock 请求。
3. 支持按环境切换：`mock`、`http`，未来可扩展 `msw`。
4. 普通查询、mutation、流式聊天分别封装，但对外保持统一入口。
5. mock 数据能模拟异步延迟、错误、流程状态变化，支撑前端独立开发。

## 非目标

- 不在本阶段定义最终后端接口协议。
- 不在本阶段实现完整医疗业务规则。
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
        chat.ts
        visit.ts
        patient.ts
      mock-transport.ts      # 实现 Transport
      mock-db.ts             # 内存数据与状态推进
  features/
    chat/
      api/
        index.ts             # chatApi facade
        queries.ts           # queryOptions / mutationOptions
        schemas.ts           # Zod schema
        types.ts
        stream.ts            # SSE 流式封装
    visit-flow/
      api/
        index.ts
        queries.ts
        schemas.ts
        types.ts
```

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

业务对外只暴露按领域组织的 API：

```ts
export const api = {
  chat: chatApi,
  visit: visitApi,
  patient: patientApi,
}
```

示例方法：

```ts
chatApi.createSession(input)
chatApi.getSession(sessionId)
chatApi.listMessages(sessionId)
chatApi.sendMessage(input)
chatApi.streamAssistantMessage(input, handlers)

visitApi.getCurrentCard(sessionId)
visitApi.submitLabDecision(input)
visitApi.submitPayment(input)
visitApi.getDiagnosis(sessionId)
visitApi.submitTreatmentAction(input)
visitApi.exitVisit(input)
```

命名规则：

- 读数据：`get*`、`list*`
- 创建：`create*`
- 用户动作：`submit*`
- 流式：`stream*`
- 不使用 `fetch*` 暴露给业务层，因为底层不一定是真实 fetch。

## TanStack Query 接入

所有服务端状态通过 queryOptions/mutationOptions 统一封装。

```ts
export const chatQueries = {
  session: (sessionId: SessionId) =>
    queryOptions({
      queryKey: ['chat', 'session', sessionId],
      queryFn: () => chatApi.getSession(sessionId),
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
chatApi.streamAssistantMessage(
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
- `card`：后端要求展示流程卡。
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

- `visitApi.submitLabDecision`
- `visitApi.submitPayment`
- `chatApi.streamAssistantMessage`
- `visitApi.exitVisit`

状态机接收结果后发送事件：

- `LAB_DECISION_ACCEPTED`
- `PAYMENT_COMPLETED`
- `DIAGNOSIS_READY`
- `EMERGENCY_DETECTED`
- `TRANSFER_REQUIRED`
- `EXIT_CONFIRMED`

这样流程跳转可追踪，API 来源可替换。

## 与 MSW 的关系

短期优先实现 `mock transport`，因为后端协议未定，前端可以直接走统一 facade。

MSW 后续用于更接近真实网络的测试：

- 组件集成测试。
- E2E 测试。
- 验证 ky/http transport 的错误处理。

长期推荐：

- 开发阶段：`VITE_API_MODE=mock` 使用 mock transport。
- 接口联调：`VITE_API_MODE=http` 使用真实后端。
- 测试阶段：unit 使用 mock transport，integration 使用 MSW。

## 实施计划

### 第一阶段：请求层骨架

- 创建 `src/lib/api/*`。
- 实现 `ApiTransport`、`getTransport()`、`ApiError`。
- 实现 ky http transport。
- 实现 mock transport 的基础路由、延迟和错误注入。
- 增加 `.env.example`。

### 第二阶段：聊天和问诊 API

- 定义 chat/visit 的 types 和 schemas。
- 实现 `chatApi`、`visitApi` facade。
- 实现 mock fixtures 和 mock-db。
- 实现 `streamAssistantMessage` 的 mock 流式输出。

### 第三阶段：Query 封装

- 创建 QueryClient。
- 定义 queryOptions/mutationOptions。
- 补充首批 hook：`useChatSession`、`useVisitCard`、`useSubmitLabDecision`。

### 第四阶段：测试

- 为 mock transport 写单元测试。
- 为 API facade 写契约测试：同一测试可跑 mock/http mock server。
- 为错误转换和 Zod 解析失败写测试。

## 验收标准

- UI 组件不直接导入 `ky`、`fetch`、mock fixtures。
- 切换 `VITE_API_MODE` 不需要改业务组件。
- mock 模式可以完整跑通一次问诊主流程。
- HTTP 模式只需要补齐 endpoint 和后端字段映射。
- `pnpm test`、`pnpm lint`、`pnpm build` 通过。

## 风险与注意事项

- 后端字段最终确认后，可能需要增加 adapter 层做字段映射。
- mock-db 必须保持简单，避免演变成另一个复杂后端。
- 医疗流程状态不能只靠 mock handler 隐式推进，关键状态仍应进入 XState。
- 流式响应要始终支持 AbortController，避免退出或急症打断后仍继续写入消息。
