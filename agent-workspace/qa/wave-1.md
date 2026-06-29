# QA Wave 1：工作台患者视角走查

日期：2026-06-29  
范围：5174 dev server，患者从首页进入问诊、阻塞卡处理、上下文抽屉、主动退出、完成后追问等关键路径。

## 走查结论

本轮发现的问题集中在两类：

1. 患者视角的流程闭环不完整：主动退出、阻塞疑问、完成后追问存在“点了没反馈”或错误跳转。
2. 时间线和覆盖层的展示不符合真实问诊语义：流程卡顺序错误、Drawer 文案不可读、图标含义不清。

本轮已完成同类代码收口：工作台 Header、底部 Drawer、阻塞问题流、完成态消息分流、mock 流程卡时间戳、ESLint 忽略非源码工作树。

## 问题与修复

### 1. 血常规流程卡出现在医生说明之前

现象：

- 新建问诊后，患者看到“建议进行血常规检验”卡片排在 AI 医生说明之前。
- 这不符合时间线语义，正确顺序应为：患者主诉 → AI 解释为什么建议检验 → 检验决策卡。

根因：

- mock 流程卡 fixture 的 `createdAt` 固定为 `2026-06-28T02:00:00.000Z`。
- 前端 `flattenTimelinePages` 会按 `createdAt` 升序排序。
- 新生成的 AI 消息使用当前时间，固定旧时间的流程卡因此被排序到前面。

解决：

- 在 `mock-db.cardItem()` 中统一刷新进入时间线的 `card.createdAt` 和 timeline item `createdAt`。
- 对 `lab_execution.resultReturnedAt`、`completed_visit.completedAt` 这类展示时间同步刷新。
- 在 `stream-simulator` 的 card 事件中优先带上 `result.timelineItems` 里的真实 timeline item，避免前端用 fixture 时间临时构造卡片。

同类覆盖：

- 检验决策卡、支付卡、检验执行卡、诊断卡、处置方案卡、取药卡、治疗执行卡、完成卡均通过 `cardItem()` 统一入时间线。

### 2. 退出问诊确认后没有可见结果

现象：

- 点击右上角 `X` 后能弹出确认 Sheet。
- 点击“确认退出”后页面仍停在工作台，输入框消失但 header 和时间线保留，用户感知为“确认退出点不了”。

根因：

- `confirmExit()` 只调用 `exitVisit` 并发送状态机事件，未把后端返回的 terminal timeline item 合并到当前 cache。
- 页面确认回调未在退出成功后导航到首页。

解决：

- `confirmExit()` 合并 `exitVisit` 返回的 terminal item。
- 退出后 invalidate 当前 session 和列表 query。
- `WorkbenchPage` 在确认退出成功后关闭 Sheet 并 `navigate("/")`。

同类覆盖：

- `ExitVisitSheet` 增加显式 handle / close trigger，并修复底部 Drawer 文字颜色。

### 3. “我有疑问”提交后没有反馈

现象：

- 阻塞卡底部点击“我有疑问”，输入疑问后 Sheet 关闭。
- 时间线没有展示患者问题，也没有 AI 回答。

根因：

- 之前复用了 `sendMessage()`，在阻塞态下会进入主问诊发送语义，状态机又阻止主流程推进，导致用户看不到明确反馈。
- 已有 `askLockedQuestion` API/stream contract，但 Workbench 未接入。

解决：

- `useWorkbenchSession` 新增 `askLockedQuestion(content, cardId)`。
- 阻塞疑问走 `/lock-question` 流式回复，不推进主问诊状态机。
- 时间线追加患者问题和 AI 回复，卡片仍保持 pending，患者可以继续处理卡片。

同类覆盖：

- `useAssistantStream.startStream()` 支持 `assistant`、`consultation`、`lock-question` 三种模式。

### 4. 上下文 Drawer 内容几乎不可读

现象：

- 点击上下文摘要条后，底部 Drawer 打开。
- 患者编号、主诉、轮次、超时时间在白底上接近白色，难以阅读。

根因：

- HeroUI Drawer 默认样式与当前 Tailwind/shadcn 变量混用时，内容颜色未稳定继承项目主题。

解决：

- `ContextSummaryDrawer`、`LockQuestionSheet`、`ExitVisitSheet` 的 `Drawer.Dialog` 显式设置 `bg-background text-foreground shadow-xl`。
- 详情值显式使用 `text-foreground`，说明文本统一使用 `text-muted-foreground`。

同类覆盖：

- 工作台内全部底部 Drawer 一并检查并修复，不只修上下文抽屉。

### 5. 右上角盾牌图标意义不明

现象：

- Header 右侧仅显示盾牌图标，用户不清楚它是安全状态、隐私保护还是急症入口。

解决：

- 将图标替换为 `ShieldAlert`。
- 文案从仅图标改为图标 + “急症”。
- `aria-label` 和 `title` 改为“急症求助”。

同类覆盖：

- 暂停、恢复、退出按钮补充 `title`，降低纯图标按钮理解成本。

### 6. 新建问诊显示第 0 轮

现象：

- 从首页带主诉新建问诊后，顶部上下文显示“第0轮”。

根因：

- mock `createSession()` 写入首条患者消息，但 `askRound` 仍初始化为 0。

解决：

- 新建问诊带 `chiefComplaint` 时 `askRound` 初始化为 1。
- `summary.lastMessage` 同步写为首条主诉。

同类覆盖：

- `createFollowUp()` 同步处理：带复诊主诉时写入患者消息、`askRound = 1`、`lastMessage = chiefComplaint`。

### 7. 完成后追问可能跳到“未找到问诊会话”

现象：

- 完成态输入“还需要吃几天药？”后，页面进入加载，随后显示“加载失败 / 未找到问诊会话”。

根因：

- 完成态发送分流依赖本地状态机状态；如果 hydration/状态同步未及时完成，可能走普通问诊消息分支。
- follow-up 新会话创建后只写入 session cache，没有同步写入该新 session 的 timeline cache，路由切换后存在数据缺口。

解决：

- `sendMessage()` 同时以 `stateLabel === "completed"` 和 `session.status === "completed"` 判断完成态。
- 创建 follow-up 后同时写入 `visitsQueryKeys.session()` 和 `workbenchQueryKeys.timeline()` cache。

同类覆盖：

- mock `createFollowUp()` 补首条患者消息，避免复诊进入后无触发内容。

### 8. ESLint 扫描 `.agents/worktrees` 导致 lint 失败

现象：

- `pnpm lint` 扫描 `.agents/worktrees/session-idle-suspend` 后，typescript-eslint 报多个 TSConfigRootDir。

根因：

- `.agents` 是开发辅助工作树，不属于当前项目源码，但未在 ESLint global ignores 中排除。

解决：

- `eslint.config.js` 的 `globalIgnores` 增加 `.agents`。

## 已验证

命令验证：

```bash
pnpm tsc --noEmit
pnpm lint
pnpm test -- --runInBand
```

结果：

- `pnpm tsc --noEmit` 通过。
- `pnpm lint` 通过。
- `pnpm test -- --runInBand` 通过，11 个测试文件 / 105 个测试。

浏览器验证：

- 新建问诊后，时间线顺序已变为“患者主诉 → AI 说明 → 血常规检验卡”。
- 上下文 Drawer 文字可读。
- 阻塞疑问提交后，时间线展示患者问题和 AI 回复。
- 退出 Sheet 点击“确认退出”后返回首页。
- Header 急症入口已显示“急症”文本，不再是含义不明的纯盾牌。

## 未覆盖 / 后续建议

- 本轮未继续完整复测完成态追问，因为用户要求停止浏览器复测并直接写报告；代码层已修复完成态分流与 follow-up timeline cache。
- 首页/工作台快照仍显示根容器被 accessibility tree 标为 `clickable [onclick]`，需后续单独排查是否来自 HeroUI/TanStack devtools 或外层事件代理，当前未发现阻断实际点击。
- 底部 LockBar 与长流程卡的间距已通过 timeline footer spacer 缓解；后续可再做移动端小屏截图矩阵验证。
