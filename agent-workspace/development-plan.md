# 详细开发计划

更新时间：2026-06-28

产品名：**东软云脑智能医疗**

## 1. 计划目标

本计划基于现有开发文档制定，面向后续编码 Agent 执行。目标是把当前 Vite 示例页演进为可运行的患者端 AI 诊疗 mock 闭环，覆盖首页、历史、工作台、问诊流式回复、阻塞卡、检验、确诊、处置、完成、全局急症 / 超时 / 退出和关键测试。

本版计划采用**数据先行**：除最小应用运行壳外，所有页面、状态机、流程卡和交互联动都必须先消费稳定的 REST/SSE contract、Zod schema、mock fixtures 和 mock-db 状态推进。后续 UI 不允许先写临时本地对象再回填 API 字段，避免组件、mock 和真实 HTTP 接入三套模型分裂。

当前代码状态：

- `src/App.tsx` 仍是 Vite 示例页。
- 已安装 React、HeroUI 3、React Router 8、TanStack Query、Zustand、XState、ky、Zod、React Hook Form、fetch-event-source、React Virtuoso、Vitest、Testing Library、MSW 等依赖。
- 文档已定义 `patient / visits / workbench` 三个 feature 域、API facade、REST/SSE contract、XState 状态机、时间线模型和组件规范。

本计划的编号规则：

- `P0` 为实施前准备。
- `P1` 为最小运行壳，只建立 Router、Provider、全局样式和共享 shell，不开发业务数据结构。
- `P2.x` 为数据先行地基，按 `special-designs/api.md` 固化 contract、schema、fixtures、mock-db、API facade 和状态事件目录。
- `P3.x` 为消费 P2 数据模型的页面与工作台静态骨架。
- `P4.x` 为主链路联动。
- `P5.x` 为全局机制和异常态。
- `P6.x` 为测试、文档和交付收口。

数据先行执行约束：

- `P1` 只允许提供业务 UI 的承载环境；不得在页面中定义临时 `VisitSession`、`TimelineItem`、`FlowCard`、支付单或诊断对象。
- `P2.0` 到 `P2.4` 完成前，只能开发不依赖业务数据的基础 shell；首页、历史、工作台、流程卡必须等 schema 与 fixture 样例稳定后启动。
- 所有 mock 响应、HTTP 响应解析、测试工厂和页面 props 必须复用同一套 Zod schema 推导类型。
- `mock-db` 的流程推进必须以 API contract 和状态事件目录为输入；XState 只能保存流程上下文和阻塞点，不复制整份服务端数据。
- 新增 endpoint、`FlowCardKind`、`TimelineItem.type`、SSE 事件或状态枚举时，必须同步更新 schema、fixtures、mock handler、契约测试和 `special-designs/api.md`。

## 2. 并行调度原则

可调度多个 subagent 并行执行，但必须遵守以下边界：

- 不同 subagent 不应同时修改同一文件，尤其是 `src/features/workbench/api/schemas.ts`、`visit-machine.ts`、`useWorkbenchSession.ts`、`ChatTimeline.tsx`、`globals.css`。
- `types.ts`、`schemas.ts`、`api/index.ts` 这类契约文件优先由一个 subagent 负责，其他 subagent 只消费导出的类型。
- 叶子组件可并行开发，但 `FlowCardRenderer` 的总分发点应由一个 subagent 统一维护。
- mock-db 的状态推进和 XState 状态转移必须成对校验，不能各自隐式增加状态。
- 每个阶段完成后运行对应验证，至少运行 `pnpm lint`、`pnpm test`、`pnpm build` 中与改动范围匹配的命令。
- 每次实现后必须更新 `agent-workspace/map.md`，涉及 API、状态机、UI 约定变化时同步更新对应专题文档。

## 3. 总依赖图

```text
P0
  -> P1
    -> P2.0
      -> P2.1, P2.2
        -> P2.3
          -> P2.4
            -> P2.5
              -> P3.1, P3.2, P3.3, P3.4
                -> P4.1, P4.2, P4.3, P4.4
                  -> P5.1, P5.2, P5.3, P5.4
                    -> P6.1, P6.2, P6.3, P6.4
```

可并行启动窗口：

- `P2.1` 和 `P2.2` 可在 `P2.0` 完成后并行；`P2.3` 必须等首批 schema 可用后启动，避免 fixture 先行变成第二套模型。
- `P2.4` 必须等 transport、schema、首批 mock handler 都可编译后启动；query options 不为临时假数据建 key。
- `P2.5` 必须等 `FlowCard`、`TimelineItem`、`AssistantStreamEvent`、流程状态枚举和 mock 流程样例稳定后启动。
- `P3.1`、`P3.2`、`P3.3` 可在各自 API / 类型 / fixture 依赖就绪后并行。
- 多个流程卡叶子组件可在 `FlowCard` 类型稳定后并行。
- 测试可从 `P2` 起旁路推进，不必等 UI 全部完成。

## 4. 分阶段任务

### P0. 实施前准备

#### P0.1 文档与代码现状复核

依赖：无。

负责人：主 agent。

任务：

- 复核 `agent-workspace/map.md`、`requirements-analysis.md`、`ui-designs.md`、`detailed-design.md`、`component-code-conventions.md`、`special-designs/api.md`。
- 复核 `package.json`、`src` 当前结构、已安装依赖和测试配置。
- 确认当前主线目标是 mock 闭环，不接真实后端。

验收：

- 明确当前 `src/App.tsx` 和 `src/main.tsx` 需要替换为业务入口。
- 明确 `src/index.css` / `src/App.css` 中 Vite 示例样式后续需移除或停用。

完成产出：

- 已复核文档：`agent-workspace/map.md`、`requirements-analysis.md`、`ui-designs.md`、`detailed-design.md`、`component-code-conventions.md`、`special-designs/api.md`。
- 当前代码仍处于 Vite 示例状态：`src/App.tsx` 渲染默认示例页并引入 `src/App.css`；`src/main.tsx` 直接挂载 `App` 并引入 `src/index.css`，尚未接入 React Router。
- `src/globals.css` 已具备 Tailwind 4、HeroUI styles、shadcn、字体和设计变量入口，但当前未被 `src/main.tsx` 使用；后续 `P1.3` 应切换为统一引入 `globals.css`。
- 当前源码仅有 `src/components/ui/button.tsx`、`button-variants.ts`、`src/lib/utils.ts` 和 `src/test/setup.ts` 等基础文件；尚未创建 `app`、`pages`、`features`、`mocks`、`lib/api` 分层目录。
- `package.json` 已配置 `dev`、`build`、`lint`、`test`、`test:watch` 脚本；React、HeroUI 3、React Router 8、TanStack Query、Zustand、XState、ky、Zod、React Hook Form、fetch-event-source、React Virtuoso、Vitest、Testing Library、MSW 等依赖已安装。
- `vite.config.ts` 已配置 React 插件、Tailwind 4 Vite 插件和 `@ -> src` alias；`vitest.config.ts` 使用 jsdom、`src/test/setup.ts` 和 `passWithNoTests: true`；`eslint.config.js` 已忽略 `dist`、`references`。
- 当前主线目标确认：先完成患者端 AI 诊疗 mock 闭环，不接真实后端、真实身份核验、真实支付、真实检验设备、真实药房和配送系统。

#### P0.2 任务分派准备

依赖：`P0.1`。

负责人：主 agent。

任务：

- 确定 subagent 分组：`app-shell`、`api-contract`、`mock-flow`、`workbench-machine`、`ui-pages`、`flow-cards`、`quality`。
- 给每组限定文件所有权。
- 建立阶段合并顺序，避免并行改动冲突。

验收：

- 后续 subagent 可以按本计划单独领取编号任务。

完成产出：

P0.2 之后的任务领取以“编号任务 + 文件所有权 + 依赖状态”为准。一个 subagent 每次只领取一个编号任务或同一编号下的明确子任务；领取前必须确认依赖任务已完成或已产出可编译的最小 contract。

subagent 分组和文件所有权：

| 分组 | 主责范围 | 文件所有权 | 可消费但不应直接改动 |
| --- | --- | --- | --- |
| `app-shell` | 应用入口、路由、Provider、全局 shell、共享弱业务组件 | `src/main.tsx`、`src/app/*`、`src/lib/query-client.ts`、`src/features/shared/components/*` | `src/pages/*`、`src/features/*/api/*` |
| `api-contract` | API transport、错误模型、领域 schema、feature API facade、query options | `src/lib/api/*`、`src/features/patient/api/*`、`src/features/visits/api/*`、`src/features/workbench/api/*`、`.env.example` | `src/mocks/api/*`、页面和组件 |
| `mock-flow` | mock 数据库、fixtures、mock transport、SSE 模拟、mock 状态推进 | `src/mocks/api/*` | `src/features/*/api/schemas.ts`、`src/features/workbench/machine/*` |
| `workbench-machine` | 工作台状态机、工作台总 hook、流式 hook、倒计时 hook、全局状态转移 | `src/features/workbench/machine/*`、`src/features/workbench/hooks/useWorkbenchSession.ts`、`src/features/workbench/hooks/useAssistantStream.ts`、`src/features/workbench/hooks/useVisitCountdown.ts`、`src/features/workbench/hooks/useTimeline.ts`、`src/features/workbench/utils/timeline-merge.ts` | `src/features/workbench/api/*`、`src/mocks/api/*`、`src/features/workbench/components/*` |
| `ui-pages` | 路由页面、首页/历史/我的、工作台 shell、时间线、输入区、退出 Sheet | `src/pages/*`、`src/features/patient/components/*`、`src/features/visits/components/*`、`src/features/workbench/components/*`、`src/features/workbench/hooks/useChatComposer.ts`、`src/features/workbench/hooks/useExitSettlement.ts`、`src/features/workbench/store/*` | `src/features/workbench/flow-cards/*`、`src/features/*/api/*`、`src/features/workbench/machine/*` |
| `flow-cards` | 流程卡渲染分发、各类流程卡组件、卡片动作 UI | `src/features/workbench/flow-cards/*`、`src/features/workbench/hooks/useFlowCardAction.ts`、`src/features/workbench/utils/card-normalizers.ts` | `src/features/workbench/api/schemas.ts`、`src/mocks/api/*`、`src/features/workbench/machine/*` |
| `quality` | 测试、测试工厂、MSW 测试准备、验证记录、响应式复核 | `src/**/*.test.ts`、`src/**/*.test.tsx`、`src/**/*.spec.ts`、`src/**/*.spec.tsx`、`src/test/*`、`src/test/factories/*` | 业务源码只在补测试所需的可测试性小改时协同修改 |

共享冲突文件规则：

- `src/features/workbench/api/schemas.ts`、`types.ts`、`index.ts`、`queries.ts` 由 `api-contract` 单点维护；其他分组通过 issue/备注提出字段需求，不直接扩展 mock-only 字段。
- `src/features/workbench/machine/visit-machine.ts` 和相关 guards/actions/types 由 `workbench-machine` 单点维护；`mock-flow` 需要新增状态时必须先同步状态机事件和枚举。
- `src/features/workbench/components/ChatTimeline.tsx`、`InputDock.tsx`、`WorkbenchShell.tsx` 由 `ui-pages` 维护；`flow-cards` 只维护时间线中卡片自身的渲染。
- `src/features/workbench/flow-cards/FlowCardRenderer.tsx` 由 `flow-cards` 维护；新增 `FlowCardKind` 必须同时更新 schema、renderer、mock fixture 和至少一个测试。
- `src/globals.css`、`src/index.css`、`src/App.css` 的清理由 `app-shell` 在 `P1.3` 统一执行；其他分组不得临时恢复 Vite 示例样式。

阶段合并顺序：

1. `app-shell` 先合入 `P1.1`、`P1.2`、`P1.3`、`P1.4`，建立可运行路由、Provider、全局样式和共享 shell。
2. `api-contract` 先合入 `P2.0` 数据契约清单，明确 endpoint、请求/响应 schema 名、核心实体、流程状态、SSE 事件和 fixture 覆盖矩阵。
3. `api-contract` 合入 `P2.1` transport / 错误模型与 `P2.2` 领域 schema；`P2.2` 通过后才允许 `mock-flow` 写真实 fixtures。
4. `mock-flow` 合入 `P2.3` 的 mock-db、fixtures 和 stream simulator；所有 fixture 必须过 `P2.2` schema，不能使用 mock-only 字段。
5. `api-contract` 合入 `P2.4` facade/query options；query key、mutation 入参和响应解析都以 schema 为准。
6. `workbench-machine` 合入 `P2.5` 状态机骨架；状态机事件名、阻塞态和终止态稳定后，`ui-pages` 与 `flow-cards` 开始 `P3`。
7. `ui-pages` 合入 `P3.1`、`P3.2`、`P3.3`；`flow-cards` 合入 `P3.4`。若两者都需要改时间线总装点，由 `ui-pages` 先放置卡片插槽，`flow-cards` 后接入 renderer。
8. `workbench-machine` 或主 agent 合入 `P4.1` 工作台总 hook；之后 `P4.2` 流式、`P4.3` 检验支付、`P4.4` 处置完成复诊按 hook/action/mock/card 的边界分批合并。
9. `P5.1` 急症、`P5.2` 超时、`P5.3` 退出、`P5.4` 异常和只读回看可以并行开发，但最终由 `workbench-machine` 统一确认全局事件优先级：急症 > 超时 > 退出 > 阻塞卡 > 普通消息。
10. `quality` 从 `P2` 开始旁路补测试；每个业务批次合入后至少运行与范围匹配的 `pnpm lint`、`pnpm test`、`pnpm build`，失败原因必须写入本计划或 `agent-workspace/map.md` 的未完成事项。

任务领取模板：

```text
领取：P?.? <任务名>
分组：<subagent group>
依赖：<已完成任务或可用 contract>
计划改动文件：<文件列表>
不得改动：<冲突文件或其他分组所有权>
验证：<pnpm lint/test/build 或局部测试>
文档：<需要同步的 agent-workspace 文档>
```

### P1. 全局基础骨架

#### P1.1 替换应用入口和路由骨架

依赖：`P0`。

可并行：否。此任务会修改入口文件，应先完成。

任务：

- 将 `src/main.tsx` 改为 `RouterProvider` 挂载。
- 新增 `src/app/router.tsx`、`src/app/App.tsx`、`src/app/providers.tsx`、`src/app/error-boundary.tsx`。
- 建立路由：`/`、`/history`、`/profile`、`/workbench/new`、`/workbench/:sessionId`、`/history/:sessionId`。
- loader 只做参数解析和轻量预取，不推进业务状态。
- 保留 `src/App.tsx` 的兼容处理或删除示例入口，避免双入口混乱。

验收：

- 路由页面能显示占位骨架。
- `pnpm build` 至少通过 TypeScript 编译阶段。

#### P1.2 建立全局 Provider 和 QueryClient

依赖：`P1.1`。

可并行：可与 `P1.3` 并行，需避免同时改 `providers.tsx`。

任务：

- 新增 `src/lib/query-client.ts`。
- 在 `AppProviders` 接入 `QueryClientProvider`。
- 开发环境接入 `ReactQueryDevtools`。
- 不添加 `HeroUIProvider`，遵守 HeroUI 3 既有约定。

验收：

- 任意页面可正常使用 TanStack Query hook。
- 生产构建不默认展示 devtools。

#### P1.3 全局样式清理和布局基线

依赖：`P1.1`。

可并行：可与 `P1.2` 并行。

任务：

- 让 `main.tsx` 统一引入 `src/globals.css`。
- 移除或停止使用 Vite 示例 `src/index.css`、`src/App.css` 对 `#root`、body、按钮等的污染。
- 建立基础页面背景、字体、安全区和移动端单列布局约束。
- 保留 Tailwind 4、HeroUI styles、shadcn、字体导入。

验收：

- 页面不再出现 Vite 默认示例视觉。
- 移动端和 PC 根布局都不出现固定宽度污染。

#### P1.4 通用工具和共享 UI 基础

依赖：`P1.1`。

可并行：可与 `P1.2`、`P1.3` 并行。

任务：

- 补齐 `assertNever`、ID、时间格式化、患者可见错误转换等基础工具。
- 新增 `features/shared/components/PageShell.tsx`、`EmptyState.tsx`、`StatusPill.tsx`、`AppBottomTabs.tsx`。
- 确保 icon-only 按钮有 `aria-label`。

验收：

- 首页、历史、工作台可复用同一基础 shell。
- discriminated union 分发有可复用穷尽检查工具。

### P2. 契约、mock 和状态基础

#### P2.0 数据契约清单和样例矩阵

依赖：`P0`、`P1` 的最小运行壳。

可并行：否。它是数据先行的起点，必须由 `api-contract` 单点维护。

建议 subagent：`api-contract`。

任务：

- 以 `special-designs/api.md` 的首批 endpoint 表为准，整理 `patient / visits / workbench` 三域 endpoint 清单。
- 明确每个 endpoint 的 facade 方法、请求 schema 名、响应 schema 名、错误模型、分页方式和是否会写入时间线。
- 明确核心实体最小字段：`PatientContext`、`VisitSession`、`TimelineItem`、`FlowCard`、`AssistantStreamEvent`、`FlowActionResult`、`ExitSettlementResult`、`ApiError`、`PageResult`。
- 明确 `TimelineItem.kind`、`FlowCard.kind`、SSE `event.type`、`VisitStatus`、`VisitMachineState`、`TerminationReason`、`PaymentStatus` 等枚举的首版取值。
- 为每个高风险流程列一条数据样例路径：新出诊追问、检验同意、检验不查、暂不决定、支付失败、诊断完成、用药完成、仅医嘱完成、自动化治疗 mock、急症、超时、主动退出、完成后咨询、完成后复诊。
- 标注 medAgent 不支持但前端 contract 预留的边界：自动化治疗执行、总计时、急症误报恢复、暂不决定 / 不查前端语义。

验收：

- 后续 `P2.2` 可以直接按清单落 Zod schema，不需要再从 UI 反推字段。
- 后续 `P2.3` 可以直接按样例矩阵写 fixtures 和 mock-db 状态推进。
- UI 任务可以从清单判断某个字段来自 API、计算状态、还是纯展示派生值。
- `agent-workspace/special-designs/api.md` 与本计划没有 endpoint 命名、领域归属或 medAgent 边界冲突。

#### P2.1 API transport 与错误模型

依赖：`P1.2`、`P2.0`。

可并行：可与 `P2.2` 并行，但 `ApiError`、`RequestOptions`、分页基础类型需先导出。

建议 subagent：`api-contract`。

任务：

- 新增 `src/lib/api/config.ts`、`errors.ts`、`transport.ts`、`client.ts`、`types.ts`。
- 实现 `ApiTransport` 接口、`getTransport()` 和 `ApiMode`。
- 实现 ky HTTP transport 的骨架和统一错误转换。
- 增加 `.env.example`，包含 `VITE_API_MODE`、`VITE_API_BASE_URL`、`VITE_MOCK_DELAY_MS`。

验收：

- mock/http transport 可通过同一接口选择。
- HTTP 错误、Zod 解析错误和 stream 错误都能转为统一 `ApiError`。

#### P2.2 领域类型与 Zod schema

依赖：`P2.0`，以及 `P2.1` 中的基础类型。

可并行：可与 `P2.1` 并行，但 schema 文件由单一 subagent 维护；`P2.3` 不得在首批 schema 可解析前写业务 fixtures。

建议 subagent：`api-contract`。

任务：

- 新增 `features/patient/api/types.ts`、`schemas.ts`。
- 新增 `features/visits/api/types.ts`、`schemas.ts`。
- 新增 `features/workbench/api/types.ts`、`schemas.ts`。
- 覆盖 `VisitSession`、`TimelineItem`、`FlowCard`、`AssistantStreamEvent`、`FlowActionResult`、`ExitSettlementResult`。
- schema 采用 discriminated union，按 `kind` / `type` 分发。
- 覆盖 `special-designs/api.md` 首批 endpoint 的请求入参与响应 schema，不只覆盖 UI 当前要展示的字段。
- 每个 schema 文件导出 `parse*` / `safeParse*` 边界函数，供 HTTP transport、mock handler 和测试工厂复用。

验收：

- 类型从 schema 推导，不手写重复类型。
- mock fixtures 必须能通过响应 schema。
- 新增 `FlowCardKind` 时 TypeScript 能强制 renderer 和 schema 补齐。
- schema 变更能通过契约测试发现 mock、HTTP adapter、UI props 任一侧缺口。

#### P2.3 mock-db、fixtures 和 mock transport

依赖：`P2.1`、`P2.2`。

可并行：可拆成 fixtures 与 handler 两个子任务，但 `mock-db.ts` 由一个 subagent 维护。

建议 subagent：`mock-flow`。

任务：

- 新增 `src/mocks/api/mock-db.ts`、`mock-transport.ts`、`stream-simulator.ts`。
- 新增 patient、visits、timeline、flow-cards fixtures。
- fixtures 按 `P2.0` 样例矩阵组织，不按页面文件组织。
- 实现基础 handler：身份核验、患者上下文、会话列表、创建会话、创建复诊、读取时间线、发送消息、流式回复。
- 实现流程推进 handler：检验决策、检验结果回填、支付、取药 / 配送、治疗执行、医嘱确认、意图分类、锁定态疑问、完成态咨询、体征上报、退出。
- mock 延迟读取 `VITE_MOCK_DELAY_MS`。
- mock 响应统一过 schema。
- mock-db 只维护必要状态：患者、会话、时间线、当前阻塞卡、支付单、检验结果、终止原因；不复制 UI 派生字段。

验收：

- mock 模式可创建新 session，并返回初始 session 和 timeline。
- `streamAssistantMessage` 可模拟 `delta`、`message_final`、`card`、`state`、`done`。
- 首批样例矩阵都能由 mock-db 产出稳定 `TimelineItem.id`，可供 P3 UI 直接渲染。
- 所有 mock handler 成功响应和核心失败响应用 schema 校验。

#### P2.4 Query options 与 feature API facade

依赖：`P2.1`、`P2.2`、`P2.3`。

可并行：可在 `P2.3` 后半段并行，但 facade 不允许返回临时硬编码数据。

建议 subagent：`api-contract` 或 `ui-pages`。

任务：

- 实现 `patientApi`、`visitsApi`、`workbenchApi`。
- 实现 `patientQueries`、`visitsQueries`、`workbenchQueries`。
- query key 在 feature 内集中定义。
- mutation options 可先覆盖高频动作：创建会话、发送消息、提交检验决策、支付、退出。
- facade 每个方法都执行输入校验和响应解析，mock/http transport 差异只在 transport 或 adapter 层处理。
- SSE 方法不放入 Query 缓存，只暴露统一 stream handler；普通 REST 查询和 mutation 使用 queryOptions / mutationOptions。

验收：

- 页面和 hook 不直接调用 transport。
- 切换 `VITE_API_MODE` 不需要改业务组件。
- 同一套 facade 可跑在 mock transport；HTTP transport 字段不一致时只能在 adapter 层显式映射。

完成产出（2026-06-28）：

- `P2.0` 契约清单已同步到 `agent-workspace/special-designs/api.md` 的「当前实现进度」：包含三域 endpoint、核心对象、枚举取值和首批 mock 样例路径。
- `P2.1` 已实现：`.env.example`、`src/lib/api/{config,types,errors,transport,client,index}.ts`，支持 mock/http transport 选择，HTTP transport 使用 ky + fetch-event-source 骨架，Zod/HTTP/stream 错误统一转 `ApiError`。
- `P2.2` 已实现：`patient / visits / workbench` 三域 schema 与 types；`FlowCard`、`TimelineItem`、`AssistantStreamEvent` 为 discriminated union；核心 parse/safeParse 边界函数已导出。
- `P2.3` 已实现：`src/mocks/api/fixtures/*`、`handlers/*`、`mock-db.ts`、`mock-transport.ts`、`stream-simulator.ts`。mock-db 支持创建新问诊、复诊、读取历史、时间线、发送消息、SSE 检验卡、检验决策、支付、取药、仅医嘱、意图分类、急症复检、退出和计时暂停/恢复。
- `P2.4` 已实现：`patientApi`、`visitsApi`、`workbenchApi`，`patientQueries`、`visitsQueries`、`workbenchQueries`，以及首批 mutation options；新增聚合入口 `src/features/api.ts`。
- 已补契约测试：`src/features/workbench/api/workbench-api.test.ts` 覆盖 mock facade 创建会话、发送消息、流式下发检验卡、检验决策和支付推进。
- 验证：`pnpm test`、`pnpm lint`、`pnpm build` 均通过。
- 未完成：`P2.5` 状态机骨架尚未启动；完整自动化治疗演示、完成后咨询/复诊的 UI 串联和 MSW handler 留给后续阶段。

#### P2.5 XState 状态机骨架

依赖：`P2.0`、`P2.2`、`P2.3` 的流程样例。

可并行：可与 `P2.4` 后半段并行，但不能早于 `FlowCard`、`AssistantStreamEvent` 和流程状态枚举稳定。

建议 subagent：`workbench-machine`。

任务：

- 新增 `features/workbench/machine/visit-machine.ts`、`visit-machine.types.ts`、`visit-machine.guards.ts`、`visit-machine.actions.ts`。
- 建立状态：`loadingContext`、`chatting`、`analyzing`、`labDecision`、`labPayment`、`labExecution`、`diagnosis`、`treatmentDecision`、`medicationPayment`、`medicationFulfillment`、`treatmentExecution`、`adviceOnly`、`completed`、`emergencyPending`、`terminated`、`exitSettlement`、`exited`。
- 覆盖全局事件优先级：急症、退出、超时、阻塞卡动作、普通消息。
- 实现 `HYDRATE` 恢复逻辑，不触发业务副作用。
- 状态机 context 只保存当前 session id、阻塞卡 id、终止原因、计时状态和必要流程标记；大体量 session/timeline 仍由 Query cache 持有。
- 每个会改变流程状态的 mock handler 都必须有对应 machine event 或明确标注为纯数据更新。

验收：

- 状态机单元测试覆盖关键转移。
- 阻塞态下普通 `MESSAGE_SENT` 不推进主流程。
- 从 mock session 快照 hydration 后能恢复到正确阻塞态、完成态或终止态。

完成产出（2026-06-28）：

- 已新增 `src/features/workbench/machine/visit-machine.ts`、`visit-machine.types.ts`、`visit-machine.guards.ts`、`visit-machine.actions.ts`。
- 已建立计划要求的全部机器态：`loadingContext`、`chatting`、`analyzing`、`labDecision`、`labPayment`、`labExecution`、`diagnosis`、`treatmentDecision`、`medicationPayment`、`medicationFulfillment`、`treatmentExecution`、`adviceOnly`、`completed`、`emergencyPending`、`terminated`、`exitSettlement`、`exited`。
- `VisitMachineContext` 只保存流程运行所需的轻量上下文：`sessionId`、`currentCardId`、`terminalReason`、`askRound`、`labRound`、`blocking`、`timerPaused`、`streamRequestId`、急症覆盖态前态等；不复制 session/timeline/card 大对象。
- `HYDRATE` 已支持直接恢复到任一目标机器态，并同步 session 轮次、计时、阻塞卡和终止原因；该事件不触发 API 副作用。
- 已实现关键全局打断：`EMERGENCY_DETECTED` 进入 `emergencyPending` 并保存前态，急症态屏蔽超时 / 转诊 / 退出，`EMERGENCY_DISMISSED` 恢复前态，`EMERGENCY_CONFIRMED` 进入 `terminated(reason: emergency)`；`VISIT_TIMEOUT`、`TRANSFER_REQUIRED`、`EXIT_REQUESTED` 分别收口到终止 / 退出结算路径。
- 已补 `src/features/workbench/machine/visit-machine.test.ts`，覆盖 hydration、阻塞态普通消息不推进、检验决策链路、急症误报恢复、急症确认、超时优先级和处置分支跳转。
- 验证：`pnpm test`、`pnpm lint`、`pnpm build` 均通过。
- 未完成：状态机尚未接入 `useWorkbenchSession`、`useAssistantStream`、UI 时间线和流程卡动作；这些留给 `P4.1-P4.3`。

### P3. 页面和组件静态骨架

#### P3.1 首页、历史、个人中心页面

依赖：`P1`、`P2.3` 的患者 / 历史 fixtures、`P2.4` 的 visits query。

可并行：可与 `P3.2`、`P3.3` 并行。

建议 subagent：`ui-pages`。

任务：

- 实现 `HomePage`：继续上次问诊、症状输入、常见症状草稿 chip、开始问诊。
- 实现 `HistoryPage`：筛选 tab、历史列表、继续就诊、发起复诊、回看记录。
- 实现 `ProfilePage`：患者资料、病史、过敏史、偏好占位。
- 使用 `AppBottomTabs` 保持移动端导航一致。
- 页面仅通过 feature query / mutation 取数，不导入 fixtures、mock-db 或临时静态数组。

验收：

- `/`、`/history`、`/profile` 可导航。
- 首页开始问诊能跳转 `/workbench/new?draft=...`。

#### P3.2 工作台 Shell 和顶层布局

依赖：`P1.3`、`P2.3` 的 session / timeline 样例、`P2.5` 初始状态机类型。

可并行：可与 `P3.1`、`P3.3` 并行。

建议 subagent：`ui-pages`。

任务：

- 实现 `WorkbenchPage`、`NewWorkbenchPage`、`ReadonlyVisitPage` 路由页面。
- 实现 `WorkbenchContainer` 占位接入。
- 实现 `WorkbenchShell`、`WorkbenchHeader`、`ContextSummaryBar`、`ContextSummaryDrawer`。
- 顶栏按移动端优先级处理 AI 名称、急症守护图标、暂离、超时文案、退出。
- 工作台顶部摘要只展示 `VisitSession` / `PatientContext` 可提供的字段；缺字段先回补 schema，不在组件内自造字段。

验收：

- `/workbench/new`、`/workbench/:sessionId`、`/history/:sessionId` 可渲染业务骨架。
- PC 端具备主列 + 摘要侧栏占位，移动端单列。

#### P3.3 时间线、消息和输入组件

依赖：`P2.2` 的 `TimelineItem` 类型、`P2.3` 的时间线 fixtures。

可并行：可与 `P3.1`、`P3.2` 并行。

建议 subagent：`ui-pages`。

任务：

- 实现 `ChatTimeline`，使用 React Virtuoso。
- 实现 `TimelineRow`、`MessageBubble`、`SystemEventRow`、`AssistantThinkingRow`、`TerminalEventRow`。
- 实现 `InputDock`、`InputAssistPanel`、`LockBar`、`LockQuestionSheet`。
- 支持草稿 chip 和快速回答 chip 的不同点击行为。
- 时间线组件以 `TimelineItem` discriminated union 为唯一数据入口，所有状态文案来自字段或 `UiMessage` 转换，不解析 API 原始错误。

验收：

- 时间线能混排消息、系统事件、流程卡占位、终止卡。
- 主输入可受控、可禁用、可显示发送中状态。
- 阻塞态展示 LockBar，而不是普通输入。

#### P3.4 流程卡叶子组件

依赖：`P2.2` 的 `FlowCard` 类型、`P2.3` 的 flow-card fixtures。

可并行：可拆给多个 subagent，但 `FlowCardRenderer` 由一个 subagent 汇总。

建议 subagent：`flow-cards`。

任务：

- 实现 `FlowCardRenderer`。
- 实现 `LabDecisionCard`、`PaymentCard`、`LabExecutionCard`。
- 实现 `DiagnosisCard`、`TreatmentPlanCard`、`MedicationFulfillmentCard`。
- 实现 `TreatmentExecutionCard`、`AdviceOnlyCard`、`CompletedVisitCard`、`TerminalCard`。
- 所有卡片只接收 `card`、`disabled`、`pending`、`onAction`，不直接调用 API。
- 每个卡片先用 fixture 驱动展示态、pending 态、已处理态和失败态，再接入真实 action hook。

验收：

- 每种 `FlowCardKind` 都有穷尽渲染。
- 已处理卡片保留在时间线，显示处理结果和时间。
- icon button 有 `aria-label`。

### P4. 主链路联动

#### P4.1 `useWorkbenchSession` 集成

依赖：`P2.3`、`P2.4`、`P2.5`、`P3.2`、`P3.3`。

可并行：否。它是工作台总装点。

建议 subagent：主 agent 或 `workbench-machine`。

任务：

- 实现 `useWorkbenchSession(sessionId)`。
- 读取 session query 和 timeline infinite query。
- 启动 visit machine 并执行 hydration。
- 输出 `session`、`items`、`state`、`blockingCard`、`loading`、`error`、`actions`。
- 将 `WorkbenchContainer` 接到真实 hook。
- hook 只组合 Query cache、状态机和 facade actions，不在本层重新定义 session / timeline / card 数据结构。

验收：

- 继续就诊可从 session 状态恢复到正确机器态。
- 找不到 pending 卡片时能回退 `chatting` 并插入系统提示。
- `session`、`items`、`blockingCard` 均来自已解析 schema 或由 schema 字段派生。

#### P4.2 发送消息和 SSE 流式回复

依赖：`P4.1`、`P2.3` 的 stream simulator。

可并行：可与 `P4.3` 前半部分并行，但需协调 timeline cache 更新工具。

建议 subagent：`workbench-machine`。

任务：

- 实现 `useAssistantStream`。
- 发送消息时插入患者乐观消息。
- 创建 assistant streaming item。
- 处理 `delta`、`message_final`、`card`、`state`、`emergency`、`done`、`error`。
- stream chunk 按 animation frame 合并。
- 退出、急症、超时时 abort stream。

验收：

- 输入症状后时间线出现患者消息和 AI 流式回复。
- mock 可触发检验卡、诊断卡和终止事件。
- stream 中断时消息标记 failed 或 invalidated。

#### P4.3 阻塞卡、检验和支付链路

依赖：`P3.4` 的检验卡、`P4.1`。

可并行：可与 `P4.2` 后半部分并行，但状态事件需统一。

建议 subagent：`flow-cards` + `mock-flow`。

任务：

- 实现 `useFlowCardAction`。
- 接入 `submitLabDecision`：同意、不查、暂不决定。
- 接入 `submitPayment`：检验费支付、支付中、成功、失败、暂不缴费。
- mock 支持检验执行、结果回填、重新分析。
- 阻塞卡 pending 时禁用普通输入，仅开放 LockBar 两个逃生入口。

验收：

- 完整跑通：问诊 -> 是否检验 -> 同意 -> 缴费 -> 检验执行 -> 结果回填 -> 重新分析。
- 暂不决定后输入恢复。
- 不查后不伪造检验依据。

#### P4.4 确诊、处置、完成和复诊

依赖：`P4.2`、`P4.3`、`P3.4` 的处置卡。

可并行：可拆成处置卡动作和完成态意图分类两个子任务。

建议 subagent：`flow-cards` + `mock-flow`。

任务：

- 接入诊断卡和处置方案卡。
- 接入用药分支：药品支付、取药 / 配送、完成卡。
- 接入仅医嘱分支：确认医嘱、完成卡。
- 接入自动化治疗 mock 分支：预约、到号、开始、完成。
- 接入 `classifyFollowUpIntent`、`streamConsultationReply`、`createFollowUp`。
- 完成态输入区分咨询、复诊、不确定。

验收：

- 用药、仅医嘱、自动化治疗三条 mock 路径均可到完成卡。
- 完成后咨询不创建新 session。
- 完成后新症状触发复诊 session，并引用 parent session。

### P5. 全局机制和异常态

#### P5.1 急症打断 Overlay

依赖：`P4.2`、`P2.5`。

可并行：可与 `P5.2`、`P5.3` 并行。

建议 subagent：`workbench-machine`。

任务：

- 实现 `EmergencyOverlay`。
- SSE `emergency` 和 `reportVitals` 命中均发送 `EMERGENCY_DETECTED`。
- 进入 overlay 时 abort stream、禁用输入、禁用卡片动作。
- 支持确认前往急诊和误报申诉恢复。
- HTTP 模式后端会话关闭的限制写入实现注释和文档。

验收：

- 急症优先级高于超时、退出和阻塞卡。
- 确认后生成 `TerminalTimelineItem(reason: emergency)`。
- 误报恢复能回到原状态并插入系统事件。

#### P5.2 整次导诊总超时

依赖：`P4.1`。

可并行：可与 `P5.1`、`P5.3` 并行。

建议 subagent：`workbench-machine`。

任务：

- 实现 `useVisitCountdown`。
- 顶栏剩余 5 分钟、2 分钟文案。
- 实现暂离 / 继续计时动作。
- 实现 `TimeoutOverlay` 和 `VISIT_TIMEOUT` 转终止卡。

验收：

- 超时是会话级单一计时，不按步骤重置。
- 完成态停止计时。
- 超时后输入和卡片动作禁用。

#### P5.3 主动退出和退出结算

依赖：`P4.1`、`P2.4` 的 `exitVisit`。

可并行：可与 `P5.1`、`P5.2` 并行。

建议 subagent：`ui-pages`。

任务：

- 实现 `ExitVisitSheet`。
- 根据不可逆动作展示一条动态退出后果。
- 确认后调用 `workbenchApi.exitVisit`。
- 生成退出结算系统事件或终止卡，保存快照。

验收：

- 任意非终止态可打开退出 Sheet。
- 取消返回原状态，不改变时间线。
- 急症出现时覆盖退出 Sheet。

#### P5.4 异常、空态和只读回看

依赖：`P4` 基本链路。

可并行：可与 `P5.1` 至 `P5.3` 并行。

建议 subagent：`quality`。

任务：

- 补齐加载失败、发送失败、stream 失败、支付失败、只读 snapshot 加载失败。
- 实现 `ReadonlyVisitPage` 的只读时间线和摘要，不展示可发送输入框。
- 历史页空状态、筛选无结果状态。
- 错误文案转换为患者可理解的 `UiMessage`。

验收：

- 可重试错误有明确重试入口。
- 只读回看不触发 Agent 主循环。
- 业务组件不展示原始 `ApiError` 或内部状态名。

### P6. 质量、测试和文档收口

#### P6.1 单元测试

依赖：`P2` 至 `P5` 按模块逐步展开。

可并行：可由 `quality` subagent 持续执行。

任务：

- schema parse 成功 / 失败测试。
- `timeline-merge` 测试：乐观消息、服务端回填、流式更新、card upsert。
- visit machine 关键转移测试。
- `useVisitCountdown` 边界测试。
- `FlowCardRenderer` 穷尽分发测试。

验收：

- `pnpm test` 通过。
- 高风险流程至少有状态机或组件行为测试。

#### P6.2 组件与集成测试

依赖：`P4`、`P5`。

可并行：可与 `P6.1` 并行。

任务：

- `InputAssistPanel` 草稿 chip 与快速回答 chip 行为测试。
- 阻塞卡出现后主输入禁用测试。
- 检验完整链路集成测试。
- 暂不决定后输入恢复测试。
- 急症 abort stream 和 overlay 测试。
- 退出结算后果测试。

验收：

- 关键用户路径可在测试中无真实后端跑通。

#### P6.3 构建、lint 和响应式复核

依赖：`P5`。

可并行：可与 `P6.1`、`P6.2` 并行。

任务：

- 运行 `pnpm lint`。
- 运行 `pnpm test`。
- 运行 `pnpm build`。
- 用浏览器检查移动端 375px、窄屏 340px、PC 768px 以上布局。
- 复核文本不溢出按钮和卡片，Overlay 不遮挡关键操作。

验收：

- lint、test、build 通过或记录明确未通过原因。
- 移动端和 PC 端主流程可操作。

#### P6.4 文档更新和结项 API 文档准备

依赖：每次实现后都要执行，最终依赖 `P6.3`。

负责人：主 agent。

任务：

- 每个实现批次更新 `agent-workspace/map.md` 的“本次完成 / 本次未完成”。
- API contract 变化同步 `agent-workspace/special-designs/api.md`。
- UI 或状态机变化同步 `ui-designs.md`、`detailed-design.md` 或 `component-code-conventions.md`。
- 结项前产出 `agent-workspace/special-designs/rest-api.md`，包含 endpoint、鉴权上下文、请求参数、响应、错误码、分页、SSE 事件、状态枚举和典型时序。

验收：

- 文档能追溯已实现代码。
- 未实现内容和后端能力边界明确写出。

## 5. 推荐 subagent 分工

### app-shell

负责：

- `src/main.tsx`
- `src/app/*`
- `src/features/shared/components/*`
- 全局页面 shell 和路由。

优先任务：`P1.1`、`P1.2`、`P1.4`。

### api-contract

负责：

- `src/lib/api/*`
- `src/features/*/api/*`
- `.env.example`

优先任务：`P2.0`、`P2.1`、`P2.2`、`P2.4`。

注意：

- 数据契约清单和 schema 是其他任务的硬依赖，优先完成首批 endpoint 的可用版本。

### mock-flow

负责：

- `src/mocks/api/*`
- mock fixtures、mock-db、stream simulator。

优先任务：`P2.3`、`P4.3`、`P4.4` 的 mock 推进。

注意：

- mock 必须通过同一套 schema，不允许 mock-only 字段。

### workbench-machine

负责：

- `src/features/workbench/machine/*`
- `useWorkbenchSession`
- `useAssistantStream`
- `useVisitCountdown`

优先任务：`P2.5`、`P4.1`、`P4.2`、`P5.1`、`P5.2`。

注意：

- 状态机不直接保存大体量 API 响应。

### ui-pages

负责：

- `src/pages/*`
- `src/features/patient/components/*`
- `src/features/visits/components/*`
- `src/features/workbench/components/*`

优先任务：`P3.1`、`P3.2`、`P3.3`、`P5.3`。

注意：

- 页面和业务组件不直接调用 transport、mock fixtures 或 query key。

### flow-cards

负责：

- `src/features/workbench/flow-cards/*`
- `FlowCardRenderer`
- 卡片组件行为测试。

优先任务：`P3.4`、`P4.3`、`P4.4`。

注意：

- 叶子卡片只抛 `FlowCardAction`，不直接推进状态。

### quality

负责：

- `src/**/*.test.ts`
- `src/**/*.test.tsx`
- MSW 测试准备。
- 验证命令和响应式复核记录。

优先任务：`P6.1`、`P6.2`、`P6.3`，可从 `P2` 开始跟进。

## 6. 首批执行顺序建议

### 第一批：不可并行的地基

1. `P1.1` 路由和入口。
2. `P1.2` Provider 和 QueryClient。
3. `P1.3` 样式清理。
4. `P1.4` 共享基础组件。

### 第二批：数据先行地基

1. `P2.0`：按 `special-designs/api.md` 整理 endpoint、核心实体、状态枚举、SSE 事件和样例矩阵。
2. `P2.1` + `P2.2`：API transport、错误模型、领域 schema 和类型推导。
3. `P2.3`：mock fixtures、mock-db、mock transport、stream simulator 和流程推进。
4. `P2.4`：feature API facade 与 query options。
5. `P2.5`：基于稳定数据模型和样例路径建立状态机骨架。

### 第三批：界面骨架并行

1. `P3.1` 首页 / 历史 / 我的。
2. `P3.2` 工作台 shell。
3. `P3.3` 时间线和输入。
4. `P3.4` 流程卡。

### 第四批：业务闭环串联

1. `P4.1` 工作台总 hook。
2. `P4.2` 发送消息和流式。
3. `P4.3` 检验和支付。
4. `P4.4` 处置、完成、复诊。

### 第五批：安全机制和收口

1. `P5.1` 急症。
2. `P5.2` 超时。
3. `P5.3` 退出。
4. `P5.4` 异常态和只读回看。
5. `P6` 测试、构建、文档。

## 7. 当前版本明确不做

- 不接真实身份核验、真实支付、真实检验设备、真实药房和配送系统。
- 不实现医生端、药师端、检验科后台。
- 不实现处方审核和完整法务合规闭环。
- 不实现真实医疗知识库和急症规则库。
- 不引入 SSR、RSC 或 React Router Framework Mode。
- 不把自动化治疗当作 medAgent 已支持能力。自动化治疗只在前端 / mock 中演示，HTTP 联调前需后端业务层补齐 contract。

## 8. 阶段验收总清单

- 首页可新建问诊、继续问诊、进入历史和个人中心。
- 历史页可继续就诊、发起复诊、只读回看。
- 工作台可加载新出诊和复诊上下文。
- 普通问诊可发送消息并看到 AI 流式回复。
- 时间线可混排消息、系统事件、流程卡和终止卡。
- 检验链路可走同意、支付、执行、结果回填、重新分析。
- 不查和暂不决定语义不同，并在 UI 留痕。
- 确诊卡依据来源清楚，未检验时不显示检验依据。
- 用药、仅医嘱、自动化治疗 mock 分支可到完成卡。
- 完成后咨询不触发复诊，症状变化触发复诊。
- 急症、超时、主动退出能在任意非终止态打断或收口。
- 终止原因在历史和时间线留痕。
- `pnpm lint`、`pnpm test`、`pnpm build` 通过，或文档记录明确阻塞。
