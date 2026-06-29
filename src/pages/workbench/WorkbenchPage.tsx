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
import { EmergencyOverlay } from "@/features/workbench/components/EmergencyOverlay"
import { ExitVisitSheet } from "@/features/workbench/components/ExitVisitSheet"
import { InputDock } from "@/features/workbench/components/InputDock"
import { LockBar } from "@/features/workbench/components/LockBar"
import { LockQuestionSheet } from "@/features/workbench/components/LockQuestionSheet"
import { SuspendOverlay } from "@/features/workbench/components/SuspendOverlay"
import { WorkbenchHeader } from "@/features/workbench/components/WorkbenchHeader"
import { WorkbenchShell } from "@/features/workbench/components/WorkbenchShell"
import { WorkbenchSidebar } from "@/features/workbench/components/WorkbenchSidebar"
import { useExitSettlement } from "@/features/workbench/hooks/useExitSettlement"
import { useVisitCountdown } from "@/features/workbench/hooks/useVisitCountdown"
import type { WorkbenchLoaderData } from "@/pages/workbench/workbench-loaders"

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
  const timeoutOverlayOpen = useWorkbenchUiStore((s) => s.timeoutOverlayOpen)
  const setTimeoutOverlayOpen = useWorkbenchUiStore((s) => s.setTimeoutOverlayOpen)
  const exitSheetOpen = useWorkbenchUiStore((s) => s.exitSheetOpen)
  const setExitSheetOpen = useWorkbenchUiStore((s) => s.setExitSheetOpen)

  // ---- 空闲计时（基于最后一次操作，达到阈值自动挂起；completed / 挂起 / 终止态停止）----
  const isTerminated = state === "terminated" || state === "exited"
  const isSuspended = state === "suspended" || session?.status === "suspended"
  const countdownActive =
    !isTerminated && !isSuspended && state !== "completed"
  const handleIdleExpire = useCallback(() => {
    setTimeoutOverlayOpen(true)
    void actions.suspendVisit()
  }, [setTimeoutOverlayOpen, actions])
  const { warningText } = useVisitCountdown({
    lastActivityAt: session?.lastActivityAt,
    pausedAt: session?.pausedAt,
    timerPaused: context.timerPaused,
    active: countdownActive,
    onIdleExpire: handleIdleExpire,
  })

  // ---- 退出后果（从时间线派生）----
  const { consequence } = useExitSettlement(items)

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

  // 超时警告文案由倒计时 hook 驱动（warn5 / warn2 阶段非空）。
  const timeoutWarning = warningText || undefined

  return (
    <WorkbenchShell
      sidebar={
        <WorkbenchSidebar
          patientName={session?.patientId}
          chiefComplaint={session?.summary?.chiefComplaint}
          lastActivityAt={session?.lastActivityAt}
        />
      }
      header={
        <WorkbenchHeader
          timeoutWarning={timeoutWarning}
          timerPaused={context.timerPaused}
          isTerminated={isTerminated}
          onPause={actions.pauseVisit}
          onResume={actions.resumeVisit}
          onReportEmergency={() => {
            actions.reportVitals({
              sessionId,
              source: "patient_report",
              symptoms: ["患者主动上报不适"],
            })
          }}
          onExit={() => setExitSheetOpen(true)}
        />
      }
      timeline={
        <>
          <ContextSummaryBar
            patientName={session?.patientId}
            chiefComplaint={session?.summary?.chiefComplaint}
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
            lastActivityAt={session?.lastActivityAt}
          />
          <LockQuestionSheet
            open={lockQuestionSheetOpen}
            onOpenChange={(open) => setLockQuestionSheet(open, open ? lockQuestionCardId : undefined)}
            cardTitle={blockingCard?.title}
            onSubmit={(content) => {
              const cardId = lockQuestionCardId ?? blockingCard?.id
              if (cardId) {
                void actions.askLockedQuestion(content, cardId)
              }
            }}
          />
          <EmergencyOverlay
            open={state === "emergencyPending"}
            source={context.emergencySource}
            onConfirmEmergency={actions.confirmEmergency}
            onDismiss={() => {
              void actions.dismissEmergency()
            }}
          />
          <SuspendOverlay
            open={timeoutOverlayOpen || isSuspended}
            onContinue={() => {
              setTimeoutOverlayOpen(false)
              void actions.resumeFromSuspended()
            }}
          />
          <ExitVisitSheet
            open={exitSheetOpen && !isTerminated}
            onOpenChange={setExitSheetOpen}
            consequence={consequence}
            onConfirm={() => {
              void actions.confirmExit().then(() => {
                setExitSheetOpen(false)
                navigate("/")
              })
            }}
            onCancel={() => setExitSheetOpen(false)}
          />
        </>
      }
    />
  )
}
