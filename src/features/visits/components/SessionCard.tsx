import { Card, CardHeader, CardContent, CardFooter } from "@heroui/react"
import { Calendar, ChevronRight, Eye, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { VisitSessionSummary } from "@/features/visits/api"
import { VisitStatusBadge } from "@/features/visits/components/VisitStatusBadge"
import { formatDate } from "@/lib/time"
import { cn } from "@/lib/utils"

/** 进行中状态集合。 */
const ACTIVE_STATUSES = new Set([
  "chatting",
  "analyzing",
  "blocked",
  "diagnosis",
  "treatment",
  "loading_context",
])

/** 终止/转诊/退出状态集合。 */
const TERMINAL_STATUSES = new Set([
  "transferred",
  "emergency_terminated",
  "exited",
])

/** 挂起态：长时间未操作自动暂停，可按复诊流程继续。非终态。 */
const SUSPENDED_STATUS = "suspended"

interface SessionCardProps {
  /** 会话摘要。 */
  session: VisitSessionSummary
  /** 进行中时点击"继续就诊"。 */
  onContinue?: () => void
  /** 已完成时点击"发起复诊"。 */
  onFollowUp?: () => void
  /** 已完成或终止时点击"回看记录"。 */
  onViewRecord?: () => void
  className?: string
}

/**
 * 就诊会话卡片。
 *
 * 展示会话摘要（主诉、状态、时间、最后消息），并根据会话状态
 * 显示对应的操作按钮组合。
 */
export function SessionCard({
  session,
  onContinue,
  onFollowUp,
  onViewRecord,
  className,
}: SessionCardProps) {
  const title = session.summary.title ?? session.summary.chiefComplaint ?? "未命名问诊"
  const isActive = ACTIVE_STATUSES.has(session.status)
  const isCompleted = session.status === "completed"
  const isTerminal = TERMINAL_STATUSES.has(session.status)
  const isSuspended = session.status === SUSPENDED_STATUS

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="truncate text-base font-medium">{title}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" />
            <span>{formatDate(session.startedAt)}</span>
          </div>
        </div>
        <VisitStatusBadge status={session.status} className="shrink-0" />
      </CardHeader>

      {session.summary.lastMessage ? (
        <CardContent className="pt-0">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {session.summary.lastMessage}
          </p>
        </CardContent>
      ) : null}

      <CardFooter className="flex flex-wrap gap-2">
        {isActive ? (
          <Button
            size="sm"
            onClick={onContinue}
          >
            继续就诊
            <ChevronRight className="size-4" />
          </Button>
        ) : null}

        {isCompleted ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={onFollowUp}
            >
              <RefreshCw className="size-4" />
              发起复诊
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onViewRecord}
            >
              <Eye className="size-4" />
              回看记录
            </Button>
          </>
        ) : null}

        {isSuspended ? (
          <Button
            size="sm"
            onClick={onContinue}
          >
            继续问诊
            <ChevronRight className="size-4" />
          </Button>
        ) : null}

        {isTerminal ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={onViewRecord}
          >
            <Eye className="size-4" />
            回看记录
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}
