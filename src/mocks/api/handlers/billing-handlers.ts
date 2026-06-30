import { mockDb } from "@/mocks/api/mock-db"

export function handleListBillingRecords() {
  return mockDb.listBillingRecords()
}
