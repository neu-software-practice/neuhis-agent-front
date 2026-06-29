import { describe, expect, it } from "vitest"
import { z } from "zod"

import { ApiException, toApiError } from "@/lib/api/errors"
import { toUiMessage } from "@/lib/ui-message"

function makeZodError(): z.ZodError {
  const result = z.object({ a: z.string() }).safeParse({ a: 1 })
  if (result.success) throw new Error("expected a zod failure to build the fixture")
  return result.error
}

describe("toApiError", () => {
  it("passes through an ApiException's underlying error", () => {
    const exception = new ApiException({
      code: "SESSION_NOT_FOUND",
      message: "找不到",
      retriable: false,
    })
    expect(toApiError(exception)).toEqual(exception.error)
  })

  it("maps a ZodError to a non-retriable VALIDATION_ERROR", () => {
    const error = toApiError(makeZodError())
    expect(error.code).toBe("VALIDATION_ERROR")
    expect(error.retriable).toBe(false)
  })

  it("passes through a plain ApiError-shaped object", () => {
    const apiError = {
      code: "CARD_NOT_FOUND",
      message: "卡片已更新",
      retriable: true,
    }
    expect(toApiError(apiError)).toEqual(apiError)
  })

  it("maps a generic Error to a retriable UNKNOWN_ERROR, keeping its message", () => {
    const error = toApiError(new Error("boom"))
    expect(error.code).toBe("UNKNOWN_ERROR")
    expect(error.retriable).toBe(true)
    expect(error.message).toBe("boom")
  })

  it("maps an unknown non-error value to a retriable UNKNOWN_ERROR", () => {
    const error = toApiError("just a string")
    expect(error.code).toBe("UNKNOWN_ERROR")
    expect(error.retriable).toBe(true)
  })
})

describe("toUiMessage", () => {
  it("maps a known code to its patient-facing title", () => {
    const message = toUiMessage({
      code: "SESSION_NOT_FOUND",
      message: "internal detail",
      retriable: false,
    })
    expect(message.title).toBe("找不到这次就诊记录")
    expect(message.retriable).toBe(false)
  })

  it("treats an HTTP 5xx code as retriable via the status fallback", () => {
    const message = toUiMessage({ code: "HTTP_500", message: "server error" })
    expect(message.retriable).toBe(true)
  })

  it("treats an HTTP 4xx code without a dedicated message as non-retriable", () => {
    const message = toUiMessage({ code: "HTTP_400", message: "bad request" })
    expect(message.retriable).toBe(false)
  })

  it("falls back to a generic patient message for an unknown code", () => {
    const message = toUiMessage({
      code: "SOMETHING_WEIRD",
      message: "internal detail",
    })
    expect(message.title).toBe("操作没能完成")
  })
})
