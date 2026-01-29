"use client"

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppStore, DEMO_MODE_CONFIG, ROLE_PERMISSIONS } from '@/store'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { KPICard } from '@/components/features/KPICard'
import { VarianceNarrative } from '@/components/features/VarianceNarrative'
import { ActionList } from '@/components/features/ActionList'
import { ChartTooltip } from '@/components/features/ChartTooltip'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import { TOP_10_KPIS } from '@/lib/kpis'
import { calculateKPIValues, getVarianceDrivers, getActionItems } from '@/lib/kpi-calculations'
import { KPIValue, ActionItem, VarianceDriver } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardSkeleton } from '@/components/ui/skeleton-loader'
import {
  Tooltip as RadixTooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, X, ExternalLink, RefreshCw, History } from 'lucide-react'
import seedrandom from 'seedrandom'
import type { ExecutiveCommandCenter as ExecCCData } from '@/lib/bigquery/queries/executive'
import { useRecentPages } from '@/hooks/useRecentPages'

type KpiStatusFilter = 'all' | 'good' | 'warning' | 'critical'

interface PeriodBreakdown {
  name: string
  value: number
  index: number
}

// Generate daily breakdown from weekly total using deterministic random
function generateDailyBreakdown(weeklyTotal: number, periodIndex: number, seed: string): { day: string; value: number }[] {
  const rng = seedrandom(`${seed}-daily-${periodIndex}`)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weights = days.map(() => 0.8 + rng() * 0.4) // 0.8-1.2 variance
  const sum = weights.reduce((a, b) => a + b, 0)
  return days.map((day, i) => ({
    day,
    value: (weights[i] / sum) * weeklyTotal
  }))
}

// Types and transformers for BigQuery data
interface ExecDisplayData {
  metrics: Array<{
    category: string
    metric: string
    value: number
    target: number
    variance: number
    status: string
  }>
}

function transformBigQueryData(bqData: ExecCCData[]): ExecDisplayData {
  return {
    metrics: bqData.map(row => ({
      category: row.category,
      metric: row.metric,
      value: row.value,
      target: row.target,
      variance: row.variance_pct,
      status: row.status,
    }))
  }
}

// Empty default state (BigQuery-only, no mock fallback)
const EMPTY_EXEC_DATA: ExecDisplayData = {
  metrics: []
}

export function ExecutiveCommandCenter() {
  const { settings, currentUser, getCurrentUserScope } = useAppStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [kpiValues, setKpiValues] = useState<Map<string, KPIValue>>(new Map())
  const [varianceDrivers, setVarianceDrivers] = useState<VarianceDriver[]>([])
  const [actions, setActions] = useState<ActionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [kpiStatusFilter, setKpiStatusFilter] = useState<KpiStatusFilter>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodBreakdown | null>(null)
  const { recentPages, mounted: recentMounted } = useRecentPages()

  // BigQuery integration for executive metrics
  const {
    data: execData,
    isLoading: isBQLoading,
    dataSource,
    responseTime,
    refetch,
  } = useBigQueryData<ExecCCData[], ExecDisplayData>({
    queryName: 'executive-command-center',
    filters: { daysBack: 30 },
    defaultData: EMPTY_EXEC_DATA,
    transformBigQueryData,
  })

  // Hydration guard
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize filter from URL on mount
  useEffect(() => {
    const status = searchParams.get('status')
    if (status && ['good', 'warning', 'critical'].includes(status)) {
      setKpiStatusFilter(status as KpiStatusFilter)
    }
  }, [searchParams])

  // Sync filter to URL
  const updateFilterUrl = useCallback((filter: KpiStatusFilter) => {
    const params = new URLSearchParams(searchParams.toString())
    if (filter === 'all') {
      params.delete('status')
    } else {
      params.set('status', filter)
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    router.replace(newUrl, { scroll: false })
  }, [searchParams, router])

  // Handle filter click with scroll
  const handleFilterClick = useCallback((filter: KpiStatusFilter) => {
    setKpiStatusFilter(filter)
    updateFilterUrl(filter)
    // Smooth scroll to KPI grid
    setTimeout(() => {
      document.getElementById('kpi-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [updateFilterUrl])

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    // Remove seconds from time display (H3 fix)
    setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }))
  }, [])

  useEffect(() => {
    // Wait for client hydration before loading data
    if (!mounted) return

    setIsLoading(true)
    const timer = setTimeout(() => {
      // Pass role and userId to filter data to user's scope
      const values = calculateKPIValues(settings.role, settings.userId)
      setKpiValues(values)

      // Get variance to target and compute the actual dollar variance for drivers
      const revenueMTD = values.get('revenue_mtd')
      const varianceToTarget = values.get('variance_to_target_mtd')

      // Calculate dollar variance: variance_pct * target = variance_amount
      // Since variance = (actual - target) / target, then actual - target = variance * target
      // And actual = revenueMTD.value, so: target = actual / (1 + variance)
      // Dollar variance = actual - target
      let varianceAmount = 0
      if (revenueMTD && varianceToTarget) {
        const target = revenueMTD.value / (1 + varianceToTarget.value)
        varianceAmount = revenueMTD.value - target
      }

      setVarianceDrivers(getVarianceDrivers('variance_to_target_mtd', varianceAmount))
      // Pass role and userId to filter actions to user's scope
      setActions(getActionItems(settings.role, settings.userId))
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [mounted, settings.refreshSeed, settings.role, settings.userId])

  const demoMode = settings.demoMode in DEMO_MODE_CONFIG
    ? settings.demoMode
    : 'bi_leadership'
  const config = DEMO_MODE_CONFIG[demoMode]
  const highlightedKpis = config?.highlightedKpis || []

  // Get role-specific persona info
  const roleLabel = ROLE_PERMISSIONS[settings.role]?.label || 'Executive'
  const userScope = getCurrentUserScope()
  const personaDisplay = currentUser
    ? `${currentUser.name}, ${roleLabel}${userScope.scope ? ` • ${userScope.scope}` : ''}`
    : `${roleLabel}${userScope.scope ? ` • ${userScope.scope}` : ''}`

  const revenueTrend = kpiValues.get('revenue_mtd')?.trend || []
  const revenueChartData: PeriodBreakdown[] = revenueTrend.map((value, index) => ({
    name: `W${index + 1}`,
    value: value,
    index: index,
  }))

  // Handle chart click to show period breakdown
  const handleChartClick = useCallback((data: { activePayload?: Array<{ payload: PeriodBreakdown }> }) => {
    if (data?.activePayload?.[0]?.payload) {
      setSelectedPeriod(data.activePayload[0].payload)
    }
  }, [])

  // Generate daily breakdown data when a period is selected
  const dailyBreakdownData = selectedPeriod
    ? generateDailyBreakdown(selectedPeriod.value, selectedPeriod.index, settings.refreshSeed?.toString() || 'default')
    : []

  // Calculate prior period comparison
  const priorPeriodValue = selectedPeriod && selectedPeriod.index > 0
    ? revenueChartData[selectedPeriod.index - 1]?.value || 0
    : 0
  const periodVariance = selectedPeriod && priorPeriodValue
    ? ((selectedPeriod.value - priorPeriodValue) / priorPeriodValue) * 100
    : 0

  const criticalKpis = Array.from(kpiValues.values()).filter(k => k.status === 'critical')
  const warningKpis = Array.from(kpiValues.values()).filter(k => k.status === 'warning')
  const goodKpis = Array.from(kpiValues.values()).filter(k => k.status === 'good')

  const revenueMTD = kpiValues.get('revenue_mtd')
  const varianceToTarget = kpiValues.get('variance_to_target_mtd')

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Command Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1" suppressHydrationWarning>
            {personaDisplay} • {currentDate || 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RadixTooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  if (criticalKpis.length > 0) {
                    handleFilterClick('critical')
                  }
                }}
                className={`inline-flex ${criticalKpis.length > 0 ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                disabled={criticalKpis.length === 0}
                aria-label={criticalKpis.length > 0 ? `View ${criticalKpis.length} critical KPIs` : 'All systems healthy'}
              >
                <Badge variant={criticalKpis.length > 0 ? 'danger' : 'success'} className="gap-1">
                  {criticalKpis.length > 0 ? (
                    <>
                      <AlertTriangle className="h-3 w-3" />
                      {criticalKpis.length} Critical
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      All Systems Healthy
                    </>
                  )}
                </Badge>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {criticalKpis.length > 0 ? (
                <p className="text-sm">Click to view critical KPIs</p>
              ) : (
                <p className="text-sm">All KPIs are within acceptable ranges</p>
              )}
            </TooltipContent>
          </RadixTooltip>
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={refetch} disabled={isBQLoading} className="h-8 w-8" aria-label="Refresh data">
            <RefreshCw className={`h-3.5 w-3.5 ${isBQLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Badge variant="outline" className="gap-1" suppressHydrationWarning>
            <Clock className="h-3 w-3" />
            Last updated: {currentTime || '--:--:--'}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/kpi/revenue_mtd" className="block group">
          <Card id="revenue-mtd-card" className="bg-gradient-to-br from-rentokil-red to-rentokil-darkred text-white glow-primary h-full transition-transform group-hover:scale-[1.02] group-hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm opacity-80">Revenue MTD</div>
              <div className="text-3xl font-bold mt-1">
                {revenueMTD ? formatCurrency(revenueMTD.value) : '-'}
              </div>
              <div className={`text-sm mt-2 flex items-center gap-1 ${
                revenueMTD && revenueMTD.deltaPercent >= 0
                  ? 'text-green-200'
                  : 'text-yellow-200'
              }`}>
                {revenueMTD && revenueMTD.deltaPercent >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {revenueMTD && revenueMTD.deltaPercent > 0 ? '+' : ''}
                {revenueMTD ? (revenueMTD.deltaPercent * 100).toFixed(1) : 0}% vs prior
              </div>
              <div className="text-xs opacity-60 mt-2 group-hover:opacity-80 transition-opacity">Click for details</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/kpi/variance_to_target_mtd" className="block group">
          <Card id="variance-card" className={`${varianceToTarget && varianceToTarget.value >= 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600 glow-info' : 'bg-gradient-to-br from-red-500 to-red-600 glow-danger'} text-white h-full transition-transform group-hover:scale-[1.02] group-hover:shadow-lg`}>
            <CardContent className="pt-6">
              <div className="text-sm opacity-80">Variance to Target</div>
              <div className="text-3xl font-bold mt-1">
                {varianceToTarget ? `${(varianceToTarget.value * 100).toFixed(1)}%` : '-'}
              </div>
              <div className="text-sm mt-2 opacity-80">
                {varianceToTarget && varianceToTarget.value >= 0 ? 'Ahead of plan' : 'Behind plan'}
              </div>
              <div className="text-xs opacity-60 mt-2 group-hover:opacity-80 transition-opacity">Click for details</div>
            </CardContent>
          </Card>
        </Link>

        <Card id="kpi-health-card">
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">KPI Health</div>
            <div className="flex items-center gap-2 mt-2">
              <RadixTooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleFilterClick('good')}
                    className={`text-center min-h-[44px] min-w-[44px] p-2 rounded-lg cursor-pointer transition-all hover:bg-green-50 dark:hover:bg-green-900/20 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${kpiStatusFilter === 'good' ? 'bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500' : ''}`}
                    aria-label={`Filter to ${goodKpis.length} good KPIs`}
                  >
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{goodKpis.length}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Good</div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{goodKpis.length} KPIs Meeting Targets</p>
                    <p className="text-xs text-gray-400">
                      {((goodKpis.length / kpiValues.size) * 100).toFixed(0)}% of {kpiValues.size} tracked metrics
                    </p>
                    <p className="text-xs text-gray-400 mt-1 pt-1 border-t border-gray-600">
                      At or above target threshold
                    </p>
                    <p className="text-xs text-gray-400">Click to filter</p>
                  </div>
                </TooltipContent>
              </RadixTooltip>
              <RadixTooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleFilterClick('warning')}
                    className={`text-center min-h-[44px] min-w-[44px] p-2 rounded-lg cursor-pointer transition-all hover:bg-yellow-50 dark:hover:bg-yellow-900/20 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${kpiStatusFilter === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 ring-2 ring-yellow-500' : ''}`}
                    aria-label={`Filter to ${warningKpis.length} warning KPIs`}
                  >
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{warningKpis.length}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Warning</div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{warningKpis.length} KPIs Need Attention</p>
                    <p className="text-xs text-gray-400">
                      {((warningKpis.length / kpiValues.size) * 100).toFixed(0)}% of {kpiValues.size} tracked metrics
                    </p>
                    <p className="text-xs text-gray-400 mt-1 pt-1 border-t border-gray-600">
                      Below target but above critical threshold
                    </p>
                    <p className="text-xs text-gray-400">Click to filter</p>
                  </div>
                </TooltipContent>
              </RadixTooltip>
              <RadixTooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleFilterClick('critical')}
                    className={`text-center min-h-[44px] min-w-[44px] p-2 rounded-lg cursor-pointer transition-all hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${kpiStatusFilter === 'critical' ? 'bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500' : ''}`}
                    aria-label={`Filter to ${criticalKpis.length} critical KPIs`}
                  >
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalKpis.length}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Critical</div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{criticalKpis.length} KPIs Require Action</p>
                    <p className="text-xs text-gray-400">
                      {((criticalKpis.length / kpiValues.size) * 100).toFixed(0)}% of {kpiValues.size} tracked metrics
                    </p>
                    <p className="text-xs text-gray-400 mt-1 pt-1 border-t border-gray-600">
                      Significantly below target - immediate attention needed
                    </p>
                    <p className="text-xs text-gray-400">Click to filter</p>
                  </div>
                </TooltipContent>
              </RadixTooltip>
            </div>
          </CardContent>
        </Card>

        <RadixTooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                document.getElementById('action-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="text-left w-full"
              aria-label={`View ${actions.length} priority actions, ${actions.filter(a => a.severity === 'critical').length} critical`}
            >
              <Card id="priority-actions-card" className="h-full transition-transform hover:scale-[1.02] hover:shadow-lg cursor-pointer">
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Priority Actions</div>
                  <div className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{actions.length}</div>
                  <div className="text-sm mt-2 text-gray-500 dark:text-gray-400">
                    {actions.filter(a => a.severity === 'critical').length} critical
                  </div>
                  <div className="text-xs text-gray-400 mt-2">Click to view</div>
                </CardContent>
              </Card>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">Scroll to view priority action items</p>
          </TooltipContent>
        </RadixTooltip>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Cards - Left 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top KPI Cards */}
          <div id="kpi-grid">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <TrendingUp className="h-5 w-5" />
                Key Performance Indicators
              </h2>
              {kpiStatusFilter !== 'all' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setKpiStatusFilter('all')
                    updateFilterUrl('all')
                  }}
                  className="gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear filter ({kpiStatusFilter})
                </Button>
              )}
            </div>

            {/* Screen reader live region for filter changes */}
            <div aria-live="polite" className="sr-only">
              {(() => {
                const filteredCount = TOP_10_KPIS.filter(slug => {
                  const kpi = kpiValues.get(slug)
                  return kpiStatusFilter === 'all' || kpi?.status === kpiStatusFilter
                }).length
                return `${filteredCount} KPIs shown${kpiStatusFilter !== 'all' ? `, filtered by ${kpiStatusFilter} status` : ''}`
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const filteredKpis = TOP_10_KPIS.filter(slug => {
                  const kpi = kpiValues.get(slug)
                  return kpiStatusFilter === 'all' || kpi?.status === kpiStatusFilter
                })

                if (filteredKpis.length === 0) {
                  return (
                    <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                      <p className="font-medium">No KPIs in &apos;{kpiStatusFilter}&apos; status</p>
                      <Button
                        variant="link"
                        onClick={() => {
                          setKpiStatusFilter('all')
                          updateFilterUrl('all')
                        }}
                        className="mt-2"
                      >
                        Show all KPIs
                      </Button>
                    </div>
                  )
                }

                return filteredKpis.map(slug => {
                  const kpiValue = kpiValues.get(slug)
                  if (!kpiValue) return null
                  return (
                    <KPICard
                      key={slug}
                      kpiValue={kpiValue}
                      highlighted={highlightedKpis.includes(slug)}
                    />
                  )
                })
              })()}
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <Card id="revenue-trend-chart">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Revenue Trend (Last 12 Periods)</span>
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">Click any point for details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                    <defs>
                      <filter id="glow-cmd" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="blur"/>
                        <feMerge>
                          <feMergeNode in="blur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTooltip formatter={formatCurrency} />} cursor={false} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#E4002B"
                      fill="#E4002B20"
                      strokeWidth={2}
                      activeDot={{ r: 8, fill: '#E4002B', stroke: '#fff', strokeWidth: 2, cursor: 'pointer' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Period Breakdown Modal */}
          <Dialog open={!!selectedPeriod} onOpenChange={() => setSelectedPeriod(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedPeriod?.name} Revenue Breakdown</span>
                  <Link
                    href="/kpi/revenue_mtd"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Full Details <ExternalLink className="h-3 w-3" />
                  </Link>
                </DialogTitle>
              </DialogHeader>

              {selectedPeriod && (
                <div className="space-y-6">
                  {/* Period Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Period Total</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(selectedPeriod.value)}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">vs Prior Period</div>
                      <div className={`text-2xl font-bold flex items-center gap-1 ${
                        periodVariance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {periodVariance >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                        {periodVariance >= 0 ? '+' : ''}{periodVariance.toFixed(1)}%
                      </div>
                      {priorPeriodValue > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Prior: {formatCurrency(priorPeriodValue)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Daily Breakdown Chart */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Daily Breakdown</h4>
                    <div className="h-48 [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyBreakdownData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="day" />
                          <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                          <Tooltip content={<ChartTooltip formatter={formatCurrency} />} cursor={false} />
                          <Bar dataKey="value" fill="#E4002B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedPeriod(null)}>
                      Close
                    </Button>
                    <Button size="sm" className="flex-1" asChild>
                      <Link href="/kpi/revenue_mtd">View Full KPI Details</Link>
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Variance Narrative */}
          <VarianceNarrative
            kpiName="Revenue vs Target"
            drivers={varianceDrivers}
            totalVariance={varianceToTarget?.value || 0}
            isPositiveGood={true}
          />
        </div>

        {/* Right Sidebar - Actions & Quick Access */}
        <div id="action-list" className="space-y-6">
          {/* Recently Viewed Pages */}
          {recentMounted && recentPages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Quick Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentPages.slice(0, 5).map((page) => (
                    <Link
                      key={page.path}
                      href={page.path}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors group"
                    >
                      <Clock className="h-3.5 w-3.5 text-gray-400 group-hover:text-primary" />
                      <span className="truncate group-hover:underline">{page.title}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <ActionList
            actions={actions}
            title="Priority Actions"
            maxItems={8}
          />
        </div>
      </div>
    </div>
  )
}
