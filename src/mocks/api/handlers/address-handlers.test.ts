import { beforeEach, describe, expect, it } from "vitest"

import { mockDb } from "@/mocks/api/mock-db"
import {
  handleCreateAddress,
  handleDeleteAddress,
  handleListAddresses,
  handleSetDefaultAddress,
  handleUpdateAddress,
} from "@/mocks/api/handlers/address-handlers"

describe("address handlers", () => {
  beforeEach(() => {
    mockDb.reset()
  })

  describe("handleListAddresses", () => {
    it("returns addresses for a patient", () => {
      const result = handleListAddresses("patient-mock-001")
      expect(result.addresses.length).toBeGreaterThan(0)
    })

    it("returns empty array for patient with no addresses", () => {
      const result = handleListAddresses("patient-no-addr")
      expect(result.addresses).toEqual([])
    })
  })

  describe("handleCreateAddress", () => {
    it("creates a new address", () => {
      const result = handleCreateAddress("patient-mock-001", {
        name: "张三",
        phone: "13900001111",
        province: "北京市",
        city: "市辖区",
        district: "朝阳区",
        detail: "某街道1号",
      })
      expect(result.name).toBe("张三")
      expect(result.id).toBeTruthy()
    })

    it("throws on patientId mismatch", () => {
      expect(() =>
        handleCreateAddress("patient-mock-001", {
          patientId: "different-patient",
          name: "test",
          phone: "13900001111",
          province: "北京市",
          city: "市辖区",
          district: "朝阳区",
          detail: "test",
        }),
      ).toThrow()
    })
  })

  describe("handleUpdateAddress", () => {
    it("updates an existing address", () => {
      const addresses = handleListAddresses("patient-mock-001")
      const target = addresses.addresses[0]
      const result = handleUpdateAddress("patient-mock-001", target.id, {
        name: "新名字",
      })
      expect(result.name).toBe("新名字")
    })

    it("throws on patientId mismatch", () => {
      expect(() =>
        handleUpdateAddress("patient-mock-001", "addr-seed-001", {
          patientId: "different",
        }),
      ).toThrow()
    })
  })

  describe("handleDeleteAddress", () => {
    it("deletes an address", () => {
      const addresses = handleListAddresses("patient-mock-001")
      const target = addresses.addresses[0]
      const result = handleDeleteAddress("patient-mock-001", target.id)
      expect(result.success).toBe(true)
    })
  })

  describe("handleSetDefaultAddress", () => {
    it("sets an address as default", () => {
      const pid = "patient-default-addr-test"
      const a = handleCreateAddress(pid, {
        name: "A",
        phone: "13900001111",
        province: "北京市",
        city: "市辖区",
        district: "朝阳区",
        detail: "路1号",
      })
      handleCreateAddress(pid, {
        name: "B",
        phone: "13900002222",
        province: "上海市",
        city: "市辖区",
        district: "浦东新区",
        detail: "路2号",
      })
      const result = handleSetDefaultAddress(pid, a.id)
      expect(result.isDefault).toBe(true)
    })

    it("throws on patientId mismatch in body", () => {
      expect(() =>
        handleSetDefaultAddress("patient-mock-001", "addr-seed-001", {
          patientId: "different",
        }),
      ).toThrow()
    })
  })
})
