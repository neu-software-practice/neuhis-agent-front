import { useEffect, useRef, useState } from "react"

/** 倒计时阶段。会话级单一计时，不按步骤重置。 */
export type VisitCountdownPhase = "normal" | "warn5" | "warn2" | "expired"

/** ≤5min 阈值（毫秒）。 */
const WARN5_THRESHOLD_MS = 5 * 60 * 1000
/** ≤2min 阈值（毫秒）。 */
const WARN2_THRESHOLD_MS = 2 * 60 * 1000
/** 默认重算间隔（毫秒）。 */
const DEFAULT_TICK_MS = 1000

/** >5min 时不显示警告文案。 */
const WARN_TEXT: Record<VisitCountdownPhase, string> = {
  normal: "",
  warn5: "问诊时间即将结束",
  warn2: "即将超时，请尽快完成",
  expired: "",
}

export interface UseVisitCountdownInput {
  /** 会话截止时间（ISO 字符串）。后端在 resume 时已把暂停时长加回，hook 不重复补偿。 */
  timeoutAt?: string
  /** 当前一次暂停的起点（ISO 字符串）。暂停时用于冻结剩余时间。 */
  pausedAt?: string
  /** 计时是否已暂停。 */
  timerPaused?: boolean
  /** 是否处于活动计时态（completed / 终止态应传 false）。 */
  active: boolean
  /** 到期回调，仅在 active 且未暂停时触发一次。 */
  onExpire?: () => void
}

export interface UseVisitCountdownResult {
  /** 剩余毫秒数；无截止时间时为 Number.POSITIVE_INFINITY。 */
  remainingMs: number
  phase: VisitCountdownPhase
  /** 患者可见警告文案；normal / expired 为空字符串。 */
  warningText: string
}

function derivePhase(remainingMs: number): VisitCountdownPhase {
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
 * 纯计算会话剩余时间的倒计时 hook。
 *
 * - 基于 `timeoutAt` 计算剩余时间，会话级单一计时，不按步骤重置。
 * - 暂停（`timerPaused`）时冻结剩余时间（按 `pausedAt` 计算），不本地递减；
 *   恢复后按传入的 session 字段重读（`timeoutAt` 已由后端在 resume 时加回暂停时长）。
 * - `active=false`（completed / 终止态）时停止计时，不触发 `onExpire`。
 * - 到期（剩余 ≤0 且 active 且未暂停）时触发一次 `onExpire`（用 ref 防重复）。
 *
 * 不调用任何 transport / API / 状态机，只通过参数与回调通信。
 *
 * 实现注记：render 保持纯函数（不读 `Date.now()`），当前时间存入 `now` state，
 * 仅由 `setInterval` 在活动计时期间推进，从而驱动重算与重渲染。
 */
export function useVisitCountdown({
  timeoutAt,
  pausedAt,
  timerPaused = false,
  active,
  onExpire,
}: UseVisitCountdownInput): UseVisitCountdownResult {
  const deadlineMs = toMs(timeoutAt)
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

  // onExpire 防重复触发：每个截止时间只触发一次。
  const expiredFiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  // 截止时间变化（如 resume 后被加回暂停时长）时重置已触发标记。
  useEffect(() => {
    expiredFiredRef.current = false
  }, [deadlineMs])

  useEffect(() => {
    // 非活动或暂停或无截止时间时停止计时，也不触发 onExpire。
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
