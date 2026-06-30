import type { z } from "zod"

import type {
  billingRecordSchema,
  listBillingRecordsResultSchema,
} from "@/features/billing/api/schemas"

export type BillingRecord = z.infer<typeof billingRecordSchema>
export type ListBillingRecordsResult = z.infer<typeof listBillingRecordsResultSchema>
