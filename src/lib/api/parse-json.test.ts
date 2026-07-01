import { describe, expect, it, vi } from "vitest"
import { extractAllJson, parseFirstJson } from "@/lib/api/parse-json"

describe("parseFirstJson", () => {
  // ── 单个 JSON ──

  it("parses a single JSON object", () => {
    expect(parseFirstJson('{"a":1}')).toEqual({ a: 1 })
  })

  it("parses a single JSON array", () => {
    expect(parseFirstJson("[1,2,3]")).toEqual([1, 2, 3])
  })

  it("parses a nested object", () => {
    expect(parseFirstJson('{"a":{"b":[1,2,3]},"c":"d"}')).toEqual({
      a: { b: [1, 2, 3] },
      c: "d",
    })
  })

  it("parses a nested array", () => {
    expect(parseFirstJson('[[1,2],{"a":3}]')).toEqual([[1, 2], { a: 3 }])
  })

  // ── 拼接 JSON ──

  it("parses first object from two concatenated objects", () => {
    expect(parseFirstJson('{"a":1}{"b":2}')).toEqual({ a: 1 })
  })

  it("parses first array from two concatenated arrays", () => {
    expect(parseFirstJson("[1,2][3,4]")).toEqual([1, 2])
  })

  it("parses first object when object then array", () => {
    expect(parseFirstJson('{"a":1}[2,3]')).toEqual({ a: 1 })
  })

  it("parses first array when array then object", () => {
    expect(parseFirstJson('[1,2]{"a":3}')).toEqual([1, 2])
  })

  it("parses first object from three concatenated objects", () => {
    expect(parseFirstJson('{"a":1}{"b":2}{"c":3}')).toEqual({ a: 1 })
  })

  // ── 字符串内含括号 ──

  it("handles curly braces inside JSON string", () => {
    expect(parseFirstJson('{"data":"hello {world} test"}')).toEqual({
      data: "hello {world} test",
    })
  })

  it("handles square brackets inside JSON string", () => {
    expect(parseFirstJson('{"data":"arr [1,2,3] here"}')).toEqual({
      data: "arr [1,2,3] here",
    })
  })

  it("handles mixed brackets inside JSON string", () => {
    expect(parseFirstJson('{"k":"{[()]}"}')).toEqual({ k: "{[()]}" })
  })

  // ── 转义序列 ──

  it("handles escaped quotes inside string", () => {
    expect(parseFirstJson('{"data":"value \\"with\\" quotes"}')).toEqual({
      data: 'value "with" quotes',
    })
  })

  it("handles escaped backslash before quote", () => {
    expect(parseFirstJson('{"path":"a\\\\b\\\\c"}')).toEqual({
      path: "a\\b\\c",
    })
  })

  it("handles multiple escape sequences", () => {
    expect(parseFirstJson('{"s":"a\\"b\\\\c\\td"}')).toEqual({
      s: 'a"b\\c\td',
    })
  })

  it("handles tab escape in string", () => {
    expect(parseFirstJson('{"k":"a\\tb"}')).toEqual({ k: "a\tb" })
  })

  it("handles newline escape in string", () => {
    expect(parseFirstJson('{"k":"a\\nb"}')).toEqual({ k: "a\nb" })
  })

  // ── Unicode 转义 ──

  it("handles unicode escapes in string", () => {
    // H = H, e = e, l = l, o = o
    expect(parseFirstJson('"\\u0048\\u0065\\u006c\\u006c\\u006f"')).toBe("Hello")
  })

  // ── 空白处理 ──

  it("trims leading whitespace", () => {
    expect(parseFirstJson('   \n\t {"a":1}')).toEqual({ a: 1 })
  })

  it("handles whitespace between concatenated objects", () => {
    expect(parseFirstJson('{"a":1}  \n {"b":2}')).toEqual({ a: 1 })
  })

  // ── console.warn 行为 ──

  it("warns when extra content is detected", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    parseFirstJson('{"a":1}{"b":2}')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toContain("extra content")
    warn.mockRestore()
  })

  it("does not warn for single JSON object", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    parseFirstJson('{"a":1}')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it("does not warn for single JSON with trailing whitespace", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    parseFirstJson('{"a":1}  \n ')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  // ── 错误路径 ──

  it("throws on empty string", () => {
    expect(() => parseFirstJson("")).toThrow(SyntaxError)
  })

  it("throws on whitespace-only string", () => {
    expect(() => parseFirstJson("   \t \n  ")).toThrow(SyntaxError)
  })

  it("throws on non-JSON text", () => {
    expect(() => parseFirstJson("not json at all")).toThrow(SyntaxError)
  })

  it("throws on unclosed object", () => {
    expect(() => parseFirstJson('{"a":1')).toThrow(SyntaxError)
  })

  it("throws on unclosed array", () => {
    expect(() => parseFirstJson("[1,2,3")).toThrow(SyntaxError)
  })

  // ── 真实场景模拟 ──

  it("handles backend-style error concatenation", () => {
    const raw =
      '{"success":false,"data":null,"error":{"code":"UNAUTHORIZED","message":"missing authorization header","status":401},"meta":null}{"success":false,"data":null,"error":{"code":"VALIDATION_ERROR","message":"patientId query parameter is required","status":422},"meta":null}'

    const result = parseFirstJson<{
      success: boolean
      error: { code: string; message: string }
    }>(raw)

    expect(result.success).toBe(false)
    expect(result.error.code).toBe("UNAUTHORIZED")
  })
})

describe("extractAllJson", () => {
  it("returns single object in array", () => {
    expect(extractAllJson('{"a":1}')).toEqual([{ a: 1 }])
  })

  it("returns all concatenated objects", () => {
    expect(extractAllJson('{"a":1}{"b":2}')).toEqual([{ a: 1 }, { b: 2 }])
  })

  it("returns all concatenated arrays", () => {
    expect(extractAllJson("[1][2][3]")).toEqual([[1], [2], [3]])
  })

  it("returns mixed concatenated values", () => {
    expect(extractAllJson('{"a":1}[1,2]{"b":3}')).toEqual([{ a: 1 }, [1, 2], { b: 3 }])
  })

  it("returns empty array for empty input", () => {
    expect(extractAllJson("")).toEqual([])
  })

  it("returns empty array for whitespace-only input", () => {
    expect(extractAllJson("   ")).toEqual([])
  })

  it("returns empty array for non-JSON input", () => {
    expect(extractAllJson("not json")).toEqual([])
  })

  it("handles whitespace between values", () => {
    expect(extractAllJson('{"a":1}  \n {"b":2}')).toEqual([{ a: 1 }, { b: 2 }])
  })

  it("skips unparseable fragments", () => {
    expect(extractAllJson('{"a":1}not-json[1,2]')).toEqual([{ a: 1 }, [1, 2]])
  })

  it("handles backend-style error concatenation", () => {
    const raw =
      '{"success":false,"data":null,"error":{"code":"UNAUTHORIZED","message":"missing authorization header","status":401},"meta":null}{"success":false,"data":null,"error":{"code":"VALIDATION_ERROR","message":"patientId query parameter is required","status":422},"meta":null}'

    const results = extractAllJson<{ error: { code: string } }>(raw)
    expect(results).toHaveLength(2)
    expect(results[0].error.code).toBe("UNAUTHORIZED")
    expect(results[1].error.code).toBe("VALIDATION_ERROR")
  })
})
