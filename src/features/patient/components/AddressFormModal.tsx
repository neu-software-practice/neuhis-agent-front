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
  CreateAddressInput,
} from "@/features/patient/api"
import type { PatientId } from "@/lib/api/types"
import { Input } from "@/components/ui/input"
import { SwitchField } from "@/components/ui/switch-field"
import { Textarea } from "@/components/ui/textarea"
import { RegionSelector } from "@/components/ui/region-selector"
import { cn } from "@/lib/utils"

interface AddressFormModalProps {
  isOpen: boolean
  onClose: () => void
  mode: "create" | "edit"
  patientId: PatientId
  initialData?: Address
  onSuccess?: (address: Address) => void
}

const TAG_PRESETS = [
  { value: "家", label: "家" },
  { value: "公司", label: "公司" },
  { value: "病房", label: "病房" },
] as const
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
  const province = useWatch({ control, name: "province" }) ?? ""
  const city = useWatch({ control, name: "city" }) ?? ""
  const district = useWatch({ control, name: "district" }) ?? ""
  const [isCustomTag, setIsCustomTag] = useState(false)
  const tagValue = selectedTag ?? ""
  const submitting = createMutation.isPending || updateMutation.isPending

  function handleTagPreset(value: string) {
    setIsCustomTag(false)
    setValue("tag", value, { shouldValidate: true })
  }

  function handleTagCustom() {
    setIsCustomTag(true)
    setValue("tag", "", { shouldValidate: false })
  }

  useEffect(() => {
    if (isOpen) {
      reset(defaultValues)
      setIsCustomTag(
        !!initialData?.tag &&
          !TAG_PRESETS.some((p) => p.value === initialData.tag),
      )
    }
  }, [defaultValues, isOpen, reset, initialData?.tag])

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
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog
            aria-label={mode === "create" ? "新增收货地址" : "编辑收货地址"}
            className="bg-[#fafafa] text-foreground shadow-xl"
          >
            <Modal.CloseTrigger />
            <Modal.Header className="flex items-center gap-3 pb-4">
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
                    <Input
                      type="text"
                      autoComplete="name"
                      placeholder="请输入收件人姓名"
                      disabled={submitting}
                      {...register("name")}
                    />
                  </FormField>

                  <FormField label="联系电话" error={errors.phone?.message}>
                    <Input
                      type="tel"
                      autoComplete="tel"
                      placeholder="请输入 11 位手机号"
                      disabled={submitting}
                      {...register("phone")}
                    />
                  </FormField>
                </div>

                <RegionSelector
                  value={{ province, city, district }}
                  onChange={(v) => {
                    setValue("province", v.province, { shouldValidate: true })
                    setValue("city", v.city, { shouldValidate: true })
                    setValue("district", v.district, { shouldValidate: true })
                  }}
                  isInvalid={{
                    province: !!errors.province,
                    city: !!errors.city,
                    district: !!errors.district,
                  }}
                  errorMessage={{
                    province: errors.province?.message,
                    city: errors.city?.message,
                    district: errors.district?.message,
                  }}
                  isDisabled={submitting}
                />

                <FormField label="详细地址" error={errors.detail?.message}>
                  <Textarea
                    rows={3}
                    placeholder="街道、门牌号、楼栋和房间号"
                    disabled={submitting}
                    {...register("detail")}
                  />
                </FormField>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-foreground">地址标签</legend>
                  <div className="flex flex-wrap gap-2">
                    {TAG_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                          !isCustomTag && tagValue === preset.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-default-200 bg-default-100 text-foreground hover:border-primary/50",
                        )}
                        disabled={submitting}
                        onClick={() => handleTagPreset(preset.value)}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                        isCustomTag
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-default-200 bg-default-100 text-foreground hover:border-primary/50",
                      )}
                      disabled={submitting}
                      onClick={handleTagCustom}
                    >
                      其他...
                    </button>
                  </div>
                  {isCustomTag && (
                    <Input
                      type="text"
                      placeholder="请输入地址标签"
                      disabled={submitting}
                      value={tagValue}
                      onChange={(e) =>
                        setValue("tag", e.target.value, {
                          shouldValidate: true,
                        })
                      }
                    />
                  )}
                  {errors.tag?.message ? (
                    <p className="text-xs text-danger">{errors.tag.message}</p>
                  ) : null}
                </fieldset>

                <SwitchField
                  isSelected={isDefault}
                  isDisabled={submitting}
                  onChange={(v) =>
                    setValue("isDefault", v, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SwitchField.Content>
                    <SwitchField.Control>
                      <SwitchField.Thumb />
                    </SwitchField.Control>
                    设为默认收货地址
                  </SwitchField.Content>
                </SwitchField>
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
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </label>
  )
}
