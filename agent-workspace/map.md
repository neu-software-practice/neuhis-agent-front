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
    designs/api.md          # 统一 API 请求层设计
    designs/ui-design.md    # 用户界面设计：主页 + 工作台页（内容与组件排布）
    interaction-flow.md      # 患者端完整业务流程、检验子流程、急症/超时/退出机制、Agent 决策主循环
    core-interaction-flow.md # 核心卡片流转、阻塞卡、完成后自动复诊和全局打断/升级机制
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

- [完整交互流程](./interaction-flow.md)
- [核心交互流程](./core-interaction-flow.md)
- [患者端需求分析](./requirements-analysis.md)
- [技术选型](./tech-selection.md)
- [统一 API 请求层设计](./designs/api.md)
- [用户界面设计](./designs/ui-design.md)

## 本次完成

- 基于更新后的 `interaction-flow.md` 与 `core-interaction-flow.md` 重做患者端需求分析。
- 新版需求分析补齐新出诊/复诊入口、Agent 决策主循环、追问/检验轮次上限、检验纯执行子流程、随访复诊、急症并行监听、单一总超时和主动退出结算规则。
- 更新文档索引，移除旧 `interact-flow.md` 引用并加入 `core-interaction-flow.md`。

## 上次完成

- 编写用户界面设计文档：拆解主页（就诊入口 + 历史中心）与工作台页（聊天时间线 + 流程卡片混排），覆盖桌面/移动响应式布局、信息架构、组件排布、卡片与全局打断的界面表达，仅做内容与排布设计，不做风格设计。
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
- 需求分析已更新，但 `designs/api.md` 与 `designs/ui-design.md` 还需要在后续实现前按新版状态/事件进一步细化接口字段和界面状态映射。
