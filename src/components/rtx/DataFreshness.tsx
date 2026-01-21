'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { RefreshCw, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type FreshnessStatus = 'fresh' | 'stale' | 'error' | 'unknown'

export interface DataFreshnessProps {
  /** Timestamp when data was last updated */
  lastUpdated?: Date | string | null
  /** Callback when refresh button is clicked */
  onRefresh?: () => void | Promise<void>
  /** Whether a refresh is currently in progress */
  isRefreshing?: boolean
  /** Current freshness status */
  status?: FreshnessStatus
  /** Threshold in minutes after which data is considered stale */
  staleThresholdMinutes?: number
  /** Whether to show the refresh button */
  showRefreshButton?: boolean
  /** Whether to show the status icon */
  showStatusIcon?: boolean
  /** Custom label prefix */
  labelPrefix?: string
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: 'sm' | 'default' | 'lg'
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) {
    return 'just now'
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function determineStatus(
  lastUpdated: Date | null,
  staleThresholdMinutes: number,
  explicitStatus?: FreshnessStatus
): FreshnessStatus {
  if (explicitStatus) return explicitStatus
  if (!lastUpdated) return 'unknown'

  const now = new Date()
  const diffMs = now.getTime() - lastUpdated.getTime()
  const diffMins = Math.floor(diffMs / 1000 / 60)

  return diffMins > staleThresholdMinutes ? 'stale' : 'fresh'
}

export default function DataFreshness({
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  status: explicitStatus,
  staleThresholdMinutes = 15,
  showRefreshButton = true,
  showStatusIcon = true,
  labelPrefix = 'Updated',
  className,
  size = 'default',
}: DataFreshnessProps) {
  const [mounted, setMounted] = useState(false)
  const [timeAgo, setTimeAgo] = useState<string>('')

  const parsedDate = React.useMemo(() => {
    if (!lastUpdated) return null
    if (lastUpdated instanceof Date) return lastUpdated
    return new Date(lastUpdated)
  }, [lastUpdated])

  const status = determineStatus(parsedDate, staleThresholdMinutes, explicitStatus)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!parsedDate || !mounted) return

    const updateTimeAgo = () => {
      setTimeAgo(formatTimeAgo(parsedDate))
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [parsedDate, mounted])

  const statusConfig = {
    fresh: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    stale: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    unknown: {
      icon: <Clock className="h-3.5 w-3.5" />,
      color: 'text-gray-500 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
    },
  }

  const config = statusConfig[status]

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    default: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  }

  if (!mounted) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-md',
          sizeClasses[size],
          'bg-gray-50 dark:bg-gray-800',
          className
        )}
      >
        <Clock className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-md',
        sizeClasses[size],
        config.bgColor,
        className
      )}
    >
      {showStatusIcon && (
        <span className={config.color}>{config.icon}</span>
      )}

      <span className="text-gray-700 dark:text-gray-300">
        {parsedDate ? (
          <>
            <span className="text-gray-500 dark:text-gray-400">{labelPrefix}</span>{' '}
            <span title={formatTimestamp(parsedDate)}>{timeAgo}</span>
          </>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">No data available</span>
        )}
      </span>

      {showRefreshButton && onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            'h-6 w-6 p-0 ml-1',
            'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          )}
          title="Refresh data"
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
          />
        </Button>
      )}
    </div>
  )
}
