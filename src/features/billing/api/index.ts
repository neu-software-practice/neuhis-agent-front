import { getTransport } from "@/lib/api"
import { listBillingRecordsResultSchema } from "@/features/billing/api/schemas"

export const billingApi = {
  async listRecords() {
    const result = await getTransport().get("/billing/records")
    return listBillingRecordsResultSchema.parse(result)
  },
}

export * from "@/features/billing/api/schemas"
export * from "@/features/billing/api/types"
