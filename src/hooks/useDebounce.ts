import { useState, useEffect } from "react"

/**
 * 对值进行防抖，在指定延迟后才更新返回值。
 *
 * @param value - 需要防抖的值
 * @param delay - 延迟毫秒数
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
