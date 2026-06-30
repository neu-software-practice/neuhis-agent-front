import { FlaskConical, Pill } from "lucide-react"

import type { BillingRecord } from "@/features/billing/api/types"
import type { PaymentStatus } from "@/lib/api/types"

const PURPOSE_CONFIG = {
  lab: { icon: FlaskConical, label: "检验" },
  medication: { icon: Pill, label: "药品" },
} as const

interface StatusBadgeConfig {
  label: string
  className: string
}

const STATUS_BADGE: Record<PaymentStatus, StatusBadgeConfig> = {
  paid: { label: "已支付", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  unpaid: { label: "未支付", className: "bg-muted text-muted-foreground" },
  pending: { label: "支付中", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  failed: { label: "支付失败", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  refunded: { label: "已退款", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
}

interface BillingRecordCardProps {
  record: BillingRecord
}

export function BillingRecordCard({ record }: BillingRecordCardProps) {
  const purpose = PURPOSE_CONFIG[record.purpose]
  const PurposeIcon = purpose.icon
  const badge = STATUS_BADGE[record.paymentStatus]

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* 顶部：图标 + 标题 + 时间 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <PurposeIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{record.sessionTitle}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(record.createdAt).toLocaleDateString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* 中部：费用项目 */}
      <div className="mt-3 space-y-1 border-t border-border pt-3">
        {record.items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {item.name}
              {item.quantity && item.quantity > 1 ? ` ×${item.quantity}` : ""}
            </span>
            <span>¥{item.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* 底部：金额汇总 */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>医保 ¥{record.insuranceAmount.toFixed(2)}</span>
          <span>自费 ¥{record.selfPayAmount.toFixed(2)}</span>
        </div>
        <span className="font-medium">¥{record.totalAmount.toFixed(2)}</span>
      </div>
    </div>
  )
}
