import { useCallback, useState } from "react"
import { useNavigate } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronRight, ClipboardList, FileText, LogOut, MapPin, Pill, Plus, Receipt, RefreshCw, ShieldAlert, Stethoscope, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import type { Address } from "@/features/patient/api"
import { AddressCard } from "@/features/patient/components/AddressCard"
import { AddressFormModal } from "@/features/patient/components/AddressFormModal"
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
  const {
    data: addressData,
    isLoading: addressesLoading,
    isError: addressesError,
    error: addressesQueryError,
    refetch: refetchAddresses,
  } = useQuery({ ...patientQueries.addresses(patientId), enabled: !!patientId })
  const addresses = addressData?.addresses ?? []

  // ---- 编辑状态（同一时间仅一个 section 可编辑）----
  const [editingSection, setEditingSection] = useState<EditingSection>(null)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)

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
  const deleteAddressMutation = useMutation(patientMutations.deleteAddress())
  const setDefaultAddressMutation = useMutation(patientMutations.setDefaultAddress())

  const handleSave = useCallback(
    (field: "allergies" | "chronicDiseases" | "longTermMedications" | "medicalHistory", items: string[]) => {
      mutate({ patientId, [field]: items })
    },
    [mutate, patientId],
  )

  const handleOpenCreateAddress = useCallback(() => {
    setEditingAddress(null)
    setAddressModalOpen(true)
  }, [])

  const handleOpenEditAddress = useCallback((address: Address) => {
    setEditingAddress(address)
    setAddressModalOpen(true)
  }, [])

  const handleCloseAddressModal = useCallback(() => {
    setAddressModalOpen(false)
    setEditingAddress(null)
  }, [])

  const handleDeleteAddress = useCallback(
    (address: Address) => {
      if (!window.confirm("确认删除该收货地址？")) return
      deleteAddressMutation.mutate({ patientId, addressId: address.id })
    },
    [deleteAddressMutation, patientId],
  )

  const handleSetDefaultAddress = useCallback(
    (address: Address) => {
      setDefaultAddressMutation.mutate({ patientId, addressId: address.id })
    },
    [patientId, setDefaultAddressMutation],
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

            {/* 收货地址 */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <h2 className="text-base font-medium">收货地址</h2>
                  <span className="text-xs text-muted-foreground">
                    {addresses.length}/10
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenCreateAddress}
                  disabled={addresses.length >= 10}
                >
                  <Plus className="size-4" />
                  添加
                </Button>
              </div>

              {addressesLoading ? (
                <div className="flex flex-col gap-3" aria-label="地址加载中">
                  <div className="h-24 animate-pulse rounded-lg bg-muted" />
                  <div className="h-24 animate-pulse rounded-lg bg-muted" />
                </div>
              ) : null}

              {addressesError ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">
                    {addressesQueryError instanceof Error
                      ? addressesQueryError.message
                      : "收货地址加载失败"}
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void refetchAddresses()
                    }}
                  >
                    <RefreshCw className="size-4" />
                    重试
                  </Button>
                </div>
              ) : null}

              {!addressesLoading && !addressesError && addresses.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">暂无收货地址</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleOpenCreateAddress}
                  >
                    <Plus className="size-4" />
                    添加地址
                  </Button>
                </div>
              ) : null}

              {addresses.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {addresses.map((address) => (
                    <AddressCard
                      key={address.id}
                      address={address}
                      onEdit={handleOpenEditAddress}
                      onDelete={handleDeleteAddress}
                      onSetDefault={handleSetDefaultAddress}
                    />
                  ))}
                </div>
              ) : null}
            </section>

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

            {/* 功能入口 */}
            <div className="rounded-xl border border-border bg-card">
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors rounded-t-xl"
                onClick={() => navigate("/billing")}
              >
                <Receipt className="size-5 text-muted-foreground" />
                <span className="flex-1 font-medium">账单记录</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
              <div className="border-t border-border" />
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors rounded-b-xl"
                onClick={() => navigate("/medical-orders")}
              >
                <FileText className="size-5 text-muted-foreground" />
                <span className="flex-1 font-medium">医嘱记录</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </div>

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

            <AddressFormModal
              isOpen={addressModalOpen}
              onClose={handleCloseAddressModal}
              mode={editingAddress ? "edit" : "create"}
              patientId={patientId}
              initialData={editingAddress ?? undefined}
            />
          </div>
        ) : null}
      </div>
    </PageShell>
  )
}
