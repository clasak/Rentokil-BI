"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import {
  Brain, AlertTriangle, AlertCircle, Info, Clock,
  CheckCircle, RefreshCw, Database, TrendingUp, TrendingDown
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { AnomalyAlert, AnomalySeverity } from '@/lib/bigquery/queries/anomaly-detection'
import { formatDistanceToNow } from 'date-fns'

// Empty state (no mock fallback - BigQuery only)
const EMPTY_ALERTS: AnomalyAlert[] = []

export default function AnomaliesPage() {
  const [mounted, setMounted] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch anomaly alerts
  const {
    data: anomalies,
    isLoading,
    dataSource,
    responseTime,
    error,
    refetch,
  } = useBigQueryData<AnomalyAlert[], AnomalyAlert[]>({
    queryName: 'anomaly-alerts',
    defaultData: EMPTY_ALERTS,
    transformBigQueryData: (data) => data,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  const criticalCount = anomalies.filter(a => a.severity === 'critical' && !a.acknowledged).length
  const warningCount = anomalies.filter(a => a.severity === 'warning' && !a.acknowledged).length
  const infoCount = anomalies.filter(a => a.severity === 'info' && !a.acknowledged).length

  const getSeverityIcon = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getSeverityBadge = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>
      case 'warning':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Warning</Badge>
      case 'info':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Info</Badge>
    }
  }

  const getCardStyle = (severity: AnomalySeverity, acknowledged: boolean) => {
    if (acknowledged) {
      return 'bg-muted/50 border-muted opacity-75'
    }
    switch (severity) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  }

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <p className="text-lg font-medium">Error Loading Anomalies</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Admin', href: '/admin' },
        { label: 'Anomalies' }
      ]} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            Anomaly Detection
          </h1>
          <p className="text-muted-foreground mt-1">
            Statistical anomaly detection using Z-score analysis (last 7 days)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total Alerts</div>
                <div className="text-3xl font-bold">{anomalies.length}</div>
              </div>
              <Brain className="h-10 w-10 text-primary opacity-50" />
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              Last 7 days
            </div>
          </CardContent>
        </Card>

        <Card className={criticalCount > 0 ? 'border-red-200 dark:border-red-800' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Critical</div>
                <div className={`text-3xl font-bold ${criticalCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {criticalCount}
                </div>
              </div>
              <AlertCircle className={`h-10 w-10 opacity-50 ${criticalCount > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              {criticalCount === 0 ? 'All clear' : 'Requires immediate attention'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Warning</div>
                <div className="text-3xl font-bold text-amber-500">{warningCount}</div>
              </div>
              <AlertTriangle className="h-10 w-10 text-amber-500 opacity-50" />
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              Monitor closely
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Info</div>
                <div className="text-3xl font-bold text-blue-500">{infoCount}</div>
              </div>
              <Info className="h-10 w-10 text-blue-500 opacity-50" />
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              Notable deviations
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Detected Anomalies</CardTitle>
          <CardDescription>
            Statistical anomalies detected using Z-score analysis on daily revenue and sales metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <p className="text-xl font-medium text-green-700 dark:text-green-300 mb-2">
                No Anomalies Detected
              </p>
              <p className="text-muted-foreground max-w-md mx-auto">
                All KPIs are within normal ranges. Daily revenue and sales metrics show no statistical deviations (Z-score &lt; 1.5σ).
              </p>
              <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>W3_Contract_Checker.T0_unf_Contract_All</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>90-day rolling analysis</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {anomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`p-4 border rounded-lg ${getCardStyle(anomaly.severity, anomaly.acknowledged || false)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getSeverityIcon(anomaly.severity)}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {anomaly.metric}
                          {getSeverityBadge(anomaly.severity)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Detected {formatDistanceToNow(anomaly.detectionTime, { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === anomaly.id ? null : anomaly.id)}
                    >
                      {expandedId === anomaly.id ? 'Hide Details' : 'View Details'}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm">{anomaly.description}</p>

                    {expandedId === anomaly.id && (
                      <div className="mt-4 space-y-3 pt-3 border-t">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground">Actual Value</div>
                            <div className="font-semibold">
                              {anomaly.metric === 'Daily Revenue'
                                ? `$${anomaly.actualValue.toLocaleString()}`
                                : anomaly.actualValue.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Expected Value</div>
                            <div className="font-semibold">
                              {anomaly.metric === 'Daily Revenue'
                                ? `$${Math.round(anomaly.expectedValue).toLocaleString()}`
                                : Math.round(anomaly.expectedValue).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Z-Score</div>
                            <div className="font-semibold">{anomaly.zScore.toFixed(2)}σ</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Deviation</div>
                            <div className="font-semibold flex items-center gap-1">
                              {anomaly.actualValue > anomaly.expectedValue ? (
                                <>
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                  <span className="text-green-600">
                                    +{(((anomaly.actualValue - anomaly.expectedValue) / anomaly.expectedValue) * 100).toFixed(1)}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="h-4 w-4 text-red-500" />
                                  <span className="text-red-600">
                                    {(((anomaly.actualValue - anomaly.expectedValue) / anomaly.expectedValue) * 100).toFixed(1)}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="text-xs font-medium text-muted-foreground mb-1">Likely Cause</div>
                          <p className="text-sm">{anomaly.likelyCause}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <div className="text-xs font-medium text-muted-foreground">Affected KPIs:</div>
                          {anomaly.affectedKPIs.map((kpi) => (
                            <Badge key={kpi} variant="secondary" className="text-xs">
                              {kpi}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Source Info */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="h-4 w-4" />
            <span>
              Z-score analysis on W3_Contract_Checker.T0_unf_Contract_All (7.8M rows)
              {' • '}
              Detection thresholds: Critical &gt;3σ, Warning &gt;2σ, Info &gt;1.5σ
              {' • '}
              90-day rolling window
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
