import type { z } from "zod"

import type {
  medicalOrderRecordSchema,
  listMedicalOrdersResultSchema,
} from "@/features/medical-orders/api/schemas"

export type MedicalOrderRecord = z.infer<typeof medicalOrderRecordSchema>
export type ListMedicalOrdersResult = z.infer<typeof listMedicalOrdersResultSchema>
