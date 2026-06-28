import { useState, useMemo } from "react"
import { useNavigate } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { History, List } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AppBottomTabs } from "@/features/shared/components/AppBottomTabs"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import { SessionCard } from "@/features/visits/components/SessionCard"
import { visitsQueries } from "@/features/visits/api/queries"
import type { VisitSessionSummary } from "@/features/visits/api"

/** 筛选 tab 定义。 */
type FilterTab = "all" | "in_progress" | "completed" | "terminated"

interface TabItem {
  key: FilterTab
  label: string
}

const FILTER_TABS: readonly TabItem[] = [
  { key: "all", label: "全部" },
  { key: "in_progress", label: "进行中" },
  { key: "completed", label: "已完成" },
  { key: "terminated", label: "已终止" },
]

/** 各筛选条件对应的 status 集合。 */
const FILTER_STATUSES: Record<Exclude<FilterTab, "all">, ReadonlySet<string>> = {
  in_progress: new Set([
    "chatting",
    "analyzing",
    "blocked",
    "diagnosis",
    "treatment",
  ]),
  completed: new Set(["completed"]),
  terminated: new Set(["transferred", "emergency_terminated", "exited"]),
}

/**
 * 历史就诊页。
 *
 * - 顶部筛选 tab：全部 / 进行中 / 已完成 / 已终止。
 * - 每个会话以 SessionCard 展示，支持继续就诊、复诊、回看操作。
 * - 空态提示。
 */
export default function HistoryPage() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")

  const { data, isLoading } = useQuery(visitsQueries.list({}))

  const filteredSessions: VisitSessionSummary[] = useMemo(() => {
    if (!data) return []
    if (activeFilter === "all") return data.items

    const statuses = FILTER_STATUSES[activeFilter]
    return data.items.filter((s) => statuses.has(s.status))
  }, [data, activeFilter])

  function handleContinue(session: VisitSessionSummary) {
    navigate(`/workbench/${session.id}`)
  }

  function handleFollowUp(session: VisitSessionSummary) {
    navigate(
      `/workbench/new?followUpFrom=${session.id}&draft=${encodeURIComponent(session.summary.chiefComplaint ?? "")}`,
    )
  }

  function handleViewRecord(session: VisitSessionSummary) {
    if (session.status === "completed") {
      navigate(`/history/${session.id}`)
    } else {
      navigate(`/workbench/${session.id}`)
    }
  }

  return (
    <PageShell
      header={
        <div className="mx-auto w-full max-w-md px-4 py-3">
          <h1 className="text-lg font-semibold">历史记录</h1>
        </div>
      }
      footer={<AppBottomTabs />}
    >
      <div className="mx-auto w-full max-w-md px-4 py-6">
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

        {/* ── 会话列表 ── */}
        {!isLoading && filteredSessions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onContinue={
                  session.status === "chatting" ||
                  session.status === "analyzing" ||
                  session.status === "blocked" ||
                  session.status === "diagnosis" ||
                  session.status === "treatment" ||
                  session.status === "loading_context"
                    ? () => handleContinue(session)
                    : undefined
                }
                onFollowUp={
                  session.status === "completed"
                    ? () => handleFollowUp(session)
                    : undefined
                }
                onViewRecord={
                  session.status === "completed" ||
                  session.status === "transferred" ||
                  session.status === "emergency_terminated" ||
                  session.status === "exited"
                    ? () => handleViewRecord(session)
                    : undefined
                }
              />
            ))}
          </div>
        ) : null}

        {/* ── 空态 ── */}
        {!isLoading && filteredSessions.length === 0 ? (
          <EmptyState
            icon={<List className="size-10" />}
            title={
              activeFilter === "all"
                ? "暂无历史记录"
                : activeFilter === "in_progress"
                  ? "暂无进行中的问诊"
                  : activeFilter === "completed"
                    ? "暂无完成的问诊"
                    : "暂无已终止的问诊"
            }
            description={
              activeFilter === "all"
                ? "完成一次问诊后，可在这里继续就诊、发起复诊或回看记录。"
                : undefined
            }
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate("/")}
              >
                <History className="size-4" />
                去问诊
              </Button>
            }
          />
        ) : null}
      </div>
    </PageShell>
  )
}
