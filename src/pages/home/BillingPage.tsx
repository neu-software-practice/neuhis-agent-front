import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Receipt, RefreshCw, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import { BillingRecordCard } from "@/features/billing/components/BillingRecordCard"
import { billingQueries } from "@/features/billing/api/queries"
import type { BillingRecord } from "@/features/billing/api/types"

/** 筛选 tab 定义。 */
type BillingFilter = "all" | "paid" | "unpaid" | "refunded"

interface TabItem {
  key: BillingFilter
  label: string
}

const FILTER_TABS: readonly TabItem[] = [
  { key: "all", label: "全部" },
  { key: "paid", label: "已支付" },
  { key: "unpaid", label: "待支付" },
  { key: "refunded", label: "已退款" },
]

/** 各筛选条件对应的 paymentStatus 集合。 */
const FILTER_STATUSES: Record<Exclude<BillingFilter, "all">, ReadonlySet<string>> = {
  paid: new Set(["paid"]),
  unpaid: new Set(["unpaid", "pending"]),
  refunded: new Set(["refunded"]),
}

/**
 * 账单记录页。
 *
 * - 顶部筛选 tab：全部 / 已支付 / 待支付 / 已退款。
 * - 每条记录以 BillingRecordCard 展示。
 * - 空态提示。
 */
export default function BillingPage() {
  const [activeFilter, setActiveFilter] = useState<BillingFilter>("all")

  const { data, isLoading, isError, error, refetch } = useQuery(billingQueries.list())

  const filteredRecords: BillingRecord[] = useMemo(() => {
    if (!data) return []
    if (activeFilter === "all") return data.items

    const statuses = FILTER_STATUSES[activeFilter]
    return data.items.filter((r) => statuses.has(r.paymentStatus))
  }, [data, activeFilter])

  return (
    <PageShell
      header={
        <div className="mx-auto w-full max-w-md px-4 py-3 md:max-w-2xl">
          <h1 className="text-lg font-semibold">账单记录</h1>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-md px-4 py-6 md:max-w-2xl">
        {/* ── 筛选 tabs ── */}
        <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
          {FILTER_TABS.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={activeFilter === key ? "default" : "ghost"}
              className="flex-1"
              onClick={() => setActiveFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* ── 加载态 ── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : null}

        {/* ── 错误态 ── */}
        {isError ? (
          <EmptyState
            icon={<Receipt className="size-10 text-muted-foreground" />}
            title="账单加载失败"
            description={
              error instanceof Error
                ? error.message
                : "无法获取账单记录，请稍后重试。"
            }
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                <RefreshCw className="size-4" />
                重试
              </Button>
            }
          />
        ) : null}

        {/* ── 账单列表 ── */}
        {!isLoading && !isError && filteredRecords.length > 0 ? (
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
            {filteredRecords.map((record) => (
              <BillingRecordCard key={record.paymentId} record={record} />
            ))}
          </div>
        ) : null}

        {/* ── 空态 ── */}
        {!isLoading && !isError && filteredRecords.length === 0 ? (
          (data?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Receipt className="size-10" />}
              title="暂无账单记录"
              description="完成一次缴费后，账单将出现在这里。"
            />
          ) : (
            <EmptyState
              icon={<SearchX className="size-10" />}
              title="没有找到匹配的记录"
              description="试试切换上方的筛选条件。"
            />
          )
        ) : null}
      </div>
    </PageShell>
  )
}
