import { beforeEach, describe, expect, it, vi } from "vitest"

import { getTransport } from "@/lib/api"

import { patientApi } from "@/features/patient/api"

vi.mock("@/lib/api", () => ({
  getTransport: vi.fn(),
}))

describe("patientApi", () => {
  const mockTransport = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    stream: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getTransport as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockTransport,
    )
  })

  const mockPatientProfile = {
    id: "patient-1",
    name: "张三",
    gender: "male" as const,
    age: 30,
    phoneMasked: "138****0000",
    allergies: ["青霉素"],
    chronicDiseases: ["高血压"],
    longTermMedications: ["降压药"],
    updatedAt: "2026-01-01T00:00:00Z",
  }

  describe("verifyIdentity", () => {
    it("calls POST /patients/verify with input and returns result", async () => {
      const input = {
        credentialType: "id_card" as const,
        credential: "110101199001011234",
        name: "张三",
      }
      const response = {
        patient: mockPatientProfile,
        readableScopes: ["profile", "allergies"] as Array<
          "profile" | "history" | "allergies" | "medications"
        >,
        verifiedAt: "2026-01-01T00:00:00Z",
      }
      mockTransport.post.mockResolvedValue(response)

      const result = await patientApi.verifyIdentity(input)

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/patients/verify",
        input,
      )
      expect(mockTransport.post).toHaveBeenCalledTimes(1)
      expect(result).toEqual(response)
    })

    it("works with phone credential", async () => {
      const input = {
        credentialType: "phone" as const,
        credential: "13800138000",
      }
      const response = {
        patient: mockPatientProfile,
        readableScopes: ["profile"] as Array<
          "profile" | "history" | "allergies" | "medications"
        >,
        verifiedAt: "2026-01-01T00:00:00Z",
      }
      mockTransport.post.mockResolvedValue(response)

      const result = await patientApi.verifyIdentity(input)

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/patients/verify",
        input,
      )
      expect(result.verifiedAt).toBeTruthy()
    })

    it("propagates transport errors", async () => {
      mockTransport.post.mockRejectedValue(new Error("Network error"))

      await expect(
        patientApi.verifyIdentity({
          credentialType: "id_card",
          credential: "1234",
        }),
      ).rejects.toThrow("Network error")
    })
  })

  describe("getPatientContext", () => {
    it("calls GET /patients/:id/context", async () => {
      const response = {
        patient: mockPatientProfile,
        chiefComplaint: "头痛三天",
        medicalHistory: ["糖尿病史"],
        allergies: ["青霉素"],
        longTermMedications: ["二甲双胍"],
      }
      mockTransport.get.mockResolvedValue(response)

      const result = await patientApi.getPatientContext("patient-1")

      expect(mockTransport.get).toHaveBeenCalledWith(
        "/patients/patient-1/context",
      )
      expect(mockTransport.get).toHaveBeenCalledTimes(1)
      expect(result.patient.id).toBe("patient-1")
      expect(result.chiefComplaint).toBe("头痛三天")
    })

    it("propagates transport errors", async () => {
      mockTransport.get.mockRejectedValue(new Error("Not found"))

      await expect(
        patientApi.getPatientContext("nonexistent"),
      ).rejects.toThrow("Not found")
    })
  })

  describe("updatePatientProfile", () => {
    it("calls PATCH /patients/:id/profile with stripped input", async () => {
      const input = {
        patientId: "patient-1",
        allergies: ["青霉素", "头孢"],
        chronicDiseases: ["高血压"],
        longTermMedications: ["硝苯地平"],
      }
      const { patientId, ...patchData } = input
      mockTransport.patch.mockResolvedValue(mockPatientProfile)

      const result = await patientApi.updatePatientProfile(input)

      expect(mockTransport.patch).toHaveBeenCalledWith(
        "/patients/patient-1/profile",
        patchData,
      )
      expect(mockTransport.patch).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockPatientProfile)
    })

    it("propagates transport errors", async () => {
      mockTransport.patch.mockRejectedValue(new Error("Validation error"))

      await expect(
        patientApi.updatePatientProfile({
          patientId: "patient-1",
          allergies: ["青霉素"],
        }),
      ).rejects.toThrow("Validation error")
    })
  })

  describe("listAddresses", () => {
    it("calls GET /patients/:id/addresses", async () => {
      const mockAddress = {
        id: "addr-1",
        patientId: "patient-1",
        name: "张三",
        phone: "13800138000",
        province: "广东省",
        city: "广州市",
        district: "天河区",
        detail: "天河路1号",
        isDefault: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      }
      const response = { addresses: [mockAddress] }
      mockTransport.get.mockResolvedValue(response)

      const result = await patientApi.listAddresses("patient-1")

      expect(mockTransport.get).toHaveBeenCalledWith(
        "/patients/patient-1/addresses",
      )
      expect(mockTransport.get).toHaveBeenCalledTimes(1)
      expect(result.addresses).toHaveLength(1)
      expect(result.addresses[0].id).toBe("addr-1")
    })

    it("propagates transport errors", async () => {
      mockTransport.get.mockRejectedValue(new Error("Forbidden"))

      await expect(
        patientApi.listAddresses("patient-1"),
      ).rejects.toThrow("Forbidden")
    })
  })

  describe("createAddress", () => {
    it("calls POST /patients/:id/addresses with input", async () => {
      const input = {
        patientId: "patient-1",
        name: "李四",
        phone: "13900139000",
        province: "广东省",
        city: "深圳市",
        district: "南山区",
        detail: "科技园路1号",
        isDefault: false,
        tag: "公司",
      }
      const response = {
        id: "addr-2",
        patientId: "patient-1",
        name: "李四",
        phone: "13900139000",
        province: "广东省",
        city: "深圳市",
        district: "南山区",
        detail: "科技园路1号",
        isDefault: false,
        tag: "公司",
        createdAt: "2026-01-02T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      }
      mockTransport.post.mockResolvedValue(response)

      const result = await patientApi.createAddress(input)

      expect(mockTransport.post).toHaveBeenCalledWith(
        "/patients/patient-1/addresses",
        input,
      )
      expect(mockTransport.post).toHaveBeenCalledTimes(1)
      expect(result.id).toBe("addr-2")
    })

    it("propagates transport errors", async () => {
      mockTransport.post.mockRejectedValue(new Error("Bad request"))

      await expect(
        patientApi.createAddress({
          patientId: "patient-1",
          name: "李四",
          phone: "13900139000",
          province: "广东省",
          city: "深圳市",
          district: "南山区",
          detail: "科技园路1号",
        }),
      ).rejects.toThrow("Bad request")
    })
  })

  describe("updateAddress", () => {
    it("calls PATCH /patients/:id/addresses/:addrId", async () => {
      const input = {
        patientId: "patient-1",
        addressId: "addr-1",
        name: "张三(更新)",
      }
      const response = {
        id: "addr-1",
        patientId: "patient-1",
        name: "张三(更新)",
        phone: "13800138000",
        province: "广东省",
        city: "广州市",
        district: "天河区",
        detail: "天河路1号",
        isDefault: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      }
      mockTransport.patch.mockResolvedValue(response)

      const result = await patientApi.updateAddress(input)

      expect(mockTransport.patch).toHaveBeenCalledWith(
        "/patients/patient-1/addresses/addr-1",
        input,
      )
      expect(mockTransport.patch).toHaveBeenCalledTimes(1)
      expect(result.name).toBe("张三(更新)")
    })

    it("propagates transport errors", async () => {
      mockTransport.patch.mockRejectedValue(new Error("Conflict"))

      await expect(
        patientApi.updateAddress({
          patientId: "patient-1",
          addressId: "addr-1",
          name: "新名字",
        }),
      ).rejects.toThrow("Conflict")
    })
  })

  describe("deleteAddress", () => {
    it("calls DELETE /patients/:id/addresses/:addrId", async () => {
      mockTransport.delete.mockResolvedValue(undefined)

      const result = await patientApi.deleteAddress({
        patientId: "patient-1",
        addressId: "addr-1",
      })

      expect(mockTransport.delete).toHaveBeenCalledWith(
        "/patients/patient-1/addresses/addr-1",
      )
      expect(mockTransport.delete).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ success: true })
    })

    it("propagates transport errors", async () => {
      mockTransport.delete.mockRejectedValue(new Error("Not found"))

      await expect(
        patientApi.deleteAddress({
          patientId: "patient-1",
          addressId: "nonexistent",
        }),
      ).rejects.toThrow("Not found")
    })
  })

  describe("setDefaultAddress", () => {
    it("calls PUT /patients/:id/addresses/:addrId/default", async () => {
      const input = {
        patientId: "patient-1",
        addressId: "addr-2",
      }
      const response = {
        id: "addr-2",
        patientId: "patient-1",
        name: "李四",
        phone: "13900139000",
        province: "广东省",
        city: "深圳市",
        district: "南山区",
        detail: "科技园路1号",
        isDefault: true,
        createdAt: "2026-01-02T00:00:00Z",
        updatedAt: "2026-01-03T00:00:00Z",
      }
      mockTransport.put.mockResolvedValue(response)

      const result = await patientApi.setDefaultAddress(input)

      expect(mockTransport.put).toHaveBeenCalledWith(
        "/patients/patient-1/addresses/addr-2/default",
        input,
      )
      expect(mockTransport.put).toHaveBeenCalledTimes(1)
      expect(result.isDefault).toBe(true)
    })

    it("propagates transport errors", async () => {
      mockTransport.put.mockRejectedValue(new Error("Server error"))

      await expect(
        patientApi.setDefaultAddress({
          patientId: "patient-1",
          addressId: "addr-1",
        }),
      ).rejects.toThrow("Server error")
    })
  })
})
