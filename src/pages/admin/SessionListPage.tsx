import { useState } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import {
  Chip,
  Select,
  Label,
  ListBox,
  ListBoxItem,
  Table,
  Spinner,
  Pagination,
} from "@heroui/react"

import { adminApi } from "@/features/admin/api/admin-api"

const STATUS_OPTIONS = [
  { key: "all", label: "全部" },
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

        <Select
          selectedKey={status || "all"}
          onSelectionChange={(key) => {
            setStatus(key === "all" ? "" : String(key))
            setPage(1)
          }}
          className="w-36"
          aria-label="按状态筛选"
        >
          <Label>状态筛选</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {STATUS_OPTIONS.map((opt) => (
                <ListBoxItem key={opt.key} id={opt.key}>
                  {opt.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-foreground-400">
          <p className="text-lg">暂无数据</p>
        </div>
      ) : (
        <>
          <Table aria-label="问诊记录列表">
            <Table.Header>
              <Table.Column isRowHeader>患者姓名</Table.Column>
              <Table.Column>主诉</Table.Column>
              <Table.Column>状态</Table.Column>
              <Table.Column>创建时间</Table.Column>
              <Table.Column>更新时间</Table.Column>
            </Table.Header>
            <Table.Body>
              {data.items.map((item) => (
                <Table.Row key={item.id}>
                  <Table.Cell>{item.patientName || "—"}</Table.Cell>
                  <Table.Cell>{item.title || "—"}</Table.Cell>
                  <Table.Cell>
                    <Chip size="sm" color={STATUS_COLOR_MAP[item.status] ?? "default"}>
                      {STATUS_LABEL_MAP[item.status] ?? item.status}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>{formatDateTime(item.createdAt)}</Table.Cell>
                  <Table.Cell>{formatDateTime(item.updatedAt)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

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
