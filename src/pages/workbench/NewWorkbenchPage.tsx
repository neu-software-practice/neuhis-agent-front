import { useLoaderData } from "react-router"

import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import type { NewWorkbenchLoaderData } from "@/pages/workbench/workbench-loaders"

/**
 * 新建问诊工作台占位骨架。
 *
 * P1 阶段仅展示路由参数已正确解析，不创建会话、不接入状态机与时间线。
 * 真实的会话创建与工作台装配在 P3 / P4 落地。
 */
export default function NewWorkbenchPage() {
  const { draft, followUpFrom } = useLoaderData() as NewWorkbenchLoaderData

  const description = [
    draft ? `症状草稿：${draft}` : "无症状草稿",
    followUpFrom ? `复诊来源：${followUpFrom}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <PageShell>
      <EmptyState title="新建问诊（占位）" description={description} />
    </PageShell>
  )
}
