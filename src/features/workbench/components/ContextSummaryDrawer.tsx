import { Drawer } from "@heroui/react"

interface ContextSummaryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 患者姓名。 */
  patientName?: string
  /** 主诉。 */
  chiefComplaint?: string
  /** 最后一次操作时间（ISO 字符串）。 */
  lastActivityAt?: string
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
  lastActivityAt,
}: ContextSummaryDrawerProps) {
  return (
    <Drawer>
      <Drawer.Backdrop isOpen={open} onOpenChange={onOpenChange}>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="bg-background text-foreground shadow-xl">
            <Drawer.Handle />
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading>问诊上下文</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              <div className="flex flex-col gap-4">
                {/* 患者姓名 */}
                {patientName ? (
                  <InfoRow label="患者" value={patientName} />
                ) : null}

                {/* 主诉 */}
                {chiefComplaint ? (
                  <InfoRow label="主诉" value={chiefComplaint} />
                ) : null}

                {/* 最后操作时间 */}
                {lastActivityAt ? (
                  <InfoRow label="最后操作时间" value={formatActivityTime(lastActivityAt)} />
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
      <span className="max-w-[240px] truncate text-right font-medium text-foreground">
        {value}
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
