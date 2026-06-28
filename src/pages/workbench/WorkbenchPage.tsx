import { useCallback } from "react"
import { useLoaderData, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { useComposerStore } from "@/features/workbench/store/composer-store"
import { useWorkbenchUiStore } from "@/features/workbench/store/workbench-ui-store"
import { useWorkbenchSession } from "@/features/workbench/hooks/useWorkbenchSession"
import { ChatTimeline } from "@/features/workbench/components/ChatTimeline"
import { ContextSummaryBar } from "@/features/workbench/components/ContextSummaryBar"
import { ContextSummaryDrawer } from "@/features/workbench/components/ContextSummaryDrawer"
import { InputDock } from "@/features/workbench/components/InputDock"
import { LockBar } from "@/features/workbench/components/LockBar"
import { LockQuestionSheet } from "@/features/workbench/components/LockQuestionSheet"
import { WorkbenchHeader } from "@/features/workbench/components/WorkbenchHeader"
import { WorkbenchShell } from "@/features/workbench/components/WorkbenchShell"
import type { WorkbenchLoaderData } from "@/pages/workbench/workbench-loaders"

/** 格式化超时时间为 "截止 HH:mm" 简写（纯函数，不含 Date.now）。 */
function formatTimeoutShort(iso: string): string {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return iso
  const hh = date.getHours().toString().padStart(2, "0")
  const mm = date.getMinutes().toString().padStart(2, "0")
  return `截止 ${hh}:${mm}`
}

/**
 * 进行中工作台页面。
 *
 * 使用 useWorkbenchSession 总装 hook 统一管理 session / 时间线 / 状态机 / actions。
 * P4.2/P4.3 集成 SSE 流式回复和流程卡动作分发。
 */
export default function WorkbenchPage() {
  const { sessionId } = useLoaderData() as WorkbenchLoaderData
  const navigate = useNavigate()

  const handleFollowUpCreated = useCallback(
    (nextSessionId: string) => {
      navigate(`/workbench/${nextSessionId}`)
    },
    [navigate],
  )

  // ---- 总装 hook ----
  const {
    session,
    items,
    state,
    context,
    blockingCard,
    loading,
    error,
    hasMore,
    fetchMore,
    isFetchingMore,
    isStreaming,
    actions,
  } = useWorkbenchSession(sessionId, {
    onFollowUpCreated: handleFollowUpCreated,
  })

  // ---- Composer (输入草稿) ----
  const draft = useComposerStore((s) => s.draftsBySession[sessionId] ?? "")
  const setDraft = useComposerStore((s) => s.setDraft)

  // ---- UI Store (Drawer 等) ----
  const drawerOpen = useWorkbenchUiStore((s) => s.contextDrawerOpen)
  const setDrawerOpen = useWorkbenchUiStore((s) => s.setContextDrawerOpen)
  const lockQuestionSheetOpen = useWorkbenchUiStore((s) => s.lockQuestionSheetOpen)
  const lockQuestionCardId = useWorkbenchUiStore((s) => s.lockQuestionCardId)
  const setLockQuestionSheet = useWorkbenchUiStore((s) => s.setLockQuestionSheet)

  // ---- 返回首页 ----
  const handleNavigateHome = useCallback(() => {
    navigate("/")
  }, [navigate])

  // ==================== 加载态 ====================
  if (loading) {
    return (
      <WorkbenchShell
        header={<WorkbenchHeader />}
        timeline={
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">正在加载...</p>
          </div>
        }
        input={
          <div className="px-4 py-3">
            <div className="h-10 animate-pulse rounded-lg bg-muted" />
          </div>
        }
      />
    )
  }

  // ==================== 错误态 ====================
  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <EmptyState
          title="加载失败"
          description={error}
          action={
            <Button onClick={handleNavigateHome}>返回首页</Button>
          }
        />
      </div>
    )
  }

  // ==================== 数据就绪 ====================

  // 超时警告文案
  const timeoutWarning = session?.timeoutAt
    ? formatTimeoutShort(session.timeoutAt)
    : undefined

  // 阻断状态：存在阻塞卡时显示 LockBar，否则显示 InputDock
  const isTerminated = state === "terminated" || state === "exited"

  return (
    <WorkbenchShell
      header={
        <WorkbenchHeader
          timeoutWarning={timeoutWarning}
          timerPaused={context.timerPaused}
          onPause={actions.pauseVisit}
          onResume={actions.resumeVisit}
          onExit={actions.requestExit}
        />
      }
      timeline={
        <>
          <ContextSummaryBar
            patientName={session?.patientId}
            chiefComplaint={session?.summary?.chiefComplaint}
            visitRound={session?.askRound}
            onClick={() => setDrawerOpen(true)}
          />
          <ChatTimeline
            items={items}
            onAction={actions.submitFlowAction}
            loading={isFetchingMore}
            hasMore={hasMore}
            onLoadMore={fetchMore}
          />
        </>
      }
      input={
        blockingCard ? (
          <LockBar
            lockReason={blockingCard.lockReason}
            visible
            onReportEmergency={() => {
              actions.reportVitals({
                sessionId,
                source: "patient_report",
                symptoms: ["患者主动上报不适"],
              })
            }}
            onAskQuestion={() => {
              // P4.3: 打开锁定问题 Sheet（由 workbench-ui-store 管理）
              useWorkbenchUiStore.getState().setLockQuestionSheet(
                true,
                blockingCard.id,
              )
            }}
          />
        ) : (
          <InputDock
            value={draft}
            onValueChange={(v) => setDraft(sessionId, v)}
            onSend={() => {
              if (draft.trim()) {
                actions.sendMessage(draft)
              }
            }}
            blocked={isTerminated}
            sending={isStreaming}
          />
        )
      }
      overlays={
        <>
          <ContextSummaryDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            patientName={session?.patientId}
            chiefComplaint={session?.summary?.chiefComplaint}
            visitRound={session?.askRound}
            askRoundLimit={session?.askRoundLimit}
            timeoutAt={session?.timeoutAt}
          />
          <LockQuestionSheet
            open={lockQuestionSheetOpen}
            onOpenChange={(open) => setLockQuestionSheet(open, open ? lockQuestionCardId : undefined)}
            cardTitle={blockingCard?.title}
            onSubmit={(content) => {
              actions.sendMessage(content)
            }}
          />
        </>
      }
    />
  )
}
