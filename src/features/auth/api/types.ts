/**
 * Auth 模块类型定义。
 *
 * 与后端 JWT 认证接口对齐，包含请求/响应类型及用户模型。
 */

/** 已认证用户信息（JWT payload 精简映射）。 */
export interface AuthUser {
  /** 用户 ID（后端分配）。 */
  id: string
  /** 手机号（脱敏）。 */
  phoneMasked: string
  /** 关联患者 ID，用于业务接口。 */
  patientId: string
  /** 真实姓名（可选，注册时可不填）。 */
  realName?: string
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

/** 注册请求。 */
export interface RegisterInput {
  phone: string
  password: string
  realName?: string
}

/** 登录/注册统一响应。 */
export interface AuthResponse {
  tokens: TokenPair
  user: AuthUser
}

/** Token 刷新请求。 */
export interface RefreshInput {
  refreshToken: string
}

/** Token 刷新响应。 */
export interface RefreshResponse {
  tokens: TokenPair
}
