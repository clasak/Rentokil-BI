"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity, Server, Clock, Zap, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { PlatformHealthMetrics, FailedJob } from '@/lib/bigquery/queries/platform-health'

// Empty states (BigQuery-only, no mock fallback)
const EMPTY_METRICS: PlatformHealthMetrics = {
  pipelineUptime: 100,
  etlJobsSuccessful: 0,
  etlJobsTotal: 0,
  avgQueryTime: 0,
  apiLatency: 0,
  dataDowntimeMinutes: 0,
  failedJobsCount: 0,
  lastUpdated: new Date(),
  restricted: false,
}

const EMPTY_FAILED_JOBS: FailedJob[] = []

function MetricCard({
  title,
  value,
  unit,
  status,
  icon: Icon,
  description
}: {
  title: string
  value: string | number
  unit?: string
  status: 'good' | 'warning' | 'critical'
  icon: typeof Activity
  description?: string
}) {
  const statusColors = {
    good: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    critical: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
  }

  const iconColors = {
    good: 'text-green-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500'
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusColors[status]}`}>
              <Icon className={`h-5 w-5 ${iconColors[status]}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{value}</span>
                {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
              </div>
            </div>
          </div>
          {status === 'good' && <CheckCircle className="h-5 w-5 text-green-500" />}
          {status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
          {status === 'critical' && <XCircle className="h-5 w-5 text-red-500" />}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

function FailedJobRow({ job }: { job: FailedJob }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0 dark:border-gray-700">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{job.jobId}</span>
          <Badge variant="outline" className="text-xs">{job.errorCode || 'Error'}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">{job.errorMessage}</p>
        <p className="text-xs text-muted-foreground">
          Failed {formatDistanceToNow(job.creationTime, { addSuffix: true })}
          {job.user && ` | User: ${job.user}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View in BigQuery Console">
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function PlatformHealth() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Explicit transform for platform health metrics with null handling
  function transformPlatformHealthMetrics(data: PlatformHealthMetrics): PlatformHealthMetrics {
    if (!data) return { pipelineUptime: 100, etlJobsSuccessful: 0, etlJobsTotal: 0, avgQueryTime: 0, apiLatency: 0, dataDowntimeMinutes: 0, failedJobsCount: 0, lastUpdated: new Date(), restricted: false }
    return {
      pipelineUptime: data.pipelineUptime ?? 100,
      etlJobsSuccessful: data.etlJobsSuccessful ?? 0,
      etlJobsTotal: data.etlJobsTotal ?? 0,
      avgQueryTime: data.avgQueryTime ?? 0,
      apiLatency: data.apiLatency ?? 0,
      dataDowntimeMinutes: data.dataDowntimeMinutes ?? 0,
      failedJobsCount: data.failedJobsCount ?? 0,
      lastUpdated: data.lastUpdated ?? new Date(),
      restricted: data.restricted ?? false,
    }
  }

  // Explicit transform for failed jobs with null handling
  function transformFailedJobs(bqData: FailedJob[]): FailedJob[] {
    return (bqData || []).map(job => ({
      jobId: job.jobId ?? '',
      query: job.query ?? '',
      errorMessage: job.errorMessage ?? '',
      creationTime: job.creationTime ?? new Date(),
      errorCode: job.errorCode,
      user: job.user,
    }))
  }

  // Fetch platform health metrics from BigQuery
  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    error: metricsError,
    refetch: refetchMetrics,
  } = useBigQueryData<PlatformHealthMetrics, PlatformHealthMetrics>({
    queryName: 'platform-health-metrics',
    defaultData: EMPTY_METRICS,
    transformBigQueryData: transformPlatformHealthMetrics,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  // Fetch failed jobs from BigQuery
  const {
    data: failedJobs,
    isLoading: isLoadingJobs,
    refetch: refetchJobs,
  } = useBigQueryData<FailedJob[], FailedJob[]>({
    queryName: 'platform-failed-jobs',
    filters: { limit: 10 },
    defaultData: EMPTY_FAILED_JOBS,
    transformBigQueryData: transformFailedJobs,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  const isLoading = isLoadingMetrics || isLoadingJobs

  const handleRefresh = () => {
    refetchMetrics()
    refetchJobs()
  }

  const getUptimeStatus = (uptime: number) => {
    if (uptime >= 99.5) return 'good'
    if (uptime >= 98) return 'warning'
    return 'critical'
  }

  const getLatencyStatus = (latency: number) => {
    if (latency <= 300) return 'good'
    if (latency <= 500) return 'warning'
    return 'critical'
  }

  const getQueryTimeStatus = (time: number) => {
    if (time <= 1.5) return 'good'
    if (time <= 3) return 'warning'
    return 'critical'
  }

  const getDowntimeStatus = (minutes: number) => {
    if (minutes <= 15) return 'good'
    if (minutes <= 60) return 'warning'
    return 'critical'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Platform Health Dashboard
              </CardTitle>
              <CardDescription>
                Real-time monitoring of data pipeline and system performance
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {mounted && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated {formatDistanceToNow(metrics.lastUpdated, { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
          {metrics.restricted && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Limited access to INFORMATION_SCHEMA - showing placeholder data</span>
              </div>
            </div>
          )}
          {metricsError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                <XCircle className="h-4 w-4" />
                <span>Error loading metrics: {metricsError}</span>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Pipeline Uptime"
              value={metrics.pipelineUptime}
              unit="%"
              status={getUptimeStatus(metrics.pipelineUptime)}
              icon={Server}
              description="Last 30 days"
            />
            <MetricCard
              title="ETL Job Success Rate"
              value={metrics.etlJobsTotal > 0 ? `${metrics.etlJobsSuccessful}/${metrics.etlJobsTotal}` : 'No data'}
              status={metrics.etlJobsTotal > 0 && metrics.etlJobsSuccessful / metrics.etlJobsTotal >= 0.99 ? 'good' : 'warning'}
              icon={CheckCircle}
              description={metrics.etlJobsTotal > 0 ? `${((metrics.etlJobsSuccessful / metrics.etlJobsTotal) * 100).toFixed(1)}% success rate` : 'No jobs in last 24h'}
            />
            <MetricCard
              title="Avg Query Time"
              value={metrics.avgQueryTime}
              unit="s"
              status={getQueryTimeStatus(metrics.avgQueryTime)}
              icon={Zap}
              description="P95 latency"
            />
            <MetricCard
              title="API Latency"
              value={metrics.apiLatency}
              unit="ms"
              status={getLatencyStatus(metrics.apiLatency)}
              icon={Activity}
              description="Average response time"
            />
            <MetricCard
              title="Data Downtime"
              value={metrics.dataDowntimeMinutes}
              unit="min"
              status={getDowntimeStatus(metrics.dataDowntimeMinutes)}
              icon={Clock}
              description="Last 24 hours"
            />
            <MetricCard
              title="Failed Jobs"
              value={metrics.failedJobsCount}
              status={metrics.failedJobsCount === 0 ? 'good' : metrics.failedJobsCount <= 3 ? 'warning' : 'critical'}
              icon={AlertTriangle}
              description="Requires attention"
            />
          </div>
        </CardContent>
      </Card>

      {failedJobs.length > 0 && (
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Failed Jobs
                <Badge variant="destructive" className="ml-2">{failedJobs.length}</Badge>
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View All in n8n
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y dark:divide-gray-700">
              {failedJobs.map(job => (
                <FailedJobRow key={job.jobId} job={job} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
