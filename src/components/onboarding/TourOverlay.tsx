'use client'

import { useEffect, useState, useCallback } from 'react'

interface TourOverlayProps {
  targetSelector: string | null
  isVisible: boolean
  onClick?: () => void
}

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

const SPOTLIGHT_PADDING = 8

export function TourOverlay({ targetSelector, isVisible, onClick }: TourOverlayProps) {
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)

  const updateSpotlightPosition = useCallback(() => {
    if (!targetSelector) {
      setSpotlightRect(null)
      return
    }

    const targetElement = document.querySelector(targetSelector)
    if (!targetElement) {
      setSpotlightRect(null)
      return
    }

    const rect = targetElement.getBoundingClientRect()
    setSpotlightRect({
      top: rect.top - SPOTLIGHT_PADDING,
      left: rect.left - SPOTLIGHT_PADDING,
      width: rect.width + SPOTLIGHT_PADDING * 2,
      height: rect.height + SPOTLIGHT_PADDING * 2,
    })
  }, [targetSelector])

  useEffect(() => {
    if (!isVisible) {
      setSpotlightRect(null)
      return
    }

    // Initial position update with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateSpotlightPosition, 50)

    // Handle window resize
    window.addEventListener('resize', updateSpotlightPosition)
    window.addEventListener('scroll', updateSpotlightPosition, true)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateSpotlightPosition)
      window.removeEventListener('scroll', updateSpotlightPosition, true)
    }
  }, [isVisible, updateSpotlightPosition])

  // Don't render if not visible or no spotlight target (for welcome/finish steps)
  if (!isVisible || !spotlightRect) {
    return null
  }

  // Generate clip-path polygon that creates the spotlight hole
  // The polygon draws the outer rectangle, then cuts out the inner spotlight area
  const { top, left, width, height } = spotlightRect
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0

  // Clip path that creates a hole in the overlay
  // Uses the "evenodd" fill rule with an outer path and inner cutout
  const clipPath = `polygon(
    0% 0%,
    0% 100%,
    ${left}px 100%,
    ${left}px ${top}px,
    ${left + width}px ${top}px,
    ${left + width}px ${top + height}px,
    ${left}px ${top + height}px,
    ${left}px 100%,
    100% 100%,
    100% 0%
  )`

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto"
      onClick={onClick}
      aria-hidden="true"
    >
      {/* Dark overlay with spotlight cutout */}
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/70 transition-all duration-200"
        style={{ clipPath }}
      />

      {/* Spotlight border highlight */}
      <div
        className="absolute rounded-lg border-2 border-blue-400 dark:border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.3)] dark:shadow-[0_0_0_4px_rgba(59,130,246,0.4)] pointer-events-none transition-all duration-200"
        style={{
          top: `${top}px`,
          left: `${left}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
      />
    </div>
  )
}
