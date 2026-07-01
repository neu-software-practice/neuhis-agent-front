import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, MapPin, Plus, RefreshCw } from "lucide-react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"
import type { Address } from "@/features/patient/api"
import { AddressCard } from "@/features/patient/components/AddressCard"
import { AddressFormModal } from "@/features/patient/components/AddressFormModal"
import { patientMutations, patientQueries, patientQueryKeys } from "@/features/patient/api/queries"
import { useAuthStore } from "@/features/auth/store/auth-store"

/**
 * 收货地址独立管理页。
 *
 * - 默认地址始终置顶。
 * - 最多 10 个地址，达到上限后添加按钮禁用。
 * - 支持新增、编辑、删除、设为默认。
 * - 加载/错误/空态均有覆盖。
 */
export default function AddressPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const patientId = user?.patientId ?? ""

  const {
    data: addressData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({ ...patientQueries.addresses(patientId), enabled: !!patientId })
  const addresses = addressData?.addresses ?? []

  // 默认地址置顶
  const sortedAddresses = useMemo(() => {
    if (addresses.length === 0) return []
    const defaults = addresses.filter((a) => a.isDefault)
    const rest = addresses.filter((a) => !a.isDefault)
    return [...defaults, ...rest]
  }, [addresses])

  // Modal 状态
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)

  // Mutations
  const deleteAddressMutation = useMutation(patientMutations.deleteAddress())
  const setDefaultAddressMutation = useMutation(patientMutations.setDefaultAddress())

  const handleOpenCreate = useCallback(() => {
    setEditingAddress(null)
    setModalOpen(true)
  }, [])

  const handleOpenEdit = useCallback((address: Address) => {
    setEditingAddress(address)
    setModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setModalOpen(false)
    setEditingAddress(null)
  }, [])

  const handleDelete = useCallback(
    (address: Address) => {
      if (!window.confirm("确认删除该收货地址？")) return
      deleteAddressMutation.mutate({ patientId, addressId: address.id })
    },
    [deleteAddressMutation, patientId],
  )

  const handleSetDefault = useCallback(
    (address: Address) => {
      setDefaultAddressMutation.mutate({ patientId, addressId: address.id })
    },
    [patientId, setDefaultAddressMutation],
  )

  const handleAddressSaved = useCallback(() => {
    handleCloseModal()
    void queryClient.invalidateQueries({
      queryKey: patientQueryKeys.addresses(patientId),
    })
  }, [handleCloseModal, queryClient, patientId])

  const atMax = addresses.length >= 10

  return (
    <PageShell
      header={
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3 md:max-w-2xl">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => navigate("/profile")} aria-label="返回个人中心">
              <ArrowLeft className="size-5" />
            </Button>
            <h1 className="text-lg font-semibold">收货地址</h1>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenCreate}
            disabled={atMax}
          >
            <Plus className="size-4" />
            添加
          </Button>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-md px-4 py-6 md:max-w-2xl">
        {/* ── 加载态 ── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : null}

        {/* ── 错误态 ── */}
        {isError ? (
          <EmptyState
            icon={<MapPin className="size-10 text-muted-foreground" />}
            title="地址加载失败"
            description={
              error instanceof Error
                ? error.message
                : "无法获取收货地址，请稍后重试。"
            }
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                <RefreshCw className="size-4" />
                重试
              </Button>
            }
          />
        ) : null}

        {/* ── 空态 ── */}
        {!isLoading && !isError && sortedAddresses.length === 0 ? (
          <EmptyState
            icon={<MapPin className="size-10" />}
            title="暂无收货地址"
            description="添加一个收货地址，方便配送药品时使用。"
            action={
              <Button variant="secondary" onClick={handleOpenCreate} disabled={atMax}>
                <Plus className="size-4" />
                添加地址
              </Button>
            }
          />
        ) : null}

        {/* ── 地址列表 ── */}
        {!isLoading && !isError && sortedAddresses.length > 0 ? (
          <div className="flex flex-col gap-3">
            {sortedAddresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            ))}
          </div>
        ) : null}

        <AddressFormModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          mode={editingAddress ? "edit" : "create"}
          patientId={patientId}
          initialData={editingAddress ?? undefined}
          onSuccess={handleAddressSaved}
        />
      </div>
    </PageShell>
  )
}
