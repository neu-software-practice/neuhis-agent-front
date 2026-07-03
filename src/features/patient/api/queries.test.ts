import { describe, expect, it, vi } from "vitest"

import { patientApi } from "@/features/patient/api"
import {
  patientMutations,
  patientQueries,
  patientQueryKeys,
} from "@/features/patient/api/queries"

vi.mock("@/features/patient/api", () => ({
  patientApi: {
    getPatientContext: vi.fn(),
    listAddresses: vi.fn(),
    verifyIdentity: vi.fn(),
    updatePatientProfile: vi.fn(),
    createAddress: vi.fn(),
    updateAddress: vi.fn(),
    deleteAddress: vi.fn(),
    setDefaultAddress: vi.fn(),
  },
}))

const { mockInvalidateQueries } = vi.hoisted(() => ({
  mockInvalidateQueries: vi.fn(),
}))
vi.mock("@/lib/query-client", () => ({
  queryClient: { invalidateQueries: mockInvalidateQueries },
}))

describe("patientQueryKeys", () => {
  it("produces a stable 'all' key", () => {
    expect(patientQueryKeys.all).toEqual(["patient"])
  })

  it("builds a context key that includes the patientId", () => {
    const key = patientQueryKeys.context("patient-123")
    expect(key).toEqual(["patient", "context", "patient-123"])
  })

  it("builds an addresses key that includes the patientId", () => {
    const key = patientQueryKeys.addresses("patient-456")
    expect(key).toEqual(["patient", "addresses", "patient-456"])
  })

  it("produces distinct keys for different patientIds", () => {
    expect(patientQueryKeys.context("a")).not.toEqual(patientQueryKeys.context("b"))
  })
})

describe("patientQueries", () => {
  it("context() returns queryOptions with correct key and fn", () => {
    const options = patientQueries.context("patient-1")
    expect(options.queryKey).toEqual(["patient", "context", "patient-1"])
    expect(typeof options.queryFn).toBe("function")
  })

  it("addresses() returns queryOptions with correct key and fn", () => {
    const options = patientQueries.addresses("patient-1")
    expect(options.queryKey).toEqual(["patient", "addresses", "patient-1"])
    expect(typeof options.queryFn).toBe("function")
  })

  it("context queryFn calls patientApi.getPatientContext", async () => {
    vi.mocked(patientApi.getPatientContext).mockResolvedValue({
      patient: {
        id: "patient-1",
        name: "张三",
        gender: "male",
        age: 30,
        allergies: [],
        chronicDiseases: [],
        longTermMedications: [],
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      medicalHistory: [],
      allergies: [],
      longTermMedications: [],
    })
    const options = patientQueries.context("patient-1")
    const result = await options.queryFn!({} as never)
    expect(patientApi.getPatientContext).toHaveBeenCalledWith("patient-1")
    expect(result.patient.id).toBe("patient-1")
  })

  it("addresses queryFn calls patientApi.listAddresses", async () => {
    vi.mocked(patientApi.listAddresses).mockResolvedValue({
      addresses: [
        {
          id: "addr-1",
          patientId: "patient-1",
          name: "张三",
          phone: "13800138000",
          province: "北京市",
          city: "北京市",
          district: "海淀区",
          detail: "中关村大街1号",
          isDefault: false,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
    })
    const options = patientQueries.addresses("patient-1")
    const result = await options.queryFn!({} as never)
    expect(patientApi.listAddresses).toHaveBeenCalledWith("patient-1")
    expect(result.addresses).toHaveLength(1)
  })
})

describe("patientMutations", () => {
  it("verifyIdentity() returns mutationOptions with a mutationFn", () => {
    const options = patientMutations.verifyIdentity()
    expect(typeof options.mutationFn).toBe("function")
  })

  it("verifyIdentity mutationFn calls patientApi.verifyIdentity", async () => {
    vi.mocked(patientApi.verifyIdentity).mockResolvedValue({
      patient: {
        id: "patient-1",
        name: "张三",
        gender: "male",
        age: 30,
        allergies: [],
        chronicDiseases: [],
        longTermMedications: [],
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      readableScopes: ["profile"],
      verifiedAt: "2025-01-01T00:00:00.000Z",
    })
    const options = patientMutations.verifyIdentity()
    const result = await options.mutationFn!({
      credentialType: "id_card",
      credential: "110101199001011234",
      name: "张三",
    })
    expect(patientApi.verifyIdentity).toHaveBeenCalledWith({
      credentialType: "id_card",
      credential: "110101199001011234",
      name: "张三",
    })
    expect(result.readableScopes).toContain("profile")
  })

  it("updateProfile() returns mutationOptions with a mutationFn", () => {
    const options = patientMutations.updateProfile()
    expect(typeof options.mutationFn).toBe("function")
  })

  it("updateProfile mutationFn calls patientApi.updatePatientProfile", async () => {
    vi.mocked(patientApi.updatePatientProfile).mockResolvedValue({
      id: "patient-1",
      name: "张三",
      gender: "male",
      age: 30,
      allergies: ["青霉素"],
      chronicDiseases: [],
      longTermMedications: [],
      updatedAt: "2025-01-01T00:00:00.000Z",
    })
    const options = patientMutations.updateProfile()
    const result = await options.mutationFn!({
      patientId: "patient-1",
      allergies: ["青霉素"],
    })
    expect(patientApi.updatePatientProfile).toHaveBeenCalledWith({
      patientId: "patient-1",
      allergies: ["青霉素"],
    })
    expect(result.allergies).toContain("青霉素")
  })

  it("createAddress() returns mutationOptions with onSuccess invalidating addresses", () => {
    const options = patientMutations.createAddress()
    expect(typeof options.mutationFn).toBe("function")
    expect(typeof options.onSuccess).toBe("function")
  })

  it("createAddress onSuccess invalidates addresses query", () => {
    const options = patientMutations.createAddress()
    options.onSuccess?.(
      {
        id: "addr-new",
        patientId: "patient-1",
        name: "张三",
        phone: "13800138000",
        province: "北京市",
        city: "北京市",
        district: "海淀区",
        detail: "中关村大街1号",
        isDefault: false,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      {
        patientId: "patient-1",
        name: "张三",
        phone: "13800138000",
        province: "北京市",
        city: "北京市",
        district: "海淀区",
        detail: "中关村大街1号",
      },
    )
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["patient", "addresses", "patient-1"],
    })
  })

  it("updateAddress() returns mutationOptions with onSuccess", () => {
    const options = patientMutations.updateAddress()
    expect(typeof options.onSuccess).toBe("function")
  })

  it("updateAddress onSuccess invalidates addresses query", () => {
    const options = patientMutations.updateAddress()
    options.onSuccess?.(
      {
        id: "addr-1",
        patientId: "patient-1",
        name: "张三",
        phone: "13800138000",
        province: "北京市",
        city: "北京市",
        district: "海淀区",
        detail: "中关村大街1号",
        isDefault: false,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      { patientId: "patient-1", addressId: "addr-1", name: "新名字" },
    )
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["patient", "addresses", "patient-1"],
    })
  })

  it("deleteAddress() returns mutationOptions with onSuccess", () => {
    const options = patientMutations.deleteAddress()
    expect(typeof options.onSuccess).toBe("function")
  })

  it("deleteAddress onSuccess invalidates addresses query", () => {
    const options = patientMutations.deleteAddress()
    options.onSuccess?.(
      { success: true },
      { patientId: "patient-1", addressId: "addr-1" },
    )
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["patient", "addresses", "patient-1"],
    })
  })

  it("setDefaultAddress() returns mutationOptions with onSuccess", () => {
    const options = patientMutations.setDefaultAddress()
    expect(typeof options.onSuccess).toBe("function")
  })

  it("setDefaultAddress onSuccess invalidates addresses query", () => {
    const options = patientMutations.setDefaultAddress()
    options.onSuccess?.(
      {
        id: "addr-1",
        patientId: "patient-1",
        name: "张三",
        phone: "13800138000",
        province: "北京市",
        city: "北京市",
        district: "海淀区",
        detail: "中关村大街1号",
        isDefault: true,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      { patientId: "patient-1", addressId: "addr-1" },
    )
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["patient", "addresses", "patient-1"],
    })
  })

  it("createAddress mutationFn calls patientApi.createAddress", async () => {
    vi.mocked(patientApi.createAddress).mockResolvedValue({
      id: "addr-new",
      patientId: "patient-1",
      name: "张三",
      phone: "13800138000",
      province: "北京市",
      city: "北京市",
      district: "海淀区",
      detail: "中关村大街1号",
      isDefault: false,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    })
    const options = patientMutations.createAddress()
    const fn = options.mutationFn!
    const result = await fn({
      patientId: "patient-1",
      name: "张三",
      phone: "13800138000",
      province: "北京市",
      city: "北京市",
      district: "海淀区",
      detail: "中关村大街1号",
    })
    expect(patientApi.createAddress).toHaveBeenCalled()
    expect(result.id).toBe("addr-new")
  })

  it("updateAddress mutationFn calls patientApi.updateAddress", async () => {
    vi.mocked(patientApi.updateAddress).mockResolvedValue({
      id: "addr-1",
      patientId: "patient-1",
      name: "张三",
      phone: "13800138000",
      province: "北京市",
      city: "北京市",
      district: "海淀区",
      detail: "中关村大街1号",
      isDefault: false,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    })
    const options = patientMutations.updateAddress()
    const fn = options.mutationFn!
    const result = await fn({
      patientId: "patient-1",
      addressId: "addr-1",
      name: "张三",
    })
    expect(patientApi.updateAddress).toHaveBeenCalled()
    expect(result.name).toBe("张三")
  })

  it("deleteAddress mutationFn calls patientApi.deleteAddress", async () => {
    vi.mocked(patientApi.deleteAddress).mockResolvedValue({ success: true })
    const options = patientMutations.deleteAddress()
    const fn = options.mutationFn!
    const result = await fn({
      patientId: "patient-1",
      addressId: "addr-1",
    })
    expect(patientApi.deleteAddress).toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it("setDefaultAddress mutationFn calls patientApi.setDefaultAddress", async () => {
    vi.mocked(patientApi.setDefaultAddress).mockResolvedValue({
      id: "addr-1",
      patientId: "patient-1",
      name: "张三",
      phone: "13800138000",
      province: "北京市",
      city: "北京市",
      district: "海淀区",
      detail: "中关村大街1号",
      isDefault: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    })
    const options = patientMutations.setDefaultAddress()
    const fn = options.mutationFn!
    const result = await fn({
      patientId: "patient-1",
      addressId: "addr-1",
    })
    expect(patientApi.setDefaultAddress).toHaveBeenCalled()
    expect(result.isDefault).toBe(true)
  })
})
