/**
 * JSON 拼接解析工具。
 *
 * 后端 API 有时会在单个 HTTP 响应体中拼接多个 JSON 对象（无分隔符），
 * 例如 `{"a":1}{"b":2}`。标准 JSON.parse 无法处理这种输入。
 *
 * 本模块通过 bracket-depth 追踪算法提取完整 JSON 值。
 */

/**
 * 在文本中查找第一个完整 JSON 值（对象或数组）的结束位置（闭区间）。
 * 正确处理 JSON 字符串内的括号和转义序列。
 *
 * @returns 结束索引（闭区间），未找到则返回 -1
 */
function findFirstJsonEnd(text: string): number {
  let depth = 0
  let inString = false
  let escaped = false
  let started = false
  const len = text.length

  for (let i = 0; i < len; i++) {
    const ch = text[i]

    if (escaped) {
      // 上一字符是反斜杠，当前字符被转义，原样消费后清除标记
      escaped = false
      continue
    }

    if (inString) {
      if (ch === "\\") {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      // 字符串内所有字符不影响 depth
      continue
    }

    // 非字符串上下文
    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === "{" || ch === "[") {
      depth++
      started = true
    } else if (ch === "}" || ch === "]") {
      depth--
      if (started && depth === 0) {
        return i
      }
    } else if (!/\s/.test(ch) && !started) {
      // 非空白、非 JSON 起始字符 → 不是 JSON
      return -1
    }
  }

  return -1
}

/**
 * 提取并解析文本中的第一个 JSON 对象或数组。
 * 若检测到后面还有额外非空白内容，会通过 `console.warn` 记录警告。
 *
 * @throws {SyntaxError} 若未找到可解析的 JSON 值
 */
export function parseFirstJson<T = unknown>(text: string): T {
  const trimmedStart = text.trimStart()
  if (trimmedStart.length === 0) {
    throw new SyntaxError("parseFirstJson: empty input")
  }

  // 快速路径：标准 JSON.parse 成功则直接返回
  try {
    return JSON.parse(text) as T
  } catch (e) {
    // 非 SyntaxError 直接抛出；SyntaxError 则尝试慢速路径
    if (!(e instanceof SyntaxError)) {
      throw e
    }
  }

  // 慢速路径：bracket-depth 提取第一个完整 JSON 值
  // 仅当文本以 { 或 [ 开头时才尝试（否则是真正的非法 JSON）
  const end = findFirstJsonEnd(trimmedStart)
  if (end < 0) {
    // 不是拼接 JSON，重新执行 JSON.parse 以抛出原始错误
    return JSON.parse(text) as T
  }

  const firstJson = trimmedStart.slice(0, end + 1)
  const remainder = trimmedStart.slice(end + 1).trim()

  if (remainder.length > 0) {
    console.warn(
      "[api] parseFirstJson: detected extra content after first JSON value. " +
        "This may indicate the backend is concatenating multiple responses. " +
        `Extra length: ${remainder.length} chars.`,
    )
  }

  return JSON.parse(firstJson) as T
}

/**
 * 提取并解析文本中的全部 JSON 对象/数组。
 * 适用于 SSE 事件 data 字段可能包含多个拼接 JSON 的场景。
 *
 * @returns 解析后的值数组（若未找到任何 JSON 则返回空数组）
 */
export function extractAllJson<T = unknown>(text: string): T[] {
  const result: T[] = []
  let remaining = text

  while (remaining.length > 0) {
    const trimmed = remaining.trimStart()
    if (trimmed.length === 0) break

    // 跳过非 JSON 前缀，定位到下一个 { 或 [
    // eslint-disable-next-line no-useless-escape
    const jsonStart = trimmed.search(/[\{\[]/)
    if (jsonStart < 0) break

    const candidate = trimmed.slice(jsonStart)
    const end = findFirstJsonEnd(candidate)
    if (end < 0) break

    const jsonStr = candidate.slice(0, end + 1)
    try {
      result.push(JSON.parse(jsonStr) as T)
    } catch {
      // 跳过无法解析的片段，从下一个字符继续
      remaining = candidate.slice(1)
      continue
    }

    remaining = candidate.slice(end + 1)
  }

  return result
}
