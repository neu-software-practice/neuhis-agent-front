/**
 * Auth 输入校验 schema（Zod v4）。
 *
 * 用于 react-hook-form resolver 和 mock handler 校验。
 */
import { z } from "zod"

/** 手机号：11 位数字。 */
const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号")

/** 登录密码：仅非空校验，不限制复杂度（复杂度是注册时的事）。 */
const loginPasswordSchema = z.string().min(1, "请输入密码")

/** 注册密码：8-32 位，至少含字母和数字。 */
const registerPasswordSchema = z
  .string()
  .min(8, "密码至少 8 位")
  .max(32, "密码最长 32 位")
  .regex(/[a-zA-Z]/, "密码需包含字母")
  .regex(/\d/, "密码需包含数字")

export const loginInputSchema = z.object({
  phone: phoneSchema,
  password: loginPasswordSchema,
})

export const registerFormSchema = z
  .object({
    phone: phoneSchema,
    password: registerPasswordSchema,
    confirmPassword: z.string().min(1, "请再次输入密码"),
    realName: z.string().trim().max(32).optional(),
  })
  .refine((data) => data.confirmPassword === data.password, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  })

/** @deprecated 使用 registerFormSchema 代替 */
export const registerInputSchema = registerFormSchema

export const refreshInputSchema = z.object({
  refreshToken: z.string().min(1),
})

export type LoginInputSchema = z.infer<typeof loginInputSchema>
export type RegisterInputSchema = z.infer<typeof registerInputSchema>
