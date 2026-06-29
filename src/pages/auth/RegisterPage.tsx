import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate } from "react-router"
import { Eye, EyeOff, Stethoscope } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { registerFormSchema } from "@/features/auth/api/schemas"
import { authApi } from "@/features/auth/api/auth-api"
import { useAuthStore } from "@/features/auth/store/auth-store"
import type { RegisterFormValues } from "@/features/auth/api/types"

/** 性别预设选项：value 存后端，label 显示给用户。 */
const GENDER_PRESETS = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
] as const

/**
 * 注册页。
 *
 * 手机号 + 密码 + 确认密码 + 性别 + 出生日期 + 可选真实姓名，
 * 注册成功后自动登录跳转首页。
 */
export default function RegisterPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  /** 是否选择"其他"性别（手动输入） */
  const [isCustomGender, setIsCustomGender] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      gender: "",
      birthDate: "",
    },
  })

  const genderValue = watch("gender")

  function handleGenderPreset(value: string) {
    setIsCustomGender(false)
    setValue("gender", value, { shouldValidate: true })
  }

  function handleGenderCustom() {
    setIsCustomGender(true)
    setValue("gender", "", { shouldValidate: false })
  }

  async function onSubmit(data: RegisterFormValues) {
    setServerError(null)
    try {
      // 剔除 confirmPassword，只提交后端需要的字段
      const { confirmPassword: _, ...payload } = data
      const result = await authApi.register(payload)
      login(result.tokens, result.user)
      navigate("/", { replace: true })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "注册失败，请稍后重试"
      setServerError(message)
    }
  }

  const inputClass =
    "w-full rounded-lg border border-default-200 bg-default-100 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-foreground-400 focus:border-primary focus:ring-1 focus:ring-primary"

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Stethoscope className="size-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">东软云脑智能医疗</h1>
          <p className="text-sm text-foreground-500">注册新账号</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
              {serverError}
            </div>
          )}

          {/* 手机号 */}
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium">
              手机号
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="请输入手机号"
              className={inputClass}
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-xs text-danger">{errors.phone.message}</p>
            )}
          </div>

          {/* 密码 */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              密码
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="至少 6 位，含字母和数字"
                className={`${inputClass} pr-10`}
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

          {/* 确认密码 */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              确认密码
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="请再次输入密码"
                className={`${inputClass} pr-10`}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "隐藏密码" : "显示密码"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-danger">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* 姓名（选填） */}
          <div className="space-y-1.5">
            <label htmlFor="realName" className="text-sm font-medium">
              姓名 <span className="text-foreground-400">（选填）</span>
            </label>
            <input
              id="realName"
              type="text"
              autoComplete="name"
              placeholder="真实姓名，用于就诊记录"
              className={inputClass}
              {...register("realName")}
            />
            {errors.realName && (
              <p className="text-xs text-danger">{errors.realName.message}</p>
            )}
          </div>

          {/* 性别 */}
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">性别</legend>
            <div className="flex items-center gap-3">
              {GENDER_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    !isCustomGender && genderValue === preset.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-default-200 bg-default-100 text-foreground hover:border-primary/50"
                  }`}
                  onClick={() => handleGenderPreset(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                  isCustomGender
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-default-200 bg-default-100 text-foreground hover:border-primary/50"
                }`}
                onClick={handleGenderCustom}
              >
                其他
              </button>
            </div>
            {isCustomGender && (
              <input
                type="text"
                placeholder="请输入性别"
                className={inputClass}
                value={genderValue}
                onChange={(e) =>
                  setValue("gender", e.target.value, { shouldValidate: true })
                }
              />
            )}
            {errors.gender && (
              <p className="text-xs text-danger">{errors.gender.message}</p>
            )}
          </fieldset>

          {/* 出生日期 */}
          <div className="space-y-1.5">
            <Controller
              name="birthDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="出生日期"
                  value={field.value}
                  onChange={field.onChange}
                  isRequired
                  isInvalid={!!errors.birthDate}
                  errorMessage={errors.birthDate?.message}
                />
              )}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "注册中..." : "注册"}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-foreground-500">
          已有账号？{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            返回登录
          </Link>
        </p>
      </div>
    </div>
  )
}
