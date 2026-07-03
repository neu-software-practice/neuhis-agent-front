import { fetchEventSource } from "@microsoft/fetch-event-source"
import ky from "ky"

import { apiConfig } from "@/lib/api/config"
import { createApiError, toApiError, throwApiError } from "@/lib/api/errors"
import { extractAllJson, parseFirstJson } from "@/lib/api/parse-json"
import type {
  ApiTransport,
  RequestOptions,
  StreamHandlers,
} from "@/lib/api/transport"
import type { ApiError } from "@/lib/api/types"
import { useAuthStore } from "@/features/auth/store/auth-store"
import type { TokenPair } from "@/features/auth/api/types"
import { useAdminAuthStore } from "@/features/admin/store/admin-auth-store"
import type { AdminTokenPair } from "@/features/admin/api/types"

// ── Auth helpers ──

/** 不需要注入 token 的路径。 */
const PATIENT_PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"]
const ADMIN_PUBLIC_PATHS = ["/admin/auth/login", "/admin/auth/refresh"]

function isPublicPath(path: string): boolean {
  return (
    PATIENT_PUBLIC_PATHS.some((p) => path.startsWith(p)) ||
    ADMIN_PUBLIC_PATHS.includes(path)
  )
}

function isAdminPath(path: string): boolean {
  return path.startsWith("/admin/")
}

function getPatientAccessToken(): string | null {
  return useAuthStore.getState().accessToken
}

function getAdminAccessToken(): string | null {
  return useAdminAuthStore.getState().accessToken
}

function getAccessTokenForPath(path: string): string | null {
  return isAdminPath(path) ? getAdminAccessToken() : getPatientAccessToken()
}

function getAuthHeaders(path: string): Record<string, string> {
  if (isPublicPath(path)) return {}

  const token = getAccessTokenForPath(path)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * 尝试使用 refreshToken 获取新 token pair。
 * 成功返回 true（store 已更新），失败返回 false 并触发 logout。
 */
let refreshPromise: Promise<boolean> | null = null
let adminRefreshPromise: Promise<boolean> | null = null

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
      const res = await request<TokenPair>("post", "/auth/refresh", { refreshToken })
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

async function tryRefreshAdminToken(): Promise<boolean> {
  // 避免并发多次 refresh
  if (adminRefreshPromise) return adminRefreshPromise

  adminRefreshPromise = (async () => {
    const { refreshToken, updateTokens, logout } = useAdminAuthStore.getState()
    if (!refreshToken) {
      logout()
      return false
    }

    try {
      const res = await request<{ tokens: AdminTokenPair }>(
        "post",
        "/admin/auth/refresh",
        { refreshToken },
      )
      updateTokens(res.tokens)
      return true
    } catch {
      logout()
      return false
    } finally {
      adminRefreshPromise = null
    }
  })()

  return adminRefreshPromise
}

// ── Key casing ──

/**
 * 将 PascalCase 字符串转换为 camelCase。
 * 仅将首字符小写；若首字符已小写则原样返回（幂等）。
 */
function pascalToCamel(key: string): string {
  if (key.length === 0) return key
  return key[0].toLowerCase() + key.slice(1)
}

/** 递归将对象/数组中所有 key 从 PascalCase 转换为 camelCase。 */
function camelizeKeys<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(camelizeKeys) as unknown as T
  if (typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[pascalToCamel(key)] = camelizeKeys(val)
    }
    return result as unknown as T
  }
  return value
}

// ── Envelope handling ──

interface ApiEnvelope<T = unknown> {
  success: boolean
  data: T | null
  error: { code: string; message: string } | null
  meta: unknown
}

/** 检测是否为信封格式：必须同时存在 success 和 data 两个顶层 key。 */
function isEnvelope(raw: unknown): raw is ApiEnvelope {
  return (
    raw !== null &&
    typeof raw === "object" &&
    "success" in raw &&
    "data" in raw
  )
}

/**
 * 按需解包后端响应。
 * - 信封格式 → 抽取 data，若 success=false 或 error 非空则抛 ApiError
 * - 非信封格式（扁平响应）→ 原样透传，保持向后兼容
 *
 * 信封内 data 的 key 自动 PascalCase → camelCase 转换，
 * 以弥合后端 PascalCase 与前端 zod schema camelCase 之间的命名差异。
 */
function unwrapEnvelope<T>(raw: unknown): T {
  if (!isEnvelope(raw)) {
    console.log("[api] unwrapEnvelope: non-envelope, passing through")
    return raw as T // 透传：非信封格式原样返回
  }
  if (!raw.success || raw.error) {
    throwApiError(
      createApiError({
        code: raw.error?.code ?? "UNKNOWN_ERROR",
        message: raw.error?.message ?? "服务端返回错误",
        details: raw,
      }),
    )
  }
  const data = raw.data
  const camelized = camelizeKeys(data)
  console.log("[api] unwrapEnvelope: before camelize keys:", Object.keys(data as object))
  console.log("[api] unwrapEnvelope: after camelize keys:", Object.keys(camelized as object))
  return camelized as T
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
    // ky v2 在抛出 HTTPError 前已通过内部的 #getResponseData 读取响应体，
    // error.data 即预解析的结果；非 ky 错误则回退到自行读取。
    const details =
      "data" in error
        ? (error as { data?: unknown }).data
        : await error.response.json().catch(() => undefined)

    // 若响应体是信封格式且包含 error 字段，优先使用后端返回的错误码和消息
    if (isEnvelope(details) && details.error) {
      return createApiError({
        code: details.error.code,
        message: details.error.message,
        status: error.response.status,
        details,
        retriable: error.response.status >= 500,
      })
    }

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
  prefix: apiConfig.baseUrl,
  timeout: 30_000,
  parseJson: (text: string) => parseFirstJson(text),
})

async function request<T>(
  method: "get" | "post" | "patch" | "delete" | "put",
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const authHeaders = getAuthHeaders(path)

  try {
    return unwrapEnvelope<T>(
      parseFirstJson<T>(
        await httpClient(path.replace(/^\//, ""), {
          method,
          json: body,
          searchParams: normalizeSearchParams(options),
          headers: { ...authHeaders, ...options?.headers },
          signal: options?.signal,
        }).text(),
      ),
    )
  } catch (error) {
    // 401 自动 refresh + retry（仅非公开路径）
    if (
      !isPublicPath(path) &&
      error instanceof Error &&
      "response" in error &&
      (error as { response?: Response }).response?.status === 401
    ) {
      const refreshed = isAdminPath(path)
        ? await tryRefreshAdminToken()
        : await tryRefreshToken()
      if (refreshed) {
        const retryToken = getAccessTokenForPath(path)
        return unwrapEnvelope<T>(
          parseFirstJson<T>(
            await httpClient(path.replace(/^\//, ""), {
              method,
              json: body,
              searchParams: normalizeSearchParams(options),
              headers: {
                ...options?.headers,
                ...(retryToken ? { Authorization: `Bearer ${retryToken}` } : {}),
              },
              signal: options?.signal,
            }).text(),
          ),
        )
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
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...getAuthHeaders(path),
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
            const events = extractAllJson<TEvent>(message.data)
            for (const event of events) {
              handlers.onEvent?.(event)
            }
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
