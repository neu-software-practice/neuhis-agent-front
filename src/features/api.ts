import { patientApi } from "@/features/patient/api"
import { visitsApi } from "@/features/visits/api"
import { workbenchApi } from "@/features/workbench/api"

export const api = {
  patient: patientApi,
  visits: visitsApi,
  workbench: workbenchApi,
}
