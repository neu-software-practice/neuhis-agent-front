/**
 * 时间格式化工具。
 *
 * 仅做纯展示派生，不参与业务流程判断。输入统一为 ISO 字符串或时间戳，
 * 输出为患者可读的本地化文案。
 */

const DEFAULT_LOCALE = 'zh-CN'

function toDate(value: string | number | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 格式化为 `YYYY-MM-DD HH:mm`，无效输入回退为空字符串。 */
export function formatDateTime(value: string | number | Date): string {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/** 仅格式化日期部分 `YYYY-MM-DD`。 */
export function formatDate(value: string | number | Date): string {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** 仅格式化时间部分 `HH:mm`。 */
export function formatTime(value: string | number | Date): string {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/** 把毫秒时长格式化为 `mm:ss`，用于倒计时展示。负数按 0 处理。 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
