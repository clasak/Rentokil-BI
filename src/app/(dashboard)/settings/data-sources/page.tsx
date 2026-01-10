"use client"

import { useState, useEffect } from 'react'
import {
  DATA_SOURCE,
  getDataSourceName,
  getDataSourceStatus,
  isRTXConfigured,
  rtxClient,
  type DataSourceType,
  type RTXConnectionStatus
} from '@/services'
import { DATA_SOURCES_METADATA, type DataSource } from '@/lib/data-dictionary'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  AlertCircle, CheckCircle, Database, RefreshCw, Settings,
  Clock, Zap, Server, Shield, AlertTriangle, Activity,
  Loader2, ExternalLink, Copy, Eye, EyeOff, Info
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface DataSourceConfig {
  source: DataSourceType
  name: string
  configured: boolean
  status: 'connected' | 'disconnected' | 'error' | 'not_configured'
  lastSync?: string
  refreshInterval?: number
  responseTime?: number
}

// Simulated sync state
interface SyncState {
  rtx: { lastSync: string; nextSync: string; status: 'idle' | 'syncing' | 'error' }
  salesforce: { lastSync: string; nextSync: string; status: 'idle' | 'syncing' | 'error' }
  pestpac: { lastSync: string; nextSync: string; status: 'idle' | 'syncing' | 'error' }
}

export default function DataSourcesPage() {
  const [activeSource, setActiveSource] = useState<DataSourceType>(DATA_SOURCE)
  const [connectionStatus, setConnectionStatus] = useState<RTXConnectionStatus | null>(null)
  const [testing, setTesting] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  // Simulated form state (in production these would update env vars or a config store)
  const [rtxEndpoint, setRtxEndpoint] = useState(process.env.RTX_API_ENDPOINT || 'https://rtx-data-hub.rentokil.com/api/v1')
  const [rtxApiKey, setRtxApiKey] = useState('')
  const [rtxTimeout, setRtxTimeout] = useState('30000')

  // Sync intervals (in minutes)
  const [syncIntervals, setSyncIntervals] = useState({
    rtx: 15,
    salesforce: 5,
    pestpac: 15
  })

  // Simulated sync state
  const [syncState, setSyncState] = useState<SyncState>({
    rtx: {
      lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      nextSync: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      status: 'idle'
    },
    salesforce: {
      lastSync: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      nextSync: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
      status: 'idle'
    },
    pestpac: {
      lastSync: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      nextSync: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      status: 'idle'
    }
  })

  const status = getDataSourceStatus()

  // Test RTX connection
  const testRTXConnection = async () => {
    setTesting(true)
    try {
      const result = await rtxClient.testConnection()
      setConnectionStatus(result)
    } catch {
      setConnectionStatus({
        connected: false,
        lastChecked: new Date().toISOString(),
        error: 'Connection test failed'
      })
    }
    setTesting(false)
  }

  // Simulate sync
  const triggerSync = (source: keyof SyncState) => {
    setSyncState(prev => ({
      ...prev,
      [source]: { ...prev[source], status: 'syncing' }
    }))

    // Simulate sync completion after 2 seconds
    setTimeout(() => {
      setSyncState(prev => ({
        ...prev,
        [source]: {
          lastSync: new Date().toISOString(),
          nextSync: new Date(Date.now() + syncIntervals[source] * 60 * 1000).toISOString(),
          status: 'idle'
        }
      }))
    }, 2000)
  }

  const dataSources: DataSourceConfig[] = [
    {
      source: 'mock',
      name: 'Demo Data',
      configured: true,
      status: 'connected',
      lastSync: undefined,
      refreshInterval: undefined
    },
    {
      source: 'rtx',
      name: 'RTX Data Hub',
      configured: isRTXConfigured(),
      status: isRTXConfigured() ? 'connected' : 'not_configured',
      lastSync: syncState.rtx.lastSync,
      refreshInterval: syncIntervals.rtx,
      responseTime: connectionStatus?.responseTime
    },
    {
      source: 'salesforce',
      name: 'Salesforce CRM',
      configured: false,
      status: 'not_configured',
      lastSync: syncState.salesforce.lastSync,
      refreshInterval: syncIntervals.salesforce
    },
    {
      source: 'hybrid',
      name: 'Hybrid Mode',
      configured: isRTXConfigured(),
      status: isRTXConfigured() ? 'connected' : 'not_configured'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Data Sources
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure and monitor data source connections
          </p>
        </div>
      </div>

      {/* Current Status Card */}
      <Card className={`border-l-4 ${
        status.configured ? 'border-l-green-500' : 'border-l-yellow-500'
      }`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Active Data Source</CardTitle>
              <CardDescription>{status.description}</CardDescription>
            </div>
            <Badge
              variant={status.configured ? 'default' : 'outline'}
              className={status.configured
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'text-yellow-600'
              }
            >
              {status.configured ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
              ) : (
                <><AlertTriangle className="h-3 w-3 mr-1" /> Not Configured</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-xl font-semibold">{status.name}</div>
              <div className="text-sm text-muted-foreground">
                Source: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{status.source}</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Source Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Source Configuration</CardTitle>
          <CardDescription>
            Select and configure the primary data source for the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Source Selection */}
          <div className="space-y-2">
            <Label>Primary Data Source</Label>
            <Select value={activeSource} onValueChange={(v) => setActiveSource(v as DataSourceType)}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent>
                {dataSources.map(ds => (
                  <SelectItem key={ds.source} value={ds.source}>
                    <div className="flex items-center gap-2">
                      <span>{ds.name}</span>
                      {!ds.configured && ds.source !== 'mock' && (
                        <Badge variant="outline" className="text-xs">Not Configured</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Change requires restart. Set <code>NEXT_PUBLIC_DATA_SOURCE</code> in .env.local
            </p>
          </div>

          {/* Source Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataSources.filter(ds => ds.source !== 'hybrid').map(ds => (
              <Card key={ds.source} className={`${
                activeSource === ds.source ? 'ring-2 ring-primary' : ''
              }`}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        ds.status === 'connected' ? 'bg-green-500' :
                        ds.status === 'error' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`} />
                      <span className="font-medium">{ds.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {ds.source}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    {ds.configured ? (
                      <>
                        {ds.lastSync && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Last Sync</span>
                            <span>{formatDistanceToNow(new Date(ds.lastSync), { addSuffix: true })}</span>
                          </div>
                        )}
                        {ds.refreshInterval && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Refresh</span>
                            <span>Every {ds.refreshInterval} min</span>
                          </div>
                        )}
                        {ds.responseTime && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Response</span>
                            <span>{ds.responseTime}ms</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-muted-foreground">
                        {ds.source === 'mock' ? 'Always available' : 'Credentials required'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* RTX Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="h-5 w-5" />
            RTX Data Hub Configuration
          </CardTitle>
          <CardDescription>
            Connect to the enterprise RTX Data Hub warehouse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rtx-endpoint">API Endpoint</Label>
              <Input
                id="rtx-endpoint"
                placeholder="https://rtx-data-hub.company.com/api/v1"
                value={rtxEndpoint}
                onChange={(e) => setRtxEndpoint(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rtx-timeout">Timeout (ms)</Label>
              <Input
                id="rtx-timeout"
                type="number"
                placeholder="30000"
                value={rtxTimeout}
                onChange={(e) => setRtxTimeout(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rtx-api-key">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="rtx-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Enter RTX API key"
                  value={rtxApiKey}
                  onChange={(e) => setRtxApiKey(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" onClick={testRTXConnection} disabled={testing}>
                {testing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing</>
                ) : (
                  <><Zap className="h-4 w-4 mr-2" /> Test Connection</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Set <code>RTX_API_KEY</code> in .env.local (credentials are not stored in browser)
            </p>
          </div>

          {/* Connection Test Result */}
          {connectionStatus && (
            <Card className={`mt-4 ${
              connectionStatus.connected
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
            }`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  {connectionStatus.connected ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <div className="font-medium">
                      {connectionStatus.connected ? 'Connection Successful' : 'Connection Failed'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {connectionStatus.connected ? (
                        <>Response time: {connectionStatus.responseTime}ms | Version: {connectionStatus.version || 'Unknown'}</>
                      ) : (
                        connectionStatus.error
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Sync Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sync Schedule
          </CardTitle>
          <CardDescription>
            Configure automatic data refresh intervals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Source</TableHead>
                <TableHead>Refresh Interval</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Next Sync</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(['rtx', 'salesforce', 'pestpac'] as const).map(source => (
                <TableRow key={source}>
                  <TableCell className="font-medium capitalize">{source === 'rtx' ? 'RTX Data Hub' : source === 'pestpac' ? 'PestPac' : 'Salesforce'}</TableCell>
                  <TableCell>
                    <Select
                      value={syncIntervals[source].toString()}
                      onValueChange={(v) => setSyncIntervals(prev => ({ ...prev, [source]: parseInt(v) }))}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Every 5 min</SelectItem>
                        <SelectItem value="15">Every 15 min</SelectItem>
                        <SelectItem value="30">Every 30 min</SelectItem>
                        <SelectItem value="60">Every hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDistanceToNow(new Date(syncState[source].lastSync), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(syncState[source].nextSync), 'h:mm a')}
                  </TableCell>
                  <TableCell>
                    {syncState[source].status === 'syncing' ? (
                      <Badge variant="outline" className="text-blue-600">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Syncing
                      </Badge>
                    ) : syncState[source].status === 'error' ? (
                      <Badge variant="destructive">Error</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" /> Idle
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => triggerSync(source)}
                      disabled={syncState[source].status === 'syncing'}
                    >
                      <RefreshCw className={`h-4 w-4 ${syncState[source].status === 'syncing' ? 'animate-spin' : ''}`} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Data Source Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Data Source Reference
          </CardTitle>
          <CardDescription>
            Overview of all data sources feeding the BI platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(DATA_SOURCES_METADATA).map(([key, source]) => (
              <Card key={key}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{source.name}</div>
                      <Badge variant="outline" className="text-xs mt-1 capitalize">
                        {source.type}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {source.description}
                  </p>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Refresh: {source.refreshFrequency}</span>
                    <span className="text-muted-foreground">{source.owner}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Switch to RTX Data Hub</h4>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1 ml-4">
              <li>Add your RTX API credentials to <code className="bg-muted px-1.5 py-0.5 rounded">.env.local</code></li>
              <li>Set <code className="bg-muted px-1.5 py-0.5 rounded">NEXT_PUBLIC_DATA_SOURCE=rtx</code></li>
              <li>Restart the development server</li>
              <li>All dashboards will automatically use RTX data</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">2. Use Hybrid Mode (Recommended for Testing)</h4>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1 ml-4">
              <li>Set <code className="bg-muted px-1.5 py-0.5 rounded">NEXT_PUBLIC_DATA_SOURCE=hybrid</code></li>
              <li>App will try RTX first, fall back to mock data if unavailable</li>
              <li>Graceful degradation ensures app always works</li>
            </ol>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-blue-800 dark:text-blue-300">Production Ready</div>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  When you receive RTX Data Hub access, simply add credentials and change the environment variable.
                  No code changes required.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
