import { mockDb } from "@/mocks/api/mock-db"
import { mockPatient } from "@/mocks/api/fixtures/patient"

export function handleListBillingRecords() {
  return mockDb.listBillingRecords(mockPatient.id)
}
