# 前端技术选型文档

更新时间：2026-06-26

## 项目背景

NEUHIS Agent 前端是一个面向患者端 AI 诊疗流程的人机协作界面。当前业务不是普通内容站，而是“聊天 + 阻塞决策卡 + 检验/缴费/确诊/处置流程 + 急症打断 + 超时升级 + 主动退出”的流程型应用。

因此技术选型按职责分层，避免用一个全局状态库承载所有问题。

## 已确定技术栈

| 领域 | 选型 | 版本 | 用途 |
| --- | --- | --- | --- |
| 构建工具 | Vite | 8.1.0 | React 前端构建、开发服务器、生产打包 |
| 语言 | TypeScript | 6.0.2 | 业务类型、接口类型、流程状态类型 |
| UI 框架 | React | 19.2.7 | 组件化渲染 |
| 路由 | React Router | 8.0.1 | 页面路由、未来可扩展 loader/action/fetcher |
| 样式 | Tailwind CSS | 4.3.1 | 原子样式、设计变量、响应式布局 |
| 基础组件 | HeroUI 3 | 3.2.1 | 表单、弹窗、按钮、列表等可访问性组件 |
| 组件补充 | shadcn + Magic UI | shadcn 4.11.0 | 按需复制组件，补充聊天动效与局部视觉组件 |
| 图标 | lucide-react | 1.21.0 | 操作按钮、状态提示、导航图标 |
| 虚拟滚动 | React Virtuoso | 4.18.9 | 聊天时间线长列表、动态高度消息与流程卡片混排 |

## 新增依赖决策

### 服务端状态：TanStack Query

包：`@tanstack/react-query`、`@tanstack/react-query-devtools`

用于后端数据的获取、缓存、失效、后台刷新和 mutation，例如：

- 患者会话详情
- 检验项目列表、检验结果
- 支付状态轮询
- 诊断结果和处置建议查询
- 历史会话列表

约定：

- 凡是“后端拥有真实来源”的数据，优先放 TanStack Query。
- 不把服务端数据复制进 Zustand。
- mutation 成功后通过 `invalidateQueries` 或 `setQueryData` 更新缓存。
- 开发环境允许启用 React Query Devtools，生产环境不默认展示。

### 客户端状态：Zustand

包：`zustand`

用于纯前端状态，例如：

- 当前侧栏展开/折叠
- 当前选中的本地会话草稿
- 输入框临时内容
- 本地 UI 偏好
- 非后端来源的轻量临时状态

约定：

- Store 按业务域拆分，不建一个巨型 `appStore`。
- 不把 API 响应长期镜像进 Zustand。
- 涉及复杂流程跳转时，不在 Zustand 里手写大量 if/else，交给 XState。

### 问诊流程编排：XState

包：`xstate`、`@xstate/react`

用于“患者问诊主流程”的有限状态机/状态图建模。当前交互流程存在明确状态和全局中断，不适合散落在 React 组件里。

建议建模的核心状态：

- `chatting`：AI 问诊自由对话
- `labDecision`：是否检验卡
- `labPayment`：检验缴费卡
- `diagnosis`：确诊卡
- `treatmentDecision`：AI 处置决策
- `treatmentExecution`：处置执行卡
- `completed`：就诊完成但输入框仍可用
- `emergencyTerminated`：急症打断终止
- `transferred`：转大医院/升级终止
- `exitSettlement`：主动退出结算

约定：

- XState 只负责编排流程状态和事件，不直接替代 TanStack Query。
- 服务端请求仍由 API 层/TanStack Query 执行，状态机处理结果事件。
- 急症打断、超时升级、主动退出属于全局事件，必须在状态机层可追踪。

### 网络请求：ky

包：`ky`

用于普通 HTTP JSON 请求。选择 ky 而不是 axios 的原因：

- 基于标准 Fetch，适合现代浏览器和 Vite 项目。
- API 比原生 `fetch` 简洁。
- 默认把非 2xx 响应作为错误处理，便于统一错误分支。
- 支持 `prefixUrl`、timeout、retry、hooks，足够覆盖本项目 API 客户端需求。

约定：

- 在 `src/lib/api-client.ts` 统一创建 ky 实例。
- 在 hook 或 service 函数中调用 API，不在 UI 组件里直接拼 URL。
- 后端错误响应进入统一解析逻辑，转换为面向 UI 的错误对象。

### 流式响应：fetch-event-source

包：`@microsoft/fetch-event-source`

用于 AI 聊天的 Server-Sent Events 流式输出。它比浏览器原生 `EventSource` 更适合聊天接口，因为可使用 POST、请求体、自定义 headers、AbortController 和自定义重试策略。

约定：

- AI 消息流式输出单独封装在 `src/features/chat/api/stream.ts`。
- 用户取消、主动退出、急症打断时必须能 abort 当前流。
- 流式消息的增量内容进入聊天消息 reducer/store，不直接写 DOM。

### 聊天时间线虚拟滚动：React Virtuoso

包：`react-virtuoso`

用于工作台聊天时间线的虚拟化渲染。当前时间线不是普通定高列表，而是“患者消息 + AI 流式消息 + 流程卡片 + 阻塞卡 + 终止卡”的混排列表，单项高度不固定，并且需要支持底部跟随、向上加载历史和流式内容持续增高。

选择 React Virtuoso 的原因：

- MIT 许可，适合作为默认工程依赖；不引入商业授权风险。
- 支持动态高度条目，适合消息气泡、诊断卡、缴费卡等高度差异很大的内容。
- 支持 `followOutput` / `alignToBottom` 等聊天常见滚动行为，短会话可贴底，新消息可在用户处于底部时自动跟随。
- 支持通过 `startReached`、`firstItemIndex` 等能力实现向上加载更早历史，并尽量保持当前阅读位置。
- 组件无内置视觉风格，`itemContent` 内仍由 HeroUI、Magic UI、Tailwind 和业务组件负责渲染。

不选择的方案：

| 方案 | 结论 | 原因 |
| --- | --- | --- |
| `@virtuoso.dev/message-list` | 暂不选 | 专门面向聊天，但为商业许可；除非后续确认采购授权，否则不作为默认依赖 |
| `@tanstack/react-virtual` | 备选 | Headless、灵活、MIT，但聊天的底部跟随、历史 prepend、流式增高策略需要自行封装，当前阶段用 React Virtuoso 更省工程风险 |
| `react-window` | 暂不选 | 适合简单长列表；动态高度、流式消息和反向加载历史的业务封装成本较高 |

时间线数据建模约定：

- 聊天时间线统一渲染 `TimelineItem[]`，不要把消息列表和流程卡片分成两个滚动区域。
- `TimelineItem` 至少包含 `id`、`kind`、`createdAt`、`status`，其中 `kind` 可为 `message`、`flowCard`、`systemEvent`、`terminalCard`。
- `id` 必须稳定；乐观消息用本地 `localId`，服务端确认后保留渲染 key，不因服务端 ID 回填导致整行重挂载。
- 阻塞卡处理后仍保留在同一个 `TimelineItem` 位置，只更新 `status` 与处理结果，不从数组中删除。

滚动行为约定：

- 初次进入会话：默认定位到最后一条，短会话贴底显示。
- 新增患者消息 / AI 消息：如果用户当前在底部附近，自动跟随到底部；如果用户正在向上回看，不强制跳到底部，显示“回到底部”浮动按钮。
- AI 流式输出：只更新当前流式 AI 消息项；增量文本进入 reducer 后再驱动列表更新，必要时按 animation frame 合并 chunk，避免每个 token 都触发完整时间线重渲染。
- 向上加载历史：滚动到顶部附近触发历史分页请求，prepend 更早 `TimelineItem`，保持用户当前可见内容位置稳定。
- 阻塞卡生成：作为时间线新项追加；若用户在底部附近则滚动到卡片处，否则保留当前位置并提示有新决策。
- 全局急症 / 超时 overlay 不放进虚拟列表；确认后再追加终止类 `TimelineItem` 留痕。

性能实现约定：

- `ChatTimeline` 只接收已排序、扁平化的 `TimelineItem[]`，排序和服务端数据合并放在 hook / selector 层。
- `itemContent` 根据 `kind` 分发到 memoized 行组件，避免单条流式消息更新导致所有已渲染卡片重算。
- 大型卡片内部避免读取整份会话对象；只传入该卡片必要字段和动作回调。
- overscan 保持中等，优先保证滚动稳定，不为了“预渲染更多卡片”牺牲移动端性能。
- 测试需覆盖：初始定位到底部、用户上滑时新消息不打断阅读、点击回到底部、prepend 历史后视口不跳、流式消息高度变化时底部跟随。

### 表单与校验：React Hook Form + Zod

包：`react-hook-form`、`@hookform/resolvers`、`zod`

用于登录、患者信息、确认卡、支付确认、取药方式、反馈等表单。

约定：

- 表单状态由 React Hook Form 管理。
- 表单 schema 与 API 入参 schema 优先用 Zod 定义。
- API 响应也可用 Zod 做边界校验，尤其是诊断卡、处置卡等关键业务对象。

### Magic UI 动效基础：motion

包：`motion`

Magic UI 是 shadcn 风格的按需组件库，不作为一个长期运行时包安装，而是通过 shadcn CLI 按组件复制到 `src/components/ui`。Magic UI 的 `typing-animation`、`text-animate` 等组件依赖 `motion`，所以提前安装。

首批建议组件：

- `typing-animation`：AI 正在生成、导诊开场、短文本逐字浮现。
- `text-animate`：诊断依据、处置建议等文本入场动画。
- `animated-shiny-text`：轻量提示状态，不需要 `motion`。

安装方式示例：

```bash
pnpm dlx shadcn@latest add "https://magicui.design/r/typing-animation.json"
pnpm dlx shadcn@latest add "https://magicui.design/r/text-animate.json"
pnpm dlx shadcn@latest add "https://magicui.design/r/animated-shiny-text.json"
```

约定：

- Magic UI 只用于提升聊天界面的状态反馈和文本呈现，不用于大面积装饰。
- 引入组件前先查看 registry 源码和依赖，确认不会破坏 HeroUI/Tailwind 4 体系。
- 复制进项目后的组件视为本项目代码，后续可以按医疗场景调整样式。

### 测试与接口 Mock：Vitest + Testing Library + MSW

包：`vitest`、`@testing-library/react`、`@testing-library/jest-dom`、`@testing-library/user-event`、`jsdom`、`msw`

用途：

- Vitest：单元测试和组件测试运行器。
- Testing Library：按用户行为测试 React 组件。
- user-event：模拟输入、点击、键盘操作。
- jsdom：为组件测试提供 DOM 环境。
- MSW：在网络层 mock REST/SSE 相关接口，避免测试时 mock `fetch` 或 ky 本身。

已完成基础配置：

- `npm scripts` 增加 `test` 和 `test:watch`。
- 新增 `vitest.config.ts`，默认使用 `jsdom`。
- 新增 `src/test/setup.ts`，接入 jest-dom matchers。
- 测试范围限制为 `src/**/*.test.{ts,tsx}` 和 `src/**/*.spec.{ts,tsx}`，避免扫描 `references/` 第三方源码。

## 推荐目录分层

后续实现业务时建议采用以下结构：

```text
src/
  app/
    providers.tsx
    router.tsx
  lib/
    api-client.ts
    query-client.ts
    errors.ts
  features/
    chat/
      api/
      components/
      machine/
      store/
      types.ts
    visit-flow/
      machine/
      types.ts
    patient/
      api/
      schemas.ts
  components/
    ui/
```

## 已安装依赖清单

运行时依赖：

- `@tanstack/react-query`
- `@tanstack/react-query-devtools`
- `zustand`
- `xstate`
- `@xstate/react`
- `ky`
- `zod`
- `react-hook-form`
- `@hookform/resolvers`
- `@microsoft/fetch-event-source`
- `motion`
- `react-virtuoso`

开发依赖：

- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `jsdom`
- `msw`

## references 源码留档

根据项目规范，新增库源码已浅克隆到 `references/`，同仓库多包只保留一份：

- `references/tanstack-query`
- `references/zustand`
- `references/xstate`
- `references/ky`
- `references/zod`
- `references/react-hook-form`
- `references/hookform-resolvers`
- `references/fetch-event-source`
- `references/motion`
- `references/react-virtuoso`
- `references/vitest`
- `references/react-testing-library`
- `references/jest-dom`
- `references/user-event`
- `references/jsdom`
- `references/msw`

## 本次完成

- 增加聊天时间线虚拟滚动技术选型：选择 `react-virtuoso`，记录选择原因、备选方案、时间线数据建模、滚动行为和性能实现约定。
- 安装 `react-virtuoso` 并更新 `pnpm-lock.yaml`。
- 按项目规范浅克隆 `react-virtuoso` 源码到 `references/react-virtuoso`。
- 完成状态管理、服务端状态、流程状态机、网络请求、流式响应、表单校验、Magic UI 动效基础、测试与 Mock 的技术选型。
- 一次性安装上述依赖，并更新 `pnpm-lock.yaml`。
- 为测试环境增加基础脚本和配置。
- 限制 ESLint/Vitest 不扫描 `references/` 第三方源码。
- 按项目规范浅克隆新增库源码到 `references/`。
- 记录 Magic UI 的按需引入方式和首批推荐组件。

## 本次未完成

- 尚未创建 `QueryClientProvider`、API client、Zustand store、XState machine 等业务骨架代码。
- 尚未实现 `ChatTimeline` 虚拟列表组件；当前仅完成依赖与技术设计。
- 尚未实际添加 Magic UI 组件文件到 `src/components/ui`，因为具体聊天界面尚未开始实现，后续按页面需要引入。
- 尚未配置 MSW handlers，需等后端接口草案或本地 mock API 结构确定后再建。
- 尚未实现 AI 聊天流式接口封装，需等待后端 SSE 协议字段确认。
