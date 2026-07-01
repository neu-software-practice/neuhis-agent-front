import { useMemo } from "react"
import { useLoaderData, useNavigate } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { ChatTimeline } from "@/features/workbench/components/ChatTimeline"
import { ContextSummaryBar } from "@/features/workbench/components/ContextSummaryBar"
import { WorkbenchShell } from "@/features/workbench/components/WorkbenchShell"
import { VisitStatusBadge } from "@/features/visits/components/VisitStatusBadge"
import { visitsQueries } from "@/features/visits/api/queries"
import type { VisitSnapshot } from "@/features/visits/api"
import { toUiMessage } from "@/lib/ui-message"
import type { ReadonlyVisitLoaderData } from "@/pages/workbench/workbench-loaders"

/**
 * 历史就诊只读回看页。
 *
 * 复用 WorkbenchShell 布局（h-dvh → flex 列），确保 Virtuoso
 * 能拿到确定的容器高度。
 */
export default function ReadonlyVisitPage() {
  const { sessionId } = useLoaderData() as ReadonlyVisitLoaderData
  const navigate = useNavigate()

  const query = useQuery(visitsQueries.snapshot(sessionId))

  const goBack = () => navigate("/history")

  const header = (
    <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 py-3">
      <Button
        size="icon"
        variant="ghost"
        onClick={goBack}
        aria-label="返回历史记录"
      >
        <ArrowLeft className="size-5" />
      </Button>
      <h1 className="text-lg font-semibold">就诊记录回看</h1>
      {query.data ? (
        <VisitStatusBadge status={query.data.session.status} className="ml-auto" />
      ) : null}
    </div>
  )

  // ── loading ──
  if (query.isLoading) {
    return (
      <WorkbenchShell
        header={header}
        timeline={
          <div className="flex items-center justify-center py-12">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
        input={null}
      />
    )
  }

  // ── error ──
  if (query.isError) {
    const message = toUiMessage(query.error)
    return (
      <WorkbenchShell
        header={header}
        timeline={
          <div className="flex flex-1 items-center justify-center px-4 py-16">
            <EmptyState
              title={message.title}
              description={message.description}
              action={
                message.retriable ? (
                  <Button onClick={() => void query.refetch()}>重试</Button>
                ) : (
                  <Button variant="secondary" onClick={goBack}>
                    返回历史记录
                  </Button>
                )
              }
            />
          </div>
        }
        input={null}
      />
    )
  }

  // ── empty ──
  if (!query.data || query.data.timeline.length === 0) {
    return (
      <WorkbenchShell
        header={header}
        timeline={
          <div className="flex flex-1 items-center justify-center px-4 py-16">
            <EmptyState
              icon={<FileText className="size-10" />}
              title="这次就诊没有可回看的记录"
              description="该会话没有产生对话或处置内容。"
              action={
                <Button variant="secondary" onClick={goBack}>
                  返回历史记录
                </Button>
              }
            />
          </div>
        }
        input={null}
      />
    )
  }

  // ── ready ──
  return <ReadonlyVisitReady snapshot={query.data} />
}

/** 就绪态：摘要 + 只读时间线。无输入框、无动作回调。 */
function ReadonlyVisitReady({ snapshot }: { snapshot: VisitSnapshot }) {
  const { session, timeline } = snapshot

  const summaryParts = useMemo(
    () => ({ patientName: session.patientName }),
    [session],
  )

  // 按 createdAt 升序排列（最旧在前），不依赖服务端返回顺序
  const sortedTimeline = useMemo(
    () =>
      [...timeline].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [timeline],
  )

  return (
    <WorkbenchShell
      header={
        <BackHeader session={session} />
      }
      timeline={
        <div className="flex h-full flex-col">
          <div className="mx-auto w-full max-w-md px-4 pt-3">
            <ContextSummaryBar patientName={summaryParts.patientName} />
          </div>
          <div className="min-h-0 flex-1">
            <ChatTimeline items={sortedTimeline} readonly />
          </div>
        </div>
      }
      input={null}
    />
  )
}

function BackHeader({ session }: { session: VisitSnapshot["session"] }) {
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 py-3">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => navigate("/history")}
        aria-label="返回历史记录"
      >
        <ArrowLeft className="size-5" />
      </Button>
      <h1 className="text-lg font-semibold">就诊记录回看</h1>
      <VisitStatusBadge status={session.status} className="ml-auto" />
    </div>
  )
}
