'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/store'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { useOrganizationData } from '@/hooks/useOrganizationData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  MapPin,
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
  Save,
  AlertTriangle,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, differenceInDays, format, subDays } from 'date-fns'
import PeriodSelector from '@/components/rtx/PeriodSelector'
import type { PeriodType } from '@/components/rtx/PeriodSelector'
import { cn, formatCurrency } from '@/lib/utils'
import {
  initializeDailySalesData,
  getBranchesByRegion,
  getBranches,
  getBranchByCode,
  getEntriesForBranch,
  addDailyEntry,
  DEFAULT_DAILY_GOALS,
  REGION_NAMES,
  MARKET_NAMES,
} from '@/lib/daily-sales-data'
import { MarketCode, RegionCode, DailySalesEntry, Branch, DailySalesInput } from '@/types/daily-sales-cadence'
import type { MarketDaily, RegionDaily, BranchDaily } from '@/lib/bigquery/queries/branch'
import type { BranchWorkforce } from '@/lib/bigquery/queries/organization-workforce'

type DailyPerformanceLevel = 'market' | 'region' | 'branch'

// =============================================================================
// Utility Functions
// =============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// =============================================================================
// Period Drill-Down Helpers
// =============================================================================

interface PeriodState {
  period: PeriodType
  customStartDate: string
  customEndDate: string
  drilledDate: string | null
}

const DEFAULT_PERIOD_STATE: PeriodState = {
  period: 'wtd',
  customStartDate: '',
  customEndDate: '',
  drilledDate: null,
}

function getDateRangeForPeriod(
  period: PeriodType,
  customStart?: string,
  customEnd?: string,
): { startDate: string; endDate: string } {
  const yesterday = subDays(new Date(), 1)
  const endDate = format(yesterday, 'yyyy-MM-dd')

  switch (period) {
    case 'today':
      return { startDate: endDate, endDate }
    case 'wtd':
      return { startDate: format(startOfWeek(yesterday, { weekStartsOn: 1 }), 'yyyy-MM-dd'), endDate }
    case 'mtd':
      return { startDate: format(startOfMonth(yesterday), 'yyyy-MM-dd'), endDate }
    case 'qtd':
      return { startDate: format(startOfQuarter(yesterday), 'yyyy-MM-dd'), endDate }
    case 'ytd':
      return { startDate: format(startOfYear(yesterday), 'yyyy-MM-dd'), endDate }
    case 'custom':
      return {
        startDate: customStart || endDate,
        endDate: customEnd || endDate,
      }
  }
}

function getPriorPeriodRange(
  startDate: string,
  endDate: string,
): { startDate: string; endDate: string } {
  const start = new Date(startDate + 'T12:00:00')
  const end = new Date(endDate + 'T12:00:00')
  const durationDays = differenceInDays(end, start) + 1
  const priorEnd = subDays(start, 1)
  const priorStart = subDays(start, durationDays)
  return {
    startDate: format(priorStart, 'yyyy-MM-dd'),
    endDate: format(priorEnd, 'yyyy-MM-dd'),
  }
}

function getDaysBackForPeriod(
  period: PeriodType,
  customStart?: string,
  customEnd?: string,
): number {
  const range = getDateRangeForPeriod(period, customStart, customEnd)
  const priorRange = getPriorPeriodRange(range.startDate, range.endDate)
  const today = new Date()
  const earliestDate = new Date(priorRange.startDate + 'T12:00:00')
  const days = differenceInDays(today, earliestDate) + 2
  return Math.max(days, 30)
}

function filterRowsByDateRange<T extends { date: string }>(
  rows: T[],
  startDate: string,
  endDate: string,
): T[] {
  return rows.filter(r => r.date >= startDate && r.date <= endDate)
}

interface AggregatedMetrics {
  revenue: number
  leads: number
  sales: number
  closeRate: number
  dayCount: number
}

function aggregateMetrics(rows: Array<{ revenue: number; leads: number; sales: number; close_rate: number }>): AggregatedMetrics {
  if (rows.length === 0) return { revenue: 0, leads: 0, sales: 0, closeRate: 0, dayCount: 0 }
  return {
    revenue: rows.reduce((sum, r) => sum + (r.revenue || 0), 0),
    leads: rows.reduce((sum, r) => sum + (r.leads || 0), 0),
    sales: rows.reduce((sum, r) => sum + (r.sales || 0), 0),
    closeRate: rows.length > 0
      ? rows.reduce((sum, r) => sum + (r.close_rate || 0), 0) / rows.length
      : 0,
    dayCount: rows.length,
  }
}

function computeDelta(current: number, prior: number): { delta: number; deltaPercent: number } {
  const delta = current - prior
  const deltaPercent = prior !== 0 ? (delta / prior) * 100 : current > 0 ? 100 : 0
  return { delta, deltaPercent }
}

function DeltaBadge({ current, prior, label = 'vs prior' }: { current: number; prior: number; label?: string }) {
  if (prior === 0 && current === 0) return null
  const { deltaPercent } = computeDelta(current, prior)
  const isPositive = deltaPercent > 0
  const isNegative = deltaPercent < 0
  return (
    <div className={cn(
      'flex items-center gap-1 text-xs font-medium mt-1',
      isPositive && 'text-green-600 dark:text-green-400',
      isNegative && 'text-red-600 dark:text-red-400',
      !isPositive && !isNegative && 'text-gray-500'
    )}>
      {isPositive && <TrendingUp className="h-3 w-3" />}
      {isNegative && <TrendingDown className="h-3 w-3" />}
      <span>{deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}% {label}</span>
    </div>
  )
}

function getPeriodLabel(period: PeriodType, startDate?: string, endDate?: string): string {
  switch (period) {
    case 'today': return 'Today'
    case 'wtd': return 'Week to Date'
    case 'mtd': return 'Month to Date'
    case 'qtd': return 'Quarter to Date'
    case 'ytd': return 'Year to Date'
    case 'custom': return startDate && endDate
      ? `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
      : 'Custom Range'
  }
}

// =============================================================================
// Main Component
// =============================================================================

export default function DailyPerformancePage() {
  const [mounted, setMounted] = useState(false)
  const { settings, organizationFilters } = useAppStore()
  const role = useEffectiveRole(mounted)

  // Determine default tab based on role
  const getDefaultLevel = (): DailyPerformanceLevel => {
    if (role === 'market_vp' || role === 'market_sales_director') return 'market'
    if (role === 'region_director' || role === 'region_sales_manager') return 'region'
    if (role === 'manager' || role === 'sales_manager' || role === 'ops_manager') return 'branch'
    return 'market' // Default for exec
  }

  const [activeLevel, setActiveLevel] = useState<DailyPerformanceLevel>(getDefaultLevel())

  useEffect(() => {
    setMounted(true)
    initializeDailySalesData()
  }, [])

  // Update active tab when role changes (e.g., admin switches preview role)
  useEffect(() => {
    if (!mounted) return
    const defaultLevel = getDefaultLevel()
    setActiveLevel(defaultLevel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, mounted])

  // Determine which tabs to show based on role
  const availableTabs = {
    market: ['exec', 'market_vp', 'market_sales_director'].includes(role),
    region: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager'].includes(role),
    branch: true, // All roles can see branch level
  }

  if (!mounted) return null

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Daily Performance' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Performance</h1>
          <p className="text-gray-500 dark:text-gray-400">Daily cadence metrics across organizational levels</p>
        </div>
      </div>

      <Tabs id="daily-perf-tabs" value={activeLevel} onValueChange={(value) => setActiveLevel(value as DailyPerformanceLevel)}>
        <TabsList>
          {availableTabs.market && (
            <TabsTrigger value="market">Market</TabsTrigger>
          )}
          {availableTabs.region && (
            <TabsTrigger value="region">Region</TabsTrigger>
          )}
          {availableTabs.branch && (
            <TabsTrigger value="branch">Branch</TabsTrigger>
          )}
        </TabsList>

        {availableTabs.market && (
          <TabsContent value="market">
            <MarketDailyView />
          </TabsContent>
        )}

        {availableTabs.region && (
          <TabsContent value="region">
            <RegionDailyView />
          </TabsContent>
        )}

        {availableTabs.branch && (
          <TabsContent value="branch">
            <BranchDailyView />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// =============================================================================
// Market Daily View Component
// =============================================================================

function MarketDailyView() {
  const [selectedMarket, setSelectedMarket] = useState<string>('')
  const [periodState, setPeriodState] = useState<PeriodState>(DEFAULT_PERIOD_STATE)
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null)

  const { markets: orgMarkets, getRegionsForMarket: getOrgRegionsForMarket, getBranchesForRegion, isLoading: marketsLoading } = useOrganizationData()

  // Compute dynamic daysBack based on selected period
  const daysBack = useMemo(
    () => getDaysBackForPeriod(periodState.period, periodState.customStartDate, periodState.customEndDate),
    [periodState.period, periodState.customStartDate, periodState.customEndDate]
  )

  // Explicit transform for market daily data with null handling
  function transformMarketDailyData(bqData: MarketDaily[]): MarketDaily[] {
    return (bqData || []).map(row => ({
      date: row.date ?? '',
      market: row.market ?? 'Unknown',
      region_count: row.region_count ?? 0,
      branch_count: row.branch_count ?? 0,
      revenue: row.revenue ?? 0,
      leads: row.leads ?? 0,
      sales: row.sales ?? 0,
      close_rate: row.close_rate ?? 0,
    }))
  }

  const {
    data: marketDailyRawData,
    isLoading: isBQLoading,
    dataSource,
    responseTime,
    error,
    refetch,
  } = useBigQueryData<MarketDaily[], MarketDaily[]>({
    queryName: 'market-daily',
    filters: { daysBack },
    defaultData: [],
    transformBigQueryData: transformMarketDailyData,
  })

  // Branch workforce data - employee counts by role per branch
  const {
    data: branchWorkforceData,
  } = useBigQueryData<BranchWorkforce[], BranchWorkforce[]>({
    queryName: 'branch-workforce',
    filters: { marketCode: selectedMarket },
    defaultData: [],
    transformBigQueryData: (data) => data,
    includeOrgFilters: false, // Market selection handled manually
    includeRoleFilters: false, // Company-wide workforce data
    enabled: !!selectedMarket,
  })

  useEffect(() => {
    if (orgMarkets.length > 0 && !selectedMarket) {
      setSelectedMarket(orgMarkets[0].market_code)
    }
  }, [orgMarkets, selectedMarket])

  if (error) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[
          { label: 'Command Center', href: '/' },
          { label: 'Daily Performance' }
        ]} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Performance</h1>
          <p className="text-gray-500 dark:text-gray-400">Daily cadence metrics across organizational levels</p>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Failed to Load Data</span>
          </div>

          <div className="space-y-3">
            {/* Error message */}
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {error}
            </div>

            {/* Context information */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{dataSource}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Query:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">market-daily</p>
              </div>
            </div>

            {/* Recovery actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open('/platform-admin', '_blank')}>
                <FileText className="h-3 w-3 mr-1.5" />
                View Logs
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (marketsLoading || !selectedMarket) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
      </div>
    )
  }

  const selectedMarketData = orgMarkets.find(m => m.market_code === selectedMarket)

  // Filter data for selected market
  const marketFilteredData = marketDailyRawData.filter((row: MarketDaily) => {
    return selectedMarketData?.market_name &&
      row.market.toLowerCase().includes(selectedMarketData.market_name.toLowerCase().replace(' market', ''))
  })

  // Compute date ranges for period
  const currentRange = getDateRangeForPeriod(periodState.period, periodState.customStartDate, periodState.customEndDate)
  const priorRange = getPriorPeriodRange(currentRange.startDate, currentRange.endDate)

  // Determine view mode
  const effectiveDate = periodState.drilledDate || (periodState.period === 'today' ? currentRange.endDate : null)
  const showSingleDayView = effectiveDate !== null
  const showPeriodView = !showSingleDayView

  // Current & prior period data
  const currentPeriodRows = filterRowsByDateRange(marketFilteredData, currentRange.startDate, currentRange.endDate)
  const priorPeriodRows = filterRowsByDateRange(marketFilteredData, priorRange.startDate, priorRange.endDate)
  const currentAgg = aggregateMetrics(currentPeriodRows)
  const priorAgg = aggregateMetrics(priorPeriodRows)

  // Single day data (for drill or today)
  const singleDayData = effectiveDate
    ? marketFilteredData.find(r => r.date === effectiveDate) || null
    : null

  // Trend chart data
  const trendData = currentPeriodRows
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(row => ({
      date: row.date,
      dateLabel: formatDateShort(row.date),
      leads: row.leads,
      sales: row.sales,
      revenue: row.revenue,
      closeRate: row.close_rate,
    }))

  // Get regions from organization hierarchy
  const orgRegions = getOrgRegionsForMarket(selectedMarket)

  // Determine displayed metrics
  const displayLeads = showSingleDayView ? (singleDayData?.leads || 0) : currentAgg.leads
  const displaySales = showSingleDayView ? (singleDayData?.sales || 0) : currentAgg.sales
  const displayRevenue = showSingleDayView ? (singleDayData?.revenue || 0) : currentAgg.revenue
  const displayCloseRate = showSingleDayView ? (singleDayData?.close_rate || 0) : currentAgg.closeRate
  const displayLobsPrp = showSingleDayView
    ? (singleDayData ? Math.round(singleDayData.leads * 0.8) : 0)
    : Math.round(currentAgg.leads * 0.8)

  // Build market summary
  const marketSummary = {
    regionCount: selectedMarketData?.region_count || 0,
    branchCount: selectedMarketData?.branch_count || 0,
    totalPccInField: 0,
    totalInspPrp: displayLeads,
    totalLobsPrp: displayLobsPrp,
    totalLobsSold: displaySales,
    totalDollarsSold: displayRevenue,
    avgGoalAttainment: displayCloseRate,
    branchesOnTrack: 0,
    branchesOffTrack: 0,
    regionsOnTrack: 0,
    regionsOffTrack: 0,
    regionBreakdown: orgRegions.map(region => ({
      region: region.region_code,
      regionName: region.region_name,
      totalInspPrp: 0,
      totalLobsSold: 0,
      totalDollarsSold: 0,
      avgGoalAttainment: 0,
      branchCount: region.branch_count,
      branchesOnTrack: 0,
      branchesOffTrack: 0,
    })),
  }

  const regionChartData = marketSummary.regionBreakdown.map(region => ({
    name: region.region,
    fullName: region.regionName,
    inspPrp: region.totalInspPrp,
    lobsSold: region.totalLobsSold,
    dollarsSold: region.totalDollarsSold,
    attainment: region.avgGoalAttainment,
    branchCount: region.branchCount,
    onTrack: region.branchesOnTrack,
    offTrack: region.branchesOffTrack,
  }))

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">Market VP view - Regional performance summary</div>
          <div className="flex items-center gap-4">
            <DataSourceBadge status={dataSource} responseTime={responseTime} />
            <Button variant="outline" size="icon" onClick={refetch} disabled={isBQLoading}>
              <RefreshCw className={`h-4 w-4 ${isBQLoading ? 'animate-spin' : ''}`} />
            </Button>
            <SearchableSelect
              options={orgMarkets.map(m => ({
                value: m.market_code,
                label: m.market_name,
                description: `${m.region_count} regions, ${m.branch_count} branches`
              }))}
              value={selectedMarket}
              onValueChange={setSelectedMarket}
              placeholder="Select Market"
              searchPlaceholder="Search markets..."
              className="w-[280px]"
            />
          </div>
        </div>
        <PeriodSelector
          selectedPeriod={periodState.period}
          customStartDate={periodState.customStartDate}
          customEndDate={periodState.customEndDate}
          onPeriodChange={(p) => setPeriodState({ ...periodState, period: p, drilledDate: null })}
          onCustomDateChange={(s, e) => setPeriodState({ ...periodState, customStartDate: s, customEndDate: e, drilledDate: null })}
          size="sm"
        />
      </div>

      {/* Drill-down breadcrumb */}
      {periodState.drilledDate && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Button variant="ghost" size="sm" onClick={() => setPeriodState(prev => ({ ...prev, drilledDate: null }))}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {getPeriodLabel(periodState.period)} view
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Viewing {formatDate(periodState.drilledDate)}
          </span>
        </div>
      )}

      {/* No Data Warning */}
      {currentPeriodRows.length === 0 && marketDailyRawData.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  No data available for {getPeriodLabel(periodState.period, periodState.customStartDate, periodState.customEndDate)}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Latest available data: {marketFilteredData
                    .sort((a: MarketDaily, b: MarketDaily) => b.date.localeCompare(a.date))
                    .slice(0, 5)
                    .map((row: MarketDaily) => formatDateShort(row.date))
                    .join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Header */}
      <div className="flex items-center justify-between bg-muted rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-semibold">{selectedMarketData?.market_name || MARKET_NAMES[selectedMarket as MarketCode]}</p>
            <p className="text-sm text-muted-foreground">
              {showSingleDayView
                ? formatDate(effectiveDate!)
                : `${formatDateShort(currentRange.startDate)} - ${formatDateShort(currentRange.endDate)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {showPeriodView && (
            <Badge variant="outline">
              {currentAgg.dayCount} days
            </Badge>
          )}
          <Badge variant="outline">
            {marketSummary.regionCount} Regions
          </Badge>
        </div>
      </div>

      {/* Market Summary Cards */}
      <div id="daily-perf-metrics" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Total PCCs</span>
            </div>
            <p className="text-2xl font-bold mt-1">{marketSummary.totalPccInField}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Inspections</span>
            </div>
            <p className="text-2xl font-bold mt-1">{marketSummary.totalInspPrp}</p>
            {showPeriodView && <DeltaBadge current={currentAgg.leads} prior={priorAgg.leads} />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">LOBs Prepared</span>
            </div>
            <p className="text-2xl font-bold mt-1">{marketSummary.totalLobsPrp}</p>
            {showPeriodView && <DeltaBadge current={Math.round(currentAgg.leads * 0.8)} prior={Math.round(priorAgg.leads * 0.8)} />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">LOBs Sold</span>
            </div>
            <p className="text-2xl font-bold mt-1">{marketSummary.totalLobsSold}</p>
            {showPeriodView && <DeltaBadge current={currentAgg.sales} prior={priorAgg.sales} />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Revenue</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(marketSummary.totalDollarsSold)}</p>
            {showPeriodView && <DeltaBadge current={currentAgg.revenue} prior={priorAgg.revenue} />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Goal Attainment</span>
            </div>
            <p className="text-xl font-bold mt-1">{marketSummary.avgGoalAttainment.toFixed(0)}%</p>
            <Progress value={Math.min(marketSummary.avgGoalAttainment, 100)} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Regions</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-green-600 font-bold">{marketSummary.regionsOnTrack}</span>
              <span className="text-gray-400">/</span>
              <span className="text-red-600 font-bold">{marketSummary.regionsOffTrack}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">on track / off track</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend Chart - shown for multi-day periods */}
      {showPeriodView && trendData.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Daily Trend - {getPeriodLabel(periodState.period, periodState.customStartDate, periodState.customEndDate)}
                </CardTitle>
                <CardDescription>Click any bar to drill into that day&apos;s detail</CardDescription>
              </div>
              <Badge variant="outline">{trendData.length} days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trendData}
                  onClick={(chartEvent) => {
                    if (chartEvent?.activePayload?.[0]?.payload?.date) {
                      setPeriodState(prev => ({
                        ...prev,
                        drilledDate: chartEvent.activePayload![0].payload.date,
                      }))
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dateLabel" fontSize={12} angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                          <p className="font-medium">{data.dateLabel}</p>
                          <p className="text-sm text-purple-600">Leads: {data.leads}</p>
                          <p className="text-sm text-green-600">Sales: {data.sales}</p>
                          <p className="text-sm text-blue-600">Revenue: {formatCurrency(data.revenue)}</p>
                          <p className="text-xs text-gray-500 mt-1">Click to drill into this day</p>
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Bar dataKey="leads" name="Leads" fill="#8884d8" cursor="pointer" />
                  <Bar dataKey="sales" name="Sales" fill="#82ca9d" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="regions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="regions">By Region</TabsTrigger>
          <TabsTrigger value="chart">Performance Chart</TabsTrigger>
          <TabsTrigger value="branches">All Branches</TabsTrigger>
        </TabsList>

        {/* By Region Tab */}
        <TabsContent value="regions" className="space-y-4">
          {marketSummary.regionBreakdown.map((region) => {
            const branches = getBranchesForRegion(region.region)
            const isExpanded = expandedRegion === region.region

            return (
              <Card key={region.region}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedRegion(isExpanded ? null : region.region)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{region.regionName}</CardTitle>
                        <CardDescription>{region.branchCount} branches</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{formatCurrency(region.totalDollarsSold)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${region.avgGoalAttainment >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                          {region.avgGoalAttainment.toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Goal</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={region.avgGoalAttainment >= 80 ? 'default' : 'destructive'}>
                          {region.branchesOnTrack} on track
                        </Badge>
                        {region.branchesOffTrack > 0 && (
                          <Badge variant="outline" className="text-red-600 border-red-200 dark:border-red-800">
                            {region.branchesOffTrack} off track
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Branch Name</TableHead>
                          <TableHead>BMs</TableHead>
                          <TableHead className="text-center">AEs</TableHead>
                          <TableHead className="text-center">Techs</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {branches.map((branch) => {
                          const wf = branchWorkforceData.find(w => w.branch_code === branch.branch_code)
                          return (
                            <TableRow key={branch.branch_code} className="bg-muted/50">
                              <TableCell className="font-mono">{branch.branch_code}</TableCell>
                              <TableCell className="font-medium max-w-[150px] truncate">{branch.branch_name}</TableCell>
                              <TableCell className="max-w-[120px] truncate">{wf ? `${wf.branch_managers} BM` : '-'}</TableCell>
                              <TableCell className="text-center">{wf?.ae_sales ?? '-'}</TableCell>
                              <TableCell className="text-center">{wf?.technicians ?? '-'}</TableCell>
                              <TableCell className="text-center">{wf?.total ?? '-'}</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-center">
                                {wf ? (
                                  <Badge variant="outline">{wf.total} staff</Badge>
                                ) : (
                                  <Badge variant="outline">No Data</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </TabsContent>

        {/* Chart Tab */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Region Performance Comparison</CardTitle>
              <CardDescription>
                Goal attainment and revenue by region for {showSingleDayView ? formatDate(effectiveDate!) : getPeriodLabel(periodState.period)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionChartData} layout="vertical">
                    <defs>
                      <filter id="glow-market" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge>
                          <feMergeNode in="blur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={60} />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const data = payload[0].payload
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                            <p className="font-medium">{data.fullName}</p>
                            <p className="text-sm">Branches: {data.branchCount}</p>
                            <p className="text-sm">Inspections: {data.inspPrp}</p>
                            <p className="text-sm">LOBs Sold: {data.lobsSold}</p>
                            <p className="text-sm">Revenue: {formatCurrency(data.dollarsSold)}</p>
                            <p className="text-sm font-medium mt-1">
                              {data.attainment >= 80 ? '✓' : '✗'} {data.attainment.toFixed(0)}% Goal
                            </p>
                          </div>
                        )
                      }}
                    />
                    <Legend />
                    <Bar dataKey="inspPrp" name="Inspections" fill="#8884d8" activeBar={{ filter: 'url(#glow-market)' }} />
                    <Bar dataKey="lobsSold" name="LOBs Sold" fill="#82ca9d" activeBar={{ filter: 'url(#glow-market)' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Branches Tab */}
        <TabsContent value="branches">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Branches - {MARKET_NAMES[selectedMarket as MarketCode] || selectedMarketData?.market_name}</CardTitle>
                  <CardDescription>Detailed view of all branches across regions</CardDescription>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{marketSummary.branchesOnTrack} on track</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span>{marketSummary.branchesOffTrack} off track</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Branch Name</TableHead>
                    <TableHead>BMs</TableHead>
                    <TableHead className="text-center">AEs</TableHead>
                    <TableHead className="text-center">Techs</TableHead>
                    <TableHead className="text-center">Ops Mgrs</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgRegions.flatMap(region => {
                    const branches = getBranchesForRegion(region.region_code)
                    return branches.map((branch, idx) => {
                      const wf = branchWorkforceData.find(w => w.branch_code === branch.branch_code)
                      return (
                        <TableRow key={branch.branch_code} className="bg-muted/50">
                          {idx === 0 ? (
                            <TableCell rowSpan={branches.length} className="font-medium border-r">
                              {region.region_name}
                            </TableCell>
                          ) : null}
                          <TableCell className="font-mono">{branch.branch_code}</TableCell>
                          <TableCell className="font-medium max-w-[140px] truncate">{branch.branch_name}</TableCell>
                          <TableCell className="max-w-[110px] truncate">{wf ? `${wf.branch_managers} BM` : '-'}</TableCell>
                          <TableCell className="text-center">{wf?.ae_sales ?? '-'}</TableCell>
                          <TableCell className="text-center">{wf?.technicians ?? '-'}</TableCell>
                          <TableCell className="text-center">{wf?.ops_managers ?? '-'}</TableCell>
                          <TableCell className="text-center">{wf?.total ?? '-'}</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-center">
                            {wf ? (
                              <Badge variant="outline">{wf.total} staff</Badge>
                            ) : (
                              <Badge variant="outline">No Data</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =============================================================================
// Region Daily View Component
// =============================================================================

function RegionDailyView() {
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [periodState, setPeriodState] = useState<PeriodState>(DEFAULT_PERIOD_STATE)

  const { regions: orgRegions, isLoading: regionsLoading } = useOrganizationData()

  // Compute dynamic daysBack based on selected period
  const daysBack = useMemo(
    () => getDaysBackForPeriod(periodState.period, periodState.customStartDate, periodState.customEndDate),
    [periodState.period, periodState.customStartDate, periodState.customEndDate]
  )

  // Explicit transform for region daily data with null handling
  function transformRegionDailyData(bqData: RegionDaily[]): RegionDaily[] {
    return (bqData || []).map(row => ({
      date: row.date ?? '',
      region: row.region ?? 'Unknown',
      branch_count: row.branch_count ?? 0,
      revenue: row.revenue ?? 0,
      leads: row.leads ?? 0,
      sales: row.sales ?? 0,
      services_completed: row.services_completed ?? 0,
      close_rate: row.close_rate ?? 0,
      avg_revenue_per_branch: row.avg_revenue_per_branch ?? 0,
    }))
  }

  const {
    data: regionDailyRawData,
    isLoading: isBQLoading,
    dataSource,
    responseTime,
    refetch,
  } = useBigQueryData<RegionDaily[], RegionDaily[]>({
    queryName: 'region-daily',
    filters: { daysBack },
    defaultData: [],
    transformBigQueryData: transformRegionDailyData,
  })

  // Branch workforce data - employee counts by role per branch in selected region
  const {
    data: branchWorkforceData,
  } = useBigQueryData<BranchWorkforce[], BranchWorkforce[]>({
    queryName: 'branch-workforce',
    filters: { regionCode: selectedRegion },
    defaultData: [],
    transformBigQueryData: (data) => data,
    includeOrgFilters: false, // Region selection handled manually
    includeRoleFilters: false, // Company-wide workforce data
    enabled: !!selectedRegion,
  })

  useEffect(() => {
    if (orgRegions.length > 0 && !selectedRegion) {
      setSelectedRegion(orgRegions[0].region_code)
    }
  }, [orgRegions, selectedRegion])

  if (regionsLoading || !selectedRegion) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
      </div>
    )
  }

  const selectedRegionData = orgRegions.find(r => r.region_code === selectedRegion)

  // Filter data for selected region
  const regionFilteredData = regionDailyRawData.filter((row: RegionDaily) => {
    return selectedRegionData?.region_name &&
      row.region.toLowerCase().includes(selectedRegionData.region_name.toLowerCase())
  })

  // Compute date ranges for period
  const currentRange = getDateRangeForPeriod(periodState.period, periodState.customStartDate, periodState.customEndDate)
  const priorRange = getPriorPeriodRange(currentRange.startDate, currentRange.endDate)

  // Determine view mode
  const effectiveDate = periodState.drilledDate || (periodState.period === 'today' ? currentRange.endDate : null)
  const showSingleDayView = effectiveDate !== null
  const showPeriodView = !showSingleDayView

  // Current & prior period data
  const currentPeriodRows = filterRowsByDateRange(regionFilteredData, currentRange.startDate, currentRange.endDate)
  const priorPeriodRows = filterRowsByDateRange(regionFilteredData, priorRange.startDate, priorRange.endDate)
  const currentAgg = aggregateMetrics(currentPeriodRows)
  const priorAgg = aggregateMetrics(priorPeriodRows)

  // Single day data
  const singleDayData = effectiveDate
    ? regionFilteredData.find(r => r.date === effectiveDate) || null
    : null

  // Trend chart data
  const trendData = currentPeriodRows
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(row => ({
      date: row.date,
      dateLabel: formatDateShort(row.date),
      leads: row.leads,
      sales: row.sales,
      revenue: row.revenue,
      closeRate: row.close_rate,
    }))

  // Determine displayed metrics
  const displayLeads = showSingleDayView ? (singleDayData?.leads || 0) : currentAgg.leads
  const displaySales = showSingleDayView ? (singleDayData?.sales || 0) : currentAgg.sales
  const displayRevenue = showSingleDayView ? (singleDayData?.revenue || 0) : currentAgg.revenue
  const displayCloseRate = showSingleDayView ? (singleDayData?.close_rate || 0) : currentAgg.closeRate

  const summary = {
    branchCount: selectedRegionData?.branch_count || 0,
    totalPccInField: 0,
    totalInspPrp: displayLeads,
    totalLobsPrp: Math.round(displayLeads * 0.8),
    totalLobsSold: displaySales,
    totalDollarsSold: displayRevenue,
    avgGoalAttainment: displayCloseRate,
    branchesOnTrack: 0,
    branchesOffTrack: 0,
  }

  const branches = getBranchesByRegion(selectedRegion as RegionCode)

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">Region Director view - Branch performance summary</div>
          <div className="flex items-center gap-4">
            <DataSourceBadge status={dataSource} responseTime={responseTime} />
            <Button variant="outline" size="icon" onClick={refetch} disabled={isBQLoading}>
              <RefreshCw className={`h-4 w-4 ${isBQLoading ? 'animate-spin' : ''}`} />
            </Button>
            <SearchableSelect
              options={orgRegions.map(r => ({
                value: r.region_code,
                label: r.region_name,
                description: `${r.branch_count} branches`
              }))}
              value={selectedRegion}
              onValueChange={setSelectedRegion}
              placeholder="Select Region"
              searchPlaceholder="Search regions..."
              className="w-[280px]"
            />
          </div>
        </div>
        <PeriodSelector
          selectedPeriod={periodState.period}
          customStartDate={periodState.customStartDate}
          customEndDate={periodState.customEndDate}
          onPeriodChange={(p) => setPeriodState({ ...periodState, period: p, drilledDate: null })}
          onCustomDateChange={(s, e) => setPeriodState({ ...periodState, customStartDate: s, customEndDate: e, drilledDate: null })}
          size="sm"
        />
      </div>

      {/* Drill-down breadcrumb */}
      {periodState.drilledDate && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Button variant="ghost" size="sm" onClick={() => setPeriodState(prev => ({ ...prev, drilledDate: null }))}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {getPeriodLabel(periodState.period)} view
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Viewing {formatDate(periodState.drilledDate)}
          </span>
        </div>
      )}

      {/* Date Header */}
      <div className="flex items-center justify-between bg-muted rounded-lg p-4">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-semibold">{REGION_NAMES[selectedRegion as RegionCode] || orgRegions.find(r => r.region_code === selectedRegion)?.region_name || selectedRegion}</p>
            <p className="text-sm text-muted-foreground">
              {showSingleDayView
                ? formatDate(effectiveDate!)
                : `${formatDateShort(currentRange.startDate)} - ${formatDateShort(currentRange.endDate)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showPeriodView && (
            <Badge variant="outline">{currentAgg.dayCount} days</Badge>
          )}
          <Badge variant="outline">
            {summary.branchCount} branches
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Total PCCs</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.totalPccInField}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Inspections</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.totalInspPrp}</p>
            {showPeriodView && <DeltaBadge current={currentAgg.leads} prior={priorAgg.leads} />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">LOBs Prepared</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.totalLobsPrp}</p>
            {showPeriodView && <DeltaBadge current={Math.round(currentAgg.leads * 0.8)} prior={Math.round(priorAgg.leads * 0.8)} />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">LOBs Sold</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.totalLobsSold}</p>
            {showPeriodView && <DeltaBadge current={currentAgg.sales} prior={priorAgg.sales} />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Revenue</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(summary.totalDollarsSold)}</p>
            {showPeriodView && <DeltaBadge current={currentAgg.revenue} prior={priorAgg.revenue} />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Goal Attainment</span>
            </div>
            <p className="text-xl font-bold mt-1">{summary.avgGoalAttainment.toFixed(0)}%</p>
            <Progress value={Math.min(summary.avgGoalAttainment, 100)} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend Chart */}
      {showPeriodView && trendData.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Daily Trend - {getPeriodLabel(periodState.period, periodState.customStartDate, periodState.customEndDate)}
                </CardTitle>
                <CardDescription>Click any bar to drill into that day&apos;s detail</CardDescription>
              </div>
              <Badge variant="outline">{trendData.length} days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trendData}
                  onClick={(chartEvent) => {
                    if (chartEvent?.activePayload?.[0]?.payload?.date) {
                      setPeriodState(prev => ({
                        ...prev,
                        drilledDate: chartEvent.activePayload![0].payload.date,
                      }))
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dateLabel" fontSize={12} angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                          <p className="font-medium">{data.dateLabel}</p>
                          <p className="text-sm text-purple-600">Leads: {data.leads}</p>
                          <p className="text-sm text-green-600">Sales: {data.sales}</p>
                          <p className="text-sm text-blue-600">Revenue: {formatCurrency(data.revenue)}</p>
                          <p className="text-xs text-gray-500 mt-1">Click to drill into this day</p>
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Bar dataKey="leads" name="Leads" fill="#8884d8" cursor="pointer" />
                  <Bar dataKey="sales" name="Sales" fill="#82ca9d" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Branch Details Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Branch Details</CardTitle>
              <CardDescription>All branches in {REGION_NAMES[selectedRegion as RegionCode] || orgRegions.find(r => r.region_code === selectedRegion)?.region_name || selectedRegion}</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{summary.branchesOnTrack} on track</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span>{summary.branchesOffTrack} off track</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Branch Name</TableHead>
                <TableHead>BMs</TableHead>
                <TableHead className="text-center">AEs</TableHead>
                <TableHead className="text-center">Techs</TableHead>
                <TableHead className="text-center">Ops Mgrs</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => {
                const wf = branchWorkforceData.find(w => w.branch_code === branch.code)
                return (
                  <TableRow key={branch.code} className="bg-muted/50">
                    <TableCell className="font-mono">{branch.code}</TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">{branch.name}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{wf ? `${wf.branch_managers} BM` : branch.branchManager || '-'}</TableCell>
                    <TableCell className="text-center">{wf?.ae_sales ?? '-'}</TableCell>
                    <TableCell className="text-center">{wf?.technicians ?? '-'}</TableCell>
                    <TableCell className="text-center">{wf?.ops_managers ?? '-'}</TableCell>
                    <TableCell className="text-center">{wf?.total ?? '-'}</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-center">
                      {wf ? (
                        <Badge variant="outline">{wf.total} staff</Badge>
                      ) : (
                        <Badge variant="outline">No Data</Badge>
                      )}
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

// =============================================================================
// Branch Daily View Component
// =============================================================================

function BranchDailyView() {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [recentEntries, setRecentEntries] = useState<DailySalesEntry[]>([])
  const [periodState, setPeriodState] = useState<PeriodState>(DEFAULT_PERIOD_STATE)

  // Compute dynamic daysBack based on selected period
  const daysBack = useMemo(
    () => getDaysBackForPeriod(periodState.period, periodState.customStartDate, periodState.customEndDate),
    [periodState.period, periodState.customStartDate, periodState.customEndDate]
  )

  // Explicit transform for branch daily data with null handling
  function transformBranchDailyData(bqData: BranchDaily[]): BranchDaily[] {
    return (bqData || []).map(row => ({
      date: row.date ?? '',
      branch_id: row.branch_id ?? '',
      branch_name: row.branch_name ?? 'Unknown',
      revenue: row.revenue ?? 0,
      leads: row.leads ?? 0,
      sales: row.sales ?? 0,
      services_completed: row.services_completed ?? 0,
      callbacks: row.callbacks ?? 0,
      close_rate: row.close_rate ?? 0,
    }))
  }

  const {
    data: branchDailyRawData,
    isLoading: isBQLoading,
    dataSource,
    responseTime,
    refetch,
  } = useBigQueryData<BranchDaily[], BranchDaily[]>({
    queryName: 'branch-daily',
    filters: { daysBack },
    defaultData: [],
    transformBigQueryData: transformBranchDailyData,
  })

  const today = new Date().toISOString().split('T')[0]
  const hasTapLeads = new Date().getMonth() >= 3

  const [formData, setFormData] = useState<DailySalesInput>({
    date: today,
    pccInField: '',
    tapLeads: '',
    inspPrp: '',
    lobsPrp: '',
    lobsSold: '',
    dollarsSold: '',
    nextDayConf: '',
    pcNoTcConversions: false,
  })

  useEffect(() => {
    const allBranches = getBranches()
    setBranches(allBranches)
    if (allBranches.length > 0) {
      setSelectedBranch(allBranches[0])
    }
  }, [])

  useEffect(() => {
    if (selectedBranch) {
      // Get entries from BigQuery for this branch
      const branchEntries = branchDailyRawData
        .filter((row: BranchDaily) => row.branch_id === selectedBranch.code)
        .sort((a: BranchDaily, b: BranchDaily) => b.date.localeCompare(a.date))
        .slice(0, 7)

      // Convert BigQuery data to DailySalesEntry format for display
      const convertedEntries: DailySalesEntry[] = branchEntries.map((row: BranchDaily) => ({
        id: `${row.branch_id}-${row.date}`,
        date: row.date,
        branchCode: row.branch_id,
        submittedBy: selectedBranch.branchManager,
        submittedAt: row.date,
        createdAt: row.date,
        updatedAt: row.date,
        metrics: {
          pccInField: 0, // Not in BQ data
          tapLeads: undefined,
          inspPrp: row.leads,
          lobsPrp: Math.round(row.leads * 0.8),
          lobsSold: row.sales,
          dollarsSold: row.revenue,
          nextDayConf: 0, // Not in BQ data
          pcNoTcConversions: false,
        }
      }))

      setRecentEntries(convertedEntries)

      // Reset form for new entry
      setFormData({
        date: today,
        pccInField: '',
        tapLeads: '',
        inspPrp: '',
        lobsPrp: '',
        lobsSold: '',
        dollarsSold: '',
        nextDayConf: '',
        pcNoTcConversions: false,
      })
    }
  }, [selectedBranch, today, branchDailyRawData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBranch) return

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const metrics = {
        pccInField: parseInt(formData.pccInField) || 0,
        tapLeads: hasTapLeads ? parseInt(formData.tapLeads) || 0 : undefined,
        inspPrp: parseInt(formData.inspPrp) || 0,
        lobsPrp: parseInt(formData.lobsPrp) || 0,
        lobsSold: parseInt(formData.lobsSold) || 0,
        dollarsSold: parseFloat(formData.dollarsSold.replace(/[^0-9.]/g, '')) || 0,
        nextDayConf: parseInt(formData.nextDayConf) || 0,
        pcNoTcConversions: formData.pcNoTcConversions,
      }

      addDailyEntry(selectedBranch.code, formData.date, metrics, selectedBranch.branchManager)

      setRecentEntries(getEntriesForBranch(selectedBranch.code).slice(0, 7))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  if (!selectedBranch) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
      </div>
    )
  }

  // Filter BigQuery data for this branch
  const branchBQData = branchDailyRawData.filter(
    (row: BranchDaily) => row.branch_id === selectedBranch.code
  )

  // Compute date ranges for period
  const currentRange = getDateRangeForPeriod(periodState.period, periodState.customStartDate, periodState.customEndDate)
  const priorRange = getPriorPeriodRange(currentRange.startDate, currentRange.endDate)

  // Current & prior period data
  const currentPeriodRows = filterRowsByDateRange(branchBQData, currentRange.startDate, currentRange.endDate)
  const priorPeriodRows = filterRowsByDateRange(branchBQData, priorRange.startDate, priorRange.endDate)
  const currentAgg = aggregateMetrics(currentPeriodRows)
  const priorAgg = aggregateMetrics(priorPeriodRows)

  // Period label for card titles
  const periodLabel = periodState.period === 'today' ? 'Today'
    : periodState.period === 'wtd' ? 'Week'
    : periodState.period === 'mtd' ? 'Month'
    : periodState.period === 'qtd' ? 'Quarter'
    : periodState.period === 'ytd' ? 'Year'
    : 'Period'

  // Trend chart data for the branch
  const trendData = currentPeriodRows
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(row => ({
      date: row.date,
      dateLabel: formatDateShort(row.date),
      leads: row.leads,
      sales: row.sales,
      revenue: row.revenue,
    }))

  const showTrend = periodState.period !== 'today' && trendData.length > 1

  const pccCount = parseInt(formData.pccInField) || 0

  const expectedInsp = pccCount * DEFAULT_DAILY_GOALS.inspPrpPerPcc
  const expectedLobs = pccCount * DEFAULT_DAILY_GOALS.lobsPrpPerPcc
  const expectedSold = pccCount * DEFAULT_DAILY_GOALS.lobsSoldPerPcc
  const expectedConf = pccCount * DEFAULT_DAILY_GOALS.nextDayConfPerPcc

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">Branch Manager daily activity tracker</div>
          <div className="flex items-center gap-4">
            <DataSourceBadge status={dataSource} responseTime={responseTime} />
            <Button variant="outline" size="icon" onClick={refetch} disabled={isBQLoading}>
              <RefreshCw className={`h-4 w-4 ${isBQLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Select
              value={selectedBranch?.code || ''}
              onValueChange={(code) => setSelectedBranch(getBranchByCode(code) || null)}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select your branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.code} value={branch.code}>
                    {branch.code} - {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <PeriodSelector
          selectedPeriod={periodState.period}
          customStartDate={periodState.customStartDate}
          customEndDate={periodState.customEndDate}
          onPeriodChange={(p) => setPeriodState({ ...periodState, period: p, drilledDate: null })}
          onCustomDateChange={(s, e) => setPeriodState({ ...periodState, customStartDate: s, customEndDate: e, drilledDate: null })}
          size="sm"
        />
      </div>

      {/* Branch Info & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{selectedBranch.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{selectedBranch.branchManager}</p>
              <Badge variant="outline" className="mt-2">{selectedBranch.region}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{periodLabel} Inspections</p>
                <p className="text-2xl font-bold">{currentAgg.leads}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
            <DeltaBadge current={currentAgg.leads} prior={priorAgg.leads} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{periodLabel} LOBs Sold</p>
                <p className="text-2xl font-bold">{currentAgg.sales}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <DeltaBadge current={currentAgg.sales} prior={priorAgg.sales} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{periodLabel} Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(currentAgg.revenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-500" />
            </div>
            <DeltaBadge current={currentAgg.revenue} prior={priorAgg.revenue} />
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend Chart */}
      {showTrend && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Daily Trend - {getPeriodLabel(periodState.period, periodState.customStartDate, periodState.customEndDate)}
                </CardTitle>
                <CardDescription>Daily leads, sales, and revenue for this branch</CardDescription>
              </div>
              <Badge variant="outline">{trendData.length} days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dateLabel" fontSize={12} angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                          <p className="font-medium">{data.dateLabel}</p>
                          <p className="text-sm text-purple-600">Leads: {data.leads}</p>
                          <p className="text-sm text-green-600">Sales: {data.sales}</p>
                          <p className="text-sm text-blue-600">Revenue: {formatCurrency(data.revenue)}</p>
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Bar dataKey="leads" name="Leads" fill="#8884d8" />
                  <Bar dataKey="sales" name="Sales" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Entry Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today&apos;s Entry
              </CardTitle>
              <CardDescription>Enter your daily sales activity metrics</CardDescription>
            </div>
            {saveSuccess && (
              <Badge className="bg-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                Saved!
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              {/* PCCs in Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium"># PCCs in Field</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.pccInField}
                  onChange={(e) => setFormData({ ...formData, pccInField: e.target.value })}
                />
              </div>

              {/* TAP Leads */}
              {hasTapLeads && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">TAP Leads</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.tapLeads}
                    onChange={(e) => setFormData({ ...formData, tapLeads: e.target.value })}
                  />
                </div>
              )}

              {/* INSP PRP */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  INSP PRP
                  {pccCount > 0 && (
                    <span className="text-xs text-gray-400 ml-1">(goal: {expectedInsp.toFixed(1)})</span>
                  )}
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.inspPrp}
                  onChange={(e) => setFormData({ ...formData, inspPrp: e.target.value })}
                  className={parseInt(formData.inspPrp) >= expectedInsp ? 'border-green-500' : ''}
                />
              </div>

              {/* LOBs PRP */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  LOBs PRP
                  {pccCount > 0 && (
                    <span className="text-xs text-gray-400 ml-1">(goal: {expectedLobs.toFixed(0)})</span>
                  )}
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.lobsPrp}
                  onChange={(e) => setFormData({ ...formData, lobsPrp: e.target.value })}
                  className={parseInt(formData.lobsPrp) >= expectedLobs ? 'border-green-500' : ''}
                />
              </div>

              {/* LOBs Sold */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  LOBs Sold
                  {pccCount > 0 && (
                    <span className="text-xs text-gray-400 ml-1">(goal: {expectedSold.toFixed(0)})</span>
                  )}
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.lobsSold}
                  onChange={(e) => setFormData({ ...formData, lobsSold: e.target.value })}
                  className={parseInt(formData.lobsSold) >= expectedSold ? 'border-green-500' : ''}
                />
              </div>

              {/* Dollars Sold */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Dollars Sold</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                  <Input
                    type="text"
                    placeholder="0.00"
                    className="pl-7"
                    value={formData.dollarsSold}
                    onChange={(e) => setFormData({ ...formData, dollarsSold: e.target.value })}
                  />
                </div>
              </div>

              {/* Next Day Conf */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Next Day CONF
                  {pccCount > 0 && (
                    <span className="text-xs text-gray-400 ml-1">(goal: {expectedConf.toFixed(1)})</span>
                  )}
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.nextDayConf}
                  onChange={(e) => setFormData({ ...formData, nextDayConf: e.target.value })}
                />
              </div>

              {/* PC NO TC Conversions */}
              <div className="space-y-2">
                <label className="text-sm font-medium">PC NO TC Conversions</label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={formData.pcNoTcConversions}
                    onCheckedChange={(checked) => setFormData({ ...formData, pcNoTcConversions: checked })}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formData.pcNoTcConversions ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Entry
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
          <CardDescription>Your last 7 daily submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">PCCs</TableHead>
                {hasTapLeads && <TableHead className="text-center">TAP</TableHead>}
                <TableHead className="text-center">INSP</TableHead>
                <TableHead className="text-center">LOBs PRP</TableHead>
                <TableHead className="text-center">LOBs Sold</TableHead>
                <TableHead className="text-right">Dollars</TableHead>
                <TableHead className="text-center">Next Day</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasTapLeads ? 8 : 7} className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No entries yet
                  </TableCell>
                </TableRow>
              ) : (
                recentEntries.map((entry) => {
                  const goal = entry.metrics.pccInField * DEFAULT_DAILY_GOALS.inspPrpPerPcc
                  const onTrack = entry.metrics.inspPrp >= goal * 0.8
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{formatDateShort(entry.date)}</TableCell>
                      <TableCell className="text-center">{entry.metrics.pccInField}</TableCell>
                      {hasTapLeads && (
                        <TableCell className="text-center">{entry.metrics.tapLeads || '-'}</TableCell>
                      )}
                      <TableCell className="text-center">
                        <span className={onTrack ? 'text-green-600 font-medium' : 'text-red-600'}>
                          {entry.metrics.inspPrp}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{entry.metrics.lobsPrp}</TableCell>
                      <TableCell className="text-center">{entry.metrics.lobsSold}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.metrics.dollarsSold)}</TableCell>
                      <TableCell className="text-center">{entry.metrics.nextDayConf}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Goals Reference */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Daily Goals (per PCC)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-600 dark:text-blue-400">INSP PRP:</span>{' '}
              <span className="font-semibold">{DEFAULT_DAILY_GOALS.inspPrpPerPcc}</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400">LOBs PRP:</span>{' '}
              <span className="font-semibold">{DEFAULT_DAILY_GOALS.lobsPrpPerPcc}</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400">LOBs Sold:</span>{' '}
              <span className="font-semibold">{DEFAULT_DAILY_GOALS.lobsSoldPerPcc}</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400">Next Day CONF:</span>{' '}
              <span className="font-semibold">{DEFAULT_DAILY_GOALS.nextDayConfPerPcc}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
