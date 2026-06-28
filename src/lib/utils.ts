import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 穷尽检查工具：用于 discriminated union 的 switch 分发兜底。
 * 当 union 新增成员而分发未覆盖时，TypeScript 会在编译期报错。
 */
export function assertNever(value: never, message?: string): never {
  throw new Error(
    message ?? `Unexpected value reached assertNever: ${JSON.stringify(value)}`,
  )
}
