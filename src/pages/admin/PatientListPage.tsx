import { useState, useMemo, useCallback } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { Search, Loader2 } from "lucide-react"

import { adminApi } from "@/features/admin/api/admin-api"
import { useDebounce } from "@/hooks/useDebounce"

const PAGE_SIZE = 10

const GENDER_MAP: Record<string, string> = {
  male: "男",
  female: "女",
  unknown: "未知",
}

/**
 * 管理后台 — 患者管理列表页。
 *
 * 支持分页、按姓名/手机号搜索。
 */
export default function PatientListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "patients", { page, pageSize: PAGE_SIZE, search: debouncedSearch }],
    queryFn: () =>
      adminApi.listPatients({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
      }),
    placeholderData: keepPreviousData,
  })

  const totalPages = useMemo(() => {
    if (!data) return 1
    return Math.ceil(data.total / PAGE_SIZE)
  }, [data])

  return (
    <div className="space-y-6">
      {/* 页面标题与搜索 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">患者管理</h1>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-400" />
          <input
            type="text"
            placeholder="搜索姓名或手机号"
            aria-label="搜索姓名或手机号"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-default-200 bg-default-100 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600"
              onClick={() => handleSearchChange("")}
              aria-label="清除搜索"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 表格 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-foreground-400">
          <p className="text-lg">暂无患者数据</p>
          {debouncedSearch && (
            <p className="mt-1 text-sm">未找到与「{debouncedSearch}」相关的结果</p>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-divider">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-divider bg-default-100">
                <tr>
                  <th className="px-4 py-3 font-medium">姓名</th>
                  <th className="px-4 py-3 font-medium">手机号</th>
                  <th className="px-4 py-3 font-medium">性别</th>
                  <th className="px-4 py-3 font-medium">出生日期</th>
                  <th className="px-4 py-3 font-medium">注册时间</th>
                  <th className="px-4 py-3 font-medium">问诊次数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {data.items.map((patient) => (
                  <tr key={patient.id} className="hover:bg-default-50">
                    <td className="px-4 py-3">{patient.realName || "—"}</td>
                    <td className="px-4 py-3">{patient.phone}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-default-100 px-2 py-0.5 text-xs">
                        {GENDER_MAP[patient.gender] ?? "未知"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{patient.birthDate || "—"}</td>
                    <td className="px-4 py-3">
                      {new Date(patient.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-3">{patient.sessionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
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
