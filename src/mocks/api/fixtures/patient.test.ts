import { describe, expect, it } from "vitest"

import { mockPatient, mockPatientContext } from "@/mocks/api/fixtures/patient"

describe("patient fixtures", () => {
  describe("mockPatient", () => {
    it("has required fields", () => {
      expect(mockPatient.id).toBe("patient-mock-001")
      expect(mockPatient.name).toBe("李明")
      expect(mockPatient.gender).toBe("male")
      expect(typeof mockPatient.age).toBe("number")
    })

    it("has masked phone and ID card", () => {
      expect(mockPatient.phoneMasked).toContain("****")
      expect(mockPatient.idCardMasked).toContain("**********")
    })

    it("has allergies array", () => {
      expect(Array.isArray(mockPatient.allergies)).toBe(true)
      expect(mockPatient.allergies.length).toBeGreaterThan(0)
    })

    it("has chronic diseases array", () => {
      expect(Array.isArray(mockPatient.chronicDiseases)).toBe(true)
    })

    it("has updatedAt timestamp", () => {
      expect(mockPatient.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe("mockPatientContext", () => {
    it("references the mock patient", () => {
      expect(mockPatientContext.patient).toEqual(mockPatient)
    })

    it("has chief complaint", () => {
      expect(mockPatientContext.chiefComplaint).toBeTruthy()
    })

    it("has medical history", () => {
      expect(Array.isArray(mockPatientContext.medicalHistory)).toBe(true)
      expect(mockPatientContext.medicalHistory.length).toBeGreaterThan(0)
    })

    it("has allergies matching patient", () => {
      expect(mockPatientContext.allergies).toEqual(mockPatient.allergies)
    })

    it("has prior visit data", () => {
      expect(mockPatientContext.priorVisit).toBeDefined()
      expect(mockPatientContext.priorVisit?.sessionId).toBeTruthy()
      expect(mockPatientContext.priorVisit?.diagnosis).toBeTruthy()
    })
  })
})
