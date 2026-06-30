import { getTransport } from "@/lib/api"
import { listMedicalOrdersResultSchema } from "@/features/medical-orders/api/schemas"

export const medicalOrdersApi = {
  async listRecords() {
    const result = await getTransport().get("/medical-orders")
    return listMedicalOrdersResultSchema.parse(result)
  },
}

export * from "@/features/medical-orders/api/schemas"
export * from "@/features/medical-orders/api/types"
