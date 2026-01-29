"use client"

import { useState, useRef, MouseEvent, forwardRef } from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Ripple {
  x: number
  y: number
  size: number
  id: number
}

/**
 * Button component with ripple effect on click
 * Adds material design-style ripple animation for tactile feedback
 */
export const RippleButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, onClick, ...props }, forwardedRef) => {
    const [ripples, setRipples] = useState<Ripple[]>([])
    const internalRef = useRef<HTMLButtonElement>(null)
    const buttonRef = (forwardedRef as React.RefObject<HTMLButtonElement>) || internalRef
    const nextId = useRef(0)

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      const button = buttonRef.current || (forwardedRef as any)?.current
      if (!button) return

      const rect = button.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      const newRipple: Ripple = {
        x,
        y,
        size,
        id: nextId.current++,
      }

      setRipples((prev) => [...prev, newRipple])

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
      }, 600)

      // Call original onClick
      onClick?.(e)
    }

    return (
      <Button
        ref={forwardedRef}
        className={cn('relative overflow-hidden', className)}
        onClick={handleClick}
        {...props}
      >
        {children}

        {/* Ripple effects */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 dark:bg-white/20 animate-ripple pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}
      </Button>
    )
  }
)

RippleButton.displayName = 'RippleButton'
