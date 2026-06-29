import { toApiError } from "@/lib/api/errors"
import type { ApiError } from "@/lib/api/types"

/**
 * 患者可理解的错误展示模型。
 *
 * 约定（见 component-code-conventions.md §5.1 / §11）：
 * - feature hook / adapter 负责把底层 `ApiError`、`ZodError` 或未知异常
 *   转换成 `UiMessage`，再传给组件。
 * - 组件只渲染 `UiMessage`，不接触原始 `ApiError.message`、错误码、
 *   HTTP 状态或内部状态机名（如 `lab_decision` / `emergencyPending`）。
 * - `retriable` 决定是否给出「重试」入口；不可重试项给出替代引导文案。
 */
export interface UiMessage {
  /** 患者语言的主标题。 */
  title: string
  /** 可选补充说明，仍为患者语言。 */
  description?: string
  /** 是否值得提供重试入口。 */
  retriable: boolean
}

/** 患者可懂的兜底文案，绝不泄漏底层细节。 */
const FALLBACK: UiMessage = {
  title: "操作没能完成",
  description: "请稍后重试，如果多次失败可返回首页重新进入。",
  retriable: true,
}

/**
 * 已知错误码 → 患者文案映射。
 *
 * 只列出对患者有明确含义的场景；其余一律走 `FALLBACK`，
 * 避免把内部错误码、HTTP 文案或堆栈暴露给患者。
 * `retriable` 留空时由 `ApiError.retriable` 或兜底规则决定。
 */
const MESSAGE_BY_CODE: Record<
  string,
  Omit<UiMessage, "retriable"> & { retriable?: boolean }
> = {
  SESSION_NOT_FOUND: {
    title: "找不到这次就诊记录",
    description: "记录可能已被移除，请返回列表重新选择。",
    retriable: false,
  },
  PATIENT_NOT_FOUND: {
    title: "找不到患者信息",
    description: "请返回首页重新进入。",
    retriable: false,
  },
  CARD_NOT_FOUND: {
    title: "这一步已经更新",
    description: "页面信息可能不是最新的，刷新后再试。",
    retriable: true,
  },
  VALIDATION_ERROR: {
    title: "数据加载异常",
    description: "返回的内容暂时无法显示，请稍后重试。",
    retriable: false,
  },
  NETWORK_ERROR: {
    title: "网络连接不稳定",
    description: "请检查网络后重试。",
    retriable: true,
  },
}

/** 部分 HTTP 状态的患者文案（按 `HTTP_<status>` code 命中）。 */
const MESSAGE_BY_HTTP_STATUS: Record<
  number,
  Omit<UiMessage, "retriable"> & { retriable?: boolean }
> = {
  401: {
    title: "登录状态已失效",
    description: "请重新进入后再试。",
    retriable: false,
  },
  403: {
    title: "暂时无法访问这条记录",
    retriable: false,
  },
  404: {
    title: "找不到对应的内容",
    description: "记录可能已不存在，请返回列表。",
    retriable: false,
  },
  408: {
    title: "请求超时了",
    description: "网络较慢，请稍后重试。",
    retriable: true,
  },
}

/** 从 `HTTP_404` 这类 code 中解析出状态码。 */
function parseHttpStatus(error: ApiError): number | undefined {
  if (typeof error.status === "number") return error.status
  const match = /^HTTP_(\d{3})$/.exec(error.code)
  return match ? Number(match[1]) : undefined
}

/** 综合 ApiError 自身标记与映射，决定是否可重试。 */
function resolveRetriable(
  mapped: { retriable?: boolean } | undefined,
  error: ApiError,
): boolean {
  if (mapped && typeof mapped.retriable === "boolean") return mapped.retriable
  if (typeof error.retriable === "boolean") return error.retriable
  return true
}

/**
 * 把任意异常（`ApiException` / `ApiError` / `ZodError` / unknown）
 * 转换成患者可懂的 `UiMessage`。
 *
 * 永远不会把 `ApiError.message`、错误码或内部状态名直接写进结果。
 */
export function toUiMessage(value: unknown): UiMessage {
  const error = toApiError(value)

  const byCode = MESSAGE_BY_CODE[error.code]
  if (byCode) {
    return {
      title: byCode.title,
      description: byCode.description,
      retriable: resolveRetriable(byCode, error),
    }
  }

  const status = parseHttpStatus(error)
  if (status !== undefined) {
    const byStatus = MESSAGE_BY_HTTP_STATUS[status]
    if (byStatus) {
      return {
        title: byStatus.title,
        description: byStatus.description,
        retriable: resolveRetriable(byStatus, error),
      }
    }
    // 已知是 HTTP 错误但无专属文案：按 5xx 可重试、4xx 不可重试兜底。
    return {
      ...FALLBACK,
      retriable: status >= 500,
    }
  }

  return {
    ...FALLBACK,
    retriable: resolveRetriable(undefined, error),
  }
}
