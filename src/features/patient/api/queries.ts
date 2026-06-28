import { mutationOptions, queryOptions } from "@tanstack/react-query"

import { patientApi } from "@/features/patient/api"
import type {
  UpdatePatientProfileInput,
  VerifyIdentityInput,
} from "@/features/patient/api/types"
import type { PatientId } from "@/lib/api/types"

export const patientQueryKeys = {
  all: ["patient"] as const,
  context: (patientId: PatientId) =>
    [...patientQueryKeys.all, "context", patientId] as const,
}

export const patientQueries = {
  context: (patientId: PatientId) =>
    queryOptions({
      queryKey: patientQueryKeys.context(patientId),
      queryFn: () => patientApi.getPatientContext(patientId),
    }),
}

export const patientMutations = {
  verifyIdentity: () =>
    mutationOptions({
      mutationFn: (input: VerifyIdentityInput) => patientApi.verifyIdentity(input),
    }),
  updateProfile: () =>
    mutationOptions({
      mutationFn: (input: UpdatePatientProfileInput) =>
        patientApi.updatePatientProfile(input),
    }),
}
