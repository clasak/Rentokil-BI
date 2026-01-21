'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  GitBranch,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Target,
  Zap,
  Database,
  TrendingUp,
  TrendingDown,
  Info,
  XCircle,
  Activity,
} from 'lucide-react'
import {
  LEAD_FLOWS,
  SOURCE_SYSTEMS,
  calculateOverallTraceability,
  getStatusBadgeVariant,
  getCriticalFlows,
  getFlowsByStatus,
} from '@/lib/bigquery/source-systems'
import type { LeadFlowDefinition, TraceabilityStatus, SourceSystemId } from '@/lib/bigquery/source-systems'

// Helper to get status color classes
function getStatusColorClasses(status: TraceabilityStatus): string {
  switch (status) {
    case 'perfect':
      return 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
    case 'excellent':
      return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
    case 'good':
      return 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
    case 'low':
      return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
    case 'critical':
      return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
    default:
      return 'bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
  }
}

// Helper to get match rate color
function getMatchRateColor(rate: number): string {
  if (rate >= 0.90) return 'text-green-600 dark:text-green-400'
  if (rate >= 0.30) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

// Helper to get match rate background
function getMatchRateBgColor(rate: number): string {
  if (rate >= 0.90) return 'bg-green-500'
  if (rate >= 0.30) return 'bg-yellow-500'
  return 'bg-red-500'
}

// Flow card with system diagram
function FlowVisualization({ flow }: { flow: LeadFlowDefinition }) {
  const matchPercent = Math.round(flow.matchRate * 100)
  const targetPercent = Math.round(flow.targetMatchRate * 100)
  const gap = targetPercent - matchPercent

  return (
    <Card className={`${flow.status === 'critical' ? 'border-red-300 dark:border-red-700' : ''}`}>
      <CardContent className="pt-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
              #{flow.id}
            </span>
            {flow.priority === 'high' && (
              <Badge variant="warning" className="gap-1">
                <Zap className="h-3 w-3" />
                High Priority
              </Badge>
            )}
          </div>
          <Badge variant={getStatusBadgeVariant(flow.status)}>
            {flow.status.charAt(0).toUpperCase() + flow.status.slice(1)}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
          {flow.shortName}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
          {flow.description}
        </p>

        {/* System Flow Diagram */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 mb-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {flow.systems.map((systemId, idx) => {
              const system = SOURCE_SYSTEMS[systemId]
              return (
                <div key={systemId} className="flex items-center">
                  <div
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm"
                    style={{ backgroundColor: system?.color || '#6B7280' }}
                  >
                    {system?.name || systemId}
                  </div>
                  {idx < flow.systems.length - 1 && (
                    <ArrowRight className="h-4 w-4 mx-1 text-gray-400" />
                  )}
                </div>
              )
            })}
          </div>
          <div className="text-center mt-2 text-xs text-gray-500">
            {flow.handoffs} handoff{flow.handoffs !== 1 ? 's' : ''} in flow
          </div>
        </div>

        {/* Match Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Match Rate
            </span>
            <span className={`text-lg font-bold ${getMatchRateColor(flow.matchRate)}`}>
              {matchPercent}%
            </span>
          </div>
          <div className="relative">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getMatchRateBgColor(flow.matchRate)} transition-all`}
                style={{ width: `${matchPercent}%` }}
              />
            </div>
            {/* Target marker */}
            <div
              className="absolute top-0 h-3 w-0.5 bg-gray-800 dark:bg-white"
              style={{ left: `${targetPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Current: {matchPercent}%</span>
            <span>Target: {targetPercent}%</span>
          </div>
        </div>

        {/* Gap indicator */}
        {gap > 0 && (
          <div className={`mt-3 p-2 rounded text-xs ${
            gap > 50 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
            gap > 20 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          }`}>
            <div className="flex items-center gap-1">
              {gap > 50 ? <XCircle className="h-3 w-3" /> :
               gap > 20 ? <AlertTriangle className="h-3 w-3" /> :
               <TrendingUp className="h-3 w-3" />}
              <span>{gap}% gap to target</span>
            </div>
          </div>
        )}

        {/* Key Issues (if critical/low) */}
        {(flow.status === 'critical' || flow.status === 'low') && flow.keyIssues.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Key Issues:
            </div>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              {flow.keyIssues.slice(0, 2).map((issue, i) => (
                <li key={i} className="flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function LeadFlowsPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  const flows = useMemo(() => Object.values(LEAD_FLOWS), [])
  const stats = useMemo(() => calculateOverallTraceability(), [])
  const criticalFlows = useMemo(() => getCriticalFlows(), [])
  const perfectFlows = useMemo(() => getFlowsByStatus('perfect'), [])
  const excellentFlows = useMemo(() => getFlowsByStatus('excellent'), [])
  const goodFlows = useMemo(() => getFlowsByStatus('good'), [])

  // Group flows by category
  const flowsByCategory = useMemo(() => {
    const categories: Record<string, LeadFlowDefinition[]> = {
      residential_outbound: [],
      web_inbound: [],
      trusted_advisor: [],
      commercial: [],
      other: [],
    }
    flows.forEach(flow => {
      categories[flow.category].push(flow)
    })
    return categories
  }, [flows])

  const categoryLabels: Record<string, string> = {
    residential_outbound: 'Residential Outbound',
    web_inbound: 'Web/Email/Chat Inbound',
    trusted_advisor: 'Trusted Advisor',
    commercial: 'Commercial',
    other: 'Other',
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <GitBranch className="h-7 w-7 text-rentokil-red" />
            Lead Flow Visualization
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            All 15 lead journeys with match rates and system handoffs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/lead-service-engine">
            <Button variant="outline" size="sm">
              Lead Service Engine
            </Button>
          </Link>
          <Link href="/lead-service-engine/flows">
            <Button variant="default" size="sm">
              Detailed View
            </Button>
          </Link>
        </div>
      </div>

      {/* Critical Alert */}
      {criticalFlows.length > 0 && (
        <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>{criticalFlows.length} critical flow{criticalFlows.length !== 1 ? 's' : ''}</strong> with match rate below 30%: {criticalFlows.map(f => `Flow #${f.id} (${Math.round(f.matchRate * 100)}%)`).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalFlows}
                </div>
                <div className="text-sm text-gray-500">Total Flows</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(stats.averageMatchRate * 100)}%
                </div>
                <div className="text-sm text-gray-500">Avg Match Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={criticalFlows.length > 0 ? 'border-red-200 dark:border-red-800' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {stats.criticalFlowCount}
                </div>
                <div className="text-sm text-gray-500">Critical (&lt;30%)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {goodFlows.length}
                </div>
                <div className="text-sm text-gray-500">Good (70-90%)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.perfectFlowCount + excellentFlows.length}
                </div>
                <div className="text-sm text-gray-500">Excellent+ (&gt;90%)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Rate Legend */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Excellent/Perfect (&gt;90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Good/Low (30-90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Critical (&lt;30%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flows by Category */}
      {Object.entries(flowsByCategory).map(([category, categoryFlows]) => (
        categoryFlows.length > 0 && (
          <div key={category}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              {categoryLabels[category]}
              <Badge variant="secondary">{categoryFlows.length} flows</Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryFlows
                .sort((a, b) => a.matchRate - b.matchRate)
                .map(flow => (
                  <FlowVisualization key={flow.id} flow={flow} />
                ))}
            </div>
          </div>
        )
      ))}

      {/* Source Systems Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Source Systems Reference
          </CardTitle>
          <CardDescription>
            Systems involved in lead flow tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.values(SOURCE_SYSTEMS).map(system => (
              <div
                key={system.id}
                className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: system.color }}
                  />
                  <span className="font-medium text-sm text-gray-900 dark:text-white">
                    {system.name}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {system.type}
                </div>
                <Badge
                  variant={
                    system.integrationStatus === 'connected' ? 'success' :
                    system.integrationStatus === 'partial' ? 'warning' :
                    'secondary'
                  }
                  className="mt-2 text-xs"
                >
                  {system.integrationStatus}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Flows Summary</CardTitle>
          <CardDescription>
            Complete list of all 15 lead flows with match rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Flow</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Systems</TableHead>
                <TableHead className="text-center">Match Rate</TableHead>
                <TableHead className="text-center">Target</TableHead>
                <TableHead className="text-center">Gap</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flows
                .sort((a, b) => a.matchRate - b.matchRate)
                .map(flow => {
                  const matchPercent = Math.round(flow.matchRate * 100)
                  const targetPercent = Math.round(flow.targetMatchRate * 100)
                  const gap = targetPercent - matchPercent

                  return (
                    <TableRow
                      key={flow.id}
                      className={flow.status === 'critical' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}
                    >
                      <TableCell className="font-mono text-gray-500">
                        #{flow.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{flow.shortName}</span>
                          {flow.priority === 'high' && (
                            <Zap className="h-3 w-3 text-orange-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400 capitalize">
                        {flow.category.replace('_', ' ')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {flow.systems.slice(0, 3).map((sys) => (
                            <div
                              key={sys}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                              style={{ backgroundColor: SOURCE_SYSTEMS[sys]?.color }}
                              title={SOURCE_SYSTEMS[sys]?.name}
                            >
                              {SOURCE_SYSTEMS[sys]?.name.charAt(0)}
                            </div>
                          ))}
                          {flow.systems.length > 3 && (
                            <span className="text-xs text-gray-500">+{flow.systems.length - 3}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${getMatchRateColor(flow.matchRate)}`}>
                          {matchPercent}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-gray-500">
                        {targetPercent}%
                      </TableCell>
                      <TableCell className="text-center">
                        {gap > 0 ? (
                          <span className="flex items-center justify-center gap-1 text-red-600">
                            <TrendingDown className="h-3 w-3" />
                            {gap}%
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1 text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            OK
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(flow.status)}>
                          {flow.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Match Rate</strong> indicates the percentage of leads that can be traced from source to outcome.
          Green (&gt;90%) means excellent traceability, yellow (30-90%) needs improvement, and red (&lt;30%) is critical.
          Click on the Detailed View button to see improvement actions for each flow.
        </AlertDescription>
      </Alert>
    </div>
  )
}
