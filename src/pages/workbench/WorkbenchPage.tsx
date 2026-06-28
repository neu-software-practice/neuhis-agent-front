import { useCallback, useState } from "react"
import { useLoaderData, useNavigate } from "react-router"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { visitsQueries } from "@/features/visits/api/queries"
import { ContextSummaryBar } from "@/features/workbench/components/ContextSummaryBar"
import { ContextSummaryDrawer } from "@/features/workbench/components/ContextSummaryDrawer"
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
 * 读取 loader 解析的 sessionId，加载会话与时间线数据，装配 WorkbenchShell。
 * P3.2 阶段时间线和输入区域为临时占位，P3.3/P4.1 替换为真实组件。
 */
export default function WorkbenchPage() {
  const { sessionId } = useLoaderData() as WorkbenchLoaderData
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // 加载会话信息
  const sessionQuery = useQuery(visitsQueries.session(sessionId))

  const handleExit = useCallback(() => {
    navigate("/")
  }, [navigate])

  const handlePause = useCallback(() => {
    // P3.2: placeholder — 暂停逻辑将在 P4.1 实现
  }, [])

  const handleResume = useCallback(() => {
    // P3.2: placeholder — 恢复逻辑将在 P4.1 实现
  }, [])

  // 加载态
  if (sessionQuery.isLoading) {
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

  // 错误态
  if (sessionQuery.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <EmptyState
          title="加载失败"
          description={
            sessionQuery.error?.message ?? "无法加载问诊信息，请稍后重试"
          }
          action={
            <Button onClick={() => navigate("/")}>返回首页</Button>
          }
        />
      </div>
    )
  }

  // 数据就绪
  const session = sessionQuery.data!

  // 计算超时警告文案（不使用 useMemo / impure Date.now，仅格式化截止时间）
  const timeoutWarning = session.timeoutAt
    ? formatTimeoutShort(session.timeoutAt)
    : undefined

  return (
    <WorkbenchShell
      header={
        <WorkbenchHeader
          timeoutWarning={timeoutWarning}
          timerPaused={session.timerPaused}
          onPause={handlePause}
          onResume={handleResume}
          onExit={handleExit}
        />
      }
      timeline={
        <>
          <ContextSummaryBar
            patientName={session.patientId}
            chiefComplaint={session.summary?.chiefComplaint}
            visitRound={session.askRound}
            onClick={() => setDrawerOpen(true)}
          />
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">时间线区域</p>
          </div>
        </>
      }
      input={
        <div className="px-4 py-3">
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-3">
            <p className="text-sm text-muted-foreground">输入区域</p>
          </div>
        </div>
      }
      overlays={
        <ContextSummaryDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          patientName={session.patientId}
          chiefComplaint={session.summary?.chiefComplaint}
          visitRound={session.askRound}
          askRoundLimit={session.askRoundLimit}
          timeoutAt={session.timeoutAt}
        />
      }
    />
  )
}
