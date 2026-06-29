import { useEffect, useRef } from "react"
import { useLoaderData, useNavigate } from "react-router"
import { useMutation } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import { visitsApi } from "@/features/visits/api"
import { useAuthStore } from "@/features/auth/store/auth-store"
import type { NewWorkbenchLoaderData } from "@/pages/workbench/workbench-loaders"

/**
 * 新建问诊工作台页面。
 *
 * 读取 loader 解析的 draft / followUpFrom，自动创建会话。
 * 创建成功后跳转到对应工作台 /workbench/:sessionId。
 */
export default function NewWorkbenchPage() {
  const { draft, followUpFrom } = useLoaderData() as NewWorkbenchLoaderData
  const navigate = useNavigate()
  const hasCreated = useRef(false)
  const patientId = useAuthStore((s) => s.user?.patientId ?? "")

  const {
    mutate,
    isPending,
    isError,
    error,
    data,
  } = useMutation({
    mutationFn: () => {
      if (followUpFrom) {
        return visitsApi.createFollowUp({
          patientId,
          parentSessionId: followUpFrom,
          chiefComplaint: draft || undefined,
        })
      }
      return visitsApi.createSession({
        patientId,
        entryType: "new",
        chiefComplaint: draft || undefined,
      })
    },
  })

  // 挂载时自动创建会话（mutate 在 TanStack Query 中稳定不变）
  useEffect(() => {
    if (hasCreated.current) return
    hasCreated.current = true
    mutate()
  }, [mutate])

  // 创建成功后跳转到工作台
  useEffect(() => {
    if (data?.session?.id) {
      navigate(`/workbench/${data.session.id}`, { replace: true })
    }
  }, [data, navigate])

  // 创建中
  if (isPending) {
    return (
      <PageShell>
        <EmptyState
          title={
            followUpFrom ? "正在准备复诊..." : "正在创建问诊会话..."
          }
          description="请稍候"
        />
      </PageShell>
    )
  }

  // 创建失败
  if (isError) {
    return (
      <PageShell>
        <EmptyState
          title="创建问诊失败"
          description={
            error?.message ?? "无法创建问诊，请稍后重试"
          }
          action={
            <Button onClick={() => mutate()}>重试</Button>
          }
        />
      </PageShell>
    )
  }

  // 初始渲染（mutation 触发前）
  return (
    <PageShell>
      <EmptyState title="正在准备..." />
    </PageShell>
  )
}
