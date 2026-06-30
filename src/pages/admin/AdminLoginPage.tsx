import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, useSearchParams } from "react-router"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@heroui/react"

import { adminLoginInputSchema } from "@/features/admin/api/schemas"
import { adminApi } from "@/features/admin/api/admin-api"
import { useAdminAuthStore } from "@/features/admin/store/admin-auth-store"
import type { AdminLoginInput } from "@/features/admin/api/types"
import logo from "@/assets/claude.webp"

/**
 * 管理后台登录页。
 *
 * 用户名 + 密码登录，登录成功后跳转至 redirectTo 或仪表盘。
 */
export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rawRedirect = searchParams.get("redirectTo") || "/admin/dashboard"
  // 防止开放重定向：仅允许跳转到 /admin/ 下的路径
  const redirectTo = rawRedirect.startsWith("/admin/") ? rawRedirect : "/admin/dashboard"

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginInputSchema),
  })

  async function onSubmit(data: AdminLoginInput) {
    setServerError(null)
    try {
      const result = await adminApi.login(data)
      useAdminAuthStore.getState().login(result.tokens, result.user)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "登录失败，请稍后重试"
      setServerError(message)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <img src={logo} alt="东软云脑智能医疗" className="size-12 rounded-xl" />
          <h1 className="text-xl font-semibold">东软云脑智能医疗</h1>
          <p className="text-sm text-foreground-500">管理后台</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && (
            <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
              {serverError}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium">
              用户名
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="请输入用户名"
              className="w-full rounded-lg border border-default-200 bg-default-100 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              {...register("username")}
            />
            {errors.username && (
              <p className="text-xs text-danger">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              密码
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="请输入密码"
                className="w-full rounded-lg border border-default-200 bg-default-100 px-3 py-2.5 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-danger">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isDisabled={isSubmitting}
          >
            {isSubmitting ? "登录中..." : "登录"}
          </Button>
        </form>
      </div>
    </div>
  )
}
