# REST API Patch v10 — 修复注册接口：gender / birthDate 透传

日期：2026-07-01

## 变更概述

前端注册页面已收集 `gender`（性别描述）和 `birthDate`（出生日期，YYYY-MM-DD），但 `POST /auth/register` 的契约中缺少这两个字段，导致新建患者档案永远是 `gender: "unknown"`, `age: 0`。

本次变更：

1. `POST /auth/register` 请求体新增必填字段 `gender` + `birthDate`
2. 后端接收 `birthDate` 后计算 `age` 写入 `PatientProfile`（`PatientProfile` 模型**保持不变**，仍使用 `age: number`）
3. 后端接收 `gender` 后原样写入 `PatientProfile.gender`

---

## 问题描述（当前实现缺陷）

前端注册表单已完整收集性别 + 出生日期，但：

- `POST /auth/register` 的请求体 schema 未声明 `gender` / `birthDate`
- 后端 handler 未读这两个字段
- 创建新 `PatientProfile` 时硬编码 `gender: "unknown"`, `age: 0`

---

## 受影响端点

### `POST /auth/register`

#### 请求体（变更后）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `phone` | `string` | ✅ | 手机号，11 位中国大陆号码 |
| `password` | `string` | ✅ | 密码，最少 8 字符 |
| `realName` | `string` | ✅ | 真实姓名，trim 后 1-32 字符 |
| `gender` | `string` | ✅ | 性别描述，自由文本（如 `"男"`、`"女"` 或用户自定义）。trim 后最少 1 字符 |
| `birthDate` | `string` | ✅ | 出生日期，**YYYY-MM-DD** 格式（如 `"1990-05-15"`），需为合法日历日期 |

#### 行为语义

1. 校验 `birthDate` 格式：必须为合法 YYYY-MM-DD 日期（如 `"2016-02-30"` 返回 422）
2. 校验 `birthDate` 范围：不应为未来日期（建议 > today 返回 422）
3. 由 `birthDate` 计算 `age`：`age = 当前年份 - 出生月份已过 ? 0 : -1`，将结果写入 `PatientProfile.age`
4. 将 `gender` trim 后原样写入 `PatientProfile.gender`
5. 其余逻辑（phone 唯一性校验、User 创建、令牌签发）保持 v3 不变

#### 错误码（v10 新增）

| HTTP 状态码 | 错误码 | 说明 |
|-------------|--------|------|
| 422 | `VALIDATION_ERROR` | `birthDate` 格式非法 / 不存在该日期 / 未来日期；或 `gender` 为空/纯空白 |

#### 响应体（不变）

```jsonc
// 201 Created
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
  "expiresIn": 900,
  "user": {
    "userId": "u_abc123",
    "patientId": "p_xyz789",
    "phone": "13800138000",
    "realName": "张三"
  }
}
```

---

## 数据模型变更

**无 migration。** `PatientProfile` 模型保持不变（仍使用 `age: number`）。

后端需在注册 handler 中实现 `birthDate → age` 计算逻辑（出生日前已过则 `age = 当前年 - 出生年`，否则再减 1）。

---

## 前端已适配

前端已完成以下变更，等待后端对齐：

- `RegisterInput` 类型新增 `gender: string`、`birthDate: string`（required）
- `registerFormSchema` 新增 `gender`（必填非空）+ `birthDate`（必填，YYYY-MM-DD 格式）校验
- Mock handler / mockDb.register 已透传新字段并按后端逻辑将 `birthDate` 换算为 `age` 写入档案（作为后端联调参考）

---

## 兼容性

| 维度 | 处理 |
|------|------|
| 旧注册请求（不含 gender / birthDate） | 后端应返回 422（**破坏性变更**：自 v10 起注册接口新增 3 个必填字段） |
| `PatientProfile` schema | 不变（仍使用 `age: number`） |
| `GET /patients/:id/context` | 响应中 `PatientProfile` 结构不变 |

---

## 验证

- [ ] `POST /auth/register` 携带合法 `realName="张三"` `gender="男"` `birthDate="1990-05-15"`，新患者档案中 `gender="male"`, `age` 按当前年份正确计算
- [ ] `POST /auth/register` `birthDate="1990-02-30"` 返回 422 `VALIDATION_ERROR`（非法日期）
- [ ] `POST /auth/register` `birthDate="2099-01-01"` 返回 422（未来日期）
- [ ] `POST /auth/register` `gender="   "` 返回 422
- [ ] `POST /auth/register` 不传 `birthDate` / `gender` / `realName` 返回 422
- [ ] 令牌签发、重复手机号检测等 v3 原有行为不受影响
