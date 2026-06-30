import { queryOptions } from "@tanstack/react-query"

import { medicalOrdersApi } from "@/features/medical-orders/api"

export const medicalOrderQueryKeys = {
  all: ["medical-orders"] as const,
  list: () => [...medicalOrderQueryKeys.all, "list"] as const,
}

export const medicalOrderQueries = {
  list: () =>
    queryOptions({
      queryKey: medicalOrderQueryKeys.list(),
      queryFn: () => medicalOrdersApi.listRecords(),
    }),
}
