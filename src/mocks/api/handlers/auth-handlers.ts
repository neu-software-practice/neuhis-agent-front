import { mockDb } from "@/mocks/api/mock-db"
import type { AuthUser } from "@/features/auth/api/types"

/**
 * POST /auth/register
 *
 * 返回扁平结构：{ accessToken, refreshToken, expiresIn, user }
 */
export function handleRegister(body: unknown) {
  const { phone, password, realName } = body as {
    phone: string
    password: string
    realName?: string
  }

  const result = mockDb.register({ phone, password, realName })

  const authUser: AuthUser = {
    userId: result.user.id,
    phone: result.user.phone,
    realName: result.user.realName,
    patientId: result.user.patientId,
    createdAt: result.user.createdAt,
  }

  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: 900,
    user: authUser,
  }
}

/**
 * POST /auth/login
 *
 * 返回扁平结构：{ accessToken, refreshToken, expiresIn, user }
 */
export function handleLogin(body: unknown) {
  const { phone, password } = body as { phone: string; password: string }

  const result = mockDb.login({ phone, password })

  const authUser: AuthUser = {
    userId: result.user.id,
    phone: result.user.phone,
    realName: result.user.realName,
    patientId: result.user.patientId,
    createdAt: result.user.createdAt,
  }

  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: 900,
    user: authUser,
  }
}

/**
 * POST /auth/refresh
 *
 * 返回扁平结构：{ accessToken, refreshToken, expiresIn }
 */
export function handleRefresh(body: unknown) {
  const { refreshToken } = body as { refreshToken: string }

  const result = mockDb.refreshToken(refreshToken)

  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: 900,
  }
}

/**
 * POST /auth/logout
 *
 * 返回 204 No Content（空响应体）。
 */
export function handleLogout(body: unknown) {
  const { refreshToken } = body as { refreshToken?: string }
  if (refreshToken) {
    mockDb.logout(refreshToken)
  }
  // 204 No Content: 返回 undefined，由 mock-transport 转换为空响应
}
