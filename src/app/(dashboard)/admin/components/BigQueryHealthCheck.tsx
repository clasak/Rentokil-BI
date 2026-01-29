"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  Database, Loader2, CheckCircle, XCircle, Server, RefreshCw,
  Activity, Clock, AlertTriangle, Play, Trash2, ExternalLink,
  ChevronDown, ChevronRight, Eye, FileText, Mail, Settings
} from 'lucide-react'

interface QueryHealthResult {
  id: string
  page: string
  category: string
  status: 'ok' | 'error'
  responseTime: number
  rowCount?: number
  sampleData?: Record<string, unknown>[]
  error?: string
  lastRun: string
}

interface HealthCheckResponse {
  timestamp: string
  connection: {
    status: 'connected' | 'failed'
    projectId: string
    environment: string
    authMethod: 'ADC' | 'service-account'
    responseTime?: number
    error?: string
  }
  queries: QueryHealthResult[]
  summary: {
    total: number
    passed: number
    failed: number
    avgResponseTime: number
  }
}

interface ErrorLogEntry {
  timestamp: string
  queryId: string
  error: string
}

export function BigQueryHealthCheck() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null)
  const [errorLog, setErrorLog] = useState<ErrorLogEntry[]>([])
  const [lastCheck, setLastCheck] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRowExpanded = (queryId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(queryId)) {
        next.delete(queryId)
      } else {
        next.add(queryId)
      }
      return next
    })
  }

  // Load error log from localStorage
  useEffect(() => {
    const savedErrors = localStorage.getItem('bigquery-error-log')
    if (savedErrors) {
      try {
        setErrorLog(JSON.parse(savedErrors))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Save error log to localStorage
  const saveErrorLog = useCallback((errors: ErrorLogEntry[]) => {
    localStorage.setItem('bigquery-error-log', JSON.stringify(errors.slice(0, 10)))
  }, [])

  const runHealthCheck = async () => {
    setLoading(true)
    setProgress(10)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90))
      }, 200)

      const response = await fetch('/api/bigquery/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (response.ok) {
        const data: HealthCheckResponse = await response.json()
        setHealthData(data)
        setLastCheck(new Date().toISOString())

        // Add any errors to the log
        const newErrors = data.queries
          .filter(q => q.status === 'error')
          .map(q => ({
            timestamp: q.lastRun,
            queryId: q.id,
            error: q.error || 'Unknown error',
          }))

        if (newErrors.length > 0) {
          const updatedLog = [...newErrors, ...errorLog].slice(0, 10)
          setErrorLog(updatedLog)
          saveErrorLog(updatedLog)
        }
      } else {
        const errorData = await response.json()
        setHealthData(errorData)
      }
    } catch (error) {
      const newError: ErrorLogEntry = {
        timestamp: new Date().toISOString(),
        queryId: 'connection',
        error: error instanceof Error ? error.message : 'Health check failed',
      }
      const updatedLog = [newError, ...errorLog].slice(0, 10)
      setErrorLog(updatedLog)
      saveErrorLog(updatedLog)
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 500)
    }
  }

  const retryFailedQueries = async () => {
    if (!healthData) return

    const failedQueries = healthData.queries
      .filter(q => q.status === 'error')
      .map(q => q.id)

    if (failedQueries.length === 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/bigquery/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: failedQueries }),
      })

      if (response.ok) {
        const retryData: HealthCheckResponse = await response.json()

        // Merge retry results with existing data
        const updatedQueries = healthData.queries.map(q => {
          const retried = retryData.queries.find(r => r.id === q.id)
          return retried || q
        })

        const passed = updatedQueries.filter(r => r.status === 'ok').length
        const failed = updatedQueries.filter(r => r.status === 'error').length

        setHealthData({
          ...healthData,
          queries: updatedQueries,
          summary: {
            ...healthData.summary,
            passed,
            failed,
          },
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const clearErrorLog = () => {
    setErrorLog([])
    localStorage.removeItem('bigquery-error-log')
  }

  const switchToMockData = () => {
    localStorage.setItem('data-source-mode', 'mock')
    window.dispatchEvent(new CustomEvent('data-source-changed', { detail: 'mock' }))
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffMs / 60000)

    if (diffSecs < 60) return `${diffSecs}s ago`
    if (diffMins < 60) return `${diffMins}m ago`
    return date.toLocaleTimeString()
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'leads': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'sales': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'finance': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'termite': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'salti': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
      case 'ops': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
      case 'hr': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
      case 'workforce': return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
      case 'branch': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'executive': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'ae': return 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400'
      case 'organization': return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                BigQuery Connection Health
              </CardTitle>
              <CardDescription>
                Real-time connection status and environment details
              </CardDescription>
            </div>
            <Button
              onClick={runHealthCheck}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Health Check
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          {loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Running health checks...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Connection Details */}
          {healthData?.connection && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                <div className="flex items-center gap-2 mt-1">
                  {healthData.connection.status === 'connected' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`font-medium ${
                    healthData.connection.status === 'connected'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {healthData.connection.status === 'connected' ? 'Connected' : 'Failed'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400">Project ID</div>
                <div className="font-mono text-sm mt-1 dark:text-gray-100 truncate" title={healthData.connection.projectId}>
                  {healthData.connection.projectId}
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400">Environment</div>
                <div className="mt-1">
                  <Badge className={
                    healthData.connection.environment === 'production'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : healthData.connection.environment === 'staging'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }>
                    {healthData.connection.environment}
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400">Auth Method</div>
                <div className="font-medium text-sm mt-1 dark:text-gray-100">
                  {healthData.connection.authMethod}
                </div>
              </div>
            </div>
          )}

          {healthData?.connection.error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">Connection Error</span>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
                  {healthData.connection.error}
                </div>
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mb-2 font-medium">Common Causes:</p>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4 list-disc">
                    <li>Missing or invalid Google Cloud credentials (ADC not configured)</li>
                    <li>Service account lacks BigQuery permissions (roles/bigquery.user, roles/bigquery.dataViewer)</li>
                    <li>Project ID mismatch or invalid BIGQUERY_ENVIRONMENT setting</li>
                    <li>Network connectivity issues or firewall blocking Google Cloud APIs</li>
                  </ul>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runHealthCheck}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Retry Connection
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://console.cloud.google.com/bigquery', '_blank')}
                    className="text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1.5" />
                    Open BigQuery Console
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://console.cloud.google.com/iam-admin/serviceaccounts', '_blank')}
                    className="text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1.5" />
                    Check Credentials
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `mailto:data-engineering@prestox.com?subject=BigQuery Connection Error&body=${encodeURIComponent(
                      `Connection Error:\n${healthData.connection.error}\n\n` +
                      `Project ID: ${healthData.connection.projectId}\n` +
                      `Environment: ${healthData.connection.environment}\n` +
                      `Auth Method: ${healthData.connection.authMethod}\n\n` +
                      `Please investigate and resolve this connection issue.`
                    )}`}
                    className="text-xs"
                  >
                    <Mail className="h-3 w-3 mr-1.5" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>
          )}

          {lastCheck && (
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last check: {formatRelativeTime(lastCheck)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Query Health Table */}
      {healthData && healthData.queries.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Query Health Status
                </CardTitle>
                <CardDescription>
                  Status of all {healthData.summary.total} BigQuery queries across dashboard pages
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-green-600 dark:text-green-400">{healthData.summary.passed}</span>
                    <span className="text-gray-500">passed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-red-600 dark:text-red-400">{healthData.summary.failed}</span>
                    <span className="text-gray-500">failed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="font-medium dark:text-gray-100">{healthData.summary.avgResponseTime}ms</span>
                    <span className="text-gray-500">avg</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border dark:border-gray-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800">
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-40">Page</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead className="w-20 text-center">Status</TableHead>
                    <TableHead className="w-20 text-center">Rows</TableHead>
                    <TableHead className="w-20 text-center">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthData.queries.map((query) => {
                    const isExpanded = expandedRows.has(query.id)
                    const hasSampleData = query.sampleData && query.sampleData.length > 0

                    return (
                      <React.Fragment key={query.id}>
                        <TableRow
                          className={`${query.status === 'error' ? 'bg-red-50 dark:bg-red-900/10' : ''} ${hasSampleData ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`}
                          onClick={() => hasSampleData && toggleRowExpanded(query.id)}
                        >
                          <TableCell className="py-2">
                            {hasSampleData ? (
                              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            ) : query.status === 'error' ? (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            ) : null}
                          </TableCell>
                          <TableCell className="font-mono text-xs py-2">
                            <a
                              href={query.page}
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1"
                            >
                              {query.page}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <Badge className={getCategoryColor(query.category)}>
                                {query.category}
                              </Badge>
                              <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                {query.id}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-2">
                            {query.status === 'ok' ? (
                              <div className="flex items-center justify-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1" title={query.error}>
                                <XCircle className="h-4 w-4 text-red-500" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            {query.rowCount !== undefined ? (
                              <span className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
                                {query.rowCount.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <span className={`font-mono text-xs ${
                              query.responseTime > 2000
                                ? 'text-red-600 dark:text-red-400'
                                : query.responseTime > 1000
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-green-600 dark:text-green-400'
                            }`}>
                              {query.responseTime}ms
                            </span>
                          </TableCell>
                        </TableRow>
                        {/* Expanded row with sample data or error */}
                        {isExpanded && (
                          <TableRow key={`${query.id}-detail`} className="bg-gray-50 dark:bg-gray-800/50">
                            <TableCell colSpan={6} className="p-0">
                              <div className="p-4">
                                {query.status === 'error' ? (
                                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <div className="space-y-3">
                                      <div>
                                        <div className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Query Failed</div>
                                        <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
                                          {query.error}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">Page:</span>
                                          <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">
                                            {query.page}
                                          </p>
                                        </div>
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">Category:</span>
                                          <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">
                                            {query.category}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            retryFailedQueries()
                                          }}
                                          className="text-xs"
                                        >
                                          <RefreshCw className="h-3 w-3 mr-1.5" />
                                          Retry Query
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            window.open(`https://console.cloud.google.com/bigquery?project=${healthData?.connection.projectId}`, '_blank')
                                          }}
                                          className="text-xs"
                                        >
                                          <FileText className="h-3 w-3 mr-1.5" />
                                          View in BigQuery
                                          <ExternalLink className="h-3 w-3 ml-1" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            window.location.href = `mailto:data-engineering@prestox.com?subject=Query Error: ${encodeURIComponent(query.id)}&body=${encodeURIComponent(
                                              `Query ID: ${query.id}\n` +
                                              `Page: ${query.page}\n` +
                                              `Category: ${query.category}\n\n` +
                                              `Error Message:\n${query.error}\n\n` +
                                              `Please investigate and resolve this query issue.`
                                            )}`
                                          }}
                                          className="text-xs"
                                        >
                                          <Mail className="h-3 w-3 mr-1.5" />
                                          Report Issue
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : query.sampleData && query.sampleData.length > 0 ? (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Eye className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Sample Data (first {query.sampleData.length} row{query.sampleData.length !== 1 ? 's' : ''})
                                      </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b dark:border-gray-700">
                                            {Object.keys(query.sampleData[0]).map((key) => (
                                              <th key={key} className="px-2 py-1 text-left font-medium text-gray-600 dark:text-gray-400">
                                                {key}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {query.sampleData.map((row, i) => (
                                            <tr key={i} className="border-b dark:border-gray-700 last:border-0">
                                              {Object.values(row).map((value, j) => (
                                                <td key={j} className="px-2 py-1 font-mono text-gray-800 dark:text-gray-200 max-w-[200px] truncate" title={String(value)}>
                                                  {value === null ? (
                                                    <span className="text-gray-400 italic">null</span>
                                                  ) : typeof value === 'number' ? (
                                                    value.toLocaleString(undefined, { maximumFractionDigits: 4 })
                                                  ) : (
                                                    String(value)
                                                  )}
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    No sample data available
                                  </div>
                                )}
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
      )}

      {/* Error Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Log
              </CardTitle>
              <CardDescription>
                Last 10 BigQuery errors
              </CardDescription>
            </div>
            {errorLog.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearErrorLog}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {errorLog.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>No errors recorded</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {errorLog.map((error, i) => (
                <div
                  key={i}
                  className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {error.queryId}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(error.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-400 mb-3" title={error.error}>
                    {error.error}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={runHealthCheck}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1.5" />
                      Retry
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `mailto:data-engineering@prestox.com?subject=Query Error: ${encodeURIComponent(error.queryId)}&body=${encodeURIComponent(
                        `Query ID: ${error.queryId}\n` +
                        `Timestamp: ${error.timestamp}\n\n` +
                        `Error Message:\n${error.error}\n\n` +
                        `Please investigate and resolve this issue.`
                      )}`}
                      className="text-xs"
                    >
                      <Mail className="h-3 w-3 mr-1.5" />
                      Report
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={switchToMockData}
              className="gap-2"
            >
              <Database className="h-4 w-4" />
              Switch to Demo Data
            </Button>
            <Button
              variant="outline"
              onClick={retryFailedQueries}
              disabled={loading || !healthData?.summary.failed}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Failed ({healthData?.summary.failed || 0})
            </Button>
            <a href="/api/bigquery/health" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View Raw Health API
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
