"use client"

import { useState, useEffect } from 'react'
import { formatDistanceToNow, format, isAfter, subHours } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertCircle, CheckCircle, RefreshCw, Database } from 'lucide-react'

type FreshnessStatus = 'fresh' | 'stale' | 'error' | 'updating'

interface DataSourceInfo {
  name: string
  lastUpdated: Date
  updateFrequency: string
  status: FreshnessStatus
  recordCount?: number
}

interface DataFreshnessProps {
  sources: DataSourceInfo[]
  className?: string
}

function getStatusColor(status: FreshnessStatus) {
  switch (status) {
    case 'fresh':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
    case 'stale':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
    case 'error':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
    case 'updating':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }
}

function getStatusIcon(status: FreshnessStatus) {
  switch (status) {
    case 'fresh':
      return CheckCircle
    case 'stale':
      return Clock
    case 'error':
      return AlertCircle
    case 'updating':
      return RefreshCw
    default:
      return Database
  }
}

export function DataFreshness({ sources, className }: DataFreshnessProps) {
  const [, setTick] = useState(0)

  // Update every minute to refresh relative times
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  // Determine overall status
  const overallStatus: FreshnessStatus = sources.some(s => s.status === 'error')
    ? 'error'
    : sources.some(s => s.status === 'updating')
    ? 'updating'
    : sources.some(s => s.status === 'stale')
    ? 'stale'
    : 'fresh'

  const StatusIcon = getStatusIcon(overallStatus)
  const oldestUpdate = sources.reduce((oldest, source) =>
    !oldest || source.lastUpdated < oldest ? source.lastUpdated : oldest
  , null as Date | null)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5 cursor-help',
              getStatusColor(overallStatus),
              className
            )}
          >
            <StatusIcon className={cn(
              'h-3 w-3',
              overallStatus === 'updating' && 'animate-spin'
            )} />
            {oldestUpdate && (
              <span className="text-xs">
                {formatDistanceToNow(oldestUpdate, { addSuffix: true })}
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="w-80" side="bottom" align="end">
          <div className="space-y-3">
            <div className="font-medium">Data Sources</div>
            <div className="space-y-2">
              {sources.map((source) => {
                const SourceIcon = getStatusIcon(source.status)
                return (
                  <div
                    key={source.name}
                    className="flex items-start justify-between gap-4 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <SourceIcon className={cn(
                        'h-3.5 w-3.5 flex-shrink-0',
                        source.status === 'fresh' && 'text-green-500',
                        source.status === 'stale' && 'text-yellow-500',
                        source.status === 'error' && 'text-red-500',
                        source.status === 'updating' && 'text-blue-500 animate-spin'
                      )} />
                      <span>{source.name}</span>
                    </div>
                    <div className="text-right text-muted-foreground">
                      <div>{format(source.lastUpdated, 'MMM d, h:mm a')}</div>
                      <div className="text-xs">{source.updateFrequency}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Simple inline version
interface DataFreshnessInlineProps {
  lastUpdated: Date
  updateFrequency?: string
  className?: string
}

export function DataFreshnessInline({
  lastUpdated,
  updateFrequency,
  className,
}: DataFreshnessInlineProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  const isFresh = isAfter(lastUpdated, subHours(new Date(), 1))

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <Clock className={cn('h-3 w-3', isFresh ? 'text-green-500' : 'text-yellow-500')} />
      <span>
        Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
        {updateFrequency && ` (${updateFrequency})`}
      </span>
    </div>
  )
}
