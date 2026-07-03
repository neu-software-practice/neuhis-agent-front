import { beforeAll, describe, expect, it, vi } from "vitest"
import { z, core } from "zod"

import { installZodErrorMap } from "@/lib/zod-error-map"

/**
 * The `customErrorMap` named export is tree-shaken from the module namespace
 * (the project sets `sideEffects: false` and only `installZodErrorMap` is
 * referenced externally). We recover the installed map from the Zod global
 * config so we can unit-test every branch directly.
 */
type CustomErrorMap = (issue: unknown) => { message: string }

function getCustomErrorMap(): CustomErrorMap {
  const cfg = (core as unknown as { config: () => { localeError: CustomErrorMap } }).config()
  return cfg.localeError
}

/**
 * Build a minimal object shaped like a Zod issue for a given code.
 * Only the fields consumed by customErrorMap need to be present.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function issue(partial: Record<string, any>): unknown {
  return { code: "", message: "", ...partial }
}

describe("customErrorMap (recovered from global config)", () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  describe("invalid_type", () => {
    it("returns a nonoptional message when expected is nonoptional", () => {
      const result = getCustomErrorMap()(
        issue({ code: "invalid_type", expected: "nonoptional" }),
      )
      expect(result.message).toBe("此字段为必填项")
    })

    it("returns a '请输入<label>' message for known types", () => {
      expect(
        getCustomErrorMap()(issue({ code: "invalid_type", expected: "string" })).message,
      ).toBe("请输入文本")
      expect(
        getCustomErrorMap()(issue({ code: "invalid_type", expected: "number" })).message,
      ).toBe("请输入数字")
      expect(
        getCustomErrorMap()(issue({ code: "invalid_type", expected: "boolean" })).message,
      ).toBe("请输入布尔值")
    })

    it("falls back to the raw expected value for unknown types", () => {
      const result = getCustomErrorMap()(
        issue({ code: "invalid_type", expected: "weird_type" }),
      )
      expect(result.message).toBe("请输入weird_type")
    })
  })

  describe("too_small", () => {
    it("returns '请填写此字段' for a string with minimum 1", () => {
      const result = getCustomErrorMap()(
        issue({ code: "too_small", origin: "string", minimum: 1, inclusive: true }),
      )
      expect(result.message).toBe("请填写此字段")
    })

    it("returns '请上传文件' for a file with minimum 1", () => {
      const result = getCustomErrorMap()(
        issue({ code: "too_small", origin: "file", minimum: 1, inclusive: true }),
      )
      expect(result.message).toBe("请上传文件")
    })

    it("returns '请至少选择 1 项' for an array/set with minimum 1", () => {
      expect(
        getCustomErrorMap()(
          issue({ code: "too_small", origin: "array", minimum: 1, inclusive: true }),
        ).message,
      ).toBe("请至少选择 1 项")
      expect(
        getCustomErrorMap()(
          issue({ code: "too_small", origin: "set", minimum: 1, inclusive: true }),
        ).message,
      ).toBe("请至少选择 1 项")
    })

    it("returns a character count message for strings with minimum > 1", () => {
      const result = getCustomErrorMap()(
        issue({ code: "too_small", origin: "string", minimum: 5, inclusive: true }),
      )
      expect(result.message).toBe("至少输入 5 个字符")
    })

    it("returns an item count message for arrays/sets with minimum > 1", () => {
      expect(
        getCustomErrorMap()(
          issue({ code: "too_small", origin: "array", minimum: 3, inclusive: true }),
        ).message,
      ).toBe("至少选择 3 项")
      expect(
        getCustomErrorMap()(
          issue({ code: "too_small", origin: "set", minimum: 2, inclusive: true }),
        ).message,
      ).toBe("至少选择 2 项")
    })

    it("returns a date message for date origin", () => {
      const result = getCustomErrorMap()(
        issue({ code: "too_small", origin: "date", minimum: 0, inclusive: true }),
      )
      expect(result.message).toBe("日期不能早于指定时间")
    })

    it("returns a generic min-value message for numeric origins", () => {
      const result = getCustomErrorMap()(
        issue({ code: "too_small", origin: "number", minimum: 10, inclusive: true }),
      )
      expect(result.message).toBe("最小值为 10")
    })
  })

  describe("too_big", () => {
    it("returns a character limit message for strings", () => {
      const result = getCustomErrorMap()(
        issue({ code: "too_big", origin: "string", maximum: 100, inclusive: true }),
      )
      expect(result.message).toBe("最多输入 100 个字符")
    })

    it("returns an item limit message for arrays/sets", () => {
      expect(
        getCustomErrorMap()(
          issue({ code: "too_big", origin: "array", maximum: 5, inclusive: true }),
        ).message,
      ).toBe("最多选择 5 项")
      expect(
        getCustomErrorMap()(
          issue({ code: "too_big", origin: "set", maximum: 2, inclusive: true }),
        ).message,
      ).toBe("最多选择 2 项")
    })

    it("returns a date message for date origin", () => {
      const result = getCustomErrorMap()(
        issue({ code: "too_big", origin: "date", maximum: 0, inclusive: true }),
      )
      expect(result.message).toBe("日期不能晚于指定时间")
    })

    it("returns a generic max-value message for numeric origins", () => {
      const result = getCustomErrorMap()(
        issue({ code: "too_big", origin: "number", maximum: 99, inclusive: true }),
      )
      expect(result.message).toBe("最大值为 99")
    })
  })

  describe("invalid_format", () => {
    it("returns a message for starts_with", () => {
      const result = getCustomErrorMap()(
        issue({ code: "invalid_format", format: "starts_with", prefix: "https://" }),
      )
      expect(result.message).toBe('必须以 "https://" 开头')
    })

    it("returns a message for ends_with", () => {
      const result = getCustomErrorMap()(
        issue({ code: "invalid_format", format: "ends_with", suffix: ".com" }),
      )
      expect(result.message).toBe('必须以 ".com" 结尾')
    })

    it("returns a message for includes", () => {
      const result = getCustomErrorMap()(
        issue({ code: "invalid_format", format: "includes", includes: "@" }),
      )
      expect(result.message).toBe('必须包含 "@"')
    })

    it("returns '格式不正确' for regex", () => {
      const result = getCustomErrorMap()(issue({ code: "invalid_format", format: "regex" }))
      expect(result.message).toBe("格式不正确")
    })

    it("returns a friendly label for known formats", () => {
      expect(
        getCustomErrorMap()(issue({ code: "invalid_format", format: "email" })).message,
      ).toBe("请输入有效的电子邮件地址")
      expect(
        getCustomErrorMap()(issue({ code: "invalid_format", format: "uuid" })).message,
      ).toBe("请输入有效的UUID")
      expect(
        getCustomErrorMap()(issue({ code: "invalid_format", format: "url" })).message,
      ).toBe("请输入有效的网址")
    })

    it("falls back to the raw format name for unknown formats", () => {
      const result = getCustomErrorMap()(
        issue({ code: "invalid_format", format: "unknown_fmt" }),
      )
      expect(result.message).toBe("请输入有效的unknown_fmt")
    })
  })

  describe("not_multiple_of", () => {
    it("returns a divisor message", () => {
      const result = getCustomErrorMap()(issue({ code: "not_multiple_of", divisor: 3 }))
      expect(result.message).toBe("必须是 3 的倍数")
    })
  })

  describe("unrecognized_keys", () => {
    it("lists the unknown keys joined by '、'", () => {
      const result = getCustomErrorMap()(
        issue({ code: "unrecognized_keys", keys: ["foo", "bar"] }),
      )
      expect(result.message).toBe("包含未知字段：foo、bar")
    })
  })

  describe("invalid_key", () => {
    it("returns a generic invalid-key message", () => {
      const result = getCustomErrorMap()(issue({ code: "invalid_key" }))
      expect(result.message).toBe("键值无效")
    })
  })

  describe("invalid_union", () => {
    it("returns a generic union message", () => {
      const result = getCustomErrorMap()(issue({ code: "invalid_union", unionErrors: [] }))
      expect(result.message).toBe("输入格式不正确")
    })
  })

  describe("invalid_element", () => {
    it("returns an invalid-element message", () => {
      const result = getCustomErrorMap()(issue({ code: "invalid_element", origin: "array" }))
      expect(result.message).toBe("其中包含无效值")
    })
  })

  describe("invalid_value", () => {
    it("returns an out-of-range message", () => {
      const result = getCustomErrorMap()(issue({ code: "invalid_value", values: ["a", "b"] }))
      expect(result.message).toBe("取值不在允许范围内")
    })
  })

  describe("default / unknown code", () => {
    it("returns a generic '输入无效' for unhandled codes", () => {
      const result = getCustomErrorMap()(issue({ code: "future_code_we_have_not_handled" }))
      expect(result.message).toBe("输入无效")
    })
  })
})

describe("installZodErrorMap", () => {
  it("installs the custom error map globally and Zod starts emitting Chinese", () => {
    installZodErrorMap()

    // Recover the installed map and confirm it is our customErrorMap.
    const installed = getCustomErrorMap()
    const direct = installed(issue({ code: "invalid_type", expected: "string" }))
    expect(direct.message).toBe("请输入文本")

    // End-to-end: a real Zod validation should surface the Chinese message.
    const result = z.string().min(3).safeParse("ab")
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("至少输入 3 个字符")
    }
  })

  it("makes too_small string min=1 produce '请填写此字段' via real Zod", () => {
    installZodErrorMap()
    const result = z.string().min(1).safeParse("")
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("请填写此字段")
    }
  })

  it("makes too_big string max produce a character limit via real Zod", () => {
    installZodErrorMap()
    const result = z.string().max(2).parse.bind(null, "toolong")
    expect(() => result()).toThrow(z.ZodError)
    try {
      result()
    } catch (e) {
      expect((e as z.ZodError).issues[0].message).toBe("最多输入 2 个字符")
    }
  })

  it("makes unrecognized_keys produce a joined-key message via real Zod", () => {
    installZodErrorMap()
    const result = z.object({ a: z.string() }).strict().safeParse({ a: "1", b: "2" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("包含未知字段：b")
    }
  })

  it("makes not_multiple_of produce a divisor message via real Zod", () => {
    installZodErrorMap()
    const result = z.number().multipleOf(3).safeParse(4)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("必须是 3 的倍数")
    }
  })

  it("makes invalid_format (email) produce a friendly label via real Zod", () => {
    installZodErrorMap()
    const result = z.string().email().safeParse("not-an-email")
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("请输入有效的电子邮件地址")
    }
  })

  it("makes invalid_value (enum) produce an out-of-range message via real Zod", () => {
    installZodErrorMap()
    const result = z.enum(["a", "b"]).safeParse("c")
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("取值不在允许范围内")
    }
  })

  it("makes invalid_union produce a generic message via real Zod", () => {
    installZodErrorMap()
    const result = z.union([z.string(), z.number()]).safeParse(true)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("输入格式不正确")
    }
  })

  it("does not throw when called multiple times (idempotent)", () => {
    expect(() => {
      installZodErrorMap()
      installZodErrorMap()
    }).not.toThrow()
  })

  it("core.config() exposes the localeError after installation", () => {
    installZodErrorMap()
    const cfg = (core as unknown as { config: () => { localeError: unknown } }).config()
    expect(typeof cfg.localeError).toBe("function")
  })

  it("spy verification: installZodErrorMap passes the custom map to core.config", () => {
    // We cannot spyOn the ESM `core.config` namespace directly, so we verify
    // behaviourally that the installed map equals the one core now uses.
    installZodErrorMap()
    const fromConfig = getCustomErrorMap()
    // The installed map should produce our custom message for a known code.
    const result = (fromConfig as CustomErrorMap)(
      issue({ code: "too_small", origin: "string", minimum: 1, inclusive: true }),
    )
    expect(result.message).toBe("请填写此字段")
    void vi.fn // keep vi import used across environments
  })
})
