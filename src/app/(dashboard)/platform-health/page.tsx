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
import {
  Activity, RefreshCw, Server, Database, Zap, Clock,
  CheckCircle, AlertTriangle, XCircle, Play, Pause,
  ExternalLink, Shield, Wifi
} from 'lucide-react'
import {
  getPlatformHealthMetrics,
  getDataFreshnessSLAs,
  getFailedJobs,
  PlatformHealthMetrics,
  DataFreshnessSLA,
  FailedJob
} from '@/lib/platform-admin-data'
import { formatDistanceToNow } from 'date-fns'

export default function PlatformHealthPage() {
  const [metrics, setMetrics] = useState<PlatformHealthMetrics | null>(null)
  const [slaData, setSlaData] = useState<DataFreshnessSLA[]>([])
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setIsLoading(true)
    setTimeout(() => {
      setMetrics(getPlatformHealthMetrics())
      setSlaData(getDataFreshnessSLAs())
      setFailedJobs(getFailedJobs())
      setLastRefresh(new Date())
      setIsLoading(false)
    }, 300)
  }

  const getStatusColor = (value: number, threshold: number, inverse = false) => {
    if (inverse) {
      return value <= threshold ? 'text-green-500' : 'text-red-500'
    }
    return value >= threshold ? 'text-green-500' : 'text-red-500'
  }

  const getOverallStatus = () => {
    if (!metrics) return 'unknown'
    const etlSuccessRate = (metrics.etlJobsSuccess / metrics.etlJobsTotal) * 100
    if (metrics.pipelineUptime >= 99.5 && etlSuccessRate >= 99 && metrics.failedJobsCount === 0) {
      return 'healthy'
    }
    if (metrics.pipelineUptime >= 98 && etlSuccessRate >= 95) {
      return 'degraded'
    }
    return 'critical'
  }

  const status = getOverallStatus()

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const etlSuccessRate = (metrics.etlJobsSuccess / metrics.etlJobsTotal) * 100

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
              ''
            }
            variant={status === 'critical' ? 'destructive' : 'default'}
          >
            {status === 'healthy' && <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
            {status === 'degraded' && <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />}
            {status === 'critical' && <XCircle className="h-3.5 w-3.5 mr-1.5" />}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Last refresh: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </span>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Vitals */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Pipeline Uptime */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Server className="h-4 w-4" />
              Pipeline Uptime
            </div>
            <div className={`text-3xl font-bold ${getStatusColor(metrics.pipelineUptime, 99)}`}>
              {metrics.pipelineUptime}%
            </div>
            <Progress value={metrics.pipelineUptime} className="h-1.5 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">Target: 99.5%</div>
          </CardContent>
        </Card>

        {/* ETL Success */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <CheckCircle className="h-4 w-4" />
              ETL Success
            </div>
            <div className={`text-3xl font-bold ${getStatusColor(etlSuccessRate, 99)}`}>
              {metrics.etlJobsSuccess}/{metrics.etlJobsTotal}
            </div>
            <Progress value={etlSuccessRate} className="h-1.5 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">{etlSuccessRate.toFixed(1)}% success</div>
          </CardContent>
        </Card>

        {/* Query Time */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Database className="h-4 w-4" />
              Avg Query Time
            </div>
            <div className={`text-3xl font-bold ${getStatusColor(metrics.avgQueryTime, 2, true)}`}>
              {metrics.avgQueryTime}s
            </div>
            <Progress value={Math.min((2 / metrics.avgQueryTime) * 100, 100)} className="h-1.5 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">Target: &lt; 2.0s</div>
          </CardContent>
        </Card>

        {/* API Latency */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Zap className="h-4 w-4" />
              API Latency
            </div>
            <div className={`text-3xl font-bold ${getStatusColor(metrics.apiLatency, 500, true)}`}>
              {metrics.apiLatency}ms
            </div>
            <Progress value={Math.min((500 / metrics.apiLatency) * 100, 100)} className="h-1.5 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">Target: &lt; 500ms</div>
          </CardContent>
        </Card>

        {/* Downtime */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              Data Downtime
            </div>
            <div className={`text-3xl font-bold ${getStatusColor(metrics.dataDowntimeMinutes, 30, true)}`}>
              {metrics.dataDowntimeMinutes} min
            </div>
            <Progress value={Math.max(0, 100 - (metrics.dataDowntimeMinutes / 60) * 100)} className="h-1.5 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">Last 24 hours</div>
          </CardContent>
        </Card>

        {/* Failed Jobs */}
        <Card className={metrics.failedJobsCount > 0 ? 'border-red-200 dark:border-red-800' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <AlertTriangle className="h-4 w-4" />
              Failed Jobs
            </div>
            <div className={`text-3xl font-bold ${metrics.failedJobsCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {metrics.failedJobsCount}
            </div>
            <Progress value={metrics.failedJobsCount === 0 ? 100 : 0} className="h-1.5 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">
              {metrics.failedJobsCount === 0 ? 'All jobs healthy' : 'Requires attention'}
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
                    {slaData.map((source) => (
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
            </TabsContent>

            {/* ETL Monitor Tab */}
            <TabsContent value="etl" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Play className="h-8 w-8 mx-auto text-green-500 mb-2" />
                    <div className="text-2xl font-bold">{metrics.etlJobsTotal - metrics.failedJobsCount}</div>
                    <div className="text-sm text-muted-foreground">Running/Complete</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Pause className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                    <div className="text-2xl font-bold">2</div>
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
                Detailed ETL job monitoring available in the admin console
              </div>
            </TabsContent>

            {/* Failed Jobs Tab */}
            <TabsContent value="incidents" className="mt-6">
              {failedJobs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium">All Jobs Healthy</p>
                  <p className="text-muted-foreground">No failed jobs to report</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {failedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-red-800 dark:text-red-300">{job.jobName}</div>
                          <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                            Source: {job.source}
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          Retry {job.retryCount}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2 rounded font-mono">
                        {job.errorMessage}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Failed {formatDistanceToNow(job.failedAt, { addSuffix: true })}
                        </div>
                        <Button size="sm" variant="outline">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
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
