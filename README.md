# 东软云脑智能医疗 (NEUHIS Agent)

<p align="center">
  <strong>AI + 诊疗的智能医疗平台</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/react-19-58c4dc?logo=react" alt="React 19" /></a>
  <a href="#"><img src="https://img.shields.io/badge/typescript-6-3178c6?logo=typescript" alt="TypeScript 6" /></a>
  <a href="#"><img src="https://img.shields.io/badge/vite-8-646cff?logo=vite" alt="Vite 8" /></a>
  <a href="#"><img src="https://img.shields.io/badge/tailwindcss-4-06b6d4?logo=tailwindcss" alt="Tailwind CSS 4" /></a>
  <a href="#"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" /></a>
</p>

---

## 项目简介

**东软云脑智能医疗**（NEUHIS Agent）是一款基于 AI 驱动的智能问诊平台，采用**前后端分离架构**。前端提供人机交互的 Agentic 聊天界面，支持实时流式 AI 对话、患者身份核验、检验决策推送、支付取药全流程闭环，以及管理后台的运维监控能力。

本项目为 **NEUHIS** （Neusoft Electronic Universal Healthcare Information System）生态的前端组成部分，是东北大学软件学院软件系统开发实训课程实践项目。

---

## 功能特性

### 患者端

| 模块 | 功能 |
|------|------|
| **AI 智能问诊** | 基于大语言模型的流式对话问诊，支持 SSE 实时推送 |
| **身份核验与注册登录** | JWT 双令牌认证（accessToken + refreshToken 自动续期） |
| **就诊工作台** | 实时聊天、检验检查决策、支付结算、药品配送、治疗处置一体化界面 |
| **就诊历史** | 历史会话列表与只读回看，支持再次就诊 |
| **账单查询** | 历史账单记录查询 |
| **医嘱查询** | 历史医嘱记录查询 |
| **收货地址管理** | 药品配送地址的增删改查 |
| **个人中心** | 个人信息查看与编辑 |

### 管理后台

| 模块 | 功能 |
|------|------|
| **仪表盘** | 运营数据总览 |
| **患者管理** | 患者信息查询与管理 |
| **会话管理** | 全部就诊会话监控与查看 |
| **系统设置** | 系统参数配置 |

### 系统特性

- **桌面端 / 移动端自适应布局**，响应式设计
- **急症打断与超时处理机制**，保障诊疗安全
- **Mock 模式**，开发阶段无需后端即可独立运行
- **虚拟滚动**，长对话列表高性能渲染

---

## 技术栈

### 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| [React](https://react.dev/) | ^19.2.7 | UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) | ~6.0.2 | 类型安全 |
| [Vite](https://vite.dev/) | ^8.1.0 | 构建工具 |
| [pnpm](https://pnpm.io/) | — | 包管理器 |

### UI 与样式

| 技术 | 版本 | 用途 |
|------|------|------|
| [HeroUI](https://heroui.com/) | ^3.2.1 | 组件库 |
| [Tailwind CSS](https://tailwindcss.com/) | ^4.3.1 | 原子化样式 |
| [class-variance-authority](https://cva.style/) | ^0.7.1 | 组件变体管理 |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | ^3.6.0 | Tailwind 类名合并 |
| [lucide-react](https://lucide.dev/) | ^1.21.0 | 图标库 |
| [motion](https://motion.dev/) | ^12.41.0 | 动画引擎 |
| [radix-ui](https://www.radix-ui.com/) | ^1.6.0 | 无样式原语组件 |

### 状态管理与路由

| 技术 | 版本 | 用途 |
|------|------|------|
| [React Router](https://reactrouter.com/) | ^8.0.1 | 声明式路由（Data Router） |
| [TanStack Query](https://tanstack.com/query) | ^5.101.1 | 服务端状态管理 |
| [Zustand](https://github.com/pmndrs/zustand) | ^5.0.14 | 客户端轻量状态 |
| [XState](https://xstate.js.org/) | ^5.32.2 | 就诊流程状态机 |

### 网络与数据

| 技术 | 版本 | 用途 |
|------|------|------|
| [ky](https://github.com/sindresorhus/ky) | ^2.0.2 | HTTP 请求（REST） |
| [@microsoft/fetch-event-source](https://github.com/Azure/fetch-event-source) | ^2.0.1 | SSE 流式事件源 |
| [react-hook-form](https://react-hook-form.com/) | ^7.80.0 | 表单管理 |
| [zod](https://zod.dev/) | ^4.4.3 | 表单校验 |
| [react-virtuoso](https://virtuoso.dev/) | ^4.18.9 | 虚拟滚动（聊天列表） |

### 测试

| 技术 | 用途 |
|------|------|
| [Vitest](https://vitest.dev/) | 单元测试 |
| [Testing Library](https://testing-library.com/) | 组件测试 |
| [MSW](https://mswjs.io/) | Mock Service Worker |
| [jsdom](https://github.com/jsdom/jsdom) | DOM 环境模拟 |

---

## 快速开始

### 环境要求

- **Node.js** >= 20
- **pnpm**（推荐使用 corepack 启用：`corepack enable`）

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/neu-software-practice/neuhis-agent-front.git
cd neuhis-agent-front

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 根据需要编辑 .env 文件

# 4. 启动开发服务器（默认 Mock 模式）
pnpm dev
# → 浏览器打开 http://localhost:5173

# 5. 构建生产版本
pnpm build

# 6. 预览生产构建
pnpm preview

# 7. 运行测试
pnpm test

# 8. 代码检查
pnpm lint
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_MODE` | `mock` | API 模式：`mock`（模拟）或 `http`（真实后端） |
| `VITE_API_BASE_URL` | `/api` | 后端 API 基础路径 |
| `VITE_MOCK_DELAY_MS` | `400` | Mock 模式下的模拟延迟（毫秒） |
| `VITE_TIMELINE_POLL_INTERVAL_MS` | `5000` | 就诊时间线轮询间隔（毫秒） |

> 开发阶段默认使用 **Mock 模式**，内置完整的数据模拟层，无需后端即可独立运行全部前端功能。切换到 `VITE_API_MODE=http` 后连接真实后端。

---

## 项目结构

```
neuhis-agent-front/
├── agent-workspace/          # 设计文档与交互流程（功能设计、API 合约、需求分析等）
├── public/                   # 静态资源
├── src/
│   ├── app/                  # 应用入口（App 组件、路由定义、Provider 编排、错误边界）
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   └── error-boundary.tsx
│   ├── assets/               # 图片、字体等静态资源
│   ├── components/           # 通用 UI 组件
│   │   └── ui/               # 基础 UI 原子组件
│   ├── features/             # 业务功能模块（按领域拆分）
│   │   ├── auth/             # 认证（登录、注册、JWT 令牌管理）
│   │   ├── workbench/        # 就诊工作台（聊天、检验、支付、取药）
│   │   ├── visits/           # 就诊历史
│   │   ├── billing/          # 账单
│   │   ├── medical-orders/   # 医嘱
│   │   ├── patient/          # 患者信息
│   │   ├── admin/            # 管理后台
│   │   └── shared/           # 跨功能共享组件
│   ├── hooks/                # 全局共享 Hooks
│   ├── layouts/              # 布局组件（HomeLayout 等）
│   ├── lib/                  # 基础设施层
│   │   └── api/              # API 传输层（transport / client / config / schemas / errors）
│   ├── mocks/                # Mock 数据与模拟传输层
│   │   └── api/              # Mock 数据库、处理器、流模拟器
│   ├── pages/                # 页面级组件（按路由组织）
│   │   ├── home/             # 首页系列（首页、历史、账单、地址等）
│   │   ├── workbench/        # 工作台系列（新就诊、就诊、只读回看）
│   │   ├── auth/             # 认证页面（登录、注册）
│   │   └── admin/            # 管理后台页面（仪表盘、患者、会话、设置）
│   ├── test/                 # 测试工具与配置
│   ├── types/                # 全局类型定义
│   ├── globals.css           # 全局样式（Tailwind 入口）
│   └── main.tsx              # Vite 应用入口
├── .env.example              # 环境变量模板
├── vite.config.ts            # Vite 配置
├── tsconfig.json             # TypeScript 配置
└── package.json
```

---

## 架构设计

### 分层架构

```
Pages                    ← 页面级组件，组合 Features，绑定路由
  │
  ▼
Features                 ← 业务模块，每个模块内部含：
  ├── components/        ← 领域组件
  ├── hooks/             ← 领域 Hooks
  ├── api/               ← 领域 API 函数
  ├── machine/           ← XState 状态机（就诊流程）
  └── store/             ← Zustand 状态（客户端状态）
  │
  ▼
API Layer (lib/api)      ← 统一传输层抽象
  ├── transport.ts       ← ApiTransport 接口定义
  ├── client.ts          ← HTTP 实现（ky + fetch-event-source）
  ├── config.ts          ← 配置（模式、基址）
  └── schemas/errors/    ← 校验与错误处理
  │
  ▼
Transport                ← 根据 mode 切换
  ├── HTTP (ky)          ← 真实后端通信
  └── Mock (mock-db)     ← 开发阶段模拟
```

### 关键设计决策

- **传输层抽象**：通过 `ApiTransport` 接口解耦业务代码与底层通信，支持 `mock` / `http` 两种模式零成本切换。
- **就诊流程状态机**：使用 XState 建模问诊全生命周期（问诊中、检验决策、处置、急症打断等），状态流转可预测、可测试。
- **JWT 双令牌认证**：accessToken（短期） + refreshToken（长期），客户端自动检测 401 并静默续期，用户无感。
- **流式 AI 回复**：基于 `@microsoft/fetch-event-source` 实现 SSE 流式读取，逐块渲染 AI 回复内容。
- **管理后台懒加载**：Admin 相关页面通过动态导入分离 bundle，不影响患者端首屏加载性能。

---

## 相关仓库

| 项目 | 仓库地址 | 说明 |
|------|----------|------|
| **前端** | [neuhis-agent-front](https://github.com/neu-software-practice/neuhis-agent-front) | 本仓库 |
| **后端** | [software-practice-backend](https://github.com/neu-software-practice/software-practice-backend) | 后端 API 服务（Go Gin） |
| **AI Agent** | [medAgent](https://github.com/neu-software-practice/medAgent) | AI 诊疗决策引擎（Go），问诊编排与决策分发 |

---

## 文档

项目详细的架构设计、交互流程、API 合约等技术文档位于 `agent-workspace/` 目录：

| 文档 | 说明 |
|------|------|
| `map.md` | 项目代码地图与完成状态 |
| `tech-selection.md` | 技术选型与依赖用途说明 |
| `interaction-flow.md` | 患者端完整业务流程 |
| `core-interaction-flow.md` | 核心卡片流转与自动复诊 |
| `detailed-design.md` | 前端详细设计（目录、API Facade、状态机、Hooks 等） |
| `requirements-analysis.md` | 患者端需求分析 |
| `ui-designs.md` | UI 设计文档（页面清单、信息架构） |
| `medagent-backend.md` | medAgent 诊疗流程与功能设计 |
| `component-code-conventions.md` | 组件代码设计约定 |
| `special-designs/` | 各版本 API 合约补丁文档 |

---

## 许可证

本项目基于 [MIT License](./LICENSE) 开源。

```
MIT License

Copyright (c) 2026 Kirikaze Chiyuki & NEUHIS development team
```

---

## 开发团队

本项目为 **东北大学软件学院** 软件系统开发实训课程实践项目，由 NEUHIS 开发团队维护。

---

## 快速导航

- [New Issue](https://github.com/neu-software-practice/neuhis-agent-front/issues/new)
- [Project Board](https://github.com/neu-software-practice/neuhis-agent-front/projects)
