import type { z } from "zod"

import type {
  addressSchema,
  createAddressInputSchema,
  updateAddressInputSchema,
  deleteAddressInputSchema,
  setDefaultAddressInputSchema,
  addressListResponseSchema,
  addressTagSchema,
} from "@/features/patient/api/address-schemas"

export type Address = z.infer<typeof addressSchema>
export type AddressTag = z.infer<typeof addressTagSchema>
export type CreateAddressInput = z.infer<typeof createAddressInputSchema>
export type UpdateAddressInput = z.infer<typeof updateAddressInputSchema>
export type DeleteAddressInput = z.infer<typeof deleteAddressInputSchema>
export type SetDefaultAddressInput = z.infer<typeof setDefaultAddressInputSchema>
export type AddressListResponse = z.infer<typeof addressListResponseSchema>
