# P5 执行计划：全局机制与异常态

更新时间：2026-06-29

本文件是 `development-plan.md` 中 P5（急症 / 超时 / 退出 / 异常态与只读回看）的**并行执行细化方案**。原 development-plan.md 只给出按功能（P5.1–P5.4）的逻辑划分；本文件按**文件所有权分波次**重排，避免多 agent 同时改同一热点文件。

## 0. 两项已决策（用户确认）

1. **全局打断优先级**：`急症 > 退出 > 超时 > 阻塞卡 > 普通消息`。
   - 与当前 `visit-machine.ts` 实现一致（`exitSettlement` 已用 `terminalNoop` 屏蔽 `VISIT_TIMEOUT`）。
   - **需改正** `development-plan.md` L154 的「急症 > 超时 > 退出」表述，并同步 `detailed-design.md` L805–811（其顺序本就正确）。
2. **`completed` 完成态**：停止倒计时，仅保留急症打断。
   - `completed` 状态需 `shadow` 掉 `VISIT_TIMEOUT` / `EXIT_REQUESTED`（用空过渡），但**保留** `EMERGENCY_DETECTED`（患者完成后突发不适可上报）。
   - 满足 plan L632「完成态停止计时」验收。

## 1. 热点文件与冲突分析

| 文件 | P5.1 急症 | P5.2 超时 | P5.3 退出 | P5.4 异常/只读 | 结论 |
|---|---|---|---|---|---|
| `machine/visit-machine.*` | recheck/dismiss | completed 停计时 | 优先级确认 | — | **单 agent** |
| `store/workbench-ui-store.ts` | （状态派生，可不加） | timeoutOverlayOpen | exitSheetOpen | — | **单 agent** |
| `hooks/useWorkbenchSession.ts` | dismissEmergency | triggerTimeout | — | — | **集成 agent** |
| `components/WorkbenchPage.tsx` | 挂 Overlay | 挂 Overlay+倒计时 | 挂 Sheet | — | **集成 agent** |
| `components/WorkbenchHeader.tsx` | shield onClick | 倒计时文案源 | exit→开 Sheet | — | **集成 agent** |
| `mocks/api/mock-db.ts` | dismiss+事件 | 超时判定+暂停账 | 真实结算 | snapshot | **单 agent** |
| `features/*/api/{index,queries,schemas}` | dismiss 方法 | pause 账字段 | settlement 字段 | snapshot facade | **单 agent** |

派生原则：尽量让 Overlay 显隐**从机器状态/ui-store 标志派生**，叶子组件只接 `open`/`onOpenChange`/数据/`onConfirm`，不进热点文件。

## 2. 波次与 agent 指派

```
Wave 1 (并行 ×2) 基座
  A1 machine+store        A2 data+api
        \________________________/
Wave 2 (并行 ×4) 叶子组件（各自独立新文件）
  B1 急症 Overlay   B2 超时 Overlay+hook   B3 退出 Sheet+hook   B4 只读页+空态+错误文案
        \____________________|____________________/
Wave 3 (串行 ×1) 集成
  C 接线 useWorkbenchSession + WorkbenchPage + WorkbenchHeader，跑全量验证
Wave 4 (并行/收尾) 质量
  D 测试（机器/hook 测试可在 Wave1 后先起，集成测试在 Wave3 后）
```

### Wave 1 — 基座（并行 2 个 agent，互不改同一文件）

#### A1 `machine-foundation`（分组 workbench-machine）
- 拥有文件：`machine/visit-machine.ts`、`visit-machine.guards.ts`、`visit-machine.actions.ts`、`visit-machine.types.ts`、`store/workbench-ui-store.ts`。
- 任务：
  1. `completed` 态：加 `VISIT_TIMEOUT: {}`、`EXIT_REQUESTED: {}`（空过渡屏蔽），保留 `EMERGENCY_DETECTED` 继承根处理。
  2. `EMERGENCY_RECHECK_REQUESTED`（types.ts:64 当前未接线）：决定**在 `emergencyPending` 内接线**为「触发复检」语义，复检结果经 `EMERGENCY_DISMISSED`（误报恢复）或 `EMERGENCY_CONFIRMED`（确认急症）收口；若 mock 不做二次复检，则从 union 移除并在 types 注释说明。二选一，落到代码注释。
  3. 复核并以注释固化优先级：`急症 > 退出 > 超时 > 阻塞卡 > 普通消息`（当前已正确，加注释防回归）。
  4. `workbench-ui-store.ts` 新增 `timeoutOverlayOpen`、`exitSheetOpen` 两个 flag + setter（沿用现有 flag+setter 模式）。急症 Overlay 显隐由机器 `emergencyPending` 派生，不加 flag。
- 不得改动：A2 的 api/mock 文件、`useWorkbenchSession.ts`、`WorkbenchPage.tsx`、`WorkbenchHeader.tsx`。
- 验证：`pnpm tsc --noEmit`、`pnpm test`（机器测试）。

#### A2 `data-foundation`（分组 mock-flow + api-contract）
- 拥有文件：`mocks/api/mock-db.ts`、`mocks/api/handlers/*`、`mocks/api/mock-transport.ts`、`features/workbench/api/{index,queries,schemas}.ts`、`features/visits/api/{index,queries,schemas}.ts`、`lib/api/types.ts`。
- 任务（按 P5 后端缺口报告）：
  1. **急症误报恢复**：新增 `workbenchApi.dismissEmergency({ sessionId })` →（mock-db）恢复 `emergency_terminated` 前的会话状态、写入 `emergency_dismissed` 系统事件、返回 `{ session, timelineItem }`。
  2. **真实超时判定**：`getSession` 读取时若 `now > timeoutAt` 且非暂停、非终止 → 标记 timeout（或返回标志由前端 `useVisitCountdown` 触发 `VISIT_TIMEOUT`）。mock 至少让 `timeoutAt` 可被前端判定。
  3. **暂停账**：`VisitSession` schema 增 `pausedAt?: string`；`pauseVisitTimer` 记录 `pausedAt`，`resumeVisitTimer` 把暂停时长加回 `timeoutAt`（让暂停真正延后截止）。
  4. **真实退出结算**：`exitVisit` 扫描 timeline 已支付未执行 / 已执行 / 已取药卡片，计算 `refundAmount` / `payableAmount`（不再硬编码 0），并在 `ExitSettlementResult` 增可选 `consequence` 摘要字段（供 UI 兜底）。
  5. **只读回看接线**：`getReadonlySnapshot` 暴露为 `visitsApi.getReadonlySnapshot` + `visitsQueries.snapshot`，并确认 `mock-transport.ts` 注册了对应路由。
  6. **mutation 接线**：`queries.ts` 的 `workbenchMutations` 补 `reportVitals`、`pauseVisitTimer`、`resumeVisitTimer`、`dismissEmergency`。
- 约定签名（供 A1/Wave2 消费，写死在本文件，避免跨 agent 漂移）：
  - `workbenchApi.dismissEmergency(input: { sessionId: string }): Promise<{ session: VisitSession; timelineItem: TimelineItem }>`
  - `visitsApi.getReadonlySnapshot(input: { sessionId: string }): Promise<VisitSnapshot>`
  - `VisitSession` 增 `pausedAt?: string`（沿用现有 `timerPaused`）。
  - `ExitSettlementResult` 增 `consequence?: { kind: "no_fee" | "refundable" | "executed_no_refund" | "medication_dispensed"; amount?: number; text: string }`。
- 不得改动：A1 的 machine/store 文件、UI 组件、`useWorkbenchSession.ts`。
- 验证：`pnpm tsc --noEmit`、`pnpm test`（api/mock 契约测试）、所有 mock 响应过 schema。

### Wave 2 — 叶子组件（A1、A2 合入后，并行 4 个 agent，各自新文件）

#### B1 `emergency-overlay`（workbench-machine/ui）
- 新文件：`features/workbench/components/EmergencyOverlay.tsx`（HeroUI `Modal`，最高优先级）。
- props：`open`（来自机器 `emergencyPending`）、`source?`、`onConfirmEmergency`、`onDismiss`。
- 行为：进入时遮罩、两个动作（「前往急诊」确认 / 「误报，继续问诊」恢复），主/次动作视觉区分（不靠颜色）。确认 → 调用方 `EMERGENCY_CONFIRMED`；恢复 → 调用方 `EMERGENCY_DISMISSED`。
- 注释写入 HTTP 模式约束（后端命中急症即关闭会话，恢复仅前端 mock 语义）。
- 不调 API、不直接 `send`，只抛回调。

#### B2 `timeout-countdown`（workbench-machine）
- 新文件：`features/workbench/hooks/useVisitCountdown.ts`、`features/workbench/components/TimeoutOverlay.tsx`（HeroUI `Modal`，居中，PC max-w 480）。
- `useVisitCountdown({ timeoutAt, pausedAt, timerPaused })`：纯计算剩余时间，返回 `{ remainingMs, phase: "normal"|"warn5"|"warn2"|"expired", warningText }`，到期回调 `onExpire`。暂停时不本地递减，恢复后按 session 重读。会话级单一计时，不按步骤重置；`completed`/终止态停止。
- `TimeoutOverlay`：到期阻断态，确认 → 调用方 `VISIT_TIMEOUT` → terminated(timeout)，输入与卡动作禁用。
- 文案阈值：≤5min「问诊时间即将结束」低对比小字；≤2min「即将超时，请尽快完成」。默认不显示秒数。

#### B3 `exit-settlement`（ui-pages）
- 新文件：`features/workbench/components/ExitVisitSheet.tsx`（HeroUI `Drawer` placement=bottom）、`features/workbench/hooks/useExitSettlement.ts`。
- `useExitSettlement`：**从已有 timeline items 客户端派生**唯一一条动态后果文案（四档：无费用 / 可退 / 已执行不可退 / 已取药），驱动 Sheet 预览；确认时调用方 `exitVisit` 提交。
- `ExitVisitSheet`：展示后果文案 + 确认/取消。取消返回原态、时间线不变。任意非终止态可打开。
- 不直接 `send`、不直接调 transport，经回调/facade hook。

#### B4 `readonly-and-empty`（ui-pages/quality）
- 拥有文件：`pages/workbench/ReadonlyVisitPage.tsx`（当前是占位 stub）、`pages/home/HistoryPage.tsx`（空态/无结果态）、`pages/home/HomePage.tsx`（首用空态）、新增 `lib/ui-message.ts`（`ApiError` → 患者可懂 `UiMessage`）。
- `ReadonlyVisitPage`：用 `visitsQueries.snapshot` 渲染只读时间线 + 摘要，**无可发送输入框**，不触发 Agent 主循环。`readonly` 作为独立 prop，不与 `disabled`/`pending` 混用。
- 空态：首用「还没有就诊记录…」+「新建问诊」按钮；筛选无结果「没有找到匹配的记录」无新建入口。
- 各类失败（加载/发送/流/支付/快照）转 `UiMessage`，可重试项给明确重试入口；不暴露原始 `ApiError`/内部状态名。
- 注意：`HistoryPage.tsx`/`HomePage.tsx` 仅 B4 改动，其他 wave 不碰。

### Wave 3 — 集成（串行单 agent，独占接线文件）

#### C `integration`（主 agent / workbench-machine）
- 拥有文件：`hooks/useWorkbenchSession.ts`、`components/WorkbenchPage.tsx`、`components/WorkbenchHeader.tsx`。
- 任务：
  1. `useWorkbenchSession`：新增 `actions.dismissEmergency`（调 `workbenchApi.dismissEmergency` + cache 写入 + `EMERGENCY_DISMISSED`）、`actions.triggerTimeout`（`VISIT_TIMEOUT`）；暴露 `state==="emergencyPending"` 等供 Overlay 派生。
  2. `WorkbenchPage` overlays slot：挂 `EmergencyOverlay`（open 派生自 state）、`TimeoutOverlay`（open 来自 ui-store `timeoutOverlayOpen`，由 `useVisitCountdown.onExpire` 置位）、`ExitVisitSheet`（open 来自 `exitSheetOpen`）。接入 `useVisitCountdown` 与 `useExitSettlement`。
  3. `WorkbenchHeader`：shield 按钮接 `onReportEmergency`（现为死按钮）；倒计时文案改由 `useVisitCountdown.warningText` 驱动（替换静态 `formatTimeoutShort`）；exit 按钮改为打开 `ExitVisitSheet`（置 `exitSheetOpen`）而非直接 `requestExit`。
- 验证：`pnpm lint`、`pnpm tsc --noEmit`、`pnpm test`、`pnpm build` 全量。

### Wave 4 — 质量（可在 Wave1 后旁路起，集成测试在 Wave3 后）

#### D `quality`
- 拥有文件：`src/**/*.test.ts(x)`、`src/test/*`。
- 测试：
  - 机器：`completed` 屏蔽 timeout/exit、保留 emergency；急症确认/误报恢复转移；优先级 emergency>exit>timeout（Wave1 后即可起）。
  - `useVisitCountdown`：5min/2min 阈值、暂停不递减、恢复重读、到期 onExpire。
  - 退出结算：四档后果文案派生。
  - 只读：`ReadonlyVisitPage` 不渲染输入框、不发起主循环。
  - 急症：abort stream + overlay（已有 1 个，扩展）。

## 3. 文档同步（主 agent / 收尾）

- 改正 `development-plan.md` L154 优先级表述为 `急症 > 退出 > 超时 > 阻塞卡 > 普通消息`，并删 P5.1–P5.4 与代码的顺序冲突。
- `map.md`：每波合入后更新「本次完成 / 未完成」与项目地图（新增文件、状态机/store/api 变化）。
- `detailed-design.md` / `ui-designs.md`：completed 停计时、急症恢复语义、超时阈值文案、退出后果四档落文档。
- 结项前产出 `special-designs/rest-api.md`（P6 范围，本计划不含）。

## 4. 关键不变量（所有 agent 遵守）

- 叶子 Overlay/Sheet/Page 只接 `open`/`onOpenChange`/数据/`onConfirm`，**不调 transport、不 import mock fixtures、不直接 `machine.send`**。
- 新增枚举/事件/卡片须同步 schema + fixtures + handler + 至少一个测试。
- 状态机是全局优先级的**唯一**执行点。
- 患者可见文案不出现 `lab_decision` / `emergencyPending` 等内部名。
- 每波合入跑与范围匹配的 `pnpm lint/test/build`。
