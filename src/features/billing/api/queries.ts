import { queryOptions } from "@tanstack/react-query"

import { billingApi } from "@/features/billing/api"

export const billingQueryKeys = {
  all: ["billing"] as const,
  list: () => [...billingQueryKeys.all, "list"] as const,
}

export const billingQueries = {
  list: () =>
    queryOptions({
      queryKey: billingQueryKeys.list(),
      queryFn: () => billingApi.listRecords(),
    }),
}
