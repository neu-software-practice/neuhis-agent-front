import { billingApi } from "@/features/billing/api"
import { medicalOrdersApi } from "@/features/medical-orders/api"
import { patientApi } from "@/features/patient/api"
import { visitsApi } from "@/features/visits/api"
import { workbenchApi } from "@/features/workbench/api"

export const api = {
  billing: billingApi,
  medicalOrders: medicalOrdersApi,
  patient: patientApi,
  visits: visitsApi,
  workbench: workbenchApi,
}
