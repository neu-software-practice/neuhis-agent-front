# 项目地图

更新时间：2026-06-28

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
    detailed-design.md       # 前端详细设计，含目录分层、组件拆分、API facade、状态机、hooks、mock 和测试策略
    component-code-conventions.md # 组件代码设计通用约定，含 props、事件、状态来源、HeroUI/Magic UI、测试约定
    development-plan.md      # 详细开发计划，含 P0-P6 编号任务、依赖关系和 subagent 并行调度建议
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
- [前端详细设计](./detailed-design.md)
- [组件代码设计通用约定](./component-code-conventions.md)
- [详细开发计划](./development-plan.md)
- [技术选型](./tech-selection.md)
- [前端 API 合约与 Mock 设计](./special-designs/api.md)

## 本次完成

- 结合 `agent-workspace/special-designs/api.md` 更新 `agent-workspace/development-plan.md` 为“数据先行”版本。
- 明确 `P1` 只做最小运行壳，业务页面、状态机、流程卡必须等待 REST/SSE contract、Zod schema、fixtures、mock-db 和 facade 稳定后再消费。
- 新增 `P2.0 数据契约清单和样例矩阵`，要求先整理 endpoint、核心实体、状态枚举、SSE 事件、典型流程样例和 medAgent 能力边界。
- 调整总依赖图、并行启动窗口、阶段合并顺序、P2/P3 任务依赖和首批执行顺序，确保 mock 与 UI 不再先行定义临时数据结构。
- 同步更新本文档地图，记录本次只完成开发计划文档调整，不改动运行时代码。

## 本次未完成

- 未改动业务组件代码；当前项目仍是 Vite 示例页，尚未落地问诊工作台组件。
- 未启动 subagent 并行实现；本次仅完成开发计划的数据先行重排。
- 未落地 `P2.0` 对应的实际 schema / fixture 清单代码；下一步应从数据契约清单开始实现。
- 未新增测试；本次为计划文档，不涉及运行时代码。
