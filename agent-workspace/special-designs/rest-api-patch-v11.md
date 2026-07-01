# REST API Patch v11 — VisitSession 新增 `patientName` 字段

日期：2026-07-01

## 变更概述

当前所有会诊会话接口返回的 `VisitSession` / `VisitSessionSummary` 仅携带 `patientId`（机器标识），前端工作台侧边栏、上下文摘要条、上下文 Drawer 展示患者信息时需要患者姓名，但因接口未返回姓名字段，前端只能退化展示 `patientId`（如 `"patient-mock-001"`），**对患者不可读**。

本次变更：

1. `VisitSession` 和 `VisitSessionSummary` 新增 **必填** 字段 `patientName: string`
2. 后端在构造/返回 Session 时，用 `patientId` 查 `PatientProfile.name` 填入 `patientName`
3. `PatientProfile` 模型**保持不变**

---

## 问题描述（当前实现缺陷）

- 工作台侧边栏「患者」项展示的是 `patientId`（机器 ID），而非患者真实姓名
- 上下文摘要条（`ContextSummaryBar`）展示 "患者: patient-mock-001"
- 历史就诊回看页同此问题
- 管理员后台的 session 列表已自行补充了 `patientName`（v8），但患者端 session 接口未跟进

---

## 受影响端点

以下端点的**响应体**中 `session` 对象新增 `patientName` 字段（嵌套在 `data` 内，`success: true` 时）：

### `GET /visits`

返回 `items[].patientName: string`（`VisitSessionSummary` 新增字段）。

### `GET /visits/:sessionId`

返回 `patientName: string`（`VisitSession` 新增字段）。

### `POST /visits`

返回 `session.patientName: string`（`CreateSessionResult.session` 新增字段）。

### `POST /visits/:sessionId/follow-up`

同 `POST /visits`，返回 `session.patientName: string`。

### `GET /visits/:sessionId/snapshot`

返回 `session.patientName: string`（`VisitSnapshot.session` 新增字段）。

---

## 数据模型变更

### `VisitSession`（及 `VisitSessionSummary`）

新增字段（必填，由服务端自动填充，调用方**不传**）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `patientName` | `string` | ✅ | 患者真实姓名，由服务端按 `patientId` 查 `PatientProfile.name` 填入，与 `PatientProfile.name` 保持一致 |

### `PatientProfile`

**无变更。** 姓名仍由 `name: string` 承载。

---

## 创建 Session 时的行为

`POST /visits` 和 `POST /visits/:sessionId/follow-up` 请求体**不变**（调用方仍只传 `patientId`），服务端内部：

1. 按请求体中的 `patientId` 查找 `PatientProfile`
2. 复制 `PatientProfile.name` 写入新 Session 的 `patientName`
3. 若 `patientId` 对应的患者不存在，返回 404 `PATIENT_NOT_FOUND`

---

## 响应示例

```jsonc
// GET /visits/visit-mock-active — 200 OK
{
  "success": true,
  "data": {
    "id": "visit-mock-active",
    "patientId": "patient-mock-001",
    "patientName": "李明",
    "entryType": "new",
    "status": "chatting",
    "startedAt": "2026-06-28T01:50:00.000Z",
    "updatedAt": "2026-06-28T01:55:00.000Z",
    "askRound": 1,
    "askRoundLimit": 6,
    "labRound": 0,
    "labRoundLimit": 2,
    "timerPaused": false,
    "summary": {
      "chiefComplaint": "发热两天，伴咽痛",
      "lastMessage": "请继续描述体温最高多少度，以及是否咳嗽、胸闷。"
    }
  },
  "meta": null
}
```

---

## 兼容性

| 维度 | 处理 |
|------|------|
| 旧客户端（不消费 `patientName`） | 仅新增字段，**向后兼容**，旧客户端可忽略 |
| 新客户端 | 直接读取 `session.patientName` 展示 |
| `PatientProfile` | 不变 |
| Session 创建/复诊请求体 | 不变（调用方不传 `patientName`） |

---

## 前端已适配

前端已完成以下变更，等待后端对齐：

- `visitSessionBaseSchema` 新增 `patientName: z.string()`
- `visitSessionSummarySchema.pick()` 追加 `patientName: true`
- Mock 数据（fixture + mockDB.createSession / createFollowUp / listSessions）已同步填充 `patientName`
- `WorkbenchPage` / `ReadonlyVisitPage` 已将 `session?.patientId` 替换为 `session?.patientName`（侧边栏、摘要条、Drawer）

---

## 验证

- [ ] `POST /visits` 创建新会话后，返回的 `session.patientName` 等于对应用户的真实姓名
- [ ] `GET /visits/:id` 返回 `patientName` 字段
- [ ] `GET /visits` 列表中每个 `items[].patientName` 均有值
- [ ] `POST /visits/:id/follow-up` 创建复诊后返回的 `session.patientName` 与父会话一致
- [ ] `GET /visits/:id/snapshot` 返回 `session.patientName`
- [ ] `patientId` 不存在时创建会话返回 404（非 500）
