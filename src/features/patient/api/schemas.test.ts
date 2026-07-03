import { describe, expect, it } from "vitest"

import {
  genderSchema,
  patientContextSchema,
  patientPriorVisitSchema,
  patientProfileSchema,
  parsePatientContext,
  parsePatientProfile,
  parseVerifyIdentityResult,
  safeParsePatientContext,
  safeParsePatientProfile,
  safeParseVerifyIdentityResult,
  updatePatientProfileInputSchema,
  verifyIdentityInputSchema,
  verifyIdentityResultSchema,
} from "@/features/patient/api/schemas"

function validProfile() {
  return {
    id: "patient-1",
    name: "张三",
    gender: "male" as const,
    age: 30,
    phoneMasked: "138****8000",
    idCardMasked: "110***********1234",
    allergies: ["青霉素"],
    chronicDiseases: ["高血压"],
    longTermMedications: ["降压药"],
    updatedAt: "2025-01-01T00:00:00.000Z",
  }
}

describe("genderSchema", () => {
  it.each(["male", "female", "other", "unknown"])("accepts %s", (value) => {
    expect(genderSchema.safeParse(value).success).toBe(true)
  })

  it("rejects an invalid gender value", () => {
    expect(genderSchema.safeParse("invalid").success).toBe(false)
  })
})

describe("patientProfileSchema", () => {
  it("accepts a fully valid profile", () => {
    expect(patientProfileSchema.safeParse(validProfile()).success).toBe(true)
  })

  it("accepts a profile without optional masked fields", () => {
    const data = validProfile()
    delete (data as Record<string, unknown>).phoneMasked
    delete (data as Record<string, unknown>).idCardMasked
    expect(patientProfileSchema.safeParse(data).success).toBe(true)
  })

  it("accepts a profile with empty array fields", () => {
    const result = patientProfileSchema.safeParse({
      ...validProfile(),
      allergies: [],
      chronicDiseases: [],
      longTermMedications: [],
    })
    expect(result.success).toBe(true)
  })

  it("rejects a negative age", () => {
    const result = patientProfileSchema.safeParse({ ...validProfile(), age: -1 })
    expect(result.success).toBe(false)
  })

  it("rejects an age above 130", () => {
    const result = patientProfileSchema.safeParse({ ...validProfile(), age: 131 })
    expect(result.success).toBe(false)
  })

  it("rejects a non-integer age", () => {
    const result = patientProfileSchema.safeParse({ ...validProfile(), age: 30.5 })
    expect(result.success).toBe(false)
  })

  it("rejects an empty name", () => {
    const result = patientProfileSchema.safeParse({ ...validProfile(), name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid gender", () => {
    const result = patientProfileSchema.safeParse({ ...validProfile(), gender: "invalid" })
    expect(result.success).toBe(false)
  })

  it("rejects an empty allergy string in array", () => {
    const result = patientProfileSchema.safeParse({ ...validProfile(), allergies: [""] })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid updatedAt datetime", () => {
    const result = patientProfileSchema.safeParse({ ...validProfile(), updatedAt: "not-a-date" })
    expect(result.success).toBe(false)
  })
})

describe("patientPriorVisitSchema", () => {
  it("accepts a valid prior visit", () => {
    const result = patientPriorVisitSchema.safeParse({
      sessionId: "visit-1",
      completedAt: "2025-01-01T00:00:00.000Z",
      diagnosis: "上呼吸道感染",
      labResultSummary: "白细胞偏高",
      treatmentSummary: "休息，多饮水",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a prior visit with optional fields omitted", () => {
    const result = patientPriorVisitSchema.safeParse({
      sessionId: "visit-1",
      completedAt: "2025-01-01T00:00:00.000Z",
    })
    expect(result.success).toBe(true)
  })

  it("treats empty diagnosis string as undefined", () => {
    const result = patientPriorVisitSchema.safeParse({
      sessionId: "visit-1",
      completedAt: "2025-01-01T00:00:00.000Z",
      diagnosis: "",
      treatmentSummary: "",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.diagnosis).toBeUndefined()
      expect(result.data.treatmentSummary).toBeUndefined()
    }
  })

  it("rejects an empty sessionId", () => {
    const result = patientPriorVisitSchema.safeParse({
      sessionId: "",
      completedAt: "2025-01-01T00:00:00.000Z",
    })
    expect(result.success).toBe(false)
  })
})

describe("patientContextSchema", () => {
  it("accepts a valid patient context", () => {
    const result = patientContextSchema.safeParse({
      patient: validProfile(),
      chiefComplaint: "头痛",
      medicalHistory: ["手术史"],
      allergies: ["青霉素"],
      longTermMedications: ["降压药"],
      priorVisit: {
        sessionId: "visit-1",
        completedAt: "2025-01-01T00:00:00.000Z",
        diagnosis: "感冒",
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts a context without optional fields", () => {
    const result = patientContextSchema.safeParse({
      patient: validProfile(),
      medicalHistory: [],
      allergies: [],
      longTermMedications: [],
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing required patient field", () => {
    const result = patientContextSchema.safeParse({
      medicalHistory: [],
      allergies: [],
      longTermMedications: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing medicalHistory", () => {
    const result = patientContextSchema.safeParse({
      patient: validProfile(),
      allergies: [],
      longTermMedications: [],
    })
    expect(result.success).toBe(false)
  })
})

describe("verifyIdentityInputSchema", () => {
  it("accepts id_card credential type", () => {
    const result = verifyIdentityInputSchema.safeParse({
      credentialType: "id_card",
      credential: "110101199001011234",
      name: "张三",
    })
    expect(result.success).toBe(true)
  })

  it("accepts phone credential type", () => {
    const result = verifyIdentityInputSchema.safeParse({
      credentialType: "phone",
      credential: "13800138000",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a credential shorter than 4 characters", () => {
    const result = verifyIdentityInputSchema.safeParse({
      credentialType: "id_card",
      credential: "123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid credential type", () => {
    const result = verifyIdentityInputSchema.safeParse({
      credentialType: "email",
      credential: "test@example.com",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing credentialType", () => {
    expect(verifyIdentityInputSchema.safeParse({ credential: "1234" }).success).toBe(false)
  })
})

describe("verifyIdentityResultSchema", () => {
  it("accepts a valid result", () => {
    const result = verifyIdentityResultSchema.safeParse({
      patient: validProfile(),
      readableScopes: ["profile", "history", "allergies", "medications"],
      verifiedAt: "2025-01-01T00:00:00.000Z",
    })
    expect(result.success).toBe(true)
  })

  it("accepts an empty readableScopes array", () => {
    const result = verifyIdentityResultSchema.safeParse({
      patient: validProfile(),
      readableScopes: [],
      verifiedAt: "2025-01-01T00:00:00.000Z",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid scope value", () => {
    const result = verifyIdentityResultSchema.safeParse({
      patient: validProfile(),
      readableScopes: ["invalid_scope"],
      verifiedAt: "2025-01-01T00:00:00.000Z",
    })
    expect(result.success).toBe(false)
  })
})

describe("updatePatientProfileInputSchema", () => {
  it("accepts a full update input", () => {
    const result = updatePatientProfileInputSchema.safeParse({
      patientId: "patient-1",
      allergies: ["花粉"],
      chronicDiseases: ["糖尿病"],
      longTermMedications: ["胰岛素"],
      medicalHistory: ["手术史"],
    })
    expect(result.success).toBe(true)
  })

  it("accepts input with only patientId", () => {
    const result = updatePatientProfileInputSchema.safeParse({
      patientId: "patient-1",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing patientId", () => {
    expect(updatePatientProfileInputSchema.safeParse({ allergies: [] }).success).toBe(false)
  })

  it("rejects an empty string in allergies array", () => {
    const result = updatePatientProfileInputSchema.safeParse({
      patientId: "patient-1",
      allergies: [""],
    })
    expect(result.success).toBe(false)
  })
})

describe("parse / safeParse helpers", () => {
  it("parsePatientProfile returns parsed data on valid input", () => {
    const result = parsePatientProfile(validProfile())
    expect(result.id).toBe("patient-1")
  })

  it("parsePatientProfile throws on invalid input", () => {
    expect(() => parsePatientProfile({})).toThrow()
  })

  it("safeParsePatientProfile returns success true on valid input", () => {
    const result = safeParsePatientProfile(validProfile())
    expect(result.success).toBe(true)
  })

  it("safeParsePatientProfile returns success false on invalid input", () => {
    const result = safeParsePatientProfile({})
    expect(result.success).toBe(false)
  })

  it("parsePatientContext returns parsed data on valid input", () => {
    const result = parsePatientContext({
      patient: validProfile(),
      medicalHistory: [],
      allergies: [],
      longTermMedications: [],
    })
    expect(result.patient.name).toBe("张三")
  })

  it("parsePatientContext throws on invalid input", () => {
    expect(() => parsePatientContext({})).toThrow()
  })

  it("safeParsePatientContext returns success false on invalid input", () => {
    expect(safeParsePatientContext({}).success).toBe(false)
  })

  it("parseVerifyIdentityResult returns parsed data on valid input", () => {
    const result = parseVerifyIdentityResult({
      patient: validProfile(),
      readableScopes: ["profile"],
      verifiedAt: "2025-01-01T00:00:00.000Z",
    })
    expect(result.readableScopes).toContain("profile")
  })

  it("safeParseVerifyIdentityResult returns success false on invalid input", () => {
    expect(safeParseVerifyIdentityResult({}).success).toBe(false)
  })
})
