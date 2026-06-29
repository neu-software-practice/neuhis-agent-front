import { z } from "zod"

import { patientIdSchema } from "@/lib/api/types"

export const genderSchema = z.enum(["male", "female", "other", "unknown"])

export const patientProfileSchema = z.object({
  id: patientIdSchema,
  name: z.string().trim().min(1),
  gender: genderSchema,
  age: z.number().int().min(0).max(130),
  phoneMasked: z.string().optional(),
  idCardMasked: z.string().optional(),
  allergies: z.array(z.string().trim().min(1)),
  chronicDiseases: z.array(z.string().trim().min(1)),
  longTermMedications: z.array(z.string().trim().min(1)),
  updatedAt: z.string().datetime(),
})

export const patientPriorVisitSchema = z.object({
  sessionId: z.string().trim().min(1),
  completedAt: z.string().datetime(),
  diagnosis: z.string().trim().min(1),
  labResultSummary: z.string().optional(),
  treatmentSummary: z.string().trim().min(1),
})

export const patientContextSchema = z.object({
  patient: patientProfileSchema,
  chiefComplaint: z.string().optional(),
  medicalHistory: z.array(z.string().trim().min(1)),
  allergies: z.array(z.string().trim().min(1)),
  longTermMedications: z.array(z.string().trim().min(1)),
  priorVisit: patientPriorVisitSchema.optional(),
})

export const verifyIdentityInputSchema = z.object({
  credentialType: z.enum(["id_card", "phone"]),
  credential: z.string().trim().min(4),
  name: z.string().trim().min(1).optional(),
})

export const verifyIdentityResultSchema = z.object({
  patient: patientProfileSchema,
  readableScopes: z.array(
    z.enum(["profile", "history", "allergies", "medications"]),
  ),
  verifiedAt: z.string().datetime(),
})

export const updatePatientProfileInputSchema = z.object({
  patientId: patientIdSchema,
  allergies: z.array(z.string().trim().min(1)).optional(),
  chronicDiseases: z.array(z.string().trim().min(1)).optional(),
  longTermMedications: z.array(z.string().trim().min(1)).optional(),
  medicalHistory: z.array(z.string().trim().min(1)).optional(),
})

export function parsePatientProfile(value: unknown) {
  return patientProfileSchema.parse(value)
}

export function safeParsePatientProfile(value: unknown) {
  return patientProfileSchema.safeParse(value)
}

export function parsePatientContext(value: unknown) {
  return patientContextSchema.parse(value)
}

export function safeParsePatientContext(value: unknown) {
  return patientContextSchema.safeParse(value)
}

export function parseVerifyIdentityResult(value: unknown) {
  return verifyIdentityResultSchema.parse(value)
}

export function safeParseVerifyIdentityResult(value: unknown) {
  return verifyIdentityResultSchema.safeParse(value)
}
