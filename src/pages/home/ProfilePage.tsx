import { useCallback, useState } from "react"
import { useNavigate } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ClipboardList, LogOut, Pill, RefreshCw, ShieldAlert, Stethoscope, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import { EditableChipList } from "@/features/patient/components/EditableChipList"
import { PatientSummaryCard } from "@/features/patient/components/PatientSummaryCard"
import {
  patientMutations,
  patientQueries,
  patientQueryKeys,
} from "@/features/patient/api/queries"
import { useAuthStore } from "@/features/auth/store/auth-store"

type EditingSection = "allergies" | "chronicDiseases" | "longTermMedications" | "medicalHistory" | null

/**
 * 个人中心页。
 *
 * - 使用 useQuery 获取患者上下文信息。
 * - 加载中显示骨架，加载失败提供重试。
 * - 展示 PatientSummaryCard 基础信息 + EditableChipList 可编辑医疗信息。
 */
export default function ProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const patientId = user?.patientId ?? ""

  const {
    data: context,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({ ...patientQueries.context(patientId), enabled: !!patientId })

  // ---- 编辑状态（同一时间仅一个 section 可编辑）----
  const [editingSection, setEditingSection] = useState<EditingSection>(null)

  // ---- Mutation ----
  const { mutate, isPending } = useMutation({
    ...patientMutations.updateProfile(),
    onSuccess: () => {
      setEditingSection(null)
      void queryClient.invalidateQueries({
        queryKey: patientQueryKeys.context(patientId),
      })
    },
  })

  const handleSave = useCallback(
    (field: "allergies" | "chronicDiseases" | "longTermMedications" | "medicalHistory", items: string[]) => {
      mutate({ patientId, [field]: items })
    },
    [mutate],
  )

  return (
    <PageShell
      header={
        <div className="mx-auto w-full max-w-md px-4 py-3 md:max-w-2xl">
          <h1 className="text-lg font-semibold">个人中心</h1>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-md px-4 py-6 md:max-w-2xl">
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
            <PatientSummaryCard patient={context.patient} hideMedicalSections />

            {/* 可编辑医疗信息 */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
              <EditableChipList
                label="过敏史"
                items={context.patient.allergies}
                color="danger"
                icon={<ShieldAlert className="size-4" />}
                editing={editingSection === "allergies"}
                onEdit={() => setEditingSection("allergies")}
                onSave={(items) => handleSave("allergies", items)}
                onCancel={() => setEditingSection(null)}
                saving={isPending && editingSection === "allergies"}
              />

              <EditableChipList
                label="慢性病"
                items={context.patient.chronicDiseases}
                color="warning"
                icon={<Stethoscope className="size-4" />}
                editing={editingSection === "chronicDiseases"}
                onEdit={() => setEditingSection("chronicDiseases")}
                onSave={(items) => handleSave("chronicDiseases", items)}
                onCancel={() => setEditingSection(null)}
                saving={isPending && editingSection === "chronicDiseases"}
              />

              <EditableChipList
                label="长期用药"
                items={context.patient.longTermMedications}
                color="default"
                icon={<Pill className="size-4" />}
                editing={editingSection === "longTermMedications"}
                onEdit={() => setEditingSection("longTermMedications")}
                onSave={(items) => handleSave("longTermMedications", items)}
                onCancel={() => setEditingSection(null)}
                saving={isPending && editingSection === "longTermMedications"}
              />
            </div>

            {/* 既往病史 */}
            <div className="rounded-xl border border-border bg-card p-4">
              <EditableChipList
                label="既往病史"
                items={context.medicalHistory}
                color="default"
                icon={<ClipboardList className="size-4" />}
                editing={editingSection === "medicalHistory"}
                onEdit={() => setEditingSection("medicalHistory")}
                onSave={(items) => handleSave("medicalHistory", items)}
                onCancel={() => setEditingSection(null)}
                saving={isPending && editingSection === "medicalHistory"}
              />
            </div>

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

            {/* 退出登录 */}
            <div className="pt-4">
              <Button
                variant="outline"
                className="w-full text-destructive"
                onClick={() => {
                  logout()
                  navigate("/login", { replace: true })
                }}
              >
                <LogOut className="size-4" />
                退出登录
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  )
}
