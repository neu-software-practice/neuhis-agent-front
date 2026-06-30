import type { PatientId } from "@/lib/api/types"
import {
  createAddressInputSchema,
  deleteAddressInputSchema,
  setDefaultAddressInputSchema,
  updateAddressInputSchema,
} from "@/features/patient/api/address-schemas"
import { mockDb } from "@/mocks/api/mock-db"

/**
 * 地址簿 mock handlers。
 *
 * 路由：
 * - GET    /patients/:patientId/addresses
 * - POST   /patients/:patientId/addresses
 * - PATCH  /patients/:patientId/addresses/:addressId
 * - DELETE /patients/:patientId/addresses/:addressId
 * - PUT    /patients/:patientId/addresses/:addressId/default
 */

export function handleListAddresses(patientId: PatientId) {
  return { addresses: mockDb.listAddresses(patientId) }
}

export function handleCreateAddress(patientId: PatientId, body: unknown) {
  const input = createAddressInputSchema.parse({
    ...(body as Record<string, unknown>),
    patientId,
  })
  return mockDb.createAddress(patientId, input)
}

export function handleUpdateAddress(
  patientId: PatientId,
  addressId: string,
  body: unknown,
) {
  const input = updateAddressInputSchema.parse({
    ...(body as Record<string, unknown>),
    patientId,
    addressId,
  })
  return mockDb.updateAddress(patientId, input)
}

export function handleDeleteAddress(patientId: PatientId, addressId: string) {
  const input = deleteAddressInputSchema.parse({ patientId, addressId })
  mockDb.deleteAddress(input.patientId, input.addressId)
  return { success: true }
}

export function handleSetDefaultAddress(
  patientId: PatientId,
  addressId: string,
) {
  const input = setDefaultAddressInputSchema.parse({ patientId, addressId })
  return mockDb.setDefaultAddress(input.patientId, input.addressId)
}
