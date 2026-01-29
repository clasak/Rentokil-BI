"use client"

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Database, Loader2, CheckCircle, XCircle, Server, RefreshCw, AlertTriangle } from 'lucide-react'

type DataSourceMode = 'mock' | 'bigquery'
type BigQueryEnvironment = 'production' | 'staging' | 'dev'

const ENVIRONMENT_CONFIG: Record<BigQueryEnvironment, { project: string; color: string; description: string }> = {
  production: {
    project: 'bidata-sharedus-production',
    color: 'bg-green-500',
    description: 'Live production data - handle with care'
  },
  staging: {
    project: 'bidata-sharedus-staging',
    color: 'bg-yellow-500',
    description: 'Pre-production testing environment'
  },
  dev: {
    project: 'bidata-sharedus-dev',
    color: 'bg-blue-500',
    description: 'Development environment - safe to experiment'
  }
}

interface BigQueryHealth {
  status: 'healthy' | 'unhealthy' | 'unknown'
  projectId?: string
  environment?: string
  responseTime?: number
  error?: string
}

export function BigQueryDataSourceToggle() {
  const [dataSource, setDataSource] = useState<DataSourceMode>('mock')
  const [environment, setEnvironment] = useState<BigQueryEnvironment>('production')
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [health, setHealth] = useState<BigQueryHealth>({ status: 'unknown' })

  // Load saved preferences
  useEffect(() => {
    const savedSource = localStorage.getItem('data-source-mode')
    if (savedSource === 'bigquery' || savedSource === 'mock') {
      setDataSource(savedSource)
    }
    const savedEnv = localStorage.getItem('bigquery-environment')
    if (savedEnv === 'production' || savedEnv === 'staging' || savedEnv === 'dev') {
      setEnvironment(savedEnv)
    }
    setLoading(false)
  }, [])

  // Handle environment change
  const handleEnvironmentChange = (env: BigQueryEnvironment) => {
    setEnvironment(env)
    localStorage.setItem('bigquery-environment', env)
    window.dispatchEvent(new CustomEvent('bigquery-environment-changed', { detail: env }))
    // Re-check health with new environment
    checkHealth()
  }

  // Check BigQuery health
  const checkHealth = async () => {
    setChecking(true)
    try {
      const response = await fetch('/api/bigquery/health')
      if (response.ok) {
        const data = await response.json()
        setHealth({
          status: data.status === 'healthy' ? 'healthy' : 'unhealthy',
          projectId: data.bigquery?.projectId,
          environment: data.bigquery?.environment,
          responseTime: data.bigquery?.responseTime,
        })
      } else {
        setHealth({
          status: 'unhealthy',
          error: 'Failed to connect to BigQuery',
        })
      }
    } catch (error) {
      setHealth({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Connection failed',
      })
    } finally {
      setChecking(false)
    }
  }

  // Check health on mount
  useEffect(() => {
    checkHealth()
  }, [])

  const handleToggle = (checked: boolean) => {
    const newMode: DataSourceMode = checked ? 'bigquery' : 'mock'
    setDataSource(newMode)
    localStorage.setItem('data-source-mode', newMode)

    // Show a toast/notification that page reload is needed
    window.dispatchEvent(new CustomEvent('data-source-changed', { detail: newMode }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={dataSource === 'bigquery' ? 'border-2 border-blue-500' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Dashboard Data Source
              {dataSource === 'bigquery' && (
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Live Data
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Switch between demo data (mock) and live BigQuery data
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${dataSource === 'mock' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
              Demo
            </span>
            <Switch
              checked={dataSource === 'bigquery'}
              onCheckedChange={handleToggle}
              disabled={health.status !== 'healthy'}
            />
            <span className={`text-sm font-medium ${dataSource === 'bigquery' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              Live
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            {health.status === 'healthy' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : health.status === 'unhealthy' ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            )}
            <div>
              <div className="font-medium dark:text-gray-100">
                BigQuery Connection
              </div>
              {health.status === 'healthy' && health.projectId && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {health.projectId} ({health.environment})
                  {health.responseTime && ` - ${health.responseTime}ms`}
                </div>
              )}
              {health.status === 'unhealthy' && health.error && (
                <div className="text-sm text-red-500">
                  {health.error}
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkHealth}
            disabled={checking}
            className="gap-2"
          >
            {checking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Check
          </Button>
        </div>

        {/* Environment Selector */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium dark:text-gray-100">BigQuery Environment</div>
            {environment !== 'production' && (
              <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Non-Production
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ENVIRONMENT_CONFIG) as BigQueryEnvironment[]).map((env) => {
              const config = ENVIRONMENT_CONFIG[env]
              const isSelected = environment === env
              return (
                <button
                  key={env}
                  onClick={() => handleEnvironmentChange(env)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? env === 'production'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : env === 'staging'
                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${config.color}`} />
                    <span className="font-medium text-sm capitalize dark:text-gray-100">{env}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {config.project}
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {ENVIRONMENT_CONFIG[environment].description}
          </p>
        </div>

        {/* Data Source Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg border-2 ${dataSource === 'mock' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4" />
              <span className="font-medium dark:text-gray-100">Demo Data (Mock)</span>
            </div>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>Synthetic deterministic data</li>
              <li>Always available offline</li>
              <li>Fast response times</li>
              <li>Predictable for demos</li>
            </ul>
          </div>
          <div className={`p-4 rounded-lg border-2 ${dataSource === 'bigquery' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4" />
              <span className="font-medium dark:text-gray-100">Live Data (BigQuery)</span>
            </div>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>Real production data</li>
              <li>Updated daily</li>
              <li>Requires network access</li>
              <li>Falls back to mock on error</li>
            </ul>
          </div>
        </div>

        {/* Active Pages with BigQuery Support */}
        {dataSource === 'bigquery' && health.status === 'healthy' && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
              Pages with Live Data Support:
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">Leads (5 pages)</Badge>
              <Badge variant="outline" className="text-xs">Sales (5 pages)</Badge>
              <Badge variant="outline" className="text-xs">Finance/AR</Badge>
              <Badge variant="outline" className="text-xs">Termite (2 pages)</Badge>
              <Badge variant="outline" className="text-xs">SALTI Funnel</Badge>
            </div>
          </div>
        )}

        {/* Warning if switching to BigQuery but unhealthy */}
        {health.status === 'unhealthy' && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="text-sm text-yellow-800 dark:text-yellow-300">
              BigQuery connection is not available. Live data mode is disabled.
              Using demo data for all pages.
            </div>
          </div>
        )}

        <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <Database className="h-3 w-3" />
          Changes apply on next page load. Data source preference is stored locally.
        </div>
      </CardContent>
    </Card>
  )
}
