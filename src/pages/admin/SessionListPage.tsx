import { useState } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { Chip } from "@heroui/react"
import { Loader2 } from "lucide-react"

import { adminApi } from "@/features/admin/api/admin-api"

const STATUS_OPTIONS = [
  { key: "", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "paused", label: "已暂停" },
  { key: "completed", label: "已完成" },
  { key: "terminated", label: "已终止" },
] as const

const STATUS_COLOR_MAP: Record<string, "success" | "warning" | "danger" | "default"> = {
  active: "success",
  paused: "warning",
  completed: "default",
  terminated: "danger",
}

const STATUS_LABEL_MAP: Record<string, string> = {
  active: "进行中",
  paused: "已暂停",
  completed: "已完成",
  terminated: "已终止",
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * 管理后台 — 问诊记录列表页。
 *
 * 支持按状态筛选、分页浏览。
 */
export default function SessionListPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const pageSize = 10

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "sessions", { page, pageSize, status }],
    queryFn: () =>
      adminApi.listSessions({
        page,
        pageSize,
        status: status || undefined,
      }),
    placeholderData: keepPreviousData,
  })

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">问诊记录</h1>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          aria-label="按状态筛选"
          className="rounded-lg border border-default-200 bg-default-100 px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-foreground-400">
          <p className="text-lg">暂无数据</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-divider">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-divider bg-default-100">
                <tr>
                  <th className="px-4 py-3 font-medium">患者姓名</th>
                  <th className="px-4 py-3 font-medium">主诉</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">创建时间</th>
                  <th className="px-4 py-3 font-medium">更新时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-default-50">
                    <td className="px-4 py-3">{item.patientName || "—"}</td>
                    <td className="px-4 py-3">{item.title || "—"}</td>
                    <td className="px-4 py-3">
                      <Chip
                        size="sm"
                        color={STATUS_COLOR_MAP[item.status] ?? "default"}
                      >
                        {STATUS_LABEL_MAP[item.status] ?? item.status}
                      </Chip>
                    </td>
                    <td className="px-4 py-3">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-3">{formatDateTime(item.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-default-200 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                上一页
              </button>
              <span className="text-sm text-foreground-500">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-default-200 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
