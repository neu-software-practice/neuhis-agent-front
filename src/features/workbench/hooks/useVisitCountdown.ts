import { useEffect, useRef, useState } from "react"

/** 空闲阶段。以"最后一次操作"为基准，有新操作即自动重置。 */
export type VisitIdlePhase = "normal" | "warn5" | "warn2" | "expired"

/** 默认空闲阈值（毫秒）：最后一次操作后 10 分钟无操作则挂起。 */
export const DEFAULT_IDLE_MS = 10 * 60 * 1000
/** ≤5min 阈值（毫秒）。 */
const WARN5_THRESHOLD_MS = 5 * 60 * 1000
/** ≤2min 阈值（毫秒）。 */
const WARN2_THRESHOLD_MS = 2 * 60 * 1000
/** 默认重算间隔（毫秒）。 */
const DEFAULT_TICK_MS = 1000

/** >5min 时不显示警告文案。空闲语义：提示长时间未操作即将挂起。 */
const WARN_TEXT: Record<VisitIdlePhase, string> = {
  normal: "",
  warn5: "长时间未操作，问诊即将暂停",
  warn2: "即将自动暂停，可继续输入保持问诊",
  expired: "",
}

export interface UseVisitCountdownInput {
  /** 最后一次操作时间（ISO 字符串）。空闲计时以 lastActivityAt + idleMs 为截止。 */
  lastActivityAt?: string
  /** 空闲阈值（毫秒）。默认 10 分钟。 */
  idleMs?: number
  /** 当前一次暂停的起点（ISO 字符串）。暂停时用于冻结剩余时间。 */
  pausedAt?: string
  /** 计时是否已暂停。 */
  timerPaused?: boolean
  /** 是否处于活动计时态（completed / 挂起 / 终止态应传 false）。 */
  active: boolean
  /** 空闲到期回调，仅在 active 且未暂停时触发一次。 */
  onIdleExpire?: () => void
}

export interface UseVisitCountdownResult {
  /** 距自动挂起的剩余毫秒数；无 lastActivityAt 时为 Number.POSITIVE_INFINITY。 */
  remainingMs: number
  phase: VisitIdlePhase
  /** 患者可见警告文案；normal / expired 为空字符串。 */
  warningText: string
}

function derivePhase(remainingMs: number): VisitIdlePhase {
  if (remainingMs <= 0) {
    return "expired"
  }
  if (remainingMs <= WARN2_THRESHOLD_MS) {
    return "warn2"
  }
  if (remainingMs <= WARN5_THRESHOLD_MS) {
    return "warn5"
  }
  return "normal"
}

function toMs(iso?: string): number | undefined {
  if (!iso) {
    return undefined
  }
  const value = Date.parse(iso)
  return Number.isNaN(value) ? undefined : value
}

/**
 * 空闲计时 hook：基于"最后一次操作时间"判断会话是否长时间无操作。
 *
 * - 截止时间 = `lastActivityAt + idleMs`；每次有新操作（`lastActivityAt` 变化）
 *   自动重算并重置到期标记，无需显式过期时间。
 * - 暂停（`timerPaused`）时按 `pausedAt` 冻结剩余时间，不本地递减；恢复后按传入
 *   的 session 字段重读（恢复被视为一次操作，`lastActivityAt` 已被刷新）。
 * - `active=false`（completed / 挂起 / 终止态）时停止计时，不触发 `onIdleExpire`。
 * - 到期（剩余 ≤0 且 active 且未暂停）时触发一次 `onIdleExpire`（用 ref 防重复）。
 *
 * 不调用任何 transport / API / 状态机，只通过参数与回调通信。
 *
 * 实现注记：render 保持纯函数（不读 `Date.now()`），当前时间存入 `now` state，
 * 仅由 `setInterval` 在活动计时期间推进，从而驱动重算与重渲染。
 */
export function useVisitCountdown({
  lastActivityAt,
  idleMs = DEFAULT_IDLE_MS,
  pausedAt,
  timerPaused = false,
  active,
  onIdleExpire,
}: UseVisitCountdownInput): UseVisitCountdownResult {
  const activityMs = toMs(lastActivityAt)
  const deadlineMs = activityMs === undefined ? undefined : activityMs + idleMs
  const pausedAtMs = toMs(pausedAt)

  // 当前时间快照：render 期间只读此 state，由 interval 推进，保持 render 纯净。
  const [now, setNow] = useState(() => Date.now())

  // 暂停时以 pausedAt 为基准冻结剩余时间；否则用 now 快照。
  const referenceNow =
    timerPaused && pausedAtMs !== undefined ? pausedAtMs : now
  const remainingMs =
    deadlineMs === undefined
      ? Number.POSITIVE_INFINITY
      : deadlineMs - referenceNow
  const phase = derivePhase(remainingMs)

  // onIdleExpire 防重复触发：每个截止时间只触发一次。
  const expiredFiredRef = useRef(false)
  const onExpireRef = useRef(onIdleExpire)

  useEffect(() => {
    onExpireRef.current = onIdleExpire
  }, [onIdleExpire])

  // 截止时间变化（新操作刷新 lastActivityAt，或 resume 后）时重置已触发标记。
  useEffect(() => {
    expiredFiredRef.current = false
  }, [deadlineMs])

  useEffect(() => {
    // 非活动或暂停或无 lastActivityAt 时停止计时，也不触发 onIdleExpire。
    if (!active || timerPaused || deadlineMs === undefined) {
      return
    }

    const fireIfExpired = (current: number) => {
      if (deadlineMs - current <= 0 && !expiredFiredRef.current) {
        expiredFiredRef.current = true
        onExpireRef.current?.()
      }
    }

    // 进入活动态即检查一次到期（render 已基于 now 快照给出剩余值，
    // 不在 effect 内同步 setState；后续由 interval 推进 now）。
    fireIfExpired(Date.now())

    const intervalId = setInterval(() => {
      const tickNow = Date.now()
      setNow(tickNow)
      fireIfExpired(tickNow)
    }, DEFAULT_TICK_MS)

    return () => clearInterval(intervalId)
  }, [active, timerPaused, deadlineMs])

  return { remainingMs, phase, warningText: WARN_TEXT[phase] }
}
