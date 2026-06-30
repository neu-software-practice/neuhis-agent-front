import { useState, useMemo, useCallback } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import {
  SearchField,
  Label,
  Table,
  Chip,
  Spinner,
  Pagination,
} from "@heroui/react"

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
        <SearchField value={search} onChange={(value: string) => handleSearchChange(value)}>
          <Label>搜索姓名或手机号</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="搜索姓名或手机号" className="w-full sm:max-w-xs" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* 表格 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
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
          <Table aria-label="患者列表" className="w-full">
            <Table.Header>
              <Table.Column isRowHeader>姓名</Table.Column>
              <Table.Column>手机号</Table.Column>
              <Table.Column>性别</Table.Column>
              <Table.Column>出生日期</Table.Column>
              <Table.Column>注册时间</Table.Column>
              <Table.Column>问诊次数</Table.Column>
            </Table.Header>
            <Table.Body>
              {data.items.map((patient) => (
                <Table.Row key={patient.id}>
                  <Table.Cell>{patient.realName || "—"}</Table.Cell>
                  <Table.Cell>{patient.phone}</Table.Cell>
                  <Table.Cell>
                    <Chip size="sm" color="default" variant="secondary">
                      {GENDER_MAP[patient.gender] ?? "未知"}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>{patient.birthDate || "—"}</Table.Cell>
                  <Table.Cell>
                    {new Date(patient.createdAt).toLocaleDateString("zh-CN")}
                  </Table.Cell>
                  <Table.Cell>{patient.sessionCount}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center">
              <Pagination>
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                      isDisabled={page <= 1}
                    >
                      <Pagination.PreviousIcon />
                    </Pagination.Previous>
                  </Pagination.Item>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Pagination.Item key={p}>
                      <Pagination.Link isActive={page === p} onPress={() => setPage(p)}>
                        {p}
                      </Pagination.Link>
                    </Pagination.Item>
                  ))}
                  <Pagination.Item>
                    <Pagination.Next
                      onPress={() => setPage((p) => p + 1)}
                      isDisabled={page >= totalPages}
                    >
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  )
}
