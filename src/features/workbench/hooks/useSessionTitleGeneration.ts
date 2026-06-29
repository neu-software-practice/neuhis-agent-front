import { useEffect, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { visitsApi } from "@/features/visits/api"
import { visitsQueryKeys } from "@/features/visits/api/queries"
import type { VisitSession } from "@/features/visits/api/types"

/**
 * useSessionTitleGeneration
 *
 * 在首轮 AI 回复完成后自动触发标题生成。后端调用 LLM 基于对话内容总结出简短标题，
 * 替代之前直接用患者第一句话作为会话名称的做法。
 *
 * 触发条件（全部满足时自动发起）：
 * 1. isStreaming 从 true 变为 false（表示一轮流式回复刚完成）
 * 2. 当前 session 的 summary.title 为空（尚未生成过标题）
 * 3. 每个 sessionId 只触发一次
 */
export function useSessionTitleGeneration(
  sessionId: string,
  isStreaming: boolean,
) {
  const queryClient = useQueryClient()
  const triggeredRef = useRef<string | null>(null)
  const wasStreamingRef = useRef(false)

  const { mutate } = useMutation({
    mutationFn: () => visitsApi.generateTitle({ sessionId }),
    onSuccess: (result) => {
      // 更新 session query cache 中的 title
      queryClient.setQueryData<VisitSession>(
        visitsQueryKeys.session(sessionId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            summary: { ...old.summary, title: result.title },
          }
        },
      )
      // 刷新列表缓存（历史页会用到 title）
      queryClient.invalidateQueries({ queryKey: visitsQueryKeys.list() })
    },
  })

  useEffect(() => {
    const wasStreaming = wasStreamingRef.current
    wasStreamingRef.current = isStreaming

    // 检测 streaming 从 true → false 的转换（一轮回复刚完成）
    if (!wasStreaming || isStreaming) return

    // 已触发过本 session 的标题生成，跳过
    if (triggeredRef.current === sessionId) return

    // 检查 session 是否已有标题
    const session = queryClient.getQueryData<VisitSession>(
      visitsQueryKeys.session(sessionId),
    )
    if (!session) return
    if (session.summary.title) return
    // 至少有一轮对话
    if (session.askRound < 1) return

    triggeredRef.current = sessionId
    mutate()
  }, [isStreaming, sessionId, mutate, queryClient])
}
