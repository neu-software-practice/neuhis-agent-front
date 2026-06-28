import { QueryClient } from "@tanstack/react-query"

/**
 * 全局 QueryClient 单例。
 *
 * 由 AppProviders 注入。业务 hook 通过 TanStack Query 读取服务端数据，
 * 不在此处定义任何业务 query key 或 fixtures。
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 患者端以读多写少为主，给一个温和的默认 staleTime，减少重复请求。
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
