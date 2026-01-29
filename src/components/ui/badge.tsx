import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:shadow-[0_0_10px_rgba(228,0,43,0.35)] dark:hover:shadow-[0_0_12px_rgba(228,0,43,0.55)] transition-shadow duration-200",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:shadow-[0_0_10px_rgba(100,116,139,0.25)] dark:hover:shadow-[0_0_12px_rgba(148,163,184,0.3)] transition-shadow duration-200",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow-[0_0_10px_rgba(239,68,68,0.4)] dark:shadow-[0_0_12px_rgba(239,68,68,0.55)]",
        outline: "text-foreground hover:shadow-[0_0_10px_rgba(100,116,139,0.25)] dark:hover:shadow-[0_0_12px_rgba(148,163,184,0.3)] transition-shadow duration-200",
        // GREEN: Hover only
        success: "border-transparent bg-green-100 text-green-800 hover:bg-green-200 hover:shadow-[0_0_10px_rgba(34,197,94,0.4)] dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/30 dark:hover:shadow-[0_0_12px_rgba(34,197,94,0.55)] transition-shadow duration-200",
        // YELLOW: Pulsing animation
        warning: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 animate-pulse-warning-badge",
        // RED: Constant glow (always on)
        danger: "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.4)] dark:shadow-[0_0_14px_rgba(239,68,68,0.6)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
    )
  }
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
