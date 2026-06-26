# 项目地图

更新时间：2026-06-26

## 项目定位

NEUHIS Agent 前端是一个 React + HeroUI 3 + Magic UI 的 AI 诊疗 Agent 聊天界面。核心体验围绕患者与 AI 的连续问诊、流程卡片决策、检验缴费、确诊处置、急症打断、超时升级和主动退出结算展开。

## 当前代码结构

```text
.
  src/
    App.tsx                  # Vite 默认示例页，尚未替换为业务界面
    main.tsx                 # React 入口
    globals.css              # Tailwind 4、HeroUI、shadcn 设计变量入口
    components/ui/button.tsx # shadcn 风格 Button
    components/ui/button-variants.ts # Button 样式 variants
    lib/utils.ts             # cn 工具函数
    test/setup.ts            # Vitest + jest-dom 初始化
  agent-workspace/
    special-designs/api.md  # 前端 API 合约与 Mock 设计，含 REST/SSE contract 和结项 REST 文档要求
    interaction-flow.md      # 患者端完整业务流程、检验子流程、急症/超时/退出机制、Agent 决策主循环
    core-interaction-flow.md # 核心卡片流转、阻塞卡、完成后自动复诊和全局打断/升级机制
    requirements-analysis.md # 患者端需求分析，基于交互流程文档拆解范围、规则和验收
    ui-designs.md            # UI 设计文档，含患者视角原则、页面清单、路由映射、ASCII 草图、输入辅助和跳转关系
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
- [技术选型](./tech-selection.md)
- [前端 API 合约与 Mock 设计](./special-designs/api.md)

## 本次完成

- 将特殊设计目录统一为 `agent-workspace/special-designs/`。
- 更新 API 设计职责：接口 contract 由前端先定义，mock、MSW 和 HTTP transport 共用同一套 REST/SSE schema。
- 记录结项交付要求：项目结项后需产出 `agent-workspace/special-designs/rest-api.md` 作为 REST API 文档。
- 新增 `agent-workspace/ui-designs.md`，作为东软云脑智能医疗患者端 UI 设计文档。
- UI 设计文档从患者任务出发，明确主线优先、用户触发、输入减负、渐进露出和避免喧宾夺主等界面原则。
- 首页设计补充继续问诊、常见症状入口、最近一次复诊提醒；完整历史集中在 `HOME-HISTORY`，不放入工作台主界面。
- 工作台设计补充移动端默认收起的本次上下文摘要、症状 chip、快速回答、补充资料入口、完成后复诊 chip 和阻塞卡隐藏辅助控件规则。
- 草图保持高保真 HTML 原型的固定顶栏、虚拟滚动时间线、阻塞锁定栏、底部输入、急症/超时 Overlay 和退出 Sheet 结构。

## 上次完成

- 从文档树中移除旧 UI 设计文档路径，并清理 AGENTS、需求分析和项目地图中的对应引用。
- 基于更新后的 `interaction-flow.md` 与 `core-interaction-flow.md` 重做患者端需求分析。
- 新版需求分析补齐新出诊/复诊入口、Agent 决策主循环、追问/检验轮次上限、检验纯执行子流程、随访复诊、急症并行监听、单一总超时和主动退出结算规则。
- 更新文档索引，移除旧 `interact-flow.md` 引用并加入 `core-interaction-flow.md`。
- 一次性安装前端基础架构依赖。
- 新增 Vitest 测试配置和 Testing Library 初始化。
- 配置 ESLint/Vitest 忽略 `references/`，避免第三方源码参与本项目验证。
- 拆分 Button variants，修复 Fast Refresh lint 规则。
- 编写技术选型文档，明确状态管理、网络请求、流式响应、表单校验、流程状态机、Magic UI、测试 mock 的使用边界。
- 编写前端 API 合约与 Mock 设计，规划真实 HTTP 请求和 mock 数据的统一 facade。
- 编写患者端需求分析，基于交互流程文档拆解主流程、阻塞卡、全局打断、数据对象、验收标准和待确认问题。
- 按项目规范将新增依赖源码浅克隆到 `references/`。

## 本次未完成

- 业务页面仍是 Vite 默认示例，尚未开始实现 Agent 聊天界面。
- 尚未创建应用级 Provider、路由表、API 客户端、QueryClient、状态机和 store。
- 尚未实现 `agent-workspace/special-designs/api.md` 中的统一请求层与 mock transport。
- Magic UI 组件尚未实际复制进 `src/components/ui`，后续按聊天界面需要引入。
- 需求分析已更新，`special-designs/api.md` 已改为由前端先行定义 REST/SSE contract；后续实现时需继续细化 schema 并在结项输出 REST API 文档。
- 本次仅完成 UI 设计文档，尚未实现首页和工作台业务界面。
