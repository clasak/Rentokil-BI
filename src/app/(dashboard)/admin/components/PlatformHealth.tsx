"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Activity, CheckCircle, AlertTriangle, Clock,
  Zap, Server, Database, ExternalLink, RefreshCw, Mail, FileText
} from 'lucide-react'
import { PlatformHealthMetrics } from '@/lib/bigquery/queries/platform-health'
import { getFailedJobs, FailedJob } from '@/lib/platform-admin-data'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDistanceToNow } from 'date-fns'

interface PlatformHealthProps {
  metrics: PlatformHealthMetrics
}

export function PlatformHealth({ metrics }: PlatformHealthProps) {
  const [showFailedJobs, setShowFailedJobs] = useState(false)
  const failedJobs = getFailedJobs()

  // Handle loading state
  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Platform Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-500">
            Loading platform metrics...
          </div>
        </CardContent>
      </Card>
    )
  }

  // Handle restricted access to INFORMATION_SCHEMA
  if (metrics.restricted) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Platform Health
            </CardTitle>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Restricted Access
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  INFORMATION_SCHEMA Access Required
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                  Platform health metrics require access to BigQuery&apos;s INFORMATION_SCHEMA.JOBS_BY_PROJECT.
                  The service account currently lacks the <code className="bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">bigquery.jobs.list</code> permission.
                </p>
                <div className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium">To enable platform health monitoring:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Grant the <code className="bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">BigQuery Job User</code> role to your service account</li>
                    <li>Or add the <code className="bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">bigquery.jobs.list</code> permission to a custom role</li>
                  </ol>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-amber-200 dark:border-amber-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://console.cloud.google.com/iam-admin/iam?project=bidata-sharedus-production', '_blank')}
                    className="h-8 bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                  >
                    <FileText className="h-3 w-3 mr-1.5" />
                    IAM Console
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://cloud.google.com/bigquery/docs/information-schema-jobs', '_blank')}
                    className="h-8 bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                  >
                    <FileText className="h-3 w-3 mr-1.5" />
                    Documentation
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const etlSuccessRate = metrics.etlJobsTotal > 0
    ? (metrics.etlJobsSuccessful / metrics.etlJobsTotal) * 100
    : 0

  const getStatusColor = (value: number, threshold: number, inverse = false) => {
    if (inverse) {
      return value <= threshold ? 'text-green-500' : 'text-red-500'
    }
    return value >= threshold ? 'text-green-500' : 'text-red-500'
  }

  const getStatusBadge = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value <= threshold : value >= threshold
    const tooltipText = isGood
      ? `System is operating normally (${value}% uptime exceeds ${threshold}% target)`
      : `System performance is below target threshold (${value}% uptime is below ${threshold}% target)`

    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Badge variant={isGood ? 'default' : 'destructive'} className={cn(
              isGood ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : '',
              'cursor-help'
            )}>
              {isGood ? 'Healthy' : 'Degraded'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Platform Health
            </CardTitle>
            {getStatusBadge(metrics.pipelineUptime, 99)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Pipeline Uptime */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Server className="h-4 w-4" />
                Pipeline Uptime
              </div>
              <div className={`text-2xl font-bold ${getStatusColor(metrics.pipelineUptime, 99)}`}>
                {metrics.pipelineUptime}%
              </div>
              <Progress value={metrics.pipelineUptime} className="h-1 mt-2" />
            </div>

            {/* ETL Job Success Rate */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <CheckCircle className="h-4 w-4" />
                ETL Success
              </div>
              {metrics.etlJobsTotal > 0 ? (
                <>
                  <div className={`text-2xl font-bold ${getStatusColor(etlSuccessRate, 99)}`}>
                    {metrics.etlJobsSuccessful}/{metrics.etlJobsTotal}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {etlSuccessRate.toFixed(1)}% success rate
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-400">-</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    No jobs in last 24h
                  </div>
                </>
              )}
            </div>

            {/* Average Query Time */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Database className="h-4 w-4" />
                Avg Query Time
              </div>
              <div className={`text-2xl font-bold ${getStatusColor(metrics.avgQueryTime, 2, true)}`}>
                {metrics.avgQueryTime}s
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Target: &lt; 2.0s
              </div>
            </div>

            {/* API Latency */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Zap className="h-4 w-4" />
                API Latency
              </div>
              <div className={`text-2xl font-bold ${getStatusColor(metrics.apiLatency, 500, true)}`}>
                {metrics.apiLatency}ms
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Target: &lt; 500ms
              </div>
            </div>

            {/* Data Downtime */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Clock className="h-4 w-4" />
                Data Downtime
              </div>
              <div className={`text-2xl font-bold ${getStatusColor(metrics.dataDowntimeMinutes, 30, true)}`}>
                {metrics.dataDowntimeMinutes} min
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Last 24 hours
              </div>
            </div>

            {/* Failed Jobs */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <AlertTriangle className="h-4 w-4" />
                Failed Jobs
              </div>
              <div className={`text-2xl font-bold ${metrics.failedJobsCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {metrics.failedJobsCount}
              </div>
              {metrics.failedJobsCount > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-xs text-primary"
                  onClick={() => setShowFailedJobs(true)}
                >
                  View details
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Failed Jobs Dialog */}
      <Dialog open={showFailedJobs} onOpenChange={setShowFailedJobs}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Failed Jobs ({failedJobs.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {failedJobs.map((job) => (
              <FailedJobCard key={job.id} job={job} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function FailedJobCard({ job }: { job: FailedJob }) {
  const jobUrl = `https://console.cloud.google.com/bigquery?project=bidata-sharedus-production&page=jobs`

  const mailtoLink = `mailto:data-engineering@prestox.com?subject=Failed Job: ${encodeURIComponent(job.jobName)}&body=${encodeURIComponent(
    `Job Name: ${job.jobName}\n` +
    `Source: ${job.source}\n` +
    `Failed: ${job.failedAt.toISOString()}\n` +
    `Retry Count: ${job.retryCount}\n\n` +
    `Error Message:\n${job.errorMessage}\n\n` +
    `Please investigate and resolve this issue.`
  )}`

  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <div className="font-semibold text-red-900 dark:text-red-100">{job.jobName}</div>
          </div>
          <div className="text-sm text-red-600 dark:text-red-400 mt-1 ml-6">
            Source: <span className="font-medium">{job.source}</span>
          </div>
        </div>
        <Badge variant="destructive" className="text-xs">
          Retry {job.retryCount}
        </Badge>
      </div>

      <div className="space-y-2 ml-6">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Failed:</span>
            <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">
              {formatDistanceToNow(job.failedAt, { addSuffix: true })}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Attempts:</span>
            <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">
              {job.retryCount} {job.retryCount === 1 ? 'retry' : 'retries'}
            </p>
          </div>
        </div>

        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Error Message:</span>
          <div className="mt-1 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
            {job.errorMessage}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Retry Job
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(jobUrl, '_blank')}
            className="text-xs"
          >
            <FileText className="h-3 w-3 mr-1.5" />
            View Error Logs
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = mailtoLink}
            className="text-xs"
          >
            <Mail className="h-3 w-3 mr-1.5" />
            Report Issue
          </Button>
        </div>
      </div>
    </div>
  )
}
