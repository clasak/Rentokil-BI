'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Clock, CheckCircle2, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DataFreshnessIndicatorProps {
  className?: string
}

interface FreshnessData {
  lastSaleDate: string
  hoursOld: number
  dataAsOf: string
  isStale: boolean
}

export function DataFreshnessIndicator({ className }: DataFreshnessIndicatorProps) {
  const [freshness, setFreshness] = useState<FreshnessData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFreshness = async () => {
      try {
        const response = await fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'sales-tracker-data-freshness', filters: {} }),
        })

        if (!response.ok) {
          console.error('Failed to fetch data freshness')
          setLoading(false)
          return
        }

        const result = await response.json()
        if (result.success && result.data) {
          setFreshness(result.data)
        }
      } catch (error) {
        console.error('Error fetching data freshness:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFreshness()
    // Refresh every 5 minutes
    const interval = setInterval(fetchFreshness, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Alert className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400 animate-pulse" />
        <AlertDescription className="text-gray-900 dark:text-gray-100">
          Checking data freshness...
        </AlertDescription>
      </Alert>
    )
  }

  if (!freshness) {
    return null
  }

  const formatHours = (hours: number) => {
    if (hours < 1) return 'less than 1 hour'
    if (hours === 1) return '1 hour'
    if (hours < 24) return `${Math.floor(hours)} hours`
    const days = Math.floor(hours / 24)
    const remainingHours = Math.floor(hours % 24)
    if (remainingHours === 0) return `${days} day${days > 1 ? 's' : ''}`
    return `${days} day${days > 1 ? 's' : ''}, ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`
  }

  // Determine alert variant based on staleness
  const getAlertConfig = () => {
    if (freshness.hoursOld > 24) {
      return {
        variant: 'destructive' as const,
        icon: AlertCircle,
        bgClass: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
        iconClass: 'text-red-600 dark:text-red-400',
        textClass: 'text-red-900 dark:text-red-100',
      }
    } else if (freshness.isStale) {
      return {
        variant: 'default' as const,
        icon: Clock,
        bgClass: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
        iconClass: 'text-amber-600 dark:text-amber-400',
        textClass: 'text-amber-900 dark:text-amber-100',
      }
    } else {
      return {
        variant: 'default' as const,
        icon: CheckCircle2,
        bgClass: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
        iconClass: 'text-green-600 dark:text-green-400',
        textClass: 'text-green-900 dark:text-green-100',
      }
    }
  }

  const config = getAlertConfig()
  const Icon = config.icon

  return (
    <Alert className={`${config.bgClass} ${className}`}>
      <Icon className={`h-4 w-4 ${config.iconClass}`} />
      <AlertDescription className={config.textClass}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <span className="font-medium">
              {freshness.isStale ? 'Data Sync Delay' : 'Data Up-to-Date'}
            </span>
            <span className="ml-2">
              Last sale in database: <strong>{freshness.lastSaleDate}</strong>
            </span>
            <span className="ml-2 text-sm opacity-90">
              ({formatHours(freshness.hoursOld)} ago)
            </span>
          </div>
          {freshness.isStale && (
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-3 w-3" />
              <span className="opacity-90">Updates every 6 hours</span>
            </div>
          )}
        </div>
        {freshness.hoursOld > 24 && (
          <div className="mt-1 text-sm opacity-90">
            ETL pipeline may be down. Contact Data Engineering if this persists.
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
