import { type ReactNode, useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Modal } from "@heroui/react"
import { Loader2, MapPin, Plus } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import type { z } from "zod"

import {
  createAddressInputSchema,
} from "@/features/patient/api"
import { patientMutations } from "@/features/patient/api/queries"
import type {
  Address,
  AddressTag,
  CreateAddressInput,
} from "@/features/patient/api"
import type { PatientId } from "@/lib/api/types"
import { cn } from "@/lib/utils"

interface AddressFormModalProps {
  isOpen: boolean
  onClose: () => void
  mode: "create" | "edit"
  patientId: PatientId
  initialData?: Address
  onSuccess?: (address: Address) => void
}

const ADDRESS_TAGS: AddressTag[] = ["家", "公司", "病房", "其他"]
type CreateAddressFormValues = z.input<typeof createAddressInputSchema>

function buildDefaultValues(
  patientId: PatientId,
  initialData?: Address,
): CreateAddressInput {
  return {
    patientId,
    name: initialData?.name ?? "",
    phone: initialData?.phone ?? "",
    province: initialData?.province ?? "",
    city: initialData?.city ?? "",
    district: initialData?.district ?? "",
    detail: initialData?.detail ?? "",
    isDefault: initialData?.isDefault ?? false,
    tag: initialData?.tag,
  }
}

const inputClass =
  "w-full rounded-lg border border-default-200 bg-default-100 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"

export function AddressFormModal({
  isOpen,
  onClose,
  mode,
  patientId,
  initialData,
  onSuccess,
}: AddressFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const defaultValues = useMemo(
    () => buildDefaultValues(patientId, initialData),
    [initialData, patientId],
  )

  const createMutation = useMutation(patientMutations.createAddress())
  const updateMutation = useMutation(patientMutations.updateAddress())

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateAddressFormValues, unknown, CreateAddressInput>({
    resolver: zodResolver(createAddressInputSchema),
    defaultValues,
  })

  const selectedTag = useWatch({ control, name: "tag" })
  const isDefault = useWatch({ control, name: "isDefault" })
  const submitting = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (isOpen) {
      reset(defaultValues)
    }
  }, [defaultValues, isOpen, reset])

  function handleClose() {
    setServerError(null)
    onClose()
  }

  async function onSubmit(data: CreateAddressInput) {
    setServerError(null)
    try {
      const address =
        mode === "edit" && initialData
          ? await updateMutation.mutateAsync({
              ...data,
              patientId,
              addressId: initialData.id,
            })
          : await createMutation.mutateAsync({ ...data, patientId })
      onSuccess?.(address)
      handleClose()
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "地址保存失败")
    }
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog
            aria-label={mode === "create" ? "新增收货地址" : "编辑收货地址"}
            className="bg-background text-foreground shadow-xl"
          >
            <Modal.CloseTrigger />
            <Modal.Header className="flex items-center gap-3">
              <Modal.Icon className="bg-primary/10 text-primary">
                {mode === "create" ? (
                  <Plus className="size-5" />
                ) : (
                  <MapPin className="size-5" />
                )}
              </Modal.Icon>
              <Modal.Heading>
                {mode === "create" ? "新增收货地址" : "编辑收货地址"}
              </Modal.Heading>
            </Modal.Header>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Modal.Body className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
                {serverError ? (
                  <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
                    {serverError}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="收件人" error={errors.name?.message}>
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="请输入收件人姓名"
                      className={inputClass}
                      disabled={submitting}
                      {...register("name")}
                    />
                  </FormField>

                  <FormField label="联系电话" error={errors.phone?.message}>
                    <input
                      type="tel"
                      autoComplete="tel"
                      placeholder="请输入 11 位手机号"
                      className={inputClass}
                      disabled={submitting}
                      {...register("phone")}
                    />
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField label="省份" error={errors.province?.message}>
                    <input
                      type="text"
                      placeholder="省"
                      className={inputClass}
                      disabled={submitting}
                      {...register("province")}
                    />
                  </FormField>
                  <FormField label="城市" error={errors.city?.message}>
                    <input
                      type="text"
                      placeholder="市"
                      className={inputClass}
                      disabled={submitting}
                      {...register("city")}
                    />
                  </FormField>
                  <FormField label="区县" error={errors.district?.message}>
                    <input
                      type="text"
                      placeholder="区/县"
                      className={inputClass}
                      disabled={submitting}
                      {...register("district")}
                    />
                  </FormField>
                </div>

                <FormField label="详细地址" error={errors.detail?.message}>
                  <textarea
                    rows={3}
                    placeholder="街道、门牌号、楼栋和房间号"
                    className={cn(inputClass, "min-h-24 resize-y")}
                    disabled={submitting}
                    {...register("detail")}
                  />
                </FormField>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">地址标签</legend>
                  <div className="flex flex-wrap gap-2">
                    {ADDRESS_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                          selectedTag === tag
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-default-200 bg-default-100 text-foreground hover:border-primary/50",
                        )}
                        disabled={submitting}
                        onClick={() =>
                          setValue("tag", tag, { shouldValidate: true })
                        }
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  {errors.tag?.message ? (
                    <p className="text-xs text-danger">{errors.tag.message}</p>
                  ) : null}
                </fieldset>

                <button
                  type="button"
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                    isDefault
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-default-200 bg-default-100 text-foreground",
                  )}
                  disabled={submitting}
                  aria-pressed={isDefault}
                  onClick={() =>
                    setValue("isDefault", !isDefault, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <span>设为默认收货地址</span>
                  <span
                    className={cn(
                      "flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",
                      isDefault ? "bg-primary" : "bg-default-300",
                    )}
                    aria-hidden="true"
                  >
                    <span
                      className={cn(
                        "size-5 rounded-full bg-background transition-transform",
                        isDefault && "translate-x-5",
                      )}
                    />
                  </span>
                </button>
              </Modal.Body>

              <Modal.Footer className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onPress={handleClose}
                  isDisabled={submitting}
                >
                  取消
                </Button>
                <Button type="submit" variant="primary" isDisabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      保存中
                    </>
                  ) : (
                    "保存地址"
                  )}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </label>
  )
}
