import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button, Card, Input, Label, TextField, FieldError } from "@heroui/react"
import { Save } from "lucide-react"

import { adminApi } from "@/features/admin/api/admin-api"
import type { SystemSettings } from "@/features/admin/api/types"
import { SwitchField } from "@/components/ui/switch-field"

/**
 * 管理后台 — 系统设置页。
 *
 * Card 表单布局，支持编辑站点名称、并发数、超时时间和注册开关。
 */
export default function SettingsPage() {
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => adminApi.getSettings(),
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<SystemSettings>()

  // 当远程数据加载完毕后，填充表单
  useEffect(() => {
    if (settings) {
      reset(settings)
    }
  }, [settings, reset])

  const mutation = useMutation({
    mutationFn: (data: Partial<SystemSettings>) =>
      adminApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] })
    },
    onError: () => {
      // error handled inline
    },
  })

  function onSubmit(data: SystemSettings) {
    mutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-foreground-400">加载设置中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">系统设置</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
        <Card className="p-6">
          <h2 className="mb-5 text-lg font-medium">基本配置</h2>

          <div className="space-y-5">
            {/* 站点名称 */}
            <TextField isInvalid={!!errors.siteName} name="siteName" type="text">
              <Label>站点名称</Label>
              <Input
                placeholder="请输入站点名称"
                {...register("siteName", { required: "站点名称不能为空" })}
              />
              <FieldError>{errors.siteName?.message}</FieldError>
            </TextField>

            {/* 最大并发问诊数 */}
            <TextField isInvalid={!!errors.maxConcurrentSessions} name="maxConcurrentSessions" type="number">
              <Label>最大并发问诊数</Label>
              <Input
                placeholder="例如 50"
                {...register("maxConcurrentSessions", {
                  required: "此项为必填",
                  valueAsNumber: true,
                  min: { value: 1, message: "至少为 1" },
                })}
              />
              <FieldError>{errors.maxConcurrentSessions?.message}</FieldError>
            </TextField>

            {/* 问诊超时时间 */}
            <TextField isInvalid={!!errors.sessionTimeoutMinutes} name="sessionTimeoutMinutes" type="number">
              <Label>问诊超时时间(分钟)</Label>
              <Input
                placeholder="例如 30"
                {...register("sessionTimeoutMinutes", {
                  required: "此项为必填",
                  valueAsNumber: true,
                  min: { value: 1, message: "至少为 1 分钟" },
                })}
              />
              <FieldError>{errors.sessionTimeoutMinutes?.message}</FieldError>
            </TextField>

            {/* 开放注册 */}
            <Controller
              name="enableRegistration"
              control={control}
              render={({ field }) => (
                <SwitchField isSelected={field.value} onChange={field.onChange}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">开放注册</p>
                      <p className="text-xs text-foreground-500">
                        允许新用户自行注册账号
                      </p>
                    </div>
                  </div>
                </SwitchField>
              )}
            />

            {/* 提交/状态 */}
            {mutation.isSuccess && (
              <p className="text-sm text-success">设置已保存</p>
            )}
            {mutation.isError && (
              <p className="text-sm text-danger">
                保存失败：{mutation.error instanceof Error ? mutation.error.message : "请稍后重试"}
              </p>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                isDisabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  "保存中..."
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Save className="size-4" />
                    保存设置
                  </span>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  )
}
