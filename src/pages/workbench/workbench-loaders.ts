import type { LoaderFunctionArgs } from "react-router"
import { redirect } from "react-router"

/**
 * 工作台路由 loader 集合。
 *
 * P1 阶段只做路由级参数解析与轻量校验，不预取业务数据、不推进任何状态机。
 * 后续阶段可在此通过 queryClient.ensureQueryData 预取轻量上下文。
 */

/** 简单的 sessionId 形态校验：非空、无空白。后续可按真实 ID 规则收紧。 */
function isValidSessionId(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0 && !/\s/.test(value)
}

export interface NewWorkbenchLoaderData {
  /** 首页带入的症状草稿，可为空。 */
  draft: string | null
  /** 复诊来源 sessionId，可为空。 */
  followUpFrom: string | null
}

export function newWorkbenchLoader({
  request,
}: LoaderFunctionArgs): NewWorkbenchLoaderData {
  const url = new URL(request.url)
  return {
    draft: url.searchParams.get("draft"),
    followUpFrom: url.searchParams.get("followUpFrom"),
  }
}

export interface WorkbenchLoaderData {
  sessionId: string
}

export function workbenchLoader({
  params,
}: LoaderFunctionArgs): WorkbenchLoaderData {
  if (!isValidSessionId(params.sessionId)) {
    throw redirect("/")
  }
  return { sessionId: params.sessionId }
}

export interface ReadonlyVisitLoaderData {
  sessionId: string
}

export function readonlyVisitLoader({
  params,
}: LoaderFunctionArgs): ReadonlyVisitLoaderData {
  if (!isValidSessionId(params.sessionId)) {
    throw redirect("/history")
  }
  return { sessionId: params.sessionId }
}
