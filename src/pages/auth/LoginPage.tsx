import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate, useSearchParams } from "react-router"
import { TextField, Input, Label, FieldError, Form } from "@heroui/react"
import { Stethoscope } from "lucide-react"

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
        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4" validationBehavior="aria">
          {serverError && (
            <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
              {serverError}
            </div>
          )}

          <TextField isInvalid={!!errors.phone} name="phone" type="tel">
            <Label>手机号</Label>
            <Input
              placeholder="请输入手机号"
              autoComplete="tel"
              {...register("phone")}
            />
            {errors.phone && (
              <FieldError>{errors.phone.message}</FieldError>
            )}
          </TextField>

          <TextField isInvalid={!!errors.password} name="password">
            <Label>密码</Label>
            <Input
              placeholder="请输入密码"
              autoComplete="current-password"
              type="password"
              {...register("password")}
            />
            {errors.password && (
              <FieldError>{errors.password.message}</FieldError>
            )}
          </TextField>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "登录中..." : "登录"}
          </Button>
        </Form>

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
