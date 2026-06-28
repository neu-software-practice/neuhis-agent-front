import { useQuery } from "@tanstack/react-query"
import { RefreshCw, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AppBottomTabs } from "@/features/shared/components/AppBottomTabs"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import { PatientSummaryCard } from "@/features/patient/components/PatientSummaryCard"
import { patientQueries } from "@/features/patient/api/queries"

/**
 * 个人中心页。
 *
 * - 使用 useQuery 获取患者上下文信息。
 * - 加载中显示骨架，加载失败提供重试。
 * - 展示 PatientSummaryCard 患者信息摘要。
 */
export default function ProfilePage() {
  const {
    data: context,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(patientQueries.context("patient-mock-001"))

  return (
    <PageShell
      header={
        <div className="mx-auto w-full max-w-md px-4 py-3">
          <h1 className="text-lg font-semibold">个人中心</h1>
        </div>
      }
      footer={<AppBottomTabs />}
    >
      <div className="mx-auto w-full max-w-md px-4 py-6">
        {/* ── 加载态 ── */}
        {isLoading ? (
          <div className="flex flex-col gap-4" aria-label="加载中">
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
            <div className="h-20 animate-pulse rounded-xl bg-muted" />
            <div className="h-20 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : null}

        {/* ── 错误态 ── */}
        {isError ? (
          <EmptyState
            icon={<User className="size-10 text-muted-foreground" />}
            title="资料加载失败"
            description={
              error instanceof Error
                ? error.message
                : "无法获取患者信息，请稍后重试。"
            }
            action={
              <Button
                variant="secondary"
                onClick={() => refetch()}
              >
                <RefreshCw className="size-4" />
                重试
              </Button>
            }
          />
        ) : null}

        {/* ── 患者信息 ── */}
        {!isLoading && !isError && context ? (
          <div className="flex flex-col gap-4">
            <PatientSummaryCard patient={context.patient} />

            {/* 病史 */}
            {context.medicalHistory.length > 0 ? (
              <section>
                <h2 className="mb-2 text-base font-medium">既往病史</h2>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {context.medicalHistory.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* 上次就诊摘要 */}
            {context.priorVisit ? (
              <section>
                <h2 className="mb-2 text-base font-medium">上次就诊</h2>
                <div className="rounded-lg border border-border bg-card p-3 text-sm">
                  <p>
                    <span className="font-medium text-foreground">诊断：</span>
                    {context.priorVisit.diagnosis}
                  </p>
                  {context.priorVisit.labResultSummary ? (
                    <p className="mt-1">
                      <span className="font-medium text-foreground">
                        检验摘要：
                      </span>
                      {context.priorVisit.labResultSummary}
                    </p>
                  ) : null}
                  <p className="mt-1">
                    <span className="font-medium text-foreground">
                      处置方案：
                    </span>
                    {context.priorVisit.treatmentSummary}
                  </p>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageShell>
  )
}
