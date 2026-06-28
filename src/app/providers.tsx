import type { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

import { queryClient } from "@/lib/query-client"

/**
 * 应用级 Provider 聚合。
 *
 * 仅注入 TanStack Query 与开发态 devtools。
 * 遵循 HeroUI 3 约定，不添加 HeroUIProvider。
 * 不在此处创建任何业务 store。
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}
