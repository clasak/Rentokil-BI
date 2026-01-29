"use client"

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Info,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Eye,
  ChevronRight,
  Filter,
  Database,
} from 'lucide-react'
import {
  LEAD_FLOWS,
  SOURCE_SYSTEMS,
  getPrioritizedFlows,
  getCriticalFlows,
  calculateOverallTraceability,
  getStatusBadgeVariant,
  getMatchRateStatus,
} from '@/lib/bigquery/source-systems'
import {
  getTraceabilityReport,
  getFlowMetrics,
} from '@/lib/bigquery/lead-traceability'
import type { LeadFlowDefinition, TraceabilityStatus } from '@/lib/bigquery/source-systems'
import type { FlowTraceabilityMetrics } from '@/lib/bigquery/types'
import { formatCurrency } from '@/lib/utils'

// Flow status colors
function getStatusColor(status: TraceabilityStatus): string {
  switch (status) {
    case 'perfect':
      return 'bg-emerald-500'
    case 'excellent':
      return 'bg-green-500'
    case 'good':
      return 'bg-blue-500'
    case 'low':
      return 'bg-yellow-500'
    case 'critical':
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
}

// Flow card component
function FlowCard({
  flow,
  metrics,
  isSelected,
  onSelect,
}: {
  flow: LeadFlowDefinition
  metrics: FlowTraceabilityMetrics | null
  isSelected: boolean
  onSelect: () => void
}) {
  const matchPercent = Math.round(flow.matchRate * 100)
  const targetPercent = Math.round(flow.targetMatchRate * 100)
  const gap = targetPercent - matchPercent

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary shadow-md' : ''
      } ${flow.status === 'critical' ? 'border-red-200 dark:border-red-800' : ''}`}
      onClick={onSelect}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(flow.status)}`} />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Flow #{flow.id}
            </span>
          </div>
          <Badge variant={getStatusBadgeVariant(flow.status)}>
            {flow.status === 'perfect' ? '100%' : `${matchPercent}%`}
          </Badge>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
          {flow.shortName}
        </h3>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
          {flow.description}
        </p>

        {/* System flow visualization */}
        <div className="flex items-center gap-1 mb-3 overflow-x-auto py-1">
          {flow.systems.map((system, idx) => (
            <div key={system} className="flex items-center">
              <div
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 whitespace-nowrap"
                style={{ color: SOURCE_SYSTEMS[system]?.color }}
              >
                {SOURCE_SYSTEMS[system]?.name || system}
              </div>
              {idx < flow.systems.length - 1 && (
                <ArrowRight className="h-3 w-3 mx-1 text-gray-400 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Match Rate</span>
            <span className={gap > 20 ? 'text-red-600' : gap > 10 ? 'text-yellow-600' : 'text-green-600'}>
              {gap > 0 ? `${gap}% gap to target` : 'At target'}
            </span>
          </div>
          <div className="relative">
            <Progress value={matchPercent} className="h-2" />
            <div
              className="absolute top-0 h-2 w-0.5 bg-gray-800 dark:bg-white"
              style={{ left: `${targetPercent}%` }}
            />
          </div>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {metrics.totalLeads}
              </div>
              <div className="text-[10px] text-gray-500">Leads</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(metrics.totalValue)}
              </div>
              <div className="text-[10px] text-gray-500">Value</div>
            </div>
          </div>
        )}

        {/* Priority badge */}
        {flow.priority === 'high' && (
          <div className="mt-3 flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
            <Zap className="h-3 w-3" />
            High Priority
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Flow detail panel
function FlowDetailPanel({
  flow,
  metrics,
}: {
  flow: LeadFlowDefinition
  metrics: FlowTraceabilityMetrics | null
}) {
  const matchPercent = Math.round(flow.matchRate * 100)

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant={getStatusBadgeVariant(flow.status)} className="mb-2">
            {flow.status.charAt(0).toUpperCase() + flow.status.slice(1)}
          </Badge>
          <span className="text-sm text-gray-500">Flow #{flow.id}</span>
        </div>
        <CardTitle>{flow.name}</CardTitle>
        <CardDescription>{flow.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Match Rate Visual */}
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Match Rate</span>
            <span className={`text-2xl font-bold ${
              flow.status === 'critical' ? 'text-red-600' :
              flow.status === 'low' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {matchPercent}%
            </span>
          </div>
          <Progress value={matchPercent} className="h-3" />
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>Current</span>
            <span>Target: {Math.round(flow.targetMatchRate * 100)}%</span>
          </div>
        </div>

        {/* System Journey */}
        <div>
          <h4 className="text-sm font-semibold mb-3">System Journey ({flow.handoffs} handoff{flow.handoffs !== 1 ? 's' : ''})</h4>
          <div className="space-y-2">
            {flow.systems.map((system, idx) => (
              <div key={system} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: SOURCE_SYSTEMS[system]?.color || '#6B7280' }}
                >
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{SOURCE_SYSTEMS[system]?.name || system}</div>
                  <div className="text-xs text-gray-500">{SOURCE_SYSTEMS[system]?.type}</div>
                </div>
                {idx < flow.systems.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Breakpoints */}
        {metrics && metrics.breakpoints.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Where Leads Are Lost
            </h4>
            <div className="space-y-2">
              {metrics.breakpoints.map((bp, idx) => (
                <div key={idx} className="p-2 rounded bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {bp.fromSystem} → {bp.toSystem}
                    </span>
                    <Badge variant="warning">{bp.leadsLost} lost</Badge>
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    {Math.round(bp.percentLost)}% of flow volume
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outcomes */}
        {metrics && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Outcomes</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 text-center">
                <div className="text-lg font-bold text-green-600">{metrics.outcomes.sold}</div>
                <div className="text-xs text-gray-500">Sold</div>
              </div>
              <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-center">
                <div className="text-lg font-bold text-red-600">{metrics.outcomes.lost}</div>
                <div className="text-xs text-gray-500">Lost</div>
              </div>
              <div className="p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 text-center">
                <div className="text-lg font-bold text-yellow-600">{metrics.outcomes.pending}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div className="p-2 rounded bg-gray-50 dark:bg-gray-800 text-center">
                <div className="text-lg font-bold text-gray-600">{metrics.outcomes.cancelled}</div>
                <div className="text-xs text-gray-500">Cancelled</div>
              </div>
            </div>
          </div>
        )}

        {/* Key Issues */}
        {flow.keyIssues.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Key Issues</h4>
            <ul className="space-y-2">
              {flow.keyIssues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-300">{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvement Actions */}
        {flow.improvementActions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Improvement Actions</h4>
            <ul className="space-y-2">
              {flow.improvementActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-300">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Value at Risk */}
        {metrics && metrics.atRiskValue > 0 && (
          <Alert className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>{formatCurrency(metrics.atRiskValue)}</strong> at risk from untraceable leads in this flow
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default function LeadFlowsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [flowMetrics, setFlowMetrics] = useState<Map<number, FlowTraceabilityMetrics>>(new Map())

  useEffect(() => {
    // Simulate loading and generate metrics
    const timer = setTimeout(() => {
      const metrics = new Map<number, FlowTraceabilityMetrics>()
      Object.values(LEAD_FLOWS).forEach(flow => {
        const m = getFlowMetrics(flow.id)
        if (m) metrics.set(flow.id, m)
      })
      setFlowMetrics(metrics)
      setIsLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  const overallStats = useMemo(() => calculateOverallTraceability(), [])
  const criticalFlows = useMemo(() => getCriticalFlows(), [])
  const prioritizedFlows = useMemo(() => getPrioritizedFlows(), [])

  const filteredFlows = useMemo(() => {
    let flows = Object.values(LEAD_FLOWS)

    if (categoryFilter !== 'all') {
      flows = flows.filter(f => f.category === categoryFilter)
    }

    if (statusFilter !== 'all') {
      flows = flows.filter(f => f.status === statusFilter)
    }

    return flows.sort((a, b) => {
      // Sort by priority first, then by match rate (ascending for issues)
      if (a.priority !== b.priority) {
        return a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0
      }
      return a.matchRate - b.matchRate
    })
  }, [categoryFilter, statusFilter])

  const selectedFlow = selectedFlowId
    ? Object.values(LEAD_FLOWS).find(f => f.id === selectedFlowId)
    : null

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
            <GitBranch className="h-6 w-6 text-rentokil-red" />
            Lead Journey Flows
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            15 lead flows across 7 source systems - tracking traceability and match rates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/lead-service-engine">
            <Button variant="outline" size="sm">
              Back to Engine
            </Button>
          </Link>
        </div>
      </div>

      {/* Critical Alert */}
      {criticalFlows.length > 0 && (
        <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>{criticalFlows.length} critical flow{criticalFlows.length !== 1 ? 's' : ''}</strong> with match rate below 30%: {criticalFlows.map(f => `Flow #${f.id}`).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(overallStats.averageMatchRate * 100)}%
                </div>
                <div className="text-sm text-gray-500">Avg Match Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={criticalFlows.length > 0 ? 'border-red-200 dark:border-red-800' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {overallStats.criticalFlowCount}
                </div>
                <div className="text-sm text-gray-500">Critical Flows</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {overallStats.perfectFlowCount}
                </div>
                <div className="text-sm text-gray-500">Perfect Flows</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overallStats.totalFlows}
                </div>
                <div className="text-sm text-gray-500">Total Flows</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="residential_outbound">Residential Outbound</SelectItem>
                <SelectItem value="web_inbound">Web/Email/Chat</SelectItem>
                <SelectItem value="trusted_advisor">Trusted Advisor</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="critical">Critical (&lt;30%)</SelectItem>
                <SelectItem value="low">Low (30-70%)</SelectItem>
                <SelectItem value="good">Good (70-90%)</SelectItem>
                <SelectItem value="excellent">Excellent (90-99%)</SelectItem>
                <SelectItem value="perfect">Perfect (100%)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <span className="text-sm text-gray-500">
              Showing {filteredFlows.length} of {overallStats.totalFlows} flows
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flow Cards Grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFlows.map(flow => (
              <FlowCard
                key={flow.id}
                flow={flow}
                metrics={flowMetrics.get(flow.id) || null}
                isSelected={selectedFlowId === flow.id}
                onSelect={() => setSelectedFlowId(flow.id)}
              />
            ))}
          </div>

          {filteredFlows.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No flows match your filters</p>
            </Card>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedFlow ? (
            <FlowDetailPanel
              flow={selectedFlow}
              metrics={flowMetrics.get(selectedFlow.id) || null}
            />
          ) : (
            <Card className="p-8 text-center">
              <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Select a flow to view details</p>
            </Card>
          )}
        </div>
      </div>

      {/* Prioritized Flows Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Prioritized Flows (High/Medium Priority)
          </CardTitle>
          <CardDescription>
            Focus improvement efforts on these 8 flows for maximum impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flow</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Systems</TableHead>
                <TableHead className="text-center">Match Rate</TableHead>
                <TableHead className="text-center">Target</TableHead>
                <TableHead className="text-center">Gap</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prioritizedFlows.map(flow => {
                const matchPercent = Math.round(flow.matchRate * 100)
                const targetPercent = Math.round(flow.targetMatchRate * 100)
                const gap = targetPercent - matchPercent

                return (
                  <TableRow
                    key={flow.id}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      flow.status === 'critical' ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                    }`}
                    onClick={() => setSelectedFlowId(flow.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-500">#{flow.id}</span>
                        <span className="font-medium">{flow.shortName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {flow.category.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {flow.systems.slice(0, 3).map((sys, i) => (
                          <span
                            key={sys}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                            style={{ backgroundColor: SOURCE_SYSTEMS[sys]?.color }}
                            title={SOURCE_SYSTEMS[sys]?.name}
                          >
                            {SOURCE_SYSTEMS[sys]?.name.charAt(0)}
                          </span>
                        ))}
                        {flow.systems.length > 3 && (
                          <span className="text-xs text-gray-500">+{flow.systems.length - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${
                        flow.status === 'critical' ? 'text-red-600' :
                        flow.status === 'low' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
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
                          At target
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(flow.status)}>
                        {flow.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
