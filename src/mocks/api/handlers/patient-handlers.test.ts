import { beforeEach, describe, expect, it } from "vitest"

import { mockDb } from "@/mocks/api/mock-db"
import {
  handleGetPatientContext,
  handleUpdatePatientProfile,
  handleVerifyIdentity,
} from "@/mocks/api/handlers/patient-handlers"

describe("patient handlers", () => {
  beforeEach(() => {
    mockDb.reset()
  })

  describe("handleVerifyIdentity", () => {
    it("returns patient with scopes", () => {
      const result = handleVerifyIdentity()
      expect(result.patient.id).toBe("patient-mock-001")
      expect(result.readableScopes).toContain("profile")
      expect(result.verifiedAt).toBeTruthy()
    })
  })

  describe("handleGetPatientContext", () => {
    it("returns context for existing patient", () => {
      const result = handleGetPatientContext("patient-mock-001")
      expect(result.patient.id).toBe("patient-mock-001")
      expect(result.allergies).toBeDefined()
    })

    it("throws for unknown patient", () => {
      expect(() => handleGetPatientContext("nonexistent")).toThrow()
    })
  })

  describe("handleUpdatePatientProfile", () => {
    it("updates patient fields", () => {
      const result = handleUpdatePatientProfile({
        patientId: "patient-mock-001",
        allergies: ["花粉", "尘螨"],
      })
      expect(result.allergies).toEqual(["花粉", "尘螨"])
    })

    it("throws for unknown patient", () => {
      expect(() =>
        handleUpdatePatientProfile({
          patientId: "nonexistent",
          allergies: [],
        }),
      ).toThrow()
    })
  })
})
