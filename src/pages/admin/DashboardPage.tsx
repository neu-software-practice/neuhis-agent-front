import { useQuery } from "@tanstack/react-query"
import { Button } from "@heroui/react"
import {
  Users,
  MessageSquare,
  Activity,
  UserPlus,
  CalendarPlus,
  Loader2,
} from "lucide-react"

import { adminApi } from "@/features/admin/api/admin-api"
import type { DashboardStats } from "@/features/admin/api/types"

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-divider bg-content1 p-5">
      <div className="flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-foreground-500">{title}</span>
          <span className="text-2xl font-semibold">{value.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useQuery<DashboardStats>({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: () => adminApi.getDashboardStats(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-foreground-500">数据加载失败</p>
        <Button variant="secondary" onPress={() => refetch()}>
          重试
        </Button>
      </div>
    )
  }

  const cards: StatCardProps[] = [
    {
      title: "总患者数",
      value: stats.totalPatients,
      icon: <Users className="size-6" />,
    },
    {
      title: "总问诊数",
      value: stats.totalSessions,
      icon: <MessageSquare className="size-6" />,
    },
    {
      title: "进行中问诊",
      value: stats.activeSessions,
      icon: <Activity className="size-6" />,
    },
    {
      title: "今日新增患者",
      value: stats.todayNewPatients,
      icon: <UserPlus className="size-6" />,
    },
    {
      title: "今日新增问诊",
      value: stats.todayNewSessions,
      icon: <CalendarPlus className="size-6" />,
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">仪表盘</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  )
}
