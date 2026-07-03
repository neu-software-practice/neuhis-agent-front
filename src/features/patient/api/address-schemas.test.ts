import { describe, expect, it } from "vitest"

import {
  addressIdSchema,
  addressListResponseSchema,
  addressSchema,
  addressTagSchema,
  createAddressInputSchema,
  deleteAddressInputSchema,
  parseAddress,
  parseAddressListResponse,
  setDefaultAddressInputSchema,
  updateAddressInputSchema,
} from "@/features/patient/api/address-schemas"

function validAddress() {
  return {
    id: "addr-1",
    patientId: "patient-1",
    name: "张三",
    phone: "13800138000",
    province: "北京市",
    city: "北京市",
    district: "海淀区",
    detail: "中关村大街1号",
    isDefault: false,
    tag: "家",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  }
}

describe("addressIdSchema", () => {
  it("accepts a non-empty string", () => {
    expect(addressIdSchema.safeParse("addr-1").success).toBe(true)
  })

  it("rejects an empty string", () => {
    expect(addressIdSchema.safeParse("").success).toBe(false)
  })

  it("trims whitespace before validation", () => {
    expect(addressIdSchema.safeParse("  ").success).toBe(false)
  })
})

describe("addressTagSchema", () => {
  it("accepts a valid tag", () => {
    expect(addressTagSchema.safeParse("家").success).toBe(true)
  })

  it("rejects an empty string", () => {
    expect(addressTagSchema.safeParse("").success).toBe(false)
  })

  it("rejects a tag longer than 20 characters", () => {
    expect(addressTagSchema.safeParse("a".repeat(21)).success).toBe(false)
  })

  it("accepts a tag exactly 20 characters", () => {
    expect(addressTagSchema.safeParse("a".repeat(20)).success).toBe(true)
  })
})

describe("addressSchema", () => {
  it("accepts a fully valid address", () => {
    const result = addressSchema.safeParse(validAddress())
    expect(result.success).toBe(true)
  })

  it("applies default value for isDefault", () => {
    const data = validAddress()
    delete (data as Record<string, unknown>).isDefault
    const result = addressSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isDefault).toBe(false)
    }
  })

  it("accepts address without optional tag", () => {
    const data = validAddress()
    delete (data as Record<string, unknown>).tag
    expect(addressSchema.safeParse(data).success).toBe(true)
  })

  it("rejects a phone number that does not start with 1", () => {
    const result = addressSchema.safeParse({ ...validAddress(), phone: "23800138000" })
    expect(result.success).toBe(false)
  })

  it("rejects a phone number containing letters", () => {
    const result = addressSchema.safeParse({ ...validAddress(), phone: "1380013800a" })
    expect(result.success).toBe(false)
  })

  it("rejects a phone number with fewer than 11 digits", () => {
    const result = addressSchema.safeParse({ ...validAddress(), phone: "1380013800" })
    expect(result.success).toBe(false)
  })

  it("rejects an empty name", () => {
    const result = addressSchema.safeParse({ ...validAddress(), name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects a name longer than 20 characters", () => {
    const result = addressSchema.safeParse({ ...validAddress(), name: "张".repeat(21) })
    expect(result.success).toBe(false)
  })

  it("rejects an empty province", () => {
    const result = addressSchema.safeParse({ ...validAddress(), province: "" })
    expect(result.success).toBe(false)
  })

  it("rejects an empty detail", () => {
    const result = addressSchema.safeParse({ ...validAddress(), detail: "" })
    expect(result.success).toBe(false)
  })

  it("rejects a detail longer than 200 characters", () => {
    const result = addressSchema.safeParse({ ...validAddress(), detail: "a".repeat(201) })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid createdAt datetime", () => {
    const result = addressSchema.safeParse({ ...validAddress(), createdAt: "not-a-date" })
    expect(result.success).toBe(false)
  })

  it("rejects missing required fields", () => {
    expect(addressSchema.safeParse({}).success).toBe(false)
  })
})

describe("createAddressInputSchema", () => {
  function validInput() {
    return {
      patientId: "patient-1",
      name: "张三",
      phone: "13800138000",
      province: "北京市",
      city: "北京市",
      district: "海淀区",
      detail: "中关村大街1号",
      isDefault: true,
      tag: "公司",
    }
  }

  it("accepts a valid create input", () => {
    expect(createAddressInputSchema.safeParse(validInput()).success).toBe(true)
  })

  it("applies default isDefault when omitted", () => {
    const data = validInput()
    delete (data as Record<string, unknown>).isDefault
    const result = createAddressInputSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isDefault).toBe(false)
    }
  })

  it("accepts input without optional tag", () => {
    const data = validInput()
    delete (data as Record<string, unknown>).tag
    expect(createAddressInputSchema.safeParse(data).success).toBe(true)
  })

  it("rejects an invalid phone", () => {
    const result = createAddressInputSchema.safeParse({ ...validInput(), phone: "abc" })
    expect(result.success).toBe(false)
  })

  it("rejects missing patientId", () => {
    const data = validInput()
    delete (data as Record<string, unknown>).patientId
    expect(createAddressInputSchema.safeParse(data).success).toBe(false)
  })
})

describe("updateAddressInputSchema", () => {
  it("accepts a full update input", () => {
    const result = updateAddressInputSchema.safeParse({
      patientId: "patient-1",
      addressId: "addr-1",
      name: "李四",
      phone: "13900139000",
    })
    expect(result.success).toBe(true)
  })

  it("accepts input with only required fields", () => {
    const result = updateAddressInputSchema.safeParse({
      patientId: "patient-1",
      addressId: "addr-1",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid phone in partial update", () => {
    const result = updateAddressInputSchema.safeParse({
      patientId: "patient-1",
      addressId: "addr-1",
      phone: "123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing patientId", () => {
    const result = updateAddressInputSchema.safeParse({ addressId: "addr-1" })
    expect(result.success).toBe(false)
  })

  it("rejects missing addressId", () => {
    const result = updateAddressInputSchema.safeParse({ patientId: "patient-1" })
    expect(result.success).toBe(false)
  })
})

describe("deleteAddressInputSchema", () => {
  it("accepts valid delete input", () => {
    const result = deleteAddressInputSchema.safeParse({
      patientId: "patient-1",
      addressId: "addr-1",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing patientId", () => {
    expect(deleteAddressInputSchema.safeParse({ addressId: "addr-1" }).success).toBe(false)
  })

  it("rejects missing addressId", () => {
    expect(deleteAddressInputSchema.safeParse({ patientId: "patient-1" }).success).toBe(false)
  })
})

describe("setDefaultAddressInputSchema", () => {
  it("accepts valid set-default input", () => {
    const result = setDefaultAddressInputSchema.safeParse({
      patientId: "patient-1",
      addressId: "addr-1",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing fields", () => {
    expect(setDefaultAddressInputSchema.safeParse({}).success).toBe(false)
  })
})

describe("addressListResponseSchema", () => {
  it("accepts a valid list response", () => {
    const result = addressListResponseSchema.safeParse({
      addresses: [validAddress(), { ...validAddress(), id: "addr-2" }],
    })
    expect(result.success).toBe(true)
  })

  it("accepts an empty address list", () => {
    const result = addressListResponseSchema.safeParse({ addresses: [] })
    expect(result.success).toBe(true)
  })

  it("rejects missing addresses field", () => {
    expect(addressListResponseSchema.safeParse({}).success).toBe(false)
  })

  it("rejects an invalid address in the list", () => {
    const result = addressListResponseSchema.safeParse({
      addresses: [{ ...validAddress(), phone: "invalid" }],
    })
    expect(result.success).toBe(false)
  })
})

describe("parseAddress", () => {
  it("returns parsed address on valid input", () => {
    const result = parseAddress(validAddress())
    expect(result.id).toBe("addr-1")
    expect(result.name).toBe("张三")
  })

  it("throws on invalid input", () => {
    expect(() => parseAddress({})).toThrow()
  })
})

describe("parseAddressListResponse", () => {
  it("returns parsed list on valid input", () => {
    const result = parseAddressListResponse({ addresses: [validAddress()] })
    expect(result.addresses).toHaveLength(1)
  })

  it("throws on invalid input", () => {
    expect(() => parseAddressListResponse({})).toThrow()
  })
})
