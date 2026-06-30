import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@heroui/react"
import { Save } from "lucide-react"

import { adminApi } from "@/features/admin/api/admin-api"
import type { SystemSettings } from "@/features/admin/api/types"

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
        <div className="rounded-xl border border-divider bg-content1 p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-medium">基本配置</h2>

          <div className="space-y-5">
            {/* 站点名称 */}
            <div className="space-y-1.5">
              <label htmlFor="siteName" className="text-sm font-medium">
                站点名称
              </label>
              <input
                id="siteName"
                type="text"
                placeholder="请输入站点名称"
                className="w-full rounded-lg border border-default-200 bg-default-100 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                {...register("siteName", { required: "站点名称不能为空" })}
              />
              {errors.siteName && (
                <p className="text-xs text-danger">{errors.siteName.message}</p>
              )}
            </div>

            {/* 最大并发问诊数 */}
            <div className="space-y-1.5">
              <label htmlFor="maxConcurrentSessions" className="text-sm font-medium">
                最大并发问诊数
              </label>
              <input
                id="maxConcurrentSessions"
                type="number"
                placeholder="例如 50"
                className="w-full rounded-lg border border-default-200 bg-default-100 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                {...register("maxConcurrentSessions", {
                  required: "此项为必填",
                  valueAsNumber: true,
                  min: { value: 1, message: "至少为 1" },
                })}
              />
              {errors.maxConcurrentSessions && (
                <p className="text-xs text-danger">
                  {errors.maxConcurrentSessions.message}
                </p>
              )}
            </div>

            {/* 问诊超时时间 */}
            <div className="space-y-1.5">
              <label htmlFor="sessionTimeoutMinutes" className="text-sm font-medium">
                问诊超时时间(分钟)
              </label>
              <input
                id="sessionTimeoutMinutes"
                type="number"
                placeholder="例如 30"
                className="w-full rounded-lg border border-default-200 bg-default-100 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                {...register("sessionTimeoutMinutes", {
                  required: "此项为必填",
                  valueAsNumber: true,
                  min: { value: 1, message: "至少为 1 分钟" },
                })}
              />
              {errors.sessionTimeoutMinutes && (
                <p className="text-xs text-danger">
                  {errors.sessionTimeoutMinutes.message}
                </p>
              )}
            </div>

            {/* 开放注册 */}
            <Controller
              name="enableRegistration"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between rounded-lg border border-default-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">开放注册</p>
                    <p className="text-xs text-foreground-500">
                      允许新用户自行注册账号
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.value}
                    aria-label="开放注册"
                    onClick={() => field.onChange(!field.value)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      field.value ? "bg-primary" : "bg-default-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                        field.value ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
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
        </div>
      </form>
    </div>
  )
}
