"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle, AlertCircle, Info, Clock, Zap, Eye,
  CheckCircle, ChevronRight, TrendingDown, Activity
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { AnomalyAlert } from '@/lib/bigquery/queries/anomaly-detection'

const EMPTY_ANOMALIES: AnomalyAlert[] = []

function SeverityIcon({ severity }: { severity: AnomalyAlert['severity'] }) {
  const icons = {
    critical: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />
  }
  return icons[severity]
}

function SeverityBadge({ severity }: { severity: AnomalyAlert['severity'] }) {
  const styles = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[severity]}`}>
      <SeverityIcon severity={severity} />
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  )
}

function StatusBadge({ status }: { status: AnomalyAlert['status'] }) {
  const styles = {
    active: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    investigating: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  }

  const icons = {
    active: <Activity className="h-3 w-3" />,
    investigating: <Eye className="h-3 w-3" />,
    resolved: <CheckCircle className="h-3 w-3" />
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  )
}

function AnomalyCard({ anomaly }: { anomaly: AnomalyAlert }) {
  const [expanded, setExpanded] = useState(false)

  const borderColor = {
    critical: 'border-l-red-500',
    warning: 'border-l-yellow-500',
    info: 'border-l-blue-500'
  }

  const bgColor = {
    critical: anomaly.status === 'active' ? 'bg-red-50/50 dark:bg-red-900/10' : '',
    warning: '',
    info: ''
  }

  return (
    <Card className={`border-l-4 ${borderColor[anomaly.severity]} ${bgColor[anomaly.severity]}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              anomaly.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30' :
              anomaly.severity === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
              'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              <SeverityIcon severity={anomaly.severity} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <SeverityBadge severity={anomaly.severity} />
                <StatusBadge status={anomaly.status} />
              </div>
              <p className="text-sm font-medium">{anomaly.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(anomaly.detectionTime, { addSuffix: true })}
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {anomaly.affectedKPIs.length} KPIs affected
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="shrink-0"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Likely Cause</div>
              <p className="text-sm">{anomaly.likelyCause}</p>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">Affected KPIs</div>
              <div className="flex flex-wrap gap-2">
                {anomaly.affectedKPIs.map(kpi => (
                  <Badge key={kpi} variant="outline" className="text-xs">
                    <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                    {kpi.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            {anomaly.status !== 'resolved' && (
              <div className="flex gap-2 pt-2">
                {anomaly.status === 'active' && (
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" />
                    Investigate
                  </Button>
                )}
                <Button size="sm" variant="outline">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Resolved
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AnomalyDetection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch anomaly alerts from BigQuery
  // Explicit transform for anomaly alerts with null handling
  function transformAnomalyAlerts(bqData: AnomalyAlert[]): AnomalyAlert[] {
    return (bqData || []).map(alert => ({
      id: alert.id ?? '',
      severity: alert.severity ?? 'info',
      status: alert.status ?? 'active',
      description: alert.description ?? '',
      detectionTime: alert.detectionTime ?? new Date(),
      likelyCause: alert.likelyCause ?? '',
      affectedKPIs: alert.affectedKPIs ?? [],
      metric: alert.metric ?? '',
      actualValue: alert.actualValue ?? 0,
      expectedValue: alert.expectedValue ?? 0,
      zScore: alert.zScore ?? 0,
      acknowledged: alert.acknowledged,
    }))
  }

  const {
    data: anomalies,
    isLoading,
  } = useBigQueryData<AnomalyAlert[], AnomalyAlert[]>({
    queryName: 'anomaly-alerts',
    defaultData: EMPTY_ANOMALIES,
    transformBigQueryData: transformAnomalyAlerts,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  const criticalCount = anomalies.filter(a => a.severity === 'critical' && a.status === 'active').length
  const warningCount = anomalies.filter(a => a.severity === 'warning' && a.status !== 'resolved').length
  const activeCount = anomalies.filter(a => a.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Anomaly Detection Alerts
              </CardTitle>
              <CardDescription>
                AI-detected anomalies in data patterns and KPI metrics
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {criticalCount > 0 && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    {criticalCount} Critical
                  </span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    {warningCount} Warning
                  </span>
                </div>
              )}
              <Badge variant="outline">
                {activeCount} Active
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alert by Severity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{criticalCount}</div>
                <div className="text-sm text-muted-foreground">Critical Anomalies</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{warningCount}</div>
                <div className="text-sm text-muted-foreground">Warning Anomalies</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {anomalies.filter(a => a.status === 'resolved').length}
                </div>
                <div className="text-sm text-muted-foreground">Resolved Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly List */}
      <div className="space-y-4">
        {anomalies
          .sort((a, b) => {
            // Sort by severity (critical first), then by status (active first), then by time
            const severityOrder = { critical: 0, warning: 1, info: 2 }
            const statusOrder = { active: 0, investigating: 1, resolved: 2 }
            if (severityOrder[a.severity] !== severityOrder[b.severity]) {
              return severityOrder[a.severity] - severityOrder[b.severity]
            }
            if (statusOrder[a.status] !== statusOrder[b.status]) {
              return statusOrder[a.status] - statusOrder[b.status]
            }
            return b.detectionTime.getTime() - a.detectionTime.getTime()
          })
          .map(anomaly => (
            <AnomalyCard key={anomaly.id} anomaly={anomaly} />
          ))}
      </div>
    </div>
  )
}
