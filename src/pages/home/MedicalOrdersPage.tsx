import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, FileText, RefreshCw, SearchX } from "lucide-react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import { MedicalOrderCard } from "@/features/medical-orders/components/MedicalOrderCard"
import { medicalOrderQueries } from "@/features/medical-orders/api/queries"
import type { MedicalOrderRecord } from "@/features/medical-orders/api/types"

/** 筛选 tab 定义。 */
type MedicalOrderFilter = "all" | "advice" | "medication"

interface TabItem {
  key: MedicalOrderFilter
  label: string
}

const FILTER_TABS: readonly TabItem[] = [
  { key: "all", label: "全部" },
  { key: "advice", label: "健康建议" },
  { key: "medication", label: "处方药品" },
]

/** 各筛选条件对应的 kind 集合。 */
const FILTER_KINDS: Record<Exclude<MedicalOrderFilter, "all">, ReadonlySet<string>> = {
  advice: new Set(["advice"]),
  medication: new Set(["medication"]),
}

/**
 * 医嘱记录页。
 *
 * - 顶部筛选 tab：全部 / 健康建议 / 处方药品。
 * - 每条记录以 MedicalOrderCard 展示。
 * - 空态提示。
 */
export default function MedicalOrdersPage() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState<MedicalOrderFilter>("all")

  const { data, isLoading, isError, error, refetch } = useQuery(medicalOrderQueries.list())

  const filteredRecords: MedicalOrderRecord[] = useMemo(() => {
    if (!data) return []
    if (activeFilter === "all") return data.items

    const kinds = FILTER_KINDS[activeFilter]
    return data.items.filter((r) => kinds.has(r.kind))
  }, [data, activeFilter])

  return (
    <PageShell
      header={
        <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 py-3 md:max-w-2xl">
          <Button size="icon" variant="ghost" onClick={() => navigate("/profile")} aria-label="返回个人中心">
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-lg font-semibold">医嘱记录</h1>
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
            icon={<FileText className="size-10 text-muted-foreground" />}
            title="医嘱记录加载失败"
            description={
              error instanceof Error
                ? error.message
                : "无法获取医嘱记录，请稍后重试。"
            }
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                <RefreshCw className="size-4" />
                重试
              </Button>
            }
          />
        ) : null}

        {/* ── 记录列表 ── */}
        {!isLoading && !isError && filteredRecords.length > 0 ? (
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
            {filteredRecords.map((record) => (
              <MedicalOrderCard key={record.recordId} record={record} />
            ))}
          </div>
        ) : null}

        {/* ── 空态 ── */}
        {!isLoading && !isError && filteredRecords.length === 0 ? (
          (data?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={<FileText className="size-10" />}
              title="暂无医嘱记录"
              description="完成一次问诊后，医嘱将出现在这里。"
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
