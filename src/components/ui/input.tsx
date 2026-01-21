import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles with mobile-first sizing
          "flex w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background",
          // Height: 48px on mobile (touch-friendly), 40px on desktop
          "h-12 sm:h-10",
          // Font size: 16px prevents iOS zoom on focus, sm on desktop
          "text-[16px] sm:text-sm",
          // File input styles
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          // Placeholder and focus styles
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Touch optimization
          "touch-manipulation",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
