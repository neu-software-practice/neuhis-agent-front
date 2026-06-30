import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button, Modal } from "@heroui/react"
import { Loader2, MapPin, Plus, RefreshCw } from "lucide-react"

import type { Address } from "@/features/patient/api"
import { patientQueries } from "@/features/patient/api/queries"
import { AddressCard } from "@/features/patient/components/AddressCard"
import { AddressFormModal } from "@/features/patient/components/AddressFormModal"
import type { PatientId } from "@/lib/api/types"

interface AddressPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (addressId: string) => void
  patientId: PatientId
}

export function AddressPickerModal({
  isOpen,
  onClose,
  onConfirm,
  patientId,
}: AddressPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string>("")
  const [formOpen, setFormOpen] = useState(false)

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({ ...patientQueries.addresses(patientId), enabled: isOpen })

  const addresses = useMemo(() => data?.addresses ?? [], [data?.addresses])
  const defaultAddressId = useMemo(
    () => addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? "",
    [addresses],
  )
  const effectiveSelectedId =
    selectedId && addresses.some((address) => address.id === selectedId)
      ? selectedId
      : defaultAddressId

  function handleCreated(address: Address) {
    setSelectedId(address.id)
  }

  function handleConfirm() {
    if (effectiveSelectedId) {
      onConfirm(effectiveSelectedId)
      onClose()
    }
  }

  return (
    <>
      <Modal>
        <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
          <Modal.Container placement="center" size="lg">
            <Modal.Dialog
              aria-label="选择配送地址"
              className="bg-background text-foreground shadow-xl"
            >
              <Modal.CloseTrigger />
              <Modal.Header className="flex items-center gap-3">
                <Modal.Icon className="bg-primary/10 text-primary">
                  <MapPin className="size-5" />
                </Modal.Icon>
                <Modal.Heading>选择配送地址</Modal.Heading>
              </Modal.Header>

              <Modal.Body className="max-h-[68vh] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    正在加载地址
                  </div>
                ) : null}

                {isError ? (
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {error instanceof Error ? error.message : "地址加载失败"}
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => {
                        void refetch()
                      }}
                    >
                      <RefreshCw className="size-4" />
                      重试
                    </Button>
                  </div>
                ) : null}

                {!isLoading && !isError && addresses.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">暂无收货地址</p>
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={() => setFormOpen(true)}
                    >
                      <Plus className="size-4" />
                      新增地址
                    </Button>
                  </div>
                ) : null}

                {addresses.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {addresses.map((address) => (
                      <AddressCard
                        key={address.id}
                        address={address}
                        selectable
                        selected={effectiveSelectedId === address.id}
                        onSelect={(next) => setSelectedId(next.id)}
                      />
                    ))}
                  </div>
                ) : null}
              </Modal.Body>

              <Modal.Footer className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  variant="secondary"
                  onPress={() => setFormOpen(true)}
                  isDisabled={addresses.length >= 10}
                >
                  <Plus className="size-4" />
                  新增地址
                </Button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="ghost" onPress={onClose}>
                    取消
                  </Button>
                  <Button
                    variant="primary"
                    onPress={handleConfirm}
                    isDisabled={!effectiveSelectedId}
                  >
                    确认配送
                  </Button>
                </div>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <AddressFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        mode="create"
        patientId={patientId}
        onSuccess={handleCreated}
      />
    </>
  )
}
