# 组件代码设计通用约定

更新时间：2026-06-27

产品名：**东软云脑智能医疗**

## 1. 文档目标

本文承接 `detailed-design.md`、`ui-designs.md`、`tech-selection.md` 与 `special-designs/api.md`，约定后续 React 组件的代码写法。目标是让不同编码 Agent 在实现首页、工作台、聊天时间线和流程卡时，保持同一套组件边界、props 形态、事件模型和状态来源。

本文不重新定义业务流程、不重新定义 API contract、不覆盖视觉设计。业务状态以 `detailed-design.md` 为准，页面信息架构以 `ui-designs.md` 为准，接口和 mock 以 `special-designs/api.md` 为准。

## 2. 总原则

- 组件只做自己这一层的事：页面组装页面，hook 组装数据和动作，业务组件展示业务片段，`components/ui` 只提供基础 UI。
- 数据向下传，事件向上抛。组件内部不越层调用 API、mock、QueryClient、XState machine 或 router，除非它本身就是对应的 container/hook。
- props 必须表达“这个组件渲染需要什么”和“用户操作后通知什么”，不要把实现细节、临时接口字段或整份上下文对象随手传下去。
- 医疗流程组件优先可追踪、可测试、可恢复。不要为了少写几个 props，把状态推进逻辑藏进卡片内部。
- 阻塞卡、急症、超时、退出等高风险流程，必须显式传递状态和动作，不能靠组件局部隐式判断。

## 3. 组件分层

推荐分层：

```text
pages/*
  路由页面，只读路由参数，组合 container。

features/*/hooks/*
  组合 TanStack Query、XState、Zustand、API facade，输出页面所需状态和 actions。

features/*/components/*
  业务展示组件，不直接调用 API，不手写 query key，不直接推进状态机。

features/workbench/flow-cards/*
  流程卡组件，只接收 card 数据和 onAction。

features/shared/components/*
  跨 feature 的业务弱相关组件，如 PageShell、EmptyState、StatusPill。

components/ui/*
  HeroUI / shadcn / Magic UI 基础组件或薄封装，不包含诊疗业务判断。
```

允许页面里写少量布局代码，但一旦出现下面任一情况，应拆到 `features/*/components` 或 hook：

- 同一 UI 被两个页面使用。
- 组件需要 loading/error/empty/disabled 多状态。
- 组件有用户动作并影响 API、状态机或 URL。
- JSX 超过一个屏幕且包含业务判断。

## 4. 命名与文件

- React 组件使用 `PascalCase`，文件名与主导出组件同名，例如 `FlowCardRenderer.tsx`。
- hook 使用 `useXxx.ts`，只在 hook 内调用其他 hook。
- 类型文件使用 `types.ts` 或 `*.types.ts`；schema 使用 `schemas.ts`。
- 页面组件后缀用 `Page`，容器组件后缀用 `Container`，弹层用 `Overlay` / `Sheet` / `Drawer`，卡片用 `Card`。
- 事件/action 类型使用动词语义，例如 `accept_lab`、`submit_payment`，不要使用按钮文案作为事件名。
- 枚举字段优先字符串联合类型，并使用 `kind` / `type` 做 discriminated union 分发。

导出约定：

- 一个文件优先导出一个主组件。
- feature 内可以有 `api/index.ts` 这类稳定 facade；不要创建会一次性 re-export 大量组件的宽泛 barrel。
- 测试和故事文件可以按组件旁置，例如 `PaymentCard.test.tsx`。

## 5. Props 设计

### 5.1 props 的三类字段

组件 props 按以下顺序组织：

```ts
interface ExampleProps {
  // 1. 数据：渲染需要的领域对象或字段
  sessionId: SessionId
  card: PaymentCardData

  // 2. 展示状态：loading、disabled、selected、error 等
  disabled?: boolean
  pending?: boolean
  error?: UiMessage

  // 3. 事件：用户操作后的通知
  onAction: (action: FlowCardAction) => void
}
```

约定：

- 必需数据用必填 props，不用 `undefined` 表示“还没加载”。加载态应由父层决定渲染 skeleton、empty state 还是子组件。
- `disabled` 表示不可交互，`pending` 表示动作提交中，`readonly` 表示只读回看。不要混用。
- 错误信息不要直接传底层 `ApiError.message` 给叶子组件。feature hook 应先转换成患者可理解的 `UiMessage`。
- `className` 只给基础 UI、布局壳和少数共享组件；流程卡和业务组件默认不暴露随意覆盖样式的入口。

### 5.2 传对象还是拆字段

默认规则：

- 流程卡组件接收完整、已收窄的 `card` 对象，因为 `FlowCard` 本身是稳定业务单元。
- 时间线行组件接收完整、已收窄的 `item` 对象，因为 `TimelineItem` 是稳定渲染单元。
- 小型展示组件只传必要字段，避免把整份 `session`、`patient`、`timelineItems` 传给叶子组件。

示例：

```tsx
// Good: 流程卡以 card 为业务边界
<PaymentCard card={card} pending={pendingCardId === card.id} onAction={submitFlowAction} />

// Good: badge 只需要状态和终止原因，不接收整份 session
<VisitStatusBadge status={session.status} terminalReason={session.terminalReason} />

// Avoid: 子组件只用到 status，却收到整份 session
<VisitStatusBadge session={session} />
```

判断标准：

- 如果一个对象本身就是文档中的领域模型边界，例如 `FlowCard`、`TimelineItem`、`VisitSessionSummary`，可以整体传。
- 如果子组件只展示对象中的 1-3 个字段，优先拆成字段。
- 如果对象变化频繁而子组件只关心其中一个原始值，必须拆字段，降低无意义重渲染。

### 5.3 children 与 slots

- 基础 UI 组件可以接受 `children`，例如 Button、Card、Modal。
- 布局壳组件可以接受明确 slot，例如 `header`、`footer`、`aside`。
- 业务组件不要为了偷懒暴露任意 `children`，否则后续 Agent 很容易把流程逻辑塞进错误层级。

推荐：

```tsx
interface WorkbenchShellProps {
  header: React.ReactNode
  summary: React.ReactNode
  timeline: React.ReactNode
  input: React.ReactNode
  overlays: React.ReactNode
}
```

不推荐：

```tsx
interface WorkbenchShellProps {
  children: React.ReactNode
}
```

除非这个 shell 真的只是纯布局容器。

### 5.4 回调 props

命名：

- DOM/交互组件使用 `onPress`、`onChange`、`onOpenChange` 等 UI 语义。
- 业务组件使用 `onAction`，payload 使用 discriminated union。
- 页面 container 输出给页面的动作统一放在 `actions` 对象里。

流程卡统一使用：

```ts
interface FlowCardProps<TCard extends FlowCard> {
  card: TCard
  disabled?: boolean
  pending?: boolean
  onAction: (action: FlowCardAction) => void
}
```

示例：

```tsx
function LabDecisionCard({ card, disabled, pending, onAction }: FlowCardProps<LabDecisionCardData>) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>{card.title}</Card.Title>
      </Card.Header>
      <Card.Content>{/* reason, items, cost */}</Card.Content>
      <Card.Footer>
        <Button
          isDisabled={disabled || pending}
          onPress={() => onAction({ type: 'accept_lab', cardId: card.id })}
        >
          同意检验
        </Button>
      </Card.Footer>
    </Card>
  )
}
```

约定：

- 回调 payload 必须带稳定 ID，例如 `sessionId`、`cardId`、`itemId`；不要让父组件从闭包里猜当前对象。
- 可选回调只有在组件确实支持纯展示模式时才允许。否则将回调设为必填，减少“按钮点了没反应”的隐性 bug。
- 如果需要可选回调，不要在函数参数里写 `onAction = () => {}`；应使用模块级 `NOOP` 常量或渲染前判断。

### 5.5 控制型与非控制型

- 表单和复杂输入优先由 React Hook Form 管理。
- 简单草稿输入可以由组件内部 `useState` 管理，但提交动作仍上抛。
- 需要跨组件保留的输入草稿放 Zustand，例如工作台 composer store。
- 同一个组件不要同时支持 `value` 和内部 state，除非按 React 常见 controlled/uncontrolled 约定完整实现。

`InputDock` 推荐受控：

```ts
interface InputDockProps {
  value: string
  placeholder: string
  disabled?: boolean
  sending?: boolean
  onValueChange: (value: string) => void
  onSend: () => void
  onOpenAttachSheet: () => void
}
```

## 6. 状态来源

状态归属必须清晰：

| 状态类型 | 放置位置 | 组件怎么拿 |
| --- | --- | --- |
| 会话、时间线、支付、检验结果 | TanStack Query | feature hook 读取后传 props |
| 问诊流程态、阻塞态、全局打断优先级 | XState | feature hook 订阅 machine 后传 props |
| 输入草稿、面板展开、滚动标记 | Zustand 或局部 state | container/hook 读取后传 props |
| 表单输入和校验 | React Hook Form + Zod | 表单组件内部或专用 hook |
| 纯展示派生值 | render 中计算 | 不进 state |

禁止：

- 组件直接导入 `workbenchApi`、`ky`、mock fixtures 或 query key。
- 把 API 响应复制一份进 Zustand 长期保存。
- 用 `useEffect` 把 props 派生值同步到本地 state。
- 在流程卡内部调用状态机 `send`。

推荐：

```tsx
function WorkbenchContainer({ sessionId }: { sessionId: SessionId }) {
  const workbench = useWorkbenchSession(sessionId)

  return (
    <WorkbenchShell
      header={<WorkbenchHeader session={workbench.session} state={workbench.state} />}
      summary={<ContextSummaryBar summary={workbench.session?.summary} />}
      timeline={<ChatTimeline items={workbench.items} actions={workbench.actions} />}
      input={<InputDock {...workbench.composerProps} />}
      overlays={<WorkbenchOverlays state={workbench.state} actions={workbench.actions} />}
    />
  )
}
```

## 7. 事件与 action 模型

业务事件要稳定，不能跟按钮文案绑定。

```ts
type FlowCardAction =
  | { type: 'accept_lab'; cardId: FlowCardId }
  | { type: 'skip_lab'; cardId: FlowCardId }
  | { type: 'veto_lab'; cardId: FlowCardId }
  | { type: 'submit_payment'; cardId: FlowCardId; paymentMethodId: string }
  | { type: 'defer_payment'; cardId: FlowCardId }
  | { type: 'choose_fulfillment'; cardId: FlowCardId; mode: 'pickup' | 'delivery' }
  | { type: 'ack_advice'; cardId: FlowCardId }
```

约定：

- 叶子组件只构造 action，不解释 action。
- `useFlowCardAction` 负责把 action 映射到 API facade、Query cache 更新和 machine event。
- 一个 action 只表达一个用户意图。不要用 `{ type: 'click', value: 'primary' }` 这类含糊 payload。
- action payload 使用业务 ID 和必要参数，不传 DOM event。
- 所有 action 必须能被测试直接构造。

对于页面级动作，hook 返回：

```ts
interface WorkbenchActions {
  sendMessage: (content: string) => Promise<void>
  submitFlowAction: (action: FlowCardAction) => Promise<void>
  requestExit: () => void
  confirmExit: () => Promise<void>
  pauseVisit: () => Promise<void>
  resumeVisit: () => Promise<void>
}
```

组件里只调用 `actions.submitFlowAction(action)`，不关心后端是 mock 还是 HTTP。

## 8. 渲染分发

凡是根据 `kind` / `type` 渲染的组件，必须使用穷尽分发。

```tsx
export function FlowCardRenderer({ card, onAction }: FlowCardRendererProps) {
  switch (card.kind) {
    case 'lab_decision':
      return <LabDecisionCard card={card} onAction={onAction} />
    case 'payment':
      return <PaymentCard card={card} onAction={onAction} />
    case 'diagnosis':
      return <DiagnosisCard card={card} onAction={onAction} />
    default:
      return assertNever(card)
  }
}
```

约定：

- `assertNever` 放在通用工具模块，供所有 discriminated union 分发复用。
- 不用对象 map 绕过类型收窄，除非每个 renderer 的 props 完全一致且仍能保持穷尽检查。
- 新增 `FlowCardKind` 时，必须同步补齐 renderer、schema、mock fixture 和测试。

## 9. HeroUI 与 Magic UI

### 9.1 HeroUI 3

- 使用 HeroUI 3，不添加 `HeroUIProvider`。
- HeroUI 3 的 React 组件不依赖应用级 Provider；组件行为、样式和主题主要由 `@heroui/react`、`@heroui/styles`、Tailwind CSS 4 与 CSS 变量提供。
- 只有后续确实需要额外上下文能力时，才为对应能力单独引入 Provider，并在实现文档中说明原因。
- 使用 compound component 写法，例如 `Card.Header`、`Card.Content`、`Card.Footer`。
- HeroUI 交互事件优先使用 `onPress`，不要在 HeroUI Button 上写原生 `onClick`。
- 使用语义 variant，不在业务组件中硬编码颜色。
- 不把 HeroUI 组件再包一层厚业务逻辑；业务判断放 feature 组件。

### 9.2 Magic UI

- Magic UI 只用于 AI 生成、上下文加载、短文本入场等轻量反馈。
- 不用于大面积背景装饰，不改变工作台主信息层级。
- 复制进项目后的 Magic UI 组件视为本项目代码，必须服从本文件 props、样式和测试约定。

### 9.3 图标

- 按钮图标优先用 `lucide-react`。
- icon button 必须提供 `aria-label` 或可见文本。
- 移动端窄空间优先 icon button + tooltip，不写超长按钮文案。

## 10. 样式约定

- 全局 token、字体、Tailwind 4、HeroUI styles 放在统一的全局样式入口。
- 业务组件用 Tailwind class 做布局和少量状态样式。
- 大量可复用样式使用 variants 或基础组件封装，不在多个业务组件复制长 class。
- 医疗安全状态使用语义 token 或语义 variant，例如 danger、warning、success、muted。
- 不在业务组件内联大段 `style`，除非是运行时计算的尺寸或虚拟列表必要属性。
- `cn` 只用于合并条件 class，不用于拼接业务状态文案。
- 不用负 margin 或绝对定位修补主要布局；工作台区域应有稳定高度、滚动容器和安全区。

`className` 使用规则：

```tsx
interface PageShellProps {
  children: React.ReactNode
  className?: string
}

function PageShell({ children, className }: PageShellProps) {
  return <main className={cn('min-h-dvh bg-background text-foreground', className)}>{children}</main>
}
```

业务流程卡通常不暴露 `className`，避免外部覆盖破坏不同卡片的一致性。

## 11. 加载、空态和错误

每个可异步加载的区域必须明确四态：

```ts
type RemoteViewState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: UiMessage; retriable?: boolean }
  | { status: 'empty'; message: string }
  | { status: 'ready'; data: T }
```

约定：

- 页面级 loading 用 skeleton 或上下文加载态，不让患者误以为卡死。
- 时间线流式生成用 `streaming` item，不用全屏 loading 覆盖已有内容。
- 错误文案由 feature hook 或 adapter 转换，组件不展示原始堆栈或底层 HTTP 文案。
- 可重试错误必须提供明确动作，如“重试支付”“重新发送”“稍后再试”。
- 阻塞卡 action 失败后，卡片保持 `pending`，错误显示在卡片动作区，不解锁主输入。

## 12. 表单与校验

- 表单状态由 React Hook Form 管理。
- schema 用 Zod 定义，并从 schema 推导 TypeScript 类型。
- 表单组件不直接调用 API，提交后把已校验数据交给 hook/action。
- 医疗资料、支付、取药等关键表单必须显示字段级错误。
- 表单 submit 按钮的 pending 状态来自 mutation/hook，不在组件内部猜测。

推荐：

```ts
interface FulfillmentFormProps {
  defaultValues: FulfillmentFormValues
  disabled?: boolean
  pending?: boolean
  onSubmit: (values: FulfillmentFormValues) => void
}
```

## 13. 性能约定

时间线和流程卡会长期存在，性能约定必须提前遵守：

- `ChatTimeline` 只接收已排序、扁平的 `TimelineItem[]`。
- `TimelineRow`、`MessageBubble`、流程卡组件使用 `memo`，前提是 props 保持稳定且组件足够重。
- 不在组件内部定义子组件，避免每次 render 都 remount。
- 可从 props/state 直接计算的值，在 render 中计算，不放进 state + effect。
- effect 依赖尽量使用原始值，例如 `[session.id]`，不要无脑依赖整份对象。
- 基于旧 state 更新时使用 functional setState。
- 非原始默认值不要写在参数默认值里，例如 `items = []`、`onAction = () => {}`；使用模块级常量。
- 流式 chunk 由 hook 按 animation frame 合并，组件只接收合并后的 item。
- 虚拟列表中的 key 必须稳定，乐观消息服务端回填 ID 时不能导致整行重挂载。

不推荐：

```tsx
function Parent({ item }: { item: TimelineItem }) {
  function InlineRow() {
    return <TimelineRow item={item} />
  }

  return <InlineRow />
}
```

推荐：

```tsx
const MemoTimelineRow = memo(TimelineRow)

function Parent({ item }: { item: TimelineItem }) {
  return <MemoTimelineRow item={item} />
}
```

## 14. 可访问性与患者安全

- 可点击元素必须是 button/link 或 HeroUI 对应可访问组件。
- icon-only 操作必须有 `aria-label`。
- Modal/Drawer/Sheet 必须有明确标题和关闭/确认路径。
- 急症、超时、退出确认的主动作和取消动作必须视觉区分，不能只靠颜色。
- 倒计时、支付状态、流式生成状态应使用适当的 `aria-live` 或可感知文本。
- 禁用按钮旁边必须有原因，尤其是阻塞卡和支付态。
- 患者可见文案使用患者语言，不展示内部状态名如 `lab_decision`、`emergencyPending`。

## 15. 路由与导航

- 页面组件通过 React Router 读取参数并传给 container。
- 普通业务组件不直接 `navigate`，而是通过 `onNavigate` / action 通知父层，或由 container 处理。
- 路由跳转必须保留当前业务语义，例如发起复诊要先 `createFollowUp`，再进入新 session。
- 全局覆盖态不作为路由，遵循 `ui-designs.md`。

## 16. 测试约定

组件测试优先测行为，不测实现细节：

- 按钮点击后是否抛出正确 action。
- 阻塞卡 pending 时主输入是否禁用。
- `FlowCardRenderer` 是否按 `kind` 分发。
- 草稿 chip 与快速回答 chip 行为是否不同。
- 错误、loading、empty、readonly 状态是否可见且不误触发 action。

测试中不要 mock 组件内部实现。对 API 使用 MSW 或 feature hook 边界 mock；对纯展示组件直接传 props。

示例：

```tsx
await user.click(screen.getByRole('button', { name: '同意检验' }))

expect(onAction).toHaveBeenCalledWith({
  type: 'accept_lab',
  cardId: card.id,
})
```

## 17. 常见反模式

后续编码时遇到以下写法应直接调整：

- 在流程卡组件里直接调用 `workbenchApi.submitPayment`。
- 在 UI 组件里导入 mock fixture。
- 给子组件传整份 `useWorkbenchSession` 返回值。
- 用按钮文案作为 action 类型。
- 把 `ApiError` 原文直接显示给患者。
- 在 `useEffect` 中同步 props 到 state。
- 在组件内部定义子组件。
- 阻塞卡处理完成后从时间线删除卡片。
- 因为需要某个颜色就在业务组件里写硬编码色值。
- 新增组件库但不把源码浅克隆到 `references/`、不更新技术文档和地图。

## 18. 新组件落地检查清单

新增或修改组件前，至少检查：

- 组件放在正确目录层级。
- props 只包含必要数据、展示状态和事件。
- 服务端数据来自 API facade + TanStack Query，不进入组件私有请求。
- 流程推进通过 hook/action/XState，不在叶子组件里隐式推进。
- loading/error/empty/disabled/readonly 状态有明确 UI。
- 交互使用 HeroUI `onPress` 或原生 button 语义，不混乱。
- icon button 有 `aria-label`。
- 样式使用 token/variant/Tailwind，不硬编码大段视觉参数。
- `kind` / `type` 分发有穷尽检查。
- 关键行为有测试或已在实现记录中说明未覆盖原因。
