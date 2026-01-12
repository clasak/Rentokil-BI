"use client"

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>
  /** Content to wrap */
  children: ReactNode
  /** Disable pull-to-refresh */
  disabled?: boolean
  /** Custom loading indicator */
  loadingIndicator?: ReactNode
  /** Pull threshold in pixels before refresh triggers */
  threshold?: number
  /** Maximum pull distance in pixels */
  maxPull?: number
  /** Additional class name */
  className?: string
}

/**
 * Pull-to-refresh component for mobile touch gestures
 *
 * Features:
 * - Natural pull-down gesture to refresh
 * - Visual feedback during pull
 * - Loading spinner during refresh
 * - Only activates when scrolled to top
 */
export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  loadingIndicator,
  threshold = 80,
  maxPull = 120,
  className,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [startY, setStartY] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Progress towards threshold (0-1)
  const progress = Math.min(pullDistance / threshold, 1)

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return

    // Only allow pull when at top of scroll
    if (containerRef.current && containerRef.current.scrollTop !== 0) return

    setStartY(e.touches[0].clientY)
    setIsPulling(true)
  }, [disabled, isRefreshing])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || startY === 0) return

    const currentY = e.touches[0].clientY
    const diff = currentY - startY

    if (diff > 0) {
      // Apply resistance to pull (gets harder as you pull further)
      const resistance = 0.5
      const adjustedDiff = Math.min(diff * resistance, maxPull)
      setPullDistance(adjustedDiff)

      // Prevent scroll while pulling
      if (adjustedDiff > 10) {
        e.preventDefault()
      }
    }
  }, [isPulling, startY, maxPull])

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return

    setIsPulling(false)

    if (pullDistance >= threshold && !isRefreshing) {
      // Trigger refresh
      setIsRefreshing(true)
      setPullDistance(60) // Hold at refresh position

      try {
        await onRefresh()
      } catch (error) {
        console.error('[PullToRefresh] Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      // Reset without refresh
      setPullDistance(0)
    }

    setStartY(0)
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh])

  // Set up touch event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto h-full", className)}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-0 right-0 flex justify-center items-center pointer-events-none",
          "transition-opacity duration-200",
          pullDistance > 0 || isRefreshing ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: Math.max(pullDistance, isRefreshing ? 60 : 0),
          top: 0,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center",
            "w-10 h-10 rounded-full",
            "bg-white dark:bg-gray-800",
            "shadow-lg border border-gray-200 dark:border-gray-700",
            isRefreshing && "animate-pulse"
          )}
          style={{
            transform: isRefreshing
              ? 'none'
              : `rotate(${progress * 360}deg) scale(${0.5 + progress * 0.5})`,
            transition: isPulling ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {loadingIndicator || (
            <RefreshCw
              className={cn(
                "h-5 w-5",
                isRefreshing
                  ? "animate-spin text-primary"
                  : progress >= 1
                    ? "text-primary"
                    : "text-gray-400 dark:text-gray-500"
              )}
            />
          )}
        </div>

        {/* "Release to refresh" hint */}
        {!isRefreshing && progress >= 1 && (
          <span className="absolute top-full mt-1 text-xs text-gray-500 dark:text-gray-400">
            Release to refresh
          </span>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
