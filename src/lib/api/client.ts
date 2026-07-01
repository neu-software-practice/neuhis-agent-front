import { fetchEventSource } from "@microsoft/fetch-event-source"
import ky from "ky"

import { apiConfig } from "@/lib/api/config"
import { getTransport } from "@/lib/api"
import { createApiError, toApiError, throwApiError } from "@/lib/api/errors"
import type {
  ApiTransport,
  RequestOptions,
  StreamHandlers,
} from "@/lib/api/transport"
import type { ApiError } from "@/lib/api/types"
import { useAuthStore } from "@/features/auth/store/auth-store"
import type { TokenPair } from "@/features/auth/api/types"

// ── Auth helpers ──

/** 不需要注入 token 的路径前缀。 */
const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"]

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path.startsWith(p))
}

function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken
}

/**
 * 尝试使用 refreshToken 获取新 token pair。
 * 成功返回 true（store 已更新），失败返回 false 并触发 logout。
 */
let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  // 避免并发多次 refresh
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const { refreshToken, updateTokens, logout } = useAuthStore.getState()
    if (!refreshToken) {
      logout()
      return false
    }

    try {
      const res = await getTransport().post<TokenPair>("/auth/refresh", { refreshToken })
      updateTokens(res)
      return true
    } catch {
      logout()
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// ── Transport utilities ──

function normalizeSearchParams(options?: RequestOptions) {
  const searchParams = options?.searchParams
  if (!searchParams) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(searchParams)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  )
}

async function normalizeHttpError(error: unknown): Promise<ApiError> {
  if (
    error instanceof Error &&
    "response" in error &&
    error.response instanceof Response
  ) {
    const details = await error.response.json().catch(() => undefined)
    return createApiError({
      code: `HTTP_${error.response.status}`,
      message: "请求失败，请稍后重试",
      status: error.response.status,
      details,
      retriable: error.response.status >= 500,
    })
  }

  return toApiError(error)
}

const httpClient = ky.create({
  prefix: apiConfig.baseUrl.replace(/^\//, ""),
  timeout: 30_000,
})

async function request<T>(
  method: "get" | "post" | "patch" | "delete" | "put",
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const authHeaders: Record<string, string> = {}
  if (!isPublicPath(path)) {
    const token = getAccessToken()
    if (token) {
      authHeaders["Authorization"] = `Bearer ${token}`
    }
  }

  try {
    return await httpClient(path.replace(/^\//, ""), {
      method,
      json: body,
      searchParams: normalizeSearchParams(options),
      headers: { ...authHeaders, ...options?.headers },
      signal: options?.signal,
    }).json<T>()
  } catch (error) {
    // 401 自动 refresh + retry（仅非公开路径）
    if (
      !isPublicPath(path) &&
      error instanceof Error &&
      "response" in error &&
      (error as { response?: Response }).response?.status === 401
    ) {
      const refreshed = await tryRefreshToken()
      if (refreshed) {
        const retryToken = getAccessToken()
        return await httpClient(path.replace(/^\//, ""), {
          method,
          json: body,
          searchParams: normalizeSearchParams(options),
          headers: {
            ...options?.headers,
            ...(retryToken ? { Authorization: `Bearer ${retryToken}` } : {}),
          },
          signal: options?.signal,
        }).json<T>()
      }
    }
    throwApiError(await normalizeHttpError(error))
  }
}

export function createHttpTransport(): ApiTransport {
  return {
    get: (path, options) => request("get", path, undefined, options),
    post: (path, body, options) => request("post", path, body, options),
    patch: (path, body, options) => request("patch", path, body, options),
    put: (path, body, options) => request("put", path, body, options),
    delete: (path, options) => request("delete", path, undefined, options),
    async stream<TEvent>(
      path: string,
      body: unknown,
      handlers: StreamHandlers<TEvent>,
    ) {
      try {
        const token = getAccessToken()
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        }
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }

        await fetchEventSource(`${apiConfig.baseUrl}${path}`, {
          method: "POST",
          body: JSON.stringify(body),
          headers,
          signal: handlers.signal,
          onopen: async () => {
            handlers.onOpen?.()
          },
          onmessage: (message) => {
            if (!message.data) {
              return
            }
            handlers.onEvent?.(JSON.parse(message.data) as TEvent)
          },
          onerror: (error) => {
            handlers.onError?.(toApiError(error))
            throw error
          },
        })
        handlers.onDone?.()
      } catch (error) {
        if (handlers.signal?.aborted) {
          return
        }
        handlers.onError?.(toApiError(error))
      }
    },
  }
}
