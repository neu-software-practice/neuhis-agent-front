import type { ApiError } from "@/lib/api/types"

export interface RequestOptions {
  searchParams?: Record<string, string | number | boolean | null | undefined>
  headers?: HeadersInit
  signal?: AbortSignal
}

export interface StreamHandlers<TEvent> {
  signal?: AbortSignal
  onOpen?: () => void
  onEvent?: (event: TEvent) => void
  onError?: (error: ApiError) => void
  onDone?: () => void
}

export interface ApiTransport {
  get<T>(path: string, options?: RequestOptions): Promise<T>
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>
  delete<T>(path: string, options?: RequestOptions): Promise<T>
  stream<TEvent>(
    path: string,
    body: unknown,
    handlers: StreamHandlers<TEvent>,
  ): Promise<void>
}
