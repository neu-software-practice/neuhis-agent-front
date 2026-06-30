import { useEffect, useState } from "react"

/** md 断点（768px），与 Tailwind 的 md: 一致。 */
const MD_BREAKPOINT = "(min-width: 768px)"

/**
 * 返回当前视口是否为桌面（≥768px）。
 *
 * 服务端安全：SSR/首帧返回 false（移动端优先），
 * 客户端 hydration 后同步为真实值。
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(MD_BREAKPOINT).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(MD_BREAKPOINT)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  return isDesktop
}
