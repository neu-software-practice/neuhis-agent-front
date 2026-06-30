import { mockDb } from "@/mocks/api/mock-db"

export function handleListMedicalOrders() {
  return mockDb.listMedicalOrders()
}
