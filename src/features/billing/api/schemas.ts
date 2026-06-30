import { z } from "zod"

import { paymentStatusSchema, sessionIdSchema } from "@/lib/api/types"

export const billingRecordSchema = z.object({
  paymentId: z.string().trim().min(1),
  sessionId: sessionIdSchema,
  sessionTitle: z.string().trim().min(1),
  purpose: z.enum(["lab", "medication"]),
  items: z.array(
    z.object({
      name: z.string().trim().min(1),
      amount: z.number().min(0),
      quantity: z.number().int().positive().optional(),
    }),
  ),
  totalAmount: z.number().min(0),
  insuranceAmount: z.number().min(0),
  selfPayAmount: z.number().min(0),
  paymentStatus: paymentStatusSchema,
  createdAt: z.string().datetime(),
})

export const listBillingRecordsResultSchema = z.object({
  items: z.array(billingRecordSchema),
})

export function parseBillingRecord(value: unknown) {
  return billingRecordSchema.parse(value)
}

export function parseListBillingRecordsResult(value: unknown) {
  return listBillingRecordsResultSchema.parse(value)
}
