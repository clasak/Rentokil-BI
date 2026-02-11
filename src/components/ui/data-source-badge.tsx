'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Database, Server, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DataSourceStatus = 'mock' | 'bigquery' | 'loading' | 'error'

interface DataSourceBadgeProps {
  status: DataSourceStatus
  responseTime?: number
  timestamp?: string
  className?: string
  showLabel?: boolean
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function DataSourceBadge({
  status,
  responseTime,
  timestamp,
  className,
  showLabel = true,
}: DataSourceBadgeProps) {

  const configs: Record<DataSourceStatus, {
    icon: React.ReactNode
    label: string
    variant: 'default' | 'secondary' | 'outline' | 'destructive'
    className: string
  }> = {
    mock: {
      icon: <Database className="h-3 w-3" />,
      label: 'Demo Data',
      variant: 'secondary',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    },
    bigquery: {
      icon: <Server className="h-3 w-3" />,
      label: responseTime
        ? `Live (${responseTime}ms)${timestamp ? ` \u00B7 ${formatTimestamp(timestamp)}` : ''}`
        : 'Live Data',
      variant: 'default',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    },
    loading: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: 'Loading...',
      variant: 'outline',
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    },
    error: {
      icon: <AlertCircle className="h-3 w-3" />,
      label: 'Fallback',
      variant: 'destructive',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    },
  }

  const config = configs[status]

  const getTooltipText = () => {
    switch (status) {
      case 'bigquery':
        return responseTime
          ? `Query executed in ${responseTime}ms from BigQuery production database${timestamp ? ` at ${timestamp}` : ''}`
          : 'Data fetched from BigQuery production database'
      case 'mock':
        return 'Using demo/mock data for development or offline mode'
      case 'loading':
        return 'Fetching data from data source...'
      case 'error':
        return 'Primary data source unavailable, using cached or fallback data'
      default:
        return config.label
    }
  }

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-normal text-xs',
        config.className,
        className
      )}
    >
      {config.icon}
      {showLabel && <span suppressHydrationWarning>{config.label}</span>}
    </Badge>
  )

  // Wrap in tooltip for better context
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
