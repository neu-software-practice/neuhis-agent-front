import { useEffect, useRef } from "react"
import { useLoaderData, useNavigate } from "react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { InfiniteData } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import { visitsApi } from "@/features/visits/api"
import { visitsQueryKeys } from "@/features/visits/api/queries"
import { workbenchQueryKeys } from "@/features/workbench/api/queries"
import type { ListTimelineResult } from "@/features/workbench/api"
import type { NewWorkbenchLoaderData } from "@/pages/workbench/workbench-loaders"

export function getCreateVisitTimeoutMs(): number {
  const raw = Number(import.meta.env.VITE_CREATE_VISIT_TIMEOUT_MS ?? 10_000)
  return Number.isFinite(raw) && raw > 0 ? raw : 10_000
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("复诊创建超时，请重试。"))
    }, timeoutMs)

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId)
        reject(error)
      },
    )
  })
}

/**
 * 新建问诊工作台页面。
 *
 * 读取 loader 解析的 draft / followUpFrom，自动创建会话。
 * 创建成功后跳转到对应工作台 /workbench/:sessionId。
 */
export default function NewWorkbenchPage() {
  const { draft, followUpFrom } = useLoaderData() as NewWorkbenchLoaderData
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const hasCreated = useRef(false)

  const {
    mutate,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: () => {
      if (followUpFrom) {
        return withTimeout(
          visitsApi.createFollowUp({
            patientId: "patient-mock-001",
            parentSessionId: followUpFrom,
            chiefComplaint: draft || undefined,
          }),
          getCreateVisitTimeoutMs(),
        )
      }
      return withTimeout(
        visitsApi.createSession({
          patientId: "patient-mock-001",
          entryType: "new",
          chiefComplaint: draft || undefined,
        }),
        getCreateVisitTimeoutMs(),
      )
    },
    onSuccess: (result) => {
      queryClient.setQueryData(
        visitsQueryKeys.session(result.session.id),
        result.session,
      )
      queryClient.setQueryData<InfiniteData<ListTimelineResult>>(
        workbenchQueryKeys.timeline(result.session.id),
        {
          pages: [
            {
              items: result.initialTimeline,
              hasMore: false,
            },
          ],
          pageParams: [undefined],
        },
      )
      void queryClient.invalidateQueries({ queryKey: visitsQueryKeys.all })
      navigate(`/workbench/${result.session.id}`, { replace: true })
    },
  })

  // 挂载时自动创建会话（mutate 在 TanStack Query 中稳定不变）
  useEffect(() => {
    if (hasCreated.current) return
    hasCreated.current = true
    mutate()
  }, [mutate])

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
