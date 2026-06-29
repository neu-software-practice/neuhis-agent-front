/**
 * Auth 输入校验 schema（Zod v4）。
 *
 * 用于 react-hook-form resolver 和 mock handler 校验。
 */
import { z } from "zod"

/** 手机号：11 位数字。 */
const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号")

/** 密码：6-32 位，至少含字母和数字。 */
const passwordSchema = z
  .string()
  .min(6, "密码至少 6 位")
  .max(32, "密码最长 32 位")
  .regex(/[a-zA-Z]/, "密码需包含字母")
  .regex(/\d/, "密码需包含数字")

export const loginInputSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
})

export const registerInputSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
  realName: z.string().trim().min(1).max(32).optional(),
})

export const refreshInputSchema = z.object({
  refreshToken: z.string().min(1),
})

export type LoginInputSchema = z.infer<typeof loginInputSchema>
export type RegisterInputSchema = z.infer<typeof registerInputSchema>
