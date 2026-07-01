import { useMemo } from "react"
import { useLoaderData, useNavigate } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import { ChatTimeline } from "@/features/workbench/components/ChatTimeline"
import { ContextSummaryBar } from "@/features/workbench/components/ContextSummaryBar"
import { VisitStatusBadge } from "@/features/visits/components/VisitStatusBadge"
import { visitsQueries } from "@/features/visits/api/queries"
import type { VisitSnapshot } from "@/features/visits/api"
import { toUiMessage } from "@/lib/ui-message"
import type { ReadonlyVisitLoaderData } from "@/pages/workbench/workbench-loaders"

/**
 * 历史就诊只读回看页。
 *
 * 用 `visitsQueries.snapshot` 拉取只读快照，渲染只读时间线 + 摘要。
 *
 * 只读语义（`readonly`）独立于 `disabled` / `pending`：
 * - 不渲染任何可发送输入框（InputDock / LockBar），不触发 Agent 主循环。
 * - ChatTimeline 不传 `onAction`，时间线内流程卡动作变为 no-op。
 *
 * 四态明确处理：loading / error / empty / ready。
 * 错误经 `toUiMessage` 转患者文案，可重试项给「重试」入口，
 * 不暴露原始 `ApiError.message` 或内部状态名。
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
      <ReadonlyStatusBadge snapshot={query.data} />
    </div>
  )

  return (
    <PageShell header={header} className="flex flex-col">
      <ReadonlyVisitBody
        state={query}
        onRetry={() => void query.refetch()}
        onBack={goBack}
      />
    </PageShell>
  )
}

/** 顶栏右侧状态标签：仅就绪态展示。 */
function ReadonlyStatusBadge({ snapshot }: { snapshot: VisitSnapshot | undefined }) {
  if (!snapshot) return null
  return <VisitStatusBadge status={snapshot.session.status} className="ml-auto" />
}

interface ReadonlyVisitBodyProps {
  state: ReturnType<typeof useQuery<VisitSnapshot>>
  onRetry: () => void
  onBack: () => void
}

/**
 * 只读页四态分发：loading / error / empty / ready。
 *
 * 注意：本页是回看态，ChatTimeline 不传 `onAction`，
 * 卡片动作回调（`onAction?.()`）全部 no-op，不会推进任何状态机。
 */
function ReadonlyVisitBody({ state, onRetry, onBack }: ReadonlyVisitBodyProps) {
  const { data, isLoading, isError, error } = state

  // ── loading ──
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // ── error ──
  if (isError) {
    const message = toUiMessage(error)
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <EmptyState
          title={message.title}
          description={message.description}
          action={
            message.retriable ? (
              <Button onClick={onRetry}>重试</Button>
            ) : (
              <Button variant="secondary" onClick={onBack}>
                返回历史记录
              </Button>
            )
          }
        />
      </div>
    )
  }

  // ── empty（快照已就绪但无任何时间线内容）──
  if (!data || data.timeline.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <EmptyState
          icon={<FileText className="size-10" />}
          title="这次就诊没有可回看的记录"
          description="该会话没有产生对话或处置内容。"
          action={
            <Button variant="secondary" onClick={onBack}>
              返回历史记录
            </Button>
          }
        />
      </div>
    )
  }

  // ── ready ──
  return <ReadonlyVisitReady snapshot={data} />
}

/** 就绪态：摘要 + 只读时间线。无输入框、无动作回调。 */
function ReadonlyVisitReady({ snapshot }: { snapshot: VisitSnapshot }) {
  const { session, timeline } = snapshot

  // 派生展示值在 render 中计算，不进 state。
  const summaryParts = useMemo(() => {
    return {
      patientName: session.patientName,
    }
  }, [session])

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-md px-4 pt-3">
        <ContextSummaryBar
          patientName={summaryParts.patientName}
        />
      </div>
      {/* 只读时间线：readonly 透传 → 流程卡禁用，不传 onAction → 动作 no-op */}
      <div className="min-h-0 flex-1">
        <ChatTimeline items={timeline} readonly />
      </div>
    </div>
  )
}
