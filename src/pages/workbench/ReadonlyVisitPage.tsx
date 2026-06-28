import { useLoaderData } from "react-router"

import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import type { ReadonlyVisitLoaderData } from "@/pages/workbench/workbench-loaders"

/**
 * 历史记录只读回看占位骨架。
 *
 * P1 阶段仅确认 sessionId 已解析，不加载只读时间线与摘要，
 * 不触发 Agent 主循环，也不展示可发送输入框。只读装配在 P5.4 落地。
 */
export default function ReadonlyVisitPage() {
  const { sessionId } = useLoaderData() as ReadonlyVisitLoaderData

  return (
    <PageShell>
      <EmptyState
        title="历史记录回看（占位）"
        description={`会话：${sessionId}`}
      />
    </PageShell>
  )
}
