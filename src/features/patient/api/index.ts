import { getTransport } from "@/lib/api"
import type { PatientId } from "@/lib/api/types"
import {
  patientContextSchema,
  patientProfileSchema,
  updatePatientProfileInputSchema,
  verifyIdentityInputSchema,
  verifyIdentityResultSchema,
} from "@/features/patient/api/schemas"
import type {
  UpdatePatientProfileInput,
  VerifyIdentityInput,
} from "@/features/patient/api/types"

export const patientApi = {
  async verifyIdentity(input: VerifyIdentityInput) {
    const body = verifyIdentityInputSchema.parse(input)
    const result = await getTransport().post("/patients/verify", body)
    return verifyIdentityResultSchema.parse(result)
  },

  async getPatientContext(patientId: PatientId) {
    const result = await getTransport().get(`/patients/${patientId}/context`)
    return patientContextSchema.parse(result)
  },

  async updatePatientProfile(input: UpdatePatientProfileInput) {
    const body = updatePatientProfileInputSchema.parse(input)
    const result = await getTransport().patch(
      `/patients/${body.patientId}/profile`,
      body,
    )
    return patientProfileSchema.parse(result)
  },
}

export * from "@/features/patient/api/schemas"
export * from "@/features/patient/api/types"
