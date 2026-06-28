import { useState, useMemo } from "react"
import { useNavigate } from "react-router"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Stethoscope } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AppBottomTabs } from "@/features/shared/components/AppBottomTabs"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import { SessionCard } from "@/features/visits/components/SessionCard"
import { visitsQueries, visitsMutations } from "@/features/visits/api/queries"
import type { VisitSessionSummary } from "@/features/visits/api"

/** 进行中状态集合，用于首页定位活跃会话。 */
const ACTIVE_STATUSES: ReadonlySet<string> = new Set([
  "chatting",
  "analyzing",
  "blocked",
  "diagnosis",
  "treatment",
  "loading_context",
])

/** 常见症状占位快速填充。 */
const COMMON_SYMPTOMS = ["发烧", "咳嗽", "咽痛", "头痛", "腹痛", "乏力"]

/**
 * 首页。
 *
 * - 显示进行中的活跃会话（若有），提供"继续就诊"快速入口。
 * - 症状输入区 + 常见症状快速填充 + "开始问诊"。
 */
export default function HomePage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState("")

  // ── 获取全部会话，本地过滤活跃态 ──
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery(
    visitsQueries.list({}),
  )

  const activeSession: VisitSessionSummary | undefined = useMemo(() => {
    if (!sessionsData) return undefined
    return sessionsData.items.find((s) => ACTIVE_STATUSES.has(s.status))
  }, [sessionsData])

  // ── 新建会话 ──
  const createMutation = useMutation(visitsMutations.createSession())

  async function startConsultation() {
    const trimmed = draft.trim()

    try {
      const result = await createMutation.mutateAsync({
        patientId: "patient-mock-001",
        entryType: "new",
        chiefComplaint: trimmed || undefined,
      })
      navigate(`/workbench/${result.session.id}`)
    } catch {
      // P4 fallback：若 createSession 尚未就绪，走 draft 跳转
      const search = trimmed
        ? `?draft=${encodeURIComponent(trimmed)}`
        : ""
      navigate(`/workbench/new${search}`)
    }
  }

  function handleContinueSession(session: VisitSessionSummary) {
    navigate(`/workbench/${session.id}`)
  }

  return (
    <PageShell footer={<AppBottomTabs />}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
        <h1 className="text-xl font-semibold">东软云脑智能医疗</h1>

        {/* ── 进行中会话 ── */}
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : activeSession ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-medium text-foreground">
              继续就诊
            </h2>
            <SessionCard
              session={activeSession}
              onContinue={() => handleContinueSession(activeSession)}
            />
          </section>
        ) : null}

        {/* ── 新症输入 ── */}
        <section className="flex flex-col gap-3">
          <label htmlFor="home-symptom" className="text-base font-medium">
            今天哪里不舒服？
          </label>

          {/* 常见症状快速填充 */}
          <div className="flex flex-wrap gap-2">
            {COMMON_SYMPTOMS.map((symptom) => (
              <Button
                key={symptom}
                size="sm"
                variant="outline"
                onClick={() => {
                  setDraft((prev) => {
                    const words = prev
                      .split(/[,，、\s]+/)
                      .map((w) => w.trim())
                      .filter(Boolean)
                    return words.includes(symptom)
                      ? prev
                      : [prev, symptom].filter(Boolean).join("、")
                  })
                }}
              >
                {symptom}
              </Button>
            ))}
          </div>

          <textarea
            id="home-symptom"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="描述症状，例如：发烧两天，伴有咽痛……"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          <Button
            size="lg"
            onClick={startConsultation}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                创建中…
              </>
            ) : (
              <>
                <Stethoscope className="size-5" />
                开始问诊
              </>
            )}
          </Button>
        </section>

        {/* ── 无活跃会话时 ── */}
        {!sessionsLoading && !activeSession && sessionsData ? (
          <EmptyState
            title="暂无进行中的问诊"
            description={'描述症状后点击「开始问诊」，AI 将引导您完成就诊流程。'}
          />
        ) : null}
      </div>
    </PageShell>
  )
}
