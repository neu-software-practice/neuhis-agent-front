import type { z } from "zod"

import type {
  patientContextSchema,
  patientProfileSchema,
  updatePatientProfileInputSchema,
  verifyIdentityInputSchema,
  verifyIdentityResultSchema,
} from "@/features/patient/api/schemas"

export type PatientProfile = z.infer<typeof patientProfileSchema>
export type PatientContext = z.infer<typeof patientContextSchema>
export type VerifyIdentityInput = z.infer<typeof verifyIdentityInputSchema>
export type VerifyIdentityResult = z.infer<typeof verifyIdentityResultSchema>
export type UpdatePatientProfileInput = z.infer<
  typeof updatePatientProfileInputSchema
>
