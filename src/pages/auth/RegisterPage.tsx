import { useState } from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate } from "react-router"
import { TextField, Input, Label, FieldError, Form } from "@heroui/react"
import { Stethoscope } from "lucide-react"

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

  const [serverError, setServerError] = useState<string | null>(null)
  /** 是否选择"其他"性别（手动输入） */
  const [isCustomGender, setIsCustomGender] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      gender: "",
      birthDate: "",
    },
  })

  const genderValue = useWatch({ control, name: "gender" }) ?? ""

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
      const payload = {
        phone: data.phone,
        password: data.password,
        gender: data.gender,
        birthDate: data.birthDate,
        realName: data.realName?.trim() || undefined,
      }
      const result = await authApi.register(payload)
      login(result, result.user)
      navigate("/", { replace: true })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "注册失败，请稍后重试"
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
          <p className="text-sm text-foreground-500">注册新账号</p>
        </div>

        {/* Form */}
        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4" validationBehavior="aria">
          {serverError && (
            <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
              {serverError}
            </div>
          )}

          {/* 手机号 */}
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

          {/* 密码 */}
          <TextField isInvalid={!!errors.password} name="password">
            <Label>密码</Label>
            <Input
              placeholder="至少 6 位，含字母和数字"
              autoComplete="new-password"
              type="password"
              {...register("password")}
            />
            {errors.password && (
              <FieldError>{errors.password.message}</FieldError>
            )}
          </TextField>

          {/* 确认密码 */}
          <TextField isInvalid={!!errors.confirmPassword} name="confirmPassword">
            <Label>确认密码</Label>
            <Input
              placeholder="请再次输入密码"
              autoComplete="new-password"
              type="password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <FieldError>{errors.confirmPassword.message}</FieldError>
            )}
          </TextField>

          {/* 姓名（选填） */}
          <TextField isInvalid={!!errors.realName} name="realName" type="text">
            <Label>
              姓名 <span className="text-foreground-400">（选填）</span>
            </Label>
            <Input
              placeholder="真实姓名，用于就诊记录"
              autoComplete="name"
              {...register("realName")}
            />
            {errors.realName && (
              <FieldError>{errors.realName.message}</FieldError>
            )}
          </TextField>

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
                ...
              </button>
            </div>
            {isCustomGender && (
              <TextField isInvalid={!!errors.gender} name="gender" type="text">
                <Input
                  placeholder="请输入性别"
                  value={genderValue}
                  onChange={(e) =>
                    setValue("gender", e.target.value, { shouldValidate: true })
                  }
                />
                {errors.gender && (
                  <FieldError>{errors.gender.message}</FieldError>
                )}
              </TextField>
            )}
            {!isCustomGender && errors.gender && (
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
        </Form>

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
