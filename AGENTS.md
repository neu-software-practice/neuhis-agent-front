# NEUHIS Agent 前端项目

产品名：**东软云脑智能医疗**（界面对外展示名称）。

随着人工智能、大数据和医疗信息化的发展，诊疗服务正从传统的“医生经验驱动、人工操作为主”逐步走向“数据驱动、AI 辅助、全流程协同”。

本平台围绕“AI+诊疗”展开，采用**前后端分离架构**。前端基于React框架+HeroUI 3+Magic UI，实现一个人机交互的Agentic聊天界面。

## 开发流程

项目采用编码Agent辅助开发。

每接到一个需求，先结合当前项目架构，进入规划模式规划，之后开始进行实现。

### 分支与隔离策略

接到新需求时，**必须在 worktree 中开发**，不得直接在 main 分支上编码。流程：

1. 使用 `EnterWorktree` 创建独立工作树（自动基于 main 新建分支）。
2. 在 worktree 中完成开发、测试、提交。
3. 开发完成后回到 main 分支，使用 `git cherry-pick` 或 `git merge` 将变更合入 main。
4. 确认合入无误后清理 worktree。

这样做的目的是保持 main 分支始终干净可用，避免半成品代码污染主线。

### 文档留痕

实现后务必**更新工作区内的文档**。代码地图、完成情况、本次实现了什么，没有实现什么——必须写在文档中。工作留痕。

references文件夹存放你需要的三方库的源代码。每给项目添加一个库，始终采用浅克隆把库源代码下载到该文件夹。开发中如有不理解的API可以随时查阅。

### 后端参考

- **medAgent**（`references/medAgent`）：后端的 AI 诊疗 Agent 模块（Go），负责问诊决策编排（问诊→收敛→处置→急症守护）。不是完整后端，而是后端中嵌入的 AI 决策引擎。前端 UI 流转（卡片、对话、检验、购药等）由该模块返回的 `Step.kind` 驱动。诊疗流程与功能设计见 `agent-workspace/medagent-backend.md`。

## 文档工作区

本AGENTS.md/CLAUDE.md文档仅为入口点。可以随时编辑改动。

agent-workspace 文件夹为你的开发辅助文档工作区。项目交互流程、代码地图、技术选型文档、需求分析文档、规划文档等——一切文档产出，均置于该文件夹。

### 项目地图

agent-workspace 是项目文档工作区，当前文档地图如下：

```text
agent-workspace/
  map.md                         # 项目代码地图、技术栈快照、完成/未完成事项
  special-decisions.md           # 用户对 agent 下达的特殊要求记录
  interaction-flow.md            # 患者端完整业务流程、检验子流程、全局打断/升级机制
  core-interaction-flow.md       # 核心卡片流转、阻塞卡片、完成后自动复诊
  tech-selection.md              # 前端技术选型、依赖用途、目录分层建议
  requirements-analysis.md       # 患者端需求分析，拆解范围、规则和验收
  ui-designs.md                  # UI 设计文档，页面清单、信息架构、ASCII 草图和跳转关系
  detailed-design.md             # 前端详细设计，目录分层、API facade、状态机、hooks、mock 和测试策略
  component-code-conventions.md  # 组件代码设计通用约定，props、事件、状态来源、样式和测试约定
  medagent-backend.md            # medAgent 诊疗流程与功能设计（后端参考，面向产品/功能设计者）
  special-designs/
    api.md                       # 前端 API 合约与 Mock 设计：前端先定义 REST/SSE contract，再 mock 和联调
    rest-api-patch-v2.md         # REST API Patch v2：updatePatientProfile 新增 medicalHistory 字段
    rest-api-patch-v3.md         # REST API Patch v3：JWT 认证体系（accessToken + refreshToken rotation）
    rest-api-patch-v4.md         # REST API Patch v4：会话标题生成（后端 LLM 总结问诊标题）
    rest-api-patch-v5.md         # REST API Patch v5：地址簿与药品配送地址
    rest-api-patch-v6.md         # REST API Patch v6：账单记录查询（GET /billing/records）
    rest-api-patch-v7.md         # REST API Patch v7：医嘱记录查询（GET /medical-orders）
    rest-api-patch-v8.md         # REST API Patch v8：管理后台（Admin Panel）10 端点
  无人医院_患者端_交互原型.html  # 患者端交互原型
```

维护规则：

- 每次实现后必须更新 `agent-workspace/map.md`。
- 技术选型、架构设计、流程分析等文档必须放在 `agent-workspace/` 下。
- 特殊设计文档优先放入 `agent-workspace/special-designs/`，并同步更新本地图。
- 涉及 API 接口的部分由本前端工程先定义 REST/SSE contract，并以该 contract 实现 mock；项目结项后必须产出一套 REST API 文档。

## 提交规范

```
<type>: <description>

[optional body]

Co-Authored-By: Model Name
```

**Type 类型**:

- `feat:` — 新功能
- `fix:` — Bug 修复
- `refactor:` — 重构（不改变行为）
- `docs:` — 文档
- `chore:` — 杂项（构建、依赖等）

**示例**:

```
feat: add DataFrame type with AES-CCM encrypt/decrypt

Co-Authored-By: DeepSeek V4 Pro
```

**注意**: 
对于 Claude Code，每个 commit message 末尾必须包含 `Co-Authored-By` trailer。模型名称需要参考运行环境提示中的 `You are powered by the model <实际的模型名称>`，不应该无脑认为自己是 `Claude Opus 4.8`。

对于 Codex，每个 commit message 末尾也必须包含 `Co-Authored-By` trailer，使用当前 Codex 模型身份。例如：Co-Authored-By: GPT-5.5 <codex@openai.com>
