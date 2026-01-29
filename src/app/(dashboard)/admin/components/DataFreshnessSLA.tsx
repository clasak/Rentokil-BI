"use client"

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Clock, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle,
  Database, RefreshCw, AlertTriangle, ExternalLink, FileText, Mail,
  ChevronDown, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { DataFreshnessSLA, TrendDirection } from '@/lib/bigquery/queries/data-freshness'

interface DataFreshnessSLATrackerProps {
  slaData: DataFreshnessSLA[]
  isLoading?: boolean
  onRefresh?: () => void
}

export function DataFreshnessSLATracker({ slaData, isLoading, onRefresh }: DataFreshnessSLATrackerProps) {
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())

  const metCount = slaData.filter(s => s.status === 'met').length
  const breachedCount = slaData.filter(s => s.status === 'breached').length
  // Get critical breaches - only Lead Exec is now critical (Contract Checker removed)
  const criticalBreaches = slaData.filter(s =>
    s.status === 'breached' && s.id === 'lead-1'
  )

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const getTrendIcon = (trend: TrendDirection) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getTrendLabel = (trend: TrendDirection) => {
    switch (trend) {
      case 'up':
        return 'Improving'
      case 'down':
        return 'Degrading'
      default:
        return 'Stable'
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Data Freshness SLA Tracker
            </CardTitle>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state - no data from BigQuery yet
  if (slaData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Data Freshness SLA Tracker
            </CardTitle>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            )}
          </div>
          <CardDescription>
            Real-time ETL pipeline freshness from BigQuery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Connecting to BigQuery...</p>
            <p className="text-xs mt-1">Checking ETL pipeline status</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Data Freshness SLA Tracker
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <Database className="h-3 w-3" />
              Live ETL pipeline status across all datasets
            </CardDescription>
          </div>
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {metCount} Met
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Data refreshed within SLA target</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Critical sources: &lt; 15 min | Standard sources: &lt; 60 min
                  </p>
                </TooltipContent>
              </Tooltip>
              {breachedCount > 0 && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      {breachedCount} Breached
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Data is stale - exceeded SLA threshold</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      May impact real-time dashboards and lead routing
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
              {onRefresh && (
                <Button variant="ghost" size="icon" onClick={onRefresh} className="h-8 w-8">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {/* Critical Breach Alert Banner */}
        {criticalBreaches.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Critical SLA Breach Detected
                </h4>
                <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                  {criticalBreaches.length} critical data source{criticalBreaches.length > 1 ? 's are' : ' is'} behind SLA.
                  This may impact real-time dashboards and lead routing.
                </p>
                <div className="space-y-3">
                  {criticalBreaches.map(breach => {
                    const overdueMinutes = breach.actualFreshnessMinutes - breach.slaMinutes
                    const overdueHours = Math.floor(overdueMinutes / 60)
                    const overdueRemainingMinutes = Math.round(overdueMinutes % 60)
                    const overdueText = overdueHours > 0
                      ? `${overdueHours}h ${overdueRemainingMinutes}m overdue`
                      : `${overdueRemainingMinutes}m overdue`

                    // Calculate last sync time
                    const lastSyncDate = new Date(Date.now() - breach.actualFreshnessMinutes * 60000)
                    const lastSyncText = formatDistanceToNow(lastSyncDate, { addSuffix: true })

                    return (
                      <div key={breach.id} className="bg-white dark:bg-red-950/30 p-3 rounded border border-red-200 dark:border-red-800">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                              <span className="font-semibold text-red-900 dark:text-red-100">
                                {breach.sourceName} data is {overdueText}
                              </span>
                            </div>
                            <div className="text-xs text-red-800 dark:text-red-200 space-y-1 ml-6">
                              <p>Target: <span className="font-medium">{breach.slaTarget}</span></p>
                              <p>Last sync: <span className="font-medium">{lastSyncText}</span></p>
                              <p>Table: <code className="bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded">{breach.datasetId}.{breach.tableName}</code></p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                            className="h-8 bg-white dark:bg-gray-800 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            <RefreshCw className="h-3 w-3 mr-1.5" />
                            Retry Now
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 bg-white dark:bg-gray-800 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                            onClick={() => window.open(`https://console.cloud.google.com/bigquery?project=bidata-sharedus-production&ws=!1m5!1m4!4m3!1sbidata-sharedus-production!2s${breach.datasetId}!3s${breach.tableName}`, '_blank')}
                          >
                            <FileText className="h-3 w-3 mr-1.5" />
                            View Logs
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 bg-white dark:bg-gray-800 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                            onClick={() => window.location.href = 'mailto:data-engineering@prestox.com?subject=SLA%20Breach:%20' + encodeURIComponent(breach.sourceName) + '&body=' + encodeURIComponent(`Critical SLA breach detected:\n\nSource: ${breach.sourceName}\nTarget: ${breach.slaTarget}\nActual: ${breach.actualFreshness}\nOverdue: ${overdueText}\nLast sync: ${lastSyncText}\nTable: ${breach.datasetId}.${breach.tableName}\n\nPlease investigate.`)}
                          >
                            <Mail className="h-3 w-3 mr-1.5" />
                            Contact Support
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Source</TableHead>
                <TableHead className="w-[120px]">SLA Target</TableHead>
                <TableHead className="w-[150px]">Actual Freshness</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[120px]">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slaData.map((source) => {
                const isExpanded = expandedRows.has(source.id)
                const isBreached = source.status === 'breached'

                return (
                  <React.Fragment key={source.id}>
                    <TableRow
                      className={cn(
                        'transition-colors',
                        isBreached
                          ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 cursor-pointer'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      )}
                      onClick={() => isBreached && toggleRow(source.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isBreached && (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )
                          )}
                          {source.actualFreshness === 'Error' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : isBreached ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {source.sourceName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {source.slaTarget}
                        </code>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <span className={cn(
                                'font-medium',
                                isBreached ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                              )}>
                                {source.actualFreshness}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                Last ETL run: {new Date(Date.now() - source.actualFreshnessMinutes * 60000).toLocaleString()}
                              </p>
                              {isBreached && (
                                <p className="text-xs text-red-400 mt-1">
                                  ⚠️ Exceeds {source.slaTarget} SLA target
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          {source.status === 'met' ? (
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  Met
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Data is fresh - within SLA target</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <Badge variant="destructive">
                                  Breached
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Data is stale - exceeded SLA</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Click row for recovery actions
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(source.trend)}
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {getTrendLabel(source.trend)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded row for breached SLAs */}
                    {isBreached && isExpanded && (
                      <TableRow className="bg-red-50 dark:bg-red-900/10">
                        <TableCell colSpan={5}>
                          <div className="py-3 px-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                                  {formatDistanceToNow(new Date(Date.now() - source.actualFreshnessMinutes * 60000), { addSuffix: true })}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Overdue By:</span>
                                <p className="font-medium text-red-600 dark:text-red-400 mt-1">
                                  {(() => {
                                    const overdueMinutes = source.actualFreshnessMinutes - source.slaMinutes
                                    const hours = Math.floor(overdueMinutes / 60)
                                    const minutes = Math.round(overdueMinutes % 60)
                                    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
                                  })()}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Table:</span>
                                <p className="font-mono text-xs text-gray-900 dark:text-gray-100 mt-1">
                                  {source.datasetId}.{source.tableName}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">SLA Target:</span>
                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                                  {source.slaTarget}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t dark:border-red-800">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onRefresh?.()
                                }}
                                className="h-8"
                              >
                                <RefreshCw className="h-3 w-3 mr-1.5" />
                                Retry Now
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(`https://console.cloud.google.com/bigquery?project=bidata-sharedus-production&ws=!1m5!1m4!4m3!1sbidata-sharedus-production!2s${source.datasetId}!3s${source.tableName}`, '_blank')
                                }}
                              >
                                <FileText className="h-3 w-3 mr-1.5" />
                                View in BigQuery
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const overdueMinutes = source.actualFreshnessMinutes - source.slaMinutes
                                  const hours = Math.floor(overdueMinutes / 60)
                                  const minutes = Math.round(overdueMinutes % 60)
                                  const overdueText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
                                  const lastSyncText = formatDistanceToNow(new Date(Date.now() - source.actualFreshnessMinutes * 60000), { addSuffix: true })

                                  window.location.href = `mailto:data-engineering@prestox.com?subject=SLA%20Breach:%20${encodeURIComponent(source.sourceName)}&body=${encodeURIComponent(`SLA breach detected:\n\nSource: ${source.sourceName}\nTarget: ${source.slaTarget}\nActual: ${source.actualFreshness}\nOverdue: ${overdueText}\nLast sync: ${lastSyncText}\nTable: ${source.datasetId}.${source.tableName}\n\nPlease investigate.`)}`
                                }}
                              >
                                <Mail className="h-3 w-3 mr-1.5" />
                                Contact Support
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
