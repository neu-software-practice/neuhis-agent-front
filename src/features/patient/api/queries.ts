import { mutationOptions, queryOptions } from "@tanstack/react-query"

import { queryClient } from "@/lib/query-client"
import { patientApi } from "@/features/patient/api"
import type {
  CreateAddressInput,
  DeleteAddressInput,
  SetDefaultAddressInput,
  UpdateAddressInput,
} from "@/features/patient/api/address-types"
import type {
  UpdatePatientProfileInput,
  VerifyIdentityInput,
} from "@/features/patient/api/types"
import type { PatientId } from "@/lib/api/types"

export const patientQueryKeys = {
  all: ["patient"] as const,
  context: (patientId: PatientId) =>
    [...patientQueryKeys.all, "context", patientId] as const,
  addresses: (patientId: PatientId) =>
    [...patientQueryKeys.all, "addresses", patientId] as const,
}

export const patientQueries = {
  context: (patientId: PatientId) =>
    queryOptions({
      queryKey: patientQueryKeys.context(patientId),
      queryFn: () => patientApi.getPatientContext(patientId),
    }),
  addresses: (patientId: PatientId) =>
    queryOptions({
      queryKey: patientQueryKeys.addresses(patientId),
      queryFn: () => patientApi.listAddresses(patientId),
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
  createAddress: () =>
    mutationOptions({
      mutationFn: (input: CreateAddressInput) => patientApi.createAddress(input),
      onSuccess: (_address, input) => {
        void queryClient.invalidateQueries({
          queryKey: patientQueryKeys.addresses(input.patientId),
        })
      },
    }),
  updateAddress: () =>
    mutationOptions({
      mutationFn: (input: UpdateAddressInput) => patientApi.updateAddress(input),
      onSuccess: (_address, input) => {
        void queryClient.invalidateQueries({
          queryKey: patientQueryKeys.addresses(input.patientId),
        })
      },
    }),
  deleteAddress: () =>
    mutationOptions({
      mutationFn: (input: DeleteAddressInput) => patientApi.deleteAddress(input),
      onSuccess: (_result, input) => {
        void queryClient.invalidateQueries({
          queryKey: patientQueryKeys.addresses(input.patientId),
        })
      },
    }),
  setDefaultAddress: () =>
    mutationOptions({
      mutationFn: (input: SetDefaultAddressInput) =>
        patientApi.setDefaultAddress(input),
      onSuccess: (_address, input) => {
        void queryClient.invalidateQueries({
          queryKey: patientQueryKeys.addresses(input.patientId),
        })
      },
    }),
}
