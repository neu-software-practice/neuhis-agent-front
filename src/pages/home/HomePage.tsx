import { useState } from "react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { AppBottomTabs } from "@/features/shared/components/AppBottomTabs"
import { PageShell } from "@/features/shared/components/PageShell"

/**
 * 首页 Landing 占位骨架。
 *
 * P1 阶段只搭建“一屏一任务”的输入入口与导航跳转，不接入患者上下文、
 * 进行中会话或常见症状数据；这些将在 P3 由 feature query 提供。
 */
export default function HomePage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState("")

  function startConsultation() {
    const trimmed = draft.trim()
    const search = trimmed
      ? `?draft=${encodeURIComponent(trimmed)}`
      : ""
    navigate(`/workbench/new${search}`)
  }

  return (
    <PageShell footer={<AppBottomTabs />}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
        <h1 className="text-xl font-semibold">东软云脑智能医疗</h1>

        <section className="flex flex-col gap-3">
          <label htmlFor="home-symptom" className="text-base font-medium">
            今天哪里不舒服？
          </label>
          <textarea
            id="home-symptom"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="描述症状，例如：发烧两天，伴有咽痛……"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button onClick={startConsultation}>开始问诊</Button>
        </section>
      </div>
    </PageShell>
  )
}
