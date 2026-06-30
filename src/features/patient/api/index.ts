import { getTransport } from "@/lib/api"
import type { PatientId } from "@/lib/api/types"
import {
  createAddressInputSchema,
  deleteAddressInputSchema,
  parseAddress,
  parseAddressListResponse,
  setDefaultAddressInputSchema,
  updateAddressInputSchema,
} from "@/features/patient/api/address-schemas"
import {
  patientContextSchema,
  patientProfileSchema,
  updatePatientProfileInputSchema,
  verifyIdentityInputSchema,
  verifyIdentityResultSchema,
} from "@/features/patient/api/schemas"
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

  async listAddresses(patientId: PatientId) {
    const result = await getTransport().get(`/patients/${patientId}/addresses`)
    return parseAddressListResponse(result)
  },

  async createAddress(input: CreateAddressInput) {
    const body = createAddressInputSchema.parse(input)
    const result = await getTransport().post(
      `/patients/${body.patientId}/addresses`,
      body,
    )
    return parseAddress(result)
  },

  async updateAddress(input: UpdateAddressInput) {
    const body = updateAddressInputSchema.parse(input)
    const result = await getTransport().patch(
      `/patients/${body.patientId}/addresses/${body.addressId}`,
      body,
    )
    return parseAddress(result)
  },

  async deleteAddress(input: DeleteAddressInput) {
    const body = deleteAddressInputSchema.parse(input)
    await getTransport().delete(
      `/patients/${body.patientId}/addresses/${body.addressId}`,
    )
    return { success: true }
  },

  async setDefaultAddress(input: SetDefaultAddressInput) {
    const body = setDefaultAddressInputSchema.parse(input)
    const result = await getTransport().put(
      `/patients/${body.patientId}/addresses/${body.addressId}/default`,
      body,
    )
    return parseAddress(result)
  },
}

export * from "@/features/patient/api/address-schemas"
export * from "@/features/patient/api/address-types"
export * from "@/features/patient/api/schemas"
export * from "@/features/patient/api/types"
