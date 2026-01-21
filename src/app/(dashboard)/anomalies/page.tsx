"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Brain, AlertTriangle, AlertCircle, Info, Clock,
  ChevronDown, ChevronUp, CheckCircle, ExternalLink,
  RefreshCw, Calendar, Database, Plus, Minus,
  Search, Bell, Settings, History
} from 'lucide-react'
import Link from 'next/link'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, AreaChart, Area
} from 'recharts'
import {
  getAnomalyAlerts,
  getSchemaChangeAlerts,
  AnomalyAlert,
  AnomalySeverity,
  SchemaChangeAlert,
  SchemaChangeType,
  SchemaChangeStatus
} from '@/lib/platform-admin-data'
import { formatDistanceToNow } from 'date-fns'

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([])
  const [schemaChanges, setSchemaChanges] = useState<SchemaChangeAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState('24h')

  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setAnomalies(getAnomalyAlerts())
      setSchemaChanges(getSchemaChangeAlerts())
      setIsLoading(false)
    }, 300)
  }, [timePeriod])

  const criticalCount = anomalies.filter(a => a.severity === 'critical' && !a.acknowledged).length
  const warningCount = anomalies.filter(a => a.severity === 'warning' && !a.acknowledged).length
  const newSchemaChanges = schemaChanges.filter(s => s.status === 'new').length

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

  const getChangeTypeIcon = (type: SchemaChangeType) => {
    switch (type) {
      case 'field_added':
        return <Plus className="h-4 w-4 text-green-500" />
      case 'field_removed':
        return <Minus className="h-4 w-4 text-red-500" />
      case 'type_changed':
        return <RefreshCw className="h-4 w-4 text-amber-500" />
      case 'constraint_changed':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Mock trend data
  const anomalyTrend = [
    { date: 'Mon', critical: 2, warning: 5, info: 8 },
    { date: 'Tue', critical: 1, warning: 4, info: 6 },
    { date: 'Wed', critical: 3, warning: 6, info: 7 },
    { date: 'Thu', critical: 2, warning: 3, info: 5 },
    { date: 'Fri', critical: 1, warning: 4, info: 9 },
    { date: 'Sat', critical: 0, warning: 2, info: 3 },
    { date: 'Sun', critical: criticalCount, warning: warningCount, info: 3 },
  ]

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
            AI-powered anomaly detection and schema change monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          {criticalCount > 0 && (
            <Badge variant="destructive">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              {criticalCount} Critical
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              {warningCount} Warnings
            </Badge>
          )}

          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={criticalCount > 0 ? 'border-red-200 dark:border-red-800' : ''}>
          <CardContent className="pt-6 text-center">
            <AlertCircle className={`h-8 w-8 mx-auto mb-2 ${criticalCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            <div className={`text-3xl font-bold ${criticalCount > 0 ? 'text-red-600' : ''}`}>{criticalCount}</div>
            <div className="text-sm text-muted-foreground">Critical Anomalies</div>
          </CardContent>
        </Card>

        <Card className={newSchemaChanges > 0 ? 'border-amber-200 dark:border-amber-800' : ''}>
          <CardContent className="pt-6 text-center">
            <Database className={`h-8 w-8 mx-auto mb-2 ${newSchemaChanges > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <div className={`text-3xl font-bold ${newSchemaChanges > 0 ? 'text-amber-600' : ''}`}>{newSchemaChanges}</div>
            <div className="text-sm text-muted-foreground">Schema Changes</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <div className="text-3xl font-bold">1</div>
            <div className="text-sm text-muted-foreground">SLA Breaches</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <div className="text-3xl font-bold text-muted-foreground">0</div>
            <div className="text-sm text-muted-foreground">Data Drift</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Monitoring Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList>
              <TabsTrigger value="active">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Active Anomalies
              </TabsTrigger>
              <TabsTrigger value="trends">
                <History className="h-4 w-4 mr-2" />
                Trends
              </TabsTrigger>
              <TabsTrigger value="schema">
                <Database className="h-4 w-4 mr-2" />
                Schema Changes
              </TabsTrigger>
              <TabsTrigger value="config">
                <Settings className="h-4 w-4 mr-2" />
                Alert Config
              </TabsTrigger>
            </TabsList>

            {/* Active Anomalies Tab */}
            <TabsContent value="active" className="mt-6">
              <div className="space-y-3">
                {anomalies.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 border rounded-lg transition-all ${getCardStyle(alert.severity, alert.acknowledged)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {getSeverityBadge(alert.severity)}
                            {alert.acknowledged && (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Acknowledged
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(alert.detectedAt, { addSuffix: true })}
                          </div>
                        </div>

                        <p className="font-medium mb-2">{alert.description}</p>

                        <button
                          onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          {expandedId === alert.id ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              Hide details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Show details
                            </>
                          )}
                        </button>

                        {expandedId === alert.id && (
                          <div className="mt-3 pt-3 border-t space-y-3">
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                                Likely Cause
                              </div>
                              <p className="text-sm">{alert.likelyCause}</p>
                            </div>

                            <div>
                              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                                Affected KPIs
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {alert.affectedKpis.map((kpi) => (
                                  <Link
                                    key={kpi}
                                    href={`/kpi/${kpi}`}
                                    className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors flex items-center gap-1"
                                  >
                                    <code>{kpi}</code>
                                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                  </Link>
                                ))}
                              </div>
                            </div>

                            {!alert.acknowledged && (
                              <div className="flex gap-2 pt-2">
                                <Button size="sm" variant="outline">
                                  Acknowledge
                                </Button>
                                <Button size="sm">
                                  Investigate
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="mt-6">
              <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={anomalyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                              <div className="font-medium mb-2">{label}</div>
                              {payload.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                                  <span className="capitalize">{p.dataKey}:</span>
                                  <span className="font-medium">{p.value}</span>
                                </div>
                              ))}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area type="monotone" dataKey="critical" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="warning" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="info" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">Critical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm">Warning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Info</span>
                </div>
              </div>
            </TabsContent>

            {/* Schema Changes Tab */}
            <TabsContent value="schema" className="mt-6">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Source</TableHead>
                      <TableHead className="w-[140px]">Change Type</TableHead>
                      <TableHead className="w-[150px]">Field</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schemaChanges.map((change) => (
                      <TableRow
                        key={change.id}
                        className={change.status === 'new' ? 'bg-red-50 dark:bg-red-900/10' : ''}
                      >
                        <TableCell className="font-medium">{change.sourceSystem}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getChangeTypeIcon(change.changeType)}
                            <span className="text-sm capitalize">
                              {change.changeType.replace('_', ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {change.fieldName}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={change.impactLevel === 'high' ? 'destructive' : 'outline'}
                            className={
                              change.impactLevel === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              change.impactLevel === 'low' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : ''
                            }
                          >
                            {change.impactLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={change.status === 'new' ? 'destructive' : 'outline'}
                            className={
                              change.status === 'acknowledged' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              change.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''
                            }
                          >
                            {change.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Config Tab */}
            <TabsContent value="config" className="mt-6">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Critical Anomaly Alerts</div>
                        <div className="text-sm text-muted-foreground">
                          Immediate Slack notification on critical detection
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Enabled
                    </Badge>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Schema Change Detection</div>
                        <div className="text-sm text-muted-foreground">
                          Monitor source systems for schema changes
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Enabled
                    </Badge>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">SLA Breach Alerts</div>
                        <div className="text-sm text-muted-foreground">
                          Alert when data freshness SLAs are breached
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Enabled
                    </Badge>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Alert Rules
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
