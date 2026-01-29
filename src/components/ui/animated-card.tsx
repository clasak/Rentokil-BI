"use client"

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import React from 'react'

interface AnimatedCardProps extends React.ComponentProps<typeof Card> {
  /** Enable hover lift effect */
  hoverLift?: boolean
  /** Enable bounce-in animation on mount */
  bounceIn?: boolean
  /** Delay for bounce-in animation (ms) */
  animationDelay?: number
}

/**
 * Card with micro-interactions:
 * - Hover lift effect with shadow
 * - Bounce-in animation on mount
 * - Smooth transitions
 */
export function AnimatedCard({
  children,
  className,
  hoverLift = true,
  bounceIn = false,
  animationDelay = 0,
  ...props
}: AnimatedCardProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-300',
        hoverLift && 'hover:scale-[1.02] hover:shadow-lg hover:-translate-y-1',
        bounceIn && 'animate-bounce-in',
        className
      )}
      style={{
        animationDelay: bounceIn ? `${animationDelay}ms` : undefined,
      }}
      {...props}
    >
      {children}
    </Card>
  )
}
