"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity, Server, Clock, Zap, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  getPlatformHealthMetrics,
  getFailedJobs,
  type PlatformHealthMetrics,
  type FailedJob
} from '@/lib/mock/platformAdminData'

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
  const statusBadge = {
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    retrying: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    manual_intervention: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  }

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0 dark:border-gray-700">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{job.jobName}</span>
          <Badge variant="outline" className="text-xs">{job.sourceSystem}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{job.errorMessage}</p>
        <p className="text-xs text-muted-foreground">
          Failed {formatDistanceToNow(job.failedAt, { addSuffix: true })} | Retries: {job.retryCount}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge[job.status]}`}>
          {job.status.replace('_', ' ')}
        </span>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function PlatformHealth() {
  const metrics = getPlatformHealthMetrics()
  const failedJobs = getFailedJobs()

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
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {formatDistanceToNow(metrics.lastUpdated, { addSuffix: true })}
            </div>
          </div>
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
              value={`${metrics.etlJobsSuccessful}/${metrics.etlJobsTotal}`}
              status={metrics.etlJobsSuccessful / metrics.etlJobsTotal >= 0.99 ? 'good' : 'warning'}
              icon={CheckCircle}
              description={`${((metrics.etlJobsSuccessful / metrics.etlJobsTotal) * 100).toFixed(1)}% success rate`}
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
                <FailedJobRow key={job.id} job={job} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
