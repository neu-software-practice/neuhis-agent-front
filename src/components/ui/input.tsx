import { forwardRef, type InputHTMLAttributes } from "react"
import { Input as HeroInput } from "@heroui/react"

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <HeroInput
      ref={ref}
      variant="primary"
      className={className}
      style={{
        backgroundColor: "#f3f3f3",
        "--field-placeholder": "#999",
      } as React.CSSProperties}
      {...props}
    />
  )
})

Input.displayName = "Input"
