"use client"

import { useState, useRef, useEffect, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Maximize2, Minimize2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobileChartWrapperProps {
  /** Chart content (ResponsiveContainer from Recharts) */
  children: ReactNode
  /** Optional chart title */
  title?: string
  /** Desktop height in pixels */
  height?: number
  /** Mobile height in pixels */
  mobileHeight?: number
  /** Enable fullscreen on mobile */
  fullscreenOnMobile?: boolean
  /** Alternative to fixed height - aspect ratio (e.g., 16/9) */
  aspectRatio?: number
  /** Additional class name */
  className?: string
}

/**
 * Mobile-optimized chart wrapper with fullscreen support
 *
 * Features:
 * - Responsive height (different for mobile/desktop)
 * - Fullscreen mode for mobile devices
 * - Proper chart styling rules preserved (no gray hover, dark mode grid)
 * - Touch-friendly controls
 */
export function MobileChartWrapper({
  children,
  title,
  height = 300,
  mobileHeight = 200,
  fullscreenOnMobile = true,
  aspectRatio,
  className,
}: MobileChartWrapperProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isFullscreen])

  // Lock scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isFullscreen])

  // Calculate chart height
  const getChartHeight = () => {
    if (isFullscreen) {
      return 'calc(100vh - 140px)' // Account for header and padding
    }
    if (aspectRatio) {
      return undefined // Let aspect ratio control height
    }
    return isMobile ? mobileHeight : height
  }

  const chartHeight = getChartHeight()

  // Chart container classes with proper grid line theming
  const chartContainerClasses = cn(
    // Chart styling rules from CLAUDE.md
    "[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200",
    "dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700",
    "[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200",
    "dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700",
    "[&_.recharts-text]:fill-gray-600",
    "dark:[&_.recharts-text]:fill-gray-400",
    className
  )

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "fixed inset-0 z-50 bg-white dark:bg-gray-900",
          "flex flex-col",
          "p-4 pt-safe pb-safe",
          chartContainerClasses
        )}
      >
        {/* Fullscreen header */}
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(false)}
            className="ml-auto"
            aria-label="Exit fullscreen"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Chart container */}
        <div
          className="flex-1"
          style={{ height: chartHeight }}
        >
          {children}
        </div>

        {/* Fullscreen footer */}
        <div className="flex justify-center mt-4 pt-4 border-t dark:border-gray-700">
          <Button
            variant="outline"
            onClick={() => setIsFullscreen(false)}
            className="gap-2"
          >
            <Minimize2 className="h-4 w-4" />
            Exit Fullscreen
          </Button>
        </div>
      </div>
    )
  }

  // Normal mode
  return (
    <div
      ref={containerRef}
      className={chartContainerClasses}
    >
      {/* Header with title and fullscreen toggle */}
      {(title || (fullscreenOnMobile && isMobile)) && (
        <div className="flex items-center justify-between mb-2">
          {title && (
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {title}
            </h3>
          )}
          {fullscreenOnMobile && isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto -mr-2 h-8 w-8 p-0"
              onClick={() => setIsFullscreen(true)}
              aria-label="Enter fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Chart container */}
      <div
        className="relative"
        style={{
          height: typeof chartHeight === 'number' ? `${chartHeight}px` : chartHeight,
          aspectRatio: !isFullscreen && aspectRatio ? `${aspectRatio}` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
