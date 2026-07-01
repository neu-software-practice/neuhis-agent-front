import { mockDb } from "@/mocks/api/mock-db"
import { mockPatient } from "@/mocks/api/fixtures/patient"

export function handleListMedicalOrders() {
  return mockDb.listMedicalOrders(mockPatient.id)
}
