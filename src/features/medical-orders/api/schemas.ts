import { z } from "zod"

import { sessionIdSchema } from "@/lib/api/types"

export const medicalOrderKindSchema = z.enum(["advice", "medication"])

export const medicationItemSchema = z.object({
  name: z.string().trim().min(1),
  spec: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  dosage: z.string().trim().min(1),
  days: z.number().int().positive(),
  price: z.number().min(0),
})

export const deliveryAddressSummarySchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  fullAddress: z.string().trim().min(1),
})

export const medicalOrderRecordSchema = z.object({
  recordId: z.string().trim().min(1),
  sessionId: sessionIdSchema,
  sessionTitle: z.string().trim().min(1),
  kind: medicalOrderKindSchema,
  // advice 专属字段
  advices: z.array(z.string().trim().min(1)).optional(),
  watchItems: z.array(z.string().trim().min(1)).optional(),
  followUpRecommendation: z.string().trim().min(1).optional(),
  // medication 专属字段
  medications: z.array(medicationItemSchema).optional(),
  fulfillmentStatus: z.enum(["pending", "confirmed", "completed"]).optional(),
  deliveryAddress: deliveryAddressSummarySchema.optional(),
  // 通用
  handledAt: z.string().datetime(),
  createdAt: z.string().datetime(),
})

export const listMedicalOrdersResultSchema = z.object({
  items: z.array(medicalOrderRecordSchema),
})

export function parseMedicalOrderRecord(value: unknown) {
  return medicalOrderRecordSchema.parse(value)
}

export function parseListMedicalOrdersResult(value: unknown) {
  return listMedicalOrdersResultSchema.parse(value)
}
