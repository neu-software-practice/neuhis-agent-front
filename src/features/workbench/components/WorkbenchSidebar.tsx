import { CheckCircle2, Circle, Clock, FileText, User } from "lucide-react"

import { cn } from "@/lib/utils"

interface WorkbenchSidebarProps {
  /** 患者标识。 */
  patientName?: string
  /** 主诉。 */
  chiefComplaint?: string
  /** 当前问诊轮次。 */
  visitRound?: number
  /** 最大问诊轮次限制。 */
  askRoundLimit?: number
  /** 最后一次操作时间（ISO 字符串）。 */
  lastActivityAt?: string
  /** 入口类型描述（如 "新出诊" / "复诊"）。 */
  entryType?: string
  /** 会话当前状态。 */
  sessionStatus?: string
  className?: string
}

/** 状态文案映射。 */
const STATUS_LABELS: Record<string, string> = {
  chatting: "问诊中",
  analyzing: "分析中",
  blocked: "等待确认",
  diagnosis: "已确诊",
  treatment: "处置执行",
  completed: "已完成",
  suspended: "已暂停",
  loading_context: "加载中",
  transferred: "已转诊",
  emergency_terminated: "急症终止",
  exited: "已退出",
}

/**
 * 工作台右侧摘要栏（PC 端）。
 *
 * 常驻展示本次会话的上下文摘要：入口类型、患者信息、主诉、问诊轮次、已完成步骤。
 * 仅在 md 及以上断点显示（由 WorkbenchShell 控制可见性）。
 */
export function WorkbenchSidebar({
  patientName,
  chiefComplaint,
  visitRound,
  askRoundLimit,
  lastActivityAt,
  entryType,
  sessionStatus,
  className,
}: WorkbenchSidebarProps) {
  const statusLabel = sessionStatus ? (STATUS_LABELS[sessionStatus] ?? sessionStatus) : undefined

  return (
    <div
      className={cn(
        "flex flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      {/* 标题 */}
      <h2 className="text-sm font-semibold text-foreground">本次问诊</h2>

      {/* 入口类型 + 状态 */}
      <div className="flex items-center gap-2 text-xs">
        {entryType ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
            {entryType}
          </span>
        ) : null}
        {statusLabel ? (
          <span className="text-muted-foreground">{statusLabel}</span>
        ) : null}
      </div>

      {/* 患者信息 */}
      {patientName ? (
        <InfoItem icon={<User className="size-3.5" />} label="患者" value={patientName} />
      ) : null}

      {/* 主诉 */}
      {chiefComplaint ? (
        <InfoItem icon={<FileText className="size-3.5" />} label="主诉" value={chiefComplaint} />
      ) : null}

      {/* 问诊轮次 */}
      {visitRound !== undefined ? (
        <InfoItem
          icon={<Clock className="size-3.5" />}
          label="问诊轮次"
          value={`${visitRound} / ${askRoundLimit ?? "∞"}`}
        />
      ) : null}

      {/* 最后操作时间 */}
      {lastActivityAt ? (
        <InfoItem
          icon={<Clock className="size-3.5" />}
          label="最后操作"
          value={formatActivityTime(lastActivityAt)}
        />
      ) : null}

      {/* 流程进度 */}
      <div className="mt-2 border-t border-border pt-3">
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">流程进度</h3>
        <div className="flex flex-col gap-1.5">
          <StepItem done label="身份核验" />
          <StepItem done label="病史读取" />
          <StepItem
            done={sessionStatus !== "loading_context" && sessionStatus !== "chatting"}
            label="问诊收集"
          />
          <StepItem
            done={sessionStatus === "diagnosis" || sessionStatus === "treatment" || sessionStatus === "completed"}
            label="诊断分析"
          />
          <StepItem
            done={sessionStatus === "treatment" || sessionStatus === "completed"}
            label="处置执行"
          />
          <StepItem
            done={sessionStatus === "completed"}
            label="就诊完成"
          />
        </div>
      </div>
    </div>
  )
}

/** 信息条目。 */
function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="truncate font-medium text-foreground">{value}</span>
      </div>
    </div>
  )
}

/** 流程步骤条目。 */
function StepItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {done ? (
        <CheckCircle2 className="size-3.5 text-primary" />
      ) : (
        <Circle className="size-3.5 text-muted-foreground/50" />
      )}
      <span className={cn("text-foreground", !done && "text-muted-foreground")}>
        {label}
      </span>
    </div>
  )
}

/** 格式化最后操作时间。 */
function formatActivityTime(iso: string): string {
  try {
    const date = new Date(iso)
    if (isNaN(date.getTime())) return iso
    return date.toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}
