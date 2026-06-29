import { mockDb } from "@/mocks/api/mock-db"
import type { AuthUser, TokenPair } from "@/features/auth/api/types"

/** 手机号脱敏：保留前 3 后 4。 */
function maskPhone(phone: string): string {
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

/**
 * POST /auth/register
 */
export function handleRegister(body: unknown) {
  const { phone, password, realName } = body as {
    phone: string
    password: string
    realName?: string
  }

  const result = mockDb.register({ phone, password, realName })

  const tokens: TokenPair = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: 900,
  }

  const authUser: AuthUser = {
    id: result.user.id,
    phoneMasked: maskPhone(result.user.phone),
    realName: result.user.realName,
    patientId: result.user.patientId,
  }

  return { tokens, user: authUser }
}

/**
 * POST /auth/login
 */
export function handleLogin(body: unknown) {
  const { phone, password } = body as { phone: string; password: string }

  const result = mockDb.login({ phone, password })

  const tokens: TokenPair = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: 900,
  }

  const authUser: AuthUser = {
    id: result.user.id,
    phoneMasked: maskPhone(result.user.phone),
    realName: result.user.realName,
    patientId: result.user.patientId,
  }

  return { tokens, user: authUser }
}

/**
 * POST /auth/refresh
 */
export function handleRefresh(body: unknown) {
  const { refreshToken } = body as { refreshToken: string }

  const result = mockDb.refreshToken(refreshToken)

  const tokens: TokenPair = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: 900,
  }

  return { tokens }
}

/**
 * POST /auth/logout
 */
export function handleLogout(body: unknown) {
  const { refreshToken } = body as { refreshToken?: string }
  if (refreshToken) {
    mockDb.logout(refreshToken)
  }
  return { success: true }
}
