import { isRouteErrorResponse, useRouteError } from "react-router"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/shared/components/EmptyState"
import { PageShell } from "@/features/shared/components/PageShell"

/**
 * 路由级错误边界。
 *
 * 捕获 loader / 渲染错误，向患者展示可理解的兜底页与返回首页入口，
 * 不暴露原始错误堆栈或内部状态名。
 */
export function AppErrorBoundary() {
  const error = useRouteError()

  let title = "页面出了点问题"
  let description = "请稍后重试，或返回首页重新开始。"

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "找不到这个页面"
      description = "链接可能已失效，返回首页继续使用。"
    }
  }

  return (
    <PageShell>
      <EmptyState
        title={title}
        description={description}
        action={
          <Button asChild>
            <a href="/">返回首页</a>
          </Button>
        }
      />
    </PageShell>
  )
}
