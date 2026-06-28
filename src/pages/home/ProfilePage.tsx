import { AppBottomTabs } from "@/features/shared/components/AppBottomTabs"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"

/**
 * 个人中心占位骨架。
 *
 * P1 阶段仅提供页面承载与导航，患者资料、病史、过敏史、偏好设置
 * 将在 P3 接入 patient feature query 后实现。
 */
export default function ProfilePage() {
  return (
    <PageShell
      header={
        <div className="mx-auto w-full max-w-md px-4 py-3">
          <h1 className="text-lg font-semibold">我的</h1>
        </div>
      }
      footer={<AppBottomTabs />}
    >
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <EmptyState
          title="资料尚未加载"
          description="患者资料、病史与过敏史将在后续版本接入。"
        />
      </div>
    </PageShell>
  )
}
