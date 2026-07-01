/**
 * Auth 模块类型定义。
 *
 * 与后端 JWT 认证接口对齐，包含请求/响应类型及用户模型。
 */

/** 已认证用户信息（JWT payload 精简映射）。 */
export interface AuthUser {
  /** 用户 ID（后端分配）。 */
  userId: string
  /** 关联患者 ID，用于业务接口。 */
  patientId: string
  /** 手机号。 */
  phone: string
  /** 真实姓名（可选，注册时可不填）。 */
  realName?: string
  /** 账号创建时间。 */
  createdAt?: string
}

/** Token 对。 */
export interface TokenPair {
  accessToken: string
  refreshToken: string
  /** accessToken 有效期（秒）。 */
  expiresIn: number
}

/** 登录请求。 */
export interface LoginInput {
  phone: string
  password: string
}

/** 注册请求（提交后端的字段）。 */
export interface RegisterInput {
  phone: string
  password: string
  realName?: string
}

/** 注册表单（含前端校验用字段，不发送至 API）。 */
export interface RegisterFormValues {
  phone: string
  password: string
  confirmPassword: string
  realName?: string
}

/** 登录/注册统一响应（扁平结构）。 */
export type AuthResponse = TokenPair & { user: AuthUser }

/** Token 刷新请求。 */
export interface RefreshInput {
  refreshToken: string
}

/** Token 刷新响应（扁平结构，同 TokenPair）。 */
export type RefreshResponse = TokenPair
