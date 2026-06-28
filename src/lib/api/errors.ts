import { ZodError } from "zod"

import type { ApiError } from "@/lib/api/types"
import { apiErrorSchema } from "@/lib/api/types"

export class ApiException extends Error {
  readonly error: ApiError

  constructor(error: ApiError) {
    super(error.message)
    this.name = "ApiException"
    this.error = error
  }
}

export function createApiError(error: ApiError): ApiError {
  return apiErrorSchema.parse(error)
}

export function createValidationApiError(error: ZodError): ApiError {
  return createApiError({
    code: "VALIDATION_ERROR",
    message: "返回数据格式不符合前端契约",
    details: error.issues,
    retriable: false,
  })
}

export function isApiError(value: unknown): value is ApiError {
  return apiErrorSchema.safeParse(value).success
}

export function toApiError(value: unknown): ApiError {
  if (value instanceof ApiException) {
    return value.error
  }

  if (value instanceof ZodError) {
    return createValidationApiError(value)
  }

  if (isApiError(value)) {
    return value
  }

  if (value instanceof Error) {
    return createApiError({
      code: "UNKNOWN_ERROR",
      message: value.message || "请求失败，请稍后重试",
      retriable: true,
    })
  }

  return createApiError({
    code: "UNKNOWN_ERROR",
    message: "请求失败，请稍后重试",
    details: value,
    retriable: true,
  })
}

export function throwApiError(error: ApiError): never {
  throw new ApiException(error)
}
