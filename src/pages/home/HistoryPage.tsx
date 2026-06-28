import { AppBottomTabs } from "@/features/shared/components/AppBottomTabs"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"

/**
 * 历史就诊列表占位骨架。
 *
 * P1 阶段仅提供页面承载与导航，历史数据、筛选 tab、继续就诊 / 复诊 / 只读回看
 * 将在 P3 接入 visits feature query 后实现。
 */
export default function HistoryPage() {
  return (
    <PageShell
      header={
        <div className="mx-auto w-full max-w-md px-4 py-3">
          <h1 className="text-lg font-semibold">历史就诊</h1>
        </div>
      }
      footer={<AppBottomTabs />}
    >
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <EmptyState
          title="暂无历史记录"
          description="完成一次问诊后，可在这里继续就诊、发起复诊或回看记录。"
        />
      </div>
    </PageShell>
  )
}
