"use client"

import { useEffect, useRef, useState } from 'react'

interface UseAnimatedNumberOptions {
  duration?: number // Animation duration in ms
  decimals?: number // Number of decimal places
  enabled?: boolean // Enable/disable animation
}

/**
 * Hook to animate numbers with a counting up effect
 * Perfect for KPI values, revenue, and metrics
 *
 * @example
 * const displayValue = useAnimatedNumber(42500, { duration: 1000, decimals: 0 })
 * return <div>${displayValue}</div>
 */
export function useAnimatedNumber(
  value: number,
  options: UseAnimatedNumberOptions = {}
): number {
  const {
    duration = 1000,
    decimals = 0,
    enabled = true,
  } = options

  const [mounted, setMounted] = useState(false)
  const [displayValue, setDisplayValue] = useState(value) // Start with actual value to avoid hydration mismatch
  const prevValueRef = useRef(value)
  const frameRef = useRef<number>()
  const startTimeRef = useRef<number>()

  // Set mounted state after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!enabled || !mounted) {
      setDisplayValue(value)
      return
    }

    // If value hasn't changed, don't animate
    if (value === prevValueRef.current) {
      return
    }

    const startValue = prevValueRef.current
    const endValue = value
    const diff = endValue - startValue

    // If difference is very small, just set it
    if (Math.abs(diff) < 0.01) {
      setDisplayValue(value)
      prevValueRef.current = value
      return
    }

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime
      }

      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3)

      const current = startValue + diff * easeOut
      setDisplayValue(current)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(endValue)
        prevValueRef.current = endValue
        startTimeRef.current = undefined
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [value, duration, enabled, mounted])

  // Round to specified decimals
  return Math.round(displayValue * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

/**
 * Format animated number with locale and options
 */
export function useAnimatedNumberFormatted(
  value: number,
  options: UseAnimatedNumberOptions & {
    formatter?: (value: number) => string
  } = {}
): string {
  const { formatter, ...animationOptions } = options
  const animatedValue = useAnimatedNumber(value, animationOptions)

  if (formatter) {
    return formatter(animatedValue)
  }

  return animatedValue.toLocaleString('en-US', {
    minimumFractionDigits: options.decimals || 0,
    maximumFractionDigits: options.decimals || 0,
  })
}
