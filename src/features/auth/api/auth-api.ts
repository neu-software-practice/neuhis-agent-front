/**
 * Auth API facade。
 *
 * 封装登录、注册、刷新、退出接口调用。
 * 注意：login/register 成功后由调用方写入 auth-store，此处仅负责请求。
 */
import { getTransport } from "@/lib/api"

import type {
  AuthResponse,
  LoginInput,
  RefreshInput,
  RefreshResponse,
  RegisterInput,
} from "@/features/auth/api/types"

export const authApi = {
  /** 手机号 + 密码登录。 */
  login(input: LoginInput): Promise<AuthResponse> {
    return getTransport().post<AuthResponse>("/auth/login", input)
  },

  /** 手机号 + 密码注册（可选 realName）。 */
  register(input: RegisterInput): Promise<AuthResponse> {
    return getTransport().post<AuthResponse>("/auth/register", input)
  },

  /** 使用 refreshToken 获取新 token 对。 */
  refresh(input: RefreshInput): Promise<RefreshResponse> {
    return getTransport().post<RefreshResponse>("/auth/refresh", input)
  },

  /** 退出登录，服务端撤销 refreshToken。 */
  logout(refreshToken: string): Promise<void> {
    return getTransport().post<void>("/auth/logout", { refreshToken })
  },
}
