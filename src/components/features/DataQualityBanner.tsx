"use client"

import { useAppStore } from '@/store'
import { getDataQualityMetrics, getDataSources } from '@/lib/data'
import { AlertTriangle, X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import Link from 'next/link'

export function DataQualityBanner() {
  const { settings } = useAppStore()
  const [dismissed, setDismissed] = useState(false)

  if (!settings.dataQualityIssuesEnabled || dismissed) {
    return null
  }

  const metrics = getDataQualityMetrics()
  const sources = getDataSources()

  const criticalIssues = metrics.filter(m => m.status === 'critical')
  const staleSource = sources.find(s => s.status === 'stale')

  if (criticalIssues.length === 0 && !staleSource) {
    return null
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <div className="text-sm">
            <span className="font-medium text-yellow-800 dark:text-yellow-300">Data Quality Alert: </span>
            <span className="text-yellow-700 dark:text-yellow-400">
              {criticalIssues.length > 0 && (
                <span>{criticalIssues.length} critical issue(s) detected. </span>
              )}
              {staleSource && (
                <span>{staleSource.name} data is stale ({Math.round((Date.now() - staleSource.lastRefresh.getTime()) / 3600000)}h old). </span>
              )}
            </span>
            <Link href="/governance" className="inline-flex items-center gap-1 text-yellow-800 dark:text-yellow-300 font-medium hover:underline ml-2">
              View Details <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
