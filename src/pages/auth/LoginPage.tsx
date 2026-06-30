import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate, useSearchParams } from "react-router"
import { Eye, EyeOff, Stethoscope } from "lucide-react"

import { Button } from "@/components/ui/button"
import { loginInputSchema } from "@/features/auth/api/schemas"
import { authApi } from "@/features/auth/api/auth-api"
import { useAuthStore } from "@/features/auth/store/auth-store"
import type { LoginInput } from "@/features/auth/api/types"

/**
 * 登录页。
 *
 * 手机号 + 密码登录，登录成功后跳转至 redirectTo 或首页。
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || "/"
  const login = useAuthStore((s) => s.login)

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
  })

  async function onSubmit(data: LoginInput) {
    setServerError(null)
    try {
      const result = await authApi.login(data)
      login(result.tokens, result.user)
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
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Stethoscope className="size-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">东软云脑智能医疗</h1>
          <p className="text-sm text-foreground-500">登录以继续使用</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && (
            <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
              {serverError}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium">
              手机号
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="请输入手机号"
              className="w-full rounded-lg border border-default-200 bg-default-100 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-xs text-danger">{errors.phone.message}</p>
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
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "登录中..." : "登录"}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-foreground-500">
          还没有账号？{" "}
          <Link
            to="/register"
            className="font-medium text-primary hover:underline"
          >
            立即注册
          </Link>
        </p>
      </div>
    </div>
  )
}
