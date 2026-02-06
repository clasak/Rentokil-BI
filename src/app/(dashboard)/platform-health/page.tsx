"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import {
  Activity, RefreshCw, Server, Database, Zap, Clock,
  CheckCircle, AlertTriangle, XCircle, Play, Pause,
  ExternalLink, Shield, Wifi, Info
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { PlatformHealthMetrics, FailedJob } from '@/lib/bigquery/queries/platform-health'
import type { DataFreshnessSummary } from '@/lib/bigquery/queries/data-freshness'
import { formatDistanceToNow } from 'date-fns'

// Empty states (no mock fallback - BigQuery only)
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

const EMPTY_FRESHNESS: DataFreshnessSummary = {
  totalSources: 0,
  metCount: 0,
  breachedCount: 0,
  overallHealth: 'healthy',
  sources: [],
  lastUpdated: new Date().toISOString(),
}

const EMPTY_FAILED_JOBS: FailedJob[] = []

export default function PlatformHealthPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch platform health metrics
  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    dataSource,
    responseTime,
    error: metricsError,
    refetch: refetchMetrics,
  } = useBigQueryData<PlatformHealthMetrics, PlatformHealthMetrics>({
    queryName: 'platform-health-metrics',
    defaultData: EMPTY_METRICS,
    transformBigQueryData: (data) => data,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  // Fetch data freshness SLAs
  const {
    data: freshnessData,
    isLoading: isLoadingFreshness,
    error: freshnessError,
    refetch: refetchFreshness,
  } = useBigQueryData<DataFreshnessSummary, DataFreshnessSummary>({
    queryName: 'data-freshness',
    defaultData: EMPTY_FRESHNESS,
    transformBigQueryData: (data) => data,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  // Fetch failed jobs
  const {
    data: failedJobs,
    isLoading: isLoadingJobs,
    error: jobsError,
    refetch: refetchJobs,
  } = useBigQueryData<FailedJob[], FailedJob[]>({
    queryName: 'platform-failed-jobs',
    defaultData: EMPTY_FAILED_JOBS,
    transformBigQueryData: (data) => data,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  const isLoading = isLoadingMetrics || isLoadingFreshness || isLoadingJobs
  const hasError = metricsError || freshnessError || jobsError

  const handleRefresh = () => {
    refetchMetrics()
    refetchFreshness()
    refetchJobs()
  }

  const getStatusColor = (value: number, threshold: number, inverse = false) => {
    if (inverse) {
      return value <= threshold ? 'text-green-500' : 'text-red-500'
    }
    return value >= threshold ? 'text-green-500' : 'text-red-500'
  }

  const getOverallStatus = () => {
    if (!metrics) return 'unknown'
    // If INFORMATION_SCHEMA access is restricted, show unknown status
    if (metrics.restricted) return 'unknown'
    if (metrics.etlJobsTotal === 0) return 'unknown'

    const etlSuccessRate = (metrics.etlJobsSuccessful / metrics.etlJobsTotal) * 100
    if (metrics.pipelineUptime >= 99.5 && etlSuccessRate >= 99 && metrics.failedJobsCount === 0) {
      return 'healthy'
    }
    if (metrics.pipelineUptime >= 98 && etlSuccessRate >= 95) {
      return 'degraded'
    }
    return 'critical'
  }

  const status = getOverallStatus()

  if (!mounted) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <p className="text-lg font-medium">Error Loading Platform Health</p>
          <p className="text-sm text-muted-foreground mt-1">
            {metricsError || freshnessError || jobsError}
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const etlSuccessRate = metrics.etlJobsTotal > 0
    ? (metrics.etlJobsSuccessful / metrics.etlJobsTotal) * 100
    : 100

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Admin', href: '/admin' },
        { label: 'Platform Health' }
      ]} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" />
              Platform Health
            </h1>
            <p className="text-muted-foreground mt-1">
              System vitals, ETL monitoring, and data freshness
            </p>
          </div>
          <Badge
            className={
              status === 'healthy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              status === 'degraded' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
              status === 'unknown' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' :
              ''
            }
            variant={status === 'critical' ? 'destructive' : 'default'}
          >
            {status === 'healthy' && <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
            {status === 'degraded' && <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />}
            {status === 'critical' && <XCircle className="h-3.5 w-3.5 mr-1.5" />}
            {status === 'unknown' && <Info className="h-3.5 w-3.5 mr-1.5" />}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Last refresh: {formatDistanceToNow(metrics.lastUpdated, { addSuffix: true })}
          </span>
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Restriction Warning */}
      {metrics.restricted && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  Data Access Restricted
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                  Platform health metrics require additional BigQuery permissions to display real-time data.
                </p>
                <div className="bg-amber-100 dark:bg-amber-900/40 p-3 rounded text-xs font-mono text-amber-900 dark:text-amber-100">
                  INFORMATION_SCHEMA.JOBS_BY_PROJECT requires bigquery.jobs.list permission
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-3">
                  <strong>To enable this feature:</strong> Request the <code className="bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded">bigquery.jobs.list</code> permission for your service account or user.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Vitals */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Pipeline Uptime */}
        <Card className={metrics.restricted ? 'opacity-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Server className="h-4 w-4" />
              Pipeline Uptime
              {metrics.restricted && <Shield className="h-3 w-3 text-amber-500" />}
            </div>
            <div className={`text-3xl font-bold ${metrics.restricted ? 'text-gray-400' : getStatusColor(metrics.pipelineUptime, 99)}`}>
              {metrics.restricted ? '--' : `${metrics.pipelineUptime}%`}
            </div>
            <Progress value={metrics.restricted ? 0 : metrics.pipelineUptime} className="h-1.5 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">
              {metrics.restricted ? 'Permission required' : 'Target: 99.5%'}
            </div>
          </CardContent>
        </Card>

        {/* ETL Success */}
        <Card className={metrics.restricted ? 'opacity-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <CheckCircle className="h-4 w-4" />
              ETL Success
              {metrics.restricted && <Shield className="h-3 w-3 text-amber-500" />}
            </div>
            <div className={`text-3xl font-bold ${metrics.restricted ? 'text-gray-400' : getStatusColor(etlSuccessRate, 99)}`}>
              {metrics.restricted ? '--/--' : `${metrics.etlJobsSuccessful}/${metrics.etlJobsTotal}`}
            </div>
            <Progress value={metrics.restricted ? 0 : etlSuccessRate} className="h-1.5 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">
              {metrics.restricted ? 'Permission required' : `${etlSuccessRate.toFixed(1)}% success`}
            </div>
          </CardContent>
        </Card>

        {/* Query Time */}
        <Card className={metrics.restricted ? 'opacity-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Database className="h-4 w-4" />
              Avg Query Time
              {metrics.restricted && <Shield className="h-3 w-3 text-amber-500" />}
            </div>
            <div className={`text-3xl font-bold ${metrics.restricted ? 'text-gray-400' : getStatusColor(metrics.avgQueryTime, 2, true)}`}>
              {metrics.restricted ? '--' : `${metrics.avgQueryTime}s`}
            </div>
            <Progress value={metrics.restricted ? 0 : Math.min((2 / (metrics.avgQueryTime || 0.1)) * 100, 100)} className="h-1.5 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">
              {metrics.restricted ? 'Permission required' : 'Target: < 2.0s'}
            </div>
          </CardContent>
        </Card>

        {/* API Latency */}
        <Card className={metrics.restricted ? 'opacity-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Zap className="h-4 w-4" />
              API Latency
              {metrics.restricted && <Shield className="h-3 w-3 text-amber-500" />}
            </div>
            <div className={`text-3xl font-bold ${metrics.restricted ? 'text-gray-400' : getStatusColor(metrics.apiLatency, 500, true)}`}>
              {metrics.restricted ? '--' : `${metrics.apiLatency}ms`}
            </div>
            <Progress value={metrics.restricted ? 0 : Math.min((500 / (metrics.apiLatency || 1)) * 100, 100)} className="h-1.5 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">
              {metrics.restricted ? 'Permission required' : 'Target: < 500ms'}
            </div>
          </CardContent>
        </Card>

        {/* Downtime */}
        <Card className={metrics.restricted ? 'opacity-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              Data Downtime
              {metrics.restricted && <Shield className="h-3 w-3 text-amber-500" />}
            </div>
            <div className={`text-3xl font-bold ${metrics.restricted ? 'text-gray-400' : getStatusColor(metrics.dataDowntimeMinutes, 30, true)}`}>
              {metrics.restricted ? '--' : `${metrics.dataDowntimeMinutes} min`}
            </div>
            <Progress value={metrics.restricted ? 0 : Math.max(0, 100 - (metrics.dataDowntimeMinutes / 60) * 100)} className="h-1.5 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">
              {metrics.restricted ? 'Permission required' : 'Last 24 hours'}
            </div>
          </CardContent>
        </Card>

        {/* Failed Jobs */}
        <Card className={metrics.restricted ? 'opacity-50' : metrics.failedJobsCount > 0 ? 'border-red-200 dark:border-red-800' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <AlertTriangle className="h-4 w-4" />
              Failed Jobs
              {metrics.restricted && <Shield className="h-3 w-3 text-amber-500" />}
            </div>
            <div className={`text-3xl font-bold ${metrics.restricted ? 'text-gray-400' : metrics.failedJobsCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {metrics.restricted ? '--' : metrics.failedJobsCount}
            </div>
            <Progress value={metrics.restricted ? 0 : metrics.failedJobsCount === 0 ? 100 : 0} className="h-1.5 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">
              {metrics.restricted ? 'Permission required' : metrics.failedJobsCount === 0 ? 'All jobs healthy' : 'Requires attention'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Card>
        <CardHeader>
          <CardTitle>Monitoring Details</CardTitle>
          <CardDescription>Data freshness, ETL jobs, and incident tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="freshness" className="w-full">
            <TabsList>
              <TabsTrigger value="freshness">
                <Clock className="h-4 w-4 mr-2" />
                Data Freshness
              </TabsTrigger>
              <TabsTrigger value="etl">
                <Play className="h-4 w-4 mr-2" />
                ETL Monitor
              </TabsTrigger>
              <TabsTrigger value="incidents">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Failed Jobs
              </TabsTrigger>
            </TabsList>

            {/* Data Freshness Tab */}
            <TabsContent value="freshness" className="mt-6">
              {freshnessData.sources.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No Freshness Data</p>
                  <p className="text-muted-foreground">Data freshness monitoring not available</p>
                </div>
              ) : (
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
                      {freshnessData.sources.map((source) => (
                        <TableRow
                          key={source.id}
                          className={source.status === 'breached' ? 'bg-red-50 dark:bg-red-900/10' : ''}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Wifi className={`h-4 w-4 ${source.status === 'met' ? 'text-green-500' : 'text-red-500'}`} />
                              {source.sourceName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {source.slaTarget}
                            </code>
                          </TableCell>
                          <TableCell>
                            <span className={source.status === 'breached' ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                              {source.actualFreshness}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={source.status === 'met'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : ''}
                              variant={source.status === 'breached' ? 'destructive' : 'default'}
                            >
                              {source.status === 'met' ? 'Met' : 'Breached'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm ${
                              source.trend === 'up' ? 'text-green-600' :
                              source.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                            }`}>
                              {source.trend === 'up' ? 'Improving' :
                               source.trend === 'down' ? 'Degrading' : 'Stable'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* ETL Monitor Tab */}
            <TabsContent value="etl" className="mt-6">
              {metrics.restricted ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                  <p className="text-lg font-medium">Access Restricted</p>
                  <p className="text-muted-foreground">ETL monitoring requires <code className="bg-muted px-1.5 py-0.5 rounded text-xs">bigquery.jobs.list</code> permission</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Play className="h-8 w-8 mx-auto text-green-500 mb-2" />
                        <div className="text-2xl font-bold">{metrics.etlJobsSuccessful}</div>
                        <div className="text-sm text-muted-foreground">Successful</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Pause className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                        <div className="text-2xl font-bold">{metrics.etlJobsTotal - metrics.etlJobsSuccessful - metrics.failedJobsCount}</div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                        <div className="text-2xl font-bold">{metrics.failedJobsCount}</div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="text-center text-muted-foreground py-4">
                    ETL job data from INFORMATION_SCHEMA.JOBS_BY_PROJECT (last 24 hours)
                  </div>
                </>
              )}
            </TabsContent>

            {/* Failed Jobs Tab */}
            <TabsContent value="incidents" className="mt-6">
              {metrics.restricted ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                  <p className="text-lg font-medium">Access Restricted</p>
                  <p className="text-muted-foreground">Failed jobs monitoring requires <code className="bg-muted px-1.5 py-0.5 rounded text-xs">bigquery.jobs.list</code> permission</p>
                </div>
              ) : failedJobs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium">All Jobs Healthy</p>
                  <p className="text-muted-foreground">No failed jobs in the last 24 hours</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {failedJobs.map((job) => (
                    <div
                      key={job.jobId}
                      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-red-800 dark:text-red-300">{job.jobId}</div>
                          <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                            User: {job.user}
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {job.errorCode}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2 rounded font-mono max-h-24 overflow-y-auto">
                        {job.errorMessage}
                      </div>
                      {job.query && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">View Query</summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                            {job.query}
                          </pre>
                        </details>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Failed {formatDistanceToNow(job.creationTime, { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
