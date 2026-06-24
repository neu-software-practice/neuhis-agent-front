# 项目地图

更新时间：2026-06-24

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
    designs/api.md          # 统一 API 请求层设计
    interact-flow.md         # 患者端主流程和全局打断机制
    requirements-analysis.md # 患者端需求分析，基于交互流程文档拆解范围、规则和验收
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

- [交互流程](./interact-flow.md)
- [患者端需求分析](./requirements-analysis.md)
- [技术选型](./tech-selection.md)
- [统一 API 请求层设计](./designs/api.md)

## 本次完成

- 一次性安装前端基础架构依赖。
- 新增 Vitest 测试配置和 Testing Library 初始化。
- 配置 ESLint/Vitest 忽略 `references/`，避免第三方源码参与本项目验证。
- 拆分 Button variants，修复 Fast Refresh lint 规则。
- 编写技术选型文档，明确状态管理、网络请求、流式响应、表单校验、流程状态机、Magic UI、测试 mock 的使用边界。
- 编写统一 API 请求层设计，规划真实服务器和 mock 数据的统一 facade。
- 编写患者端需求分析，基于交互流程文档拆解主流程、阻塞卡、全局打断、数据对象、验收标准和待确认问题。
- 按项目规范将新增依赖源码浅克隆到 `references/`。

## 本次未完成

- 业务页面仍是 Vite 默认示例，尚未开始实现 Agent 聊天界面。
- 尚未创建应用级 Provider、路由表、API 客户端、QueryClient、状态机和 store。
- 尚未实现 `agent-workspace/designs/api.md` 中的统一请求层。
- Magic UI 组件尚未实际复制进 `src/components/ui`，后续按聊天界面需要引入。
