import { useLoaderData } from "react-router"

import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import type { WorkbenchLoaderData } from "@/pages/workbench/workbench-loaders"

/**
 * 进行中工作台占位骨架。
 *
 * P1 阶段仅确认 sessionId 已解析，不加载会话、时间线或流程卡。
 * 工作台总装配在 P3.2 / P4.1 落地。
 */
export default function WorkbenchPage() {
  const { sessionId } = useLoaderData() as WorkbenchLoaderData

  return (
    <PageShell>
      <EmptyState
        title="问诊工作台（占位）"
        description={`会话：${sessionId}`}
      />
    </PageShell>
  )
}
