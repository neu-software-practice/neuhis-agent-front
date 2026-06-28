import { mockDb } from "@/mocks/api/mock-db"

export function handleVerifyIdentity() {
  return mockDb.verifyIdentity()
}

export function handleGetPatientContext(patientId: string) {
  return mockDb.getPatientContext(patientId)
}

export function handleUpdatePatientProfile(body: unknown) {
  return mockDb.updatePatientProfile(body as Parameters<typeof mockDb.updatePatientProfile>[0])
}
