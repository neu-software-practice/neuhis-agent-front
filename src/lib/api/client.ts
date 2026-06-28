import { fetchEventSource } from "@microsoft/fetch-event-source"
import ky from "ky"

import { apiConfig } from "@/lib/api/config"
import { createApiError, toApiError, throwApiError } from "@/lib/api/errors"
import type {
  ApiTransport,
  RequestOptions,
  StreamHandlers,
} from "@/lib/api/transport"
import type { ApiError } from "@/lib/api/types"

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
  method: "get" | "post" | "patch" | "delete",
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  try {
    return await httpClient(path.replace(/^\//, ""), {
      method,
      json: body,
      searchParams: normalizeSearchParams(options),
      headers: options?.headers,
      signal: options?.signal,
    }).json<T>()
  } catch (error) {
    throwApiError(await normalizeHttpError(error))
  }
}

export function createHttpTransport(): ApiTransport {
  return {
    get: (path, options) => request("get", path, undefined, options),
    post: (path, body, options) => request("post", path, body, options),
    patch: (path, body, options) => request("patch", path, body, options),
    delete: (path, options) => request("delete", path, undefined, options),
    async stream<TEvent>(
      path: string,
      body: unknown,
      handlers: StreamHandlers<TEvent>,
    ) {
      try {
        await fetchEventSource(`${apiConfig.baseUrl}${path}`, {
          method: "POST",
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
          },
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
