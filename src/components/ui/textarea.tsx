import { forwardRef, type TextareaHTMLAttributes } from "react"
import { TextArea as HeroTextArea } from "@heroui/react"

import { cn } from "@/lib/utils"

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <HeroTextArea
      ref={ref}
      variant="primary"
      className={cn("block w-full", className)}
      style={{
        backgroundColor: "#f3f3f3",
        "--field-placeholder": "#999",
      } as React.CSSProperties}
      {...props}
    />
  )
})

Textarea.displayName = "Textarea"
