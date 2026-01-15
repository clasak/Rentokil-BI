"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Activity, CheckCircle, AlertTriangle, Clock,
  Zap, Server, Database, ExternalLink
} from 'lucide-react'
import { PlatformHealthMetrics, getFailedJobs, FailedJob } from '@/lib/platform-admin-data'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
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

  const etlSuccessRate = (metrics.etlJobsSuccess / metrics.etlJobsTotal) * 100

  const getStatusColor = (value: number, threshold: number, inverse = false) => {
    if (inverse) {
      return value <= threshold ? 'text-green-500' : 'text-red-500'
    }
    return value >= threshold ? 'text-green-500' : 'text-red-500'
  }

  const getStatusBadge = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value <= threshold : value >= threshold
    return (
      <Badge variant={isGood ? 'default' : 'destructive'} className={isGood ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
        {isGood ? 'Healthy' : 'Degraded'}
      </Badge>
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
              <div className={`text-2xl font-bold ${getStatusColor(etlSuccessRate, 99)}`}>
                {metrics.etlJobsSuccess}/{metrics.etlJobsTotal}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {etlSuccessRate.toFixed(1)}% success rate
              </div>
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
  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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
      <div className="mt-2 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Failed {formatDistanceToNow(job.failedAt, { addSuffix: true })}
      </div>
    </div>
  )
}
