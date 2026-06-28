/**
 * 纯前端 ID 生成工具。
 *
 * 仅用于乐观消息 localKey、临时 UI 标记等纯客户端场景。
 * 服务端实体 ID 一律以 API 响应为准，不在此生成。
 */

/**
 * 生成带前缀的本地唯一 ID，例如 `local-msg-xxxxxxxx`。
 * 优先使用 crypto.randomUUID，降级到时间戳 + 随机数。
 */
export function createLocalId(prefix = "local"): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  return `${prefix}-${random}`
}
