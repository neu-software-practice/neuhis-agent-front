import { Drawer } from "@heroui/react"

interface ContextSummaryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 患者姓名。 */
  patientName?: string
  /** 主诉。 */
  chiefComplaint?: string
  /** 当前问诊轮次。 */
  visitRound?: number
  /** 最大问诊轮次限制。 */
  askRoundLimit?: number
  /** 超时时间（ISO 字符串）。 */
  timeoutAt?: string
}

/**
 * 问诊上下文摘要 Drawer。
 *
 * 使用 HeroUI v3 Drawer 展示完整上下文信息。
 * 在 ContextSummaryBar 点击时打开。
 */
export function ContextSummaryDrawer({
  open,
  onOpenChange,
  patientName,
  chiefComplaint,
  visitRound,
  askRoundLimit,
  timeoutAt,
}: ContextSummaryDrawerProps) {
  return (
    <Drawer>
      <Drawer.Backdrop isOpen={open} onOpenChange={onOpenChange}>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading>问诊上下文</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body>
              <div className="flex flex-col gap-4">
                {/* 患者姓名 */}
                {patientName ? (
                  <InfoRow label="患者" value={patientName} />
                ) : null}

                {/* 主诉 */}
                {chiefComplaint ? (
                  <InfoRow label="主诉" value={chiefComplaint} />
                ) : null}

                {/* 当前轮次 / 最大轮次 */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">问诊轮次</span>
                  <span className="font-medium">
                    {visitRound ?? "-"} / {askRoundLimit ?? "-"}
                  </span>
                </div>

                {/* 超时时间 */}
                {timeoutAt ? (
                  <InfoRow label="超时时间" value={formatTimeout(timeoutAt)} />
                ) : null}
              </div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}

/** 单行信息条目。 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[200px] truncate text-right font-medium">
        {value}
      </span>
    </div>
  )
}

/** 格式化超时时间。 */
function formatTimeout(iso: string): string {
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
