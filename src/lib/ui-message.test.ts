import { describe, expect, it } from "vitest"
import { z } from "zod"

import { ApiException, toApiError } from "@/lib/api/errors"
import type { ApiError } from "@/lib/api/types"
import { toUiMessage } from "@/lib/ui-message"

function makeZodError(): z.ZodError {
  const result = z.object({ a: z.string() }).safeParse({ a: 1 })
  if (result.success) throw new Error("expected a zod failure to build the fixture")
  return result.error
}

function apiError(overrides: Partial<ApiError> = {}): ApiError {
  return {
    code: "UNKNOWN_ERROR",
    message: "internal detail",
    ...overrides,
  }
}

describe("toUiMessage — known error codes", () => {
  it("maps SESSION_NOT_FOUND with retriable=false", () => {
    const message = toUiMessage(apiError({ code: "SESSION_NOT_FOUND", retriable: false }))
    expect(message.title).toBe("找不到这次就诊记录")
    expect(message.description).toBe("记录可能已被移除，请返回列表重新选择。")
    expect(message.retriable).toBe(false)
  })

  it("maps PATIENT_NOT_FOUND with retriable=false", () => {
    const message = toUiMessage(apiError({ code: "PATIENT_NOT_FOUND", retriable: false }))
    expect(message.title).toBe("找不到患者信息")
    expect(message.retriable).toBe(false)
  })

  it("maps CARD_NOT_FOUND with retriable=true", () => {
    const message = toUiMessage(apiError({ code: "CARD_NOT_FOUND", retriable: true }))
    expect(message.title).toBe("这一步已经更新")
    expect(message.retriable).toBe(true)
  })

  it("maps VALIDATION_ERROR with retriable=false", () => {
    const message = toUiMessage(apiError({ code: "VALIDATION_ERROR", retriable: false }))
    expect(message.title).toBe("数据加载异常")
    expect(message.retriable).toBe(false)
  })

  it("maps NETWORK_ERROR with retriable=true", () => {
    const message = toUiMessage(apiError({ code: "NETWORK_ERROR", retriable: true }))
    expect(message.title).toBe("网络连接不稳定")
    expect(message.retriable).toBe(true)
  })

  it("maps AUTH_PHONE_EXISTS with retriable=false", () => {
    const message = toUiMessage(apiError({ code: "AUTH_PHONE_EXISTS", retriable: false }))
    expect(message.title).toBe("该手机号已注册")
    expect(message.retriable).toBe(false)
  })

  it("maps AUTH_INVALID_CREDENTIALS with retriable=true", () => {
    const message = toUiMessage(apiError({ code: "AUTH_INVALID_CREDENTIALS", retriable: true }))
    expect(message.title).toBe("手机号或密码错误")
    expect(message.retriable).toBe(true)
  })

  it("maps AUTH_TOKEN_EXPIRED with retriable=false", () => {
    const message = toUiMessage(apiError({ code: "AUTH_TOKEN_EXPIRED", retriable: false }))
    expect(message.title).toBe("登录已过期")
    expect(message.retriable).toBe(false)
  })

  it("maps AUTH_REFRESH_INVALID with retriable=false", () => {
    const message = toUiMessage(apiError({ code: "AUTH_REFRESH_INVALID", retriable: false }))
    expect(message.title).toBe("登录状态已失效")
    expect(message.retriable).toBe(false)
  })

  it("maps AUTH_REFRESH_EXPIRED with retriable=false", () => {
    const message = toUiMessage(apiError({ code: "AUTH_REFRESH_EXPIRED", retriable: false }))
    expect(message.title).toBe("登录已过期")
    expect(message.retriable).toBe(false)
  })

  it("maps RATE_LIMITED with retriable=true", () => {
    const message = toUiMessage(apiError({ code: "RATE_LIMITED", retriable: true }))
    expect(message.title).toBe("操作过于频繁")
    expect(message.retriable).toBe(true)
  })
})

describe("toUiMessage — HTTP status code mapping", () => {
  it("maps HTTP_401 with retriable=false", () => {
    const message = toUiMessage(apiError({ code: "HTTP_401" }))
    expect(message.title).toBe("登录状态已失效")
    expect(message.retriable).toBe(false)
  })

  it("maps HTTP_403 with retriable=false", () => {
    const message = toUiMessage(apiError({ code: "HTTP_403" }))
    expect(message.title).toBe("暂时无法访问这条记录")
    expect(message.retriable).toBe(false)
  })

  it("maps HTTP_404 with retriable=false", () => {
    const message = toUiMessage(apiError({ code: "HTTP_404" }))
    expect(message.title).toBe("找不到对应的内容")
    expect(message.retriable).toBe(false)
  })

  it("maps HTTP_408 with retriable=true", () => {
    const message = toUiMessage(apiError({ code: "HTTP_408" }))
    expect(message.title).toBe("请求超时了")
    expect(message.retriable).toBe(true)
  })

  it("treats an HTTP 5xx code without a dedicated message as retriable", () => {
    const message = toUiMessage(apiError({ code: "HTTP_500" }))
    expect(message.title).toBe("操作没能完成")
    expect(message.retriable).toBe(true)
  })

  it("treats an HTTP 4xx code without a dedicated message as non-retriable", () => {
    const message = toUiMessage(apiError({ code: "HTTP_400" }))
    expect(message.title).toBe("操作没能完成")
    expect(message.retriable).toBe(false)
  })

  it("uses the numeric status field when code is not an HTTP_ pattern", () => {
    const message = toUiMessage(apiError({ code: "SOME_ERROR", status: 401 }))
    expect(message.title).toBe("登录状态已失效")
    expect(message.retriable).toBe(false)
  })

  it("treats HTTP 503 (no dedicated message) as retriable", () => {
    const message = toUiMessage(apiError({ code: "HTTP_503" }))
    expect(message.retriable).toBe(true)
  })
})

describe("toUiMessage — fallback behavior", () => {
  it("falls back to a generic patient message for an unknown code", () => {
    const message = toUiMessage(apiError({ code: "SOMETHING_WEIRD" }))
    expect(message.title).toBe("操作没能完成")
    expect(message.description).toBe("请稍后重试，如果多次失败可返回首页重新进入。")
  })

  it("defaults to retriable=true when neither map nor error specifies retriable", () => {
    const message = toUiMessage(apiError({ code: "TOTALLY_UNKNOWN" }))
    expect(message.retriable).toBe(true)
  })

  it("honors the error's own retriable flag when the code has no mapping", () => {
    const message = toUiMessage(apiError({ code: "TOTALLY_UNKNOWN", retriable: false }))
    expect(message.retriable).toBe(false)
  })
})

describe("toUiMessage — input types", () => {
  it("unwraps an ApiException to its underlying error", () => {
    const exception = new ApiException(
      apiError({ code: "SESSION_NOT_FOUND", retriable: false }),
    )
    const message = toUiMessage(exception)
    expect(message.title).toBe("找不到这次就诊记录")
    expect(message.retriable).toBe(false)
  })

  it("maps a ZodError to a VALIDATION_ERROR message", () => {
    const message = toUiMessage(makeZodError())
    expect(message.title).toBe("数据加载异常")
    expect(message.retriable).toBe(false)
  })

  it("maps a generic Error to a retriable UNKNOWN_ERROR fallback", () => {
    const message = toUiMessage(new Error("boom"))
    expect(message.title).toBe("操作没能完成")
    expect(message.retriable).toBe(true)
  })

  it("maps an unknown non-error value to a retriable UNKNOWN_ERROR fallback", () => {
    const message = toUiMessage("just a string")
    expect(message.title).toBe("操作没能完成")
    expect(message.retriable).toBe(true)
  })

  it("maps null to a retriable UNKNOWN_ERROR fallback", () => {
    const message = toUiMessage(null)
    expect(message.title).toBe("操作没能完成")
    expect(message.retriable).toBe(true)
  })

  it("maps undefined to a retriable UNKNOWN_ERROR fallback", () => {
    const message = toUiMessage(undefined)
    expect(message.title).toBe("操作没能完成")
    expect(message.retriable).toBe(true)
  })
})

describe("toUiMessage — retriable resolution priority", () => {
  it("prefers the mapped retriable over the error's own flag", () => {
    // CARD_NOT_FOUND is mapped retriable=true; error says false → mapped wins.
    const message = toUiMessage(apiError({ code: "CARD_NOT_FOUND", retriable: false }))
    expect(message.retriable).toBe(true)
  })

  it("uses the error's retriable when the mapping leaves it undefined", () => {
    // 403 mapping has no retriable field; error.retriable=false should win.
    const message = toUiMessage(apiError({ code: "HTTP_403", retriable: false }))
    expect(message.retriable).toBe(false)
  })
})

describe("toApiError (re-exported via ui-message path)", () => {
  it("is the same function used internally by toUiMessage", () => {
    // Verifies the wiring: a ZodError input yields a VALIDATION_ERROR code.
    const error = toApiError(makeZodError())
    expect(error.code).toBe("VALIDATION_ERROR")
  })
})
