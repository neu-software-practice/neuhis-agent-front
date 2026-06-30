import {
  AlertTriangle,
  FileText,
  MapPin,
  Pill,
  RefreshCw,
} from "lucide-react"

import type { MedicalOrderRecord } from "@/features/medical-orders/api/types"

const KIND_CONFIG = {
  advice: { icon: FileText, label: "健康建议" },
  medication: { icon: Pill, label: "处方药品" },
} as const

const FULFILLMENT_LABEL: Record<string, string> = {
  pending: "待确认",
  confirmed: "已确认",
  completed: "已完成",
}

interface MedicalOrderCardProps {
  record: MedicalOrderRecord
}

export function MedicalOrderCard({ record }: MedicalOrderCardProps) {
  const kindConfig = KIND_CONFIG[record.kind]
  const KindIcon = kindConfig.icon

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* 顶部：图标 + 标题 + 日期 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <KindIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{record.sessionTitle}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(record.handledAt).toLocaleDateString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* 中部：内容区域 */}
      {record.kind === "advice" ? (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {/* 健康建议列表 */}
          {record.advices && record.advices.length > 0 ? (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">健康建议</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                {record.advices.map((advice, idx) => (
                  <li key={idx}>{advice}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* 注意事项 */}
          {record.watchItems && record.watchItems.length > 0 ? (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  注意事项
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-amber-800 dark:text-amber-300">
                  {record.watchItems.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {/* 复诊建议 */}
          {record.followUpRecommendation ? (
            <div className="flex items-start gap-2 text-sm">
              <RefreshCw className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">
                {record.followUpRecommendation}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {/* 药品清单 */}
          {record.medications && record.medications.length > 0 ? (
            <div className="space-y-2">
              {record.medications.map((med, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{med.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {med.spec} | {med.dosage} | {med.days}天 | ×{med.quantity}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 font-medium">
                    ¥{med.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {/* 履约状态标签 */}
          {record.fulfillmentStatus ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs text-muted-foreground">履约状态：</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {FULFILLMENT_LABEL[record.fulfillmentStatus] ?? record.fulfillmentStatus}
              </span>
            </div>
          ) : null}

          {/* 配送地址 */}
          {record.deliveryAddress ? (
            <div className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-muted-foreground">
                  {record.deliveryAddress.name} {record.deliveryAddress.phone}
                </p>
                <p className="text-muted-foreground">
                  {record.deliveryAddress.fullAddress}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 底部：kind 标签 */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {kindConfig.label}
        </span>
      </div>
    </div>
  )
}
