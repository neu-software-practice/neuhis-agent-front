import { z } from "zod"

import { patientIdSchema } from "@/lib/api/types"

export const addressIdSchema = z.string().trim().min(1)

export const addressTagSchema = z.string().trim().min(1).max(20)

export const addressSchema = z.object({
  id: addressIdSchema,
  patientId: patientIdSchema,
  name: z.string().trim().min(1).max(20),
  phone: z.string().regex(/^1\d{10}$/, "手机号格式不正确"),
  province: z.string().trim().min(1),
  city: z.string().trim().min(1),
  district: z.string().trim().min(1),
  detail: z.string().trim().min(1).max(200),
  isDefault: z.boolean().default(false),
  tag: addressTagSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createAddressInputSchema = z.object({
  patientId: patientIdSchema,
  name: z.string().trim().min(1).max(20),
  phone: z.string().regex(/^1\d{10}$/, "手机号格式不正确"),
  province: z.string().trim().min(1),
  city: z.string().trim().min(1),
  district: z.string().trim().min(1),
  detail: z.string().trim().min(1).max(200),
  isDefault: z.boolean().default(false),
  tag: addressTagSchema.optional(),
})

export const updateAddressInputSchema = z.object({
  patientId: patientIdSchema,
  addressId: addressIdSchema,
  name: z.string().trim().min(1).max(20).optional(),
  phone: z.string().regex(/^1\d{10}$/, "手机号格式不正确").optional(),
  province: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  district: z.string().trim().min(1).optional(),
  detail: z.string().trim().min(1).max(200).optional(),
  isDefault: z.boolean().optional(),
  tag: addressTagSchema.optional(),
})

export const deleteAddressInputSchema = z.object({
  patientId: patientIdSchema,
  addressId: addressIdSchema,
})

export const setDefaultAddressInputSchema = z.object({
  patientId: patientIdSchema,
  addressId: addressIdSchema,
})

export const addressListResponseSchema = z.object({
  addresses: z.array(addressSchema),
})

export function parseAddress(value: unknown) {
  return addressSchema.parse(value)
}

export function parseAddressListResponse(value: unknown) {
  return addressListResponseSchema.parse(value)
}
