"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { ChartTooltip } from '@/components/features/ChartTooltip'
import { PageHeader } from '@/components/layout/PageHeader'
import FilterBar, { type FilterOption } from '@/components/rtx/FilterBar'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Users, AlertTriangle, Target, CheckCircle, XCircle, FileText, Database, RefreshCw } from 'lucide-react'
import type { SalesToday, BacklogItem } from '@/lib/bigquery/queries/sales'
import type { PipelineByStage, RepPerformance, AtRiskLead, SalesKPIs } from '@/lib/bigquery/queries/sales-pipeline'
import type { BCGSalesAnalytics } from '@/lib/bigquery/queries/bcg-analytics'

// Types for display
interface SalesDisplayData {
  closedWon: number
  closedWonValue: number
  canceled: number
  canceledValue: number
  newContracts: number
}

interface BacklogDisplayData {
  items: Array<{
    id: string
    customerName: string
    serviceType: string
    soldDate: string
    daysSinceSold: number
    amount: number
    branch: string
    salesPerson: string
  }>
  totalValue: number
  totalCount: number
}

// Transform BigQuery sales data
function transformBigQueryData(bqData: SalesToday): SalesDisplayData {
  if (!bqData) return { closedWon: 0, closedWonValue: 0, canceled: 0, canceledValue: 0, newContracts: 0 }
  return {
    closedWon: bqData.closed_won || 0,
    closedWonValue: bqData.closed_won_value || 0,
    canceled: bqData.canceled || 0,
    canceledValue: bqData.canceled_value || 0,
    newContracts: bqData.new_contracts || 0,
  }
}

// Transform BigQuery backlog data
function transformBacklogData(bqData: BacklogItem[]): BacklogDisplayData {
  const items = (bqData || []).map(item => ({
    id: item.sales_id,
    customerName: item.customer_name,
    serviceType: item.service_type,
    soldDate: item.sold_date,
    daysSinceSold: item.days_since_sold,
    amount: item.amount,
    branch: item.branch,
    salesPerson: item.sales_person,
  }))
  return {
    items,
    totalValue: items.reduce((sum, i) => sum + i.amount, 0),
    totalCount: items.length,
  }
}

// Default empty states (no mock data - BigQuery only)
const EMPTY_SALES: SalesDisplayData = {
  closedWon: 0,
  closedWonValue: 0,
  canceled: 0,
  canceledValue: 0,
  newContracts: 0,
}

const EMPTY_BACKLOG: BacklogDisplayData = {
  items: [],
  totalValue: 0,
  totalCount: 0,
}

// Types for pipeline display
interface PipelineDisplayData {
  stages: Array<{
    stage: string
    stageOrder: number
    count: number
    value: number
  }>
}

// Transform BigQuery pipeline data
function transformPipelineData(bqData: PipelineByStage[]): PipelineDisplayData {
  return {
    stages: (bqData || []).map(item => ({
      stage: item.stage,
      stageOrder: item.stage_order,
      count: item.count,
      value: item.value,
    }))
  }
}

const EMPTY_PIPELINE: PipelineDisplayData = {
  stages: [],
}

// Types for rep performance display
interface RepDisplayData {
  reps: Array<{
    salesPerson: string
    salesPersonId: string
    totalContracts: number
    totalValue: number
    startedContracts: number
    startedValue: number
    canceledContracts: number
    canceledValue: number
    winRate: number
    avgDealSize: number
  }>
}

// Transform BigQuery rep performance data
function transformRepData(bqData: RepPerformance[]): RepDisplayData {
  return {
    reps: (bqData || []).map(item => ({
      salesPerson: item.sales_person,
      salesPersonId: item.sales_person_id,
      totalContracts: item.total_contracts,
      totalValue: item.total_value,
      startedContracts: item.started_contracts,
      startedValue: item.started_value,
      canceledContracts: item.canceled_contracts,
      canceledValue: item.canceled_value,
      winRate: item.win_rate,
      avgDealSize: item.avg_deal_size,
    }))
  }
}

const EMPTY_REP: RepDisplayData = {
  reps: [],
}

// Types for at-risk leads display
interface AtRiskDisplayData {
  leads: Array<{
    leadId: string
    customerName: string
    currentStage: string
    daysInStage: number
    riskLevel: 'high' | 'medium' | 'low'
    amount: number
    assignedRep: string
    branch: string
    lastActivityDate: string
  }>
}

// Transform BigQuery at-risk data
function transformAtRiskData(bqData: AtRiskLead[]): AtRiskDisplayData {
  return {
    leads: (bqData || []).map(item => ({
      leadId: item.lead_id,
      customerName: item.customer_name,
      currentStage: item.current_stage,
      daysInStage: item.days_in_stage,
      riskLevel: item.risk_level,
      amount: item.amount,
      assignedRep: item.assigned_rep,
      branch: item.branch,
      lastActivityDate: item.last_activity_date,
    }))
  }
}

const EMPTY_AT_RISK: AtRiskDisplayData = {
  leads: [],
}

// Types for KPIs display
interface KPIsDisplayData {
  pipelineValue: number
  pipeline30Day: number
  pipeline60Day: number
  pipeline90Day: number
  winRate: number
  avgCycleTimeDays: number
  stalledOppsCount: number
  stalledOppsValue: number
  crmHygieneScore: number
  totalLeads: number
  proposalsCount: number
  soldCount: number
}

// Transform BigQuery KPIs data
function transformKPIsData(bqData: SalesKPIs): KPIsDisplayData {
  if (!bqData) return EMPTY_KPIS
  return {
    pipelineValue: bqData.pipeline_value || 0,
    pipeline30Day: bqData.pipeline_30_day || 0,
    pipeline60Day: bqData.pipeline_60_day || 0,
    pipeline90Day: bqData.pipeline_90_day || 0,
    winRate: bqData.win_rate || 0,
    avgCycleTimeDays: bqData.avg_cycle_time_days || 0,
    stalledOppsCount: bqData.stalled_opps_count || 0,
    stalledOppsValue: bqData.stalled_opps_value || 0,
    crmHygieneScore: bqData.crm_hygiene_score || 0,
    totalLeads: bqData.total_leads || 0,
    proposalsCount: bqData.proposals_count || 0,
    soldCount: bqData.sold_count || 0,
  }
}

const EMPTY_KPIS: KPIsDisplayData = {
  pipelineValue: 0,
  pipeline30Day: 0,
  pipeline60Day: 0,
  pipeline90Day: 0,
  winRate: 0,
  avgCycleTimeDays: 0,
  stalledOppsCount: 0,
  stalledOppsValue: 0,
  crmHygieneScore: 0,
  totalLeads: 0,
  proposalsCount: 0,
  soldCount: 0,
}

// Data source indicator component (BigQuery only)
function DataSourceIndicator({ isLive, label }: { isLive: boolean; label?: string }) {
  return (
    <Badge
      variant="default"
      className={`text-xs ${isLive ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}
    >
      <Database className="h-3 w-3 mr-1" />
      {label || (isLive ? 'Live' : 'Loading...')}
    </Badge>
  )
}

export default function SalesPage() {
  // BCG Analytics state (enhanced data from BCG_RTD_DB - 3.2M rows)
  const [bcgSalesData, setBcgSalesData] = useState<BCGSalesAnalytics[]>([])
  const [bcgLoading, setBcgLoading] = useState(false)

  // Filter state
  const [selectedMarket, setSelectedMarket] = useState('all')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Sales filter data from BigQuery (directly from contract table for accurate matching)
  interface SalesFilterOption {
    code: string
    name: string
    count: number
  }
  const [salesMarkets, setSalesMarkets] = useState<SalesFilterOption[]>([])
  const [salesRegions, setSalesRegions] = useState<SalesFilterOption[]>([])
  const [salesBranches, setSalesBranches] = useState<SalesFilterOption[]>([])
  const [filtersLoading, setFiltersLoading] = useState(false)

  // Fetch sales markets on mount
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'sales-markets' }),
        })
        const data = await response.json()
        if (data.success && data.data) {
          setSalesMarkets(data.data)
        }
      } catch (err) {
        console.error('Failed to fetch sales markets:', err)
      }
    }
    fetchMarkets()
  }, [])

  // Fetch regions when market changes
  useEffect(() => {
    if (selectedMarket === 'all') {
      setSalesRegions([])
      return
    }
    const fetchRegions = async () => {
      setFiltersLoading(true)
      try {
        const response = await fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'sales-regions',
            filters: { marketCode: selectedMarket },
          }),
        })
        const data = await response.json()
        if (data.success && data.data) {
          setSalesRegions(data.data)
        }
      } catch (err) {
        console.error('Failed to fetch sales regions:', err)
      } finally {
        setFiltersLoading(false)
      }
    }
    fetchRegions()
  }, [selectedMarket])

  // Fetch branches when region changes
  useEffect(() => {
    if (selectedRegion === 'all') {
      setSalesBranches([])
      return
    }
    const fetchBranches = async () => {
      setFiltersLoading(true)
      try {
        const response = await fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'sales-branches',
            filters: {
              marketCode: selectedMarket !== 'all' ? selectedMarket : undefined,
              regionCode: selectedRegion,
            },
          }),
        })
        const data = await response.json()
        if (data.success && data.data) {
          setSalesBranches(data.data)
        }
      } catch (err) {
        console.error('Failed to fetch sales branches:', err)
      } finally {
        setFiltersLoading(false)
      }
    }
    fetchBranches()
  }, [selectedMarket, selectedRegion])

  // Build filter options for dropdowns
  const marketOptions: FilterOption[] = useMemo(() => [
    { value: 'all', label: 'All Markets' },
    ...salesMarkets.map((m: SalesFilterOption) => ({
      value: m.code,
      label: `${m.code} (${m.count.toLocaleString()})`
    }))
  ], [salesMarkets])

  const regionOptions: FilterOption[] = useMemo(() => {
    if (selectedMarket === 'all') {
      return [{ value: 'all', label: 'All Regions' }]
    }
    return [
      { value: 'all', label: 'All Regions' },
      ...salesRegions.map((r: SalesFilterOption) => ({
        value: r.code,
        label: `${r.code} (${r.count.toLocaleString()})`
      }))
    ]
  }, [selectedMarket, salesRegions])

  const branchOptions: FilterOption[] = useMemo(() => {
    if (selectedRegion === 'all') {
      return [{ value: 'all', label: 'All Branches' }]
    }
    return [
      { value: 'all', label: 'All Branches' },
      ...salesBranches.map((b: SalesFilterOption) => ({
        value: b.code,
        label: `${b.code} (${b.count.toLocaleString()})`
      }))
    ]
  }, [selectedRegion, salesBranches])

  // Handle filter changes with cascading resets
  const handleMarketChange = (value: string) => {
    setSelectedMarket(value)
    setSelectedRegion('all')
    setSelectedBranch('all')
  }

  const handleRegionChange = (value: string) => {
    setSelectedRegion(value)
    setSelectedBranch('all')
  }

  const handleBranchChange = (value: string) => {
    setSelectedBranch(value)
  }

  const handleClearFilters = () => {
    setSelectedMarket('all')
    setSelectedRegion('all')
    setSelectedBranch('all')
    setStartDate('')
    setEndDate('')
  }

  // Build filter object for BigQuery queries
  const queryFilters = useMemo(() => {
    const filters: Record<string, unknown> = {
      marketCode: selectedMarket !== 'all' ? selectedMarket : undefined,
      regionCode: selectedRegion !== 'all' ? selectedRegion : undefined,
      branchCode: selectedBranch !== 'all' ? selectedBranch : undefined,
    }

    // Only add date filters if they're set
    if (startDate) filters.startDate = startDate
    if (endDate) filters.endDate = endDate

    // Only use daysBack if no date range specified
    if (!startDate && !endDate) {
      filters.daysBack = 90 // Default lookback
    }

    return filters
  }, [selectedMarket, selectedRegion, selectedBranch, startDate, endDate])

  // Fetch BCG sales analytics (always from BigQuery)
  const fetchBCGSales = useCallback(async () => {
    setBcgLoading(true)
    try {
      const response = await fetch('/api/bigquery/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'bcg-sales-analytics',
          filters: {
            ...queryFilters,
            limit: 50,
          }
        }),
      })

      const data = await response.json()
      if (data.success && data.data?.length > 0) {
        setBcgSalesData(data.data)
      }
    } catch (err) {
      console.error('BCG Sales Analytics fetch failed:', err)
    } finally {
      setBcgLoading(false)
    }
  }, [queryFilters])

  // Fetch BCG data on mount and when filters change
  useEffect(() => {
    fetchBCGSales()
  }, [fetchBCGSales])

  // BigQuery integration for today's sales metrics (using BCG for real data)
  const {
    data: salesData,
    isLoading: isSalesLoading,
    dataSource: salesDataSource,
    responseTime,
    error,
    refetch: refetchSales,
  } = useBigQueryData<SalesToday, SalesDisplayData>({
    queryName: 'bcg-sales-today',
    filters: queryFilters,
    defaultData: EMPTY_SALES,
    transformBigQueryData,
    includeOrgFilters: true, // Sales overview - shows org-level data
    includeRoleFilters: false, // Not filtered to individual user
  })

  // BigQuery integration for backlog data
  const {
    data: backlogData,
    isLoading: isBacklogLoading,
    dataSource: backlogDataSource,
    refetch: refetchBacklog,
  } = useBigQueryData<BacklogItem[], BacklogDisplayData>({
    queryName: 'bcg-backlog',
    filters: { ...queryFilters, limit: 50 },
    defaultData: EMPTY_BACKLOG,
    transformBigQueryData: transformBacklogData,
    includeOrgFilters: true, // Sales overview - shows org-level data
    includeRoleFilters: false, // Not filtered to individual user
  })

  // BigQuery integration for pipeline by stage
  const {
    data: pipelineData,
    isLoading: isPipelineLoading,
    dataSource: pipelineDataSource,
    refetch: refetchPipeline,
  } = useBigQueryData<PipelineByStage[], PipelineDisplayData>({
    queryName: 'bcg-pipeline-by-stage',
    filters: queryFilters,
    defaultData: EMPTY_PIPELINE,
    transformBigQueryData: transformPipelineData,
    includeOrgFilters: true, // Sales overview - shows org-level data
    includeRoleFilters: false, // Not filtered to individual user
  })

  // BigQuery integration for rep performance
  const {
    data: repData,
    isLoading: isRepLoading,
    dataSource: repDataSource,
    refetch: refetchReps,
  } = useBigQueryData<RepPerformance[], RepDisplayData>({
    queryName: 'bcg-rep-performance',
    filters: { ...queryFilters, limit: 15 },
    defaultData: EMPTY_REP,
    transformBigQueryData: transformRepData,
    includeOrgFilters: true, // Sales overview - shows org-level data
    includeRoleFilters: false, // Not filtered to individual user
  })

  // BigQuery integration for at-risk leads
  const {
    data: atRiskData,
    isLoading: isAtRiskLoading,
    dataSource: atRiskDataSource,
    refetch: refetchAtRisk,
  } = useBigQueryData<AtRiskLead[], AtRiskDisplayData>({
    queryName: 'bcg-at-risk-leads',
    filters: { ...queryFilters, limit: 15 },
    defaultData: EMPTY_AT_RISK,
    transformBigQueryData: transformAtRiskData,
    includeOrgFilters: true, // Sales overview - shows org-level data
    includeRoleFilters: false, // Not filtered to individual user
  })

  // BigQuery integration for sales KPIs
  const {
    data: kpisData,
    isLoading: isKPIsLoading,
    dataSource: kpisDataSource,
    refetch: refetchKPIs,
  } = useBigQueryData<SalesKPIs, KPIsDisplayData>({
    queryName: 'bcg-sales-kpis',
    filters: queryFilters,
    defaultData: EMPTY_KPIS,
    transformBigQueryData: transformKPIsData,
    includeOrgFilters: true, // Sales overview - shows org-level data
    includeRoleFilters: false, // Not filtered to individual user
  })

  // Combined loading and refetch
  const isBQLoading = isSalesLoading || isBacklogLoading || isPipelineLoading || isRepLoading || isAtRiskLoading || isKPIsLoading
  const dataSource = salesDataSource // Primary data source indicator
  const refetch = () => {
    refetchSales()
    refetchBacklog()
    refetchPipeline()
    refetchReps()
    refetchAtRisk()
    refetchKPIs()
  }

  // Determine if we're showing live data
  const isLiveData = salesDataSource === 'bigquery'

  // Check if BigQuery returned empty data (connected but no results)
  const isLiveButEmpty = isLiveData &&
    kpisData.totalLeads === 0 &&
    kpisData.pipelineValue === 0 &&
    pipelineData.stages.length === 0

  // Calculate win rate from live data
  const liveWinRate = salesData.newContracts > 0
    ? ((salesData.closedWon / salesData.newContracts) * 100).toFixed(1)
    : '0.0'

  // Stage conversion data - use BigQuery data
  const stageLabels: Record<string, string> = {
    prospect: 'Prospect',
    qualified: 'Qualified',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
  }

  // Use BigQuery pipeline data
  const funnelData = pipelineData.stages.map(stage => ({
    name: stageLabels[stage.stage] || stage.stage,
    value: stage.value,
    count: stage.count,
    fill: stage.stage === 'prospect' ? '#94a3b8' :
          stage.stage === 'qualified' ? '#3b82f6' :
          stage.stage === 'proposal' ? '#f59e0b' :
          '#22c55e'
  }))

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumbs */}
      <PageHeader
        title="Sales"
        breadcrumbs={[
          { label: 'Command Center', href: '/' },
          { label: 'Sales' },
        ]}
        dataSource={dataSource}
        responseTime={responseTime}
        error={error}
        onRefresh={refetch}
        isLoading={isBQLoading}
      />

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-800 dark:text-red-200">
              Data Error
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Empty Data Warning - show even if some data exists */}
      {isLiveData && !error && (salesData.closedWon === 0 && salesData.newContracts === 0) && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg flex items-center gap-3">
          <Database className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              No Sales Data for Selected Period
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              No contracts found for the selected date range. Try expanding the date range or checking different filters.
            </p>
          </div>
        </div>
      )}

      {/* BigQuery Connected But Empty */}
      {isLiveButEmpty && !error && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg flex items-center gap-3">
          <Database className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Connected to BigQuery - No Data Found
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              BigQuery connection is active but returned no results. The tables may be empty or have no data matching the current filters/date range.
            </p>
          </div>
          <AlertTriangle className="h-5 w-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        markets={marketOptions}
        regions={regionOptions}
        branches={branchOptions}
        selectedMarket={selectedMarket}
        selectedRegion={selectedRegion}
        selectedBranch={selectedBranch}
        onMarketChange={handleMarketChange}
        onRegionChange={handleRegionChange}
        onBranchChange={handleBranchChange}
        onClearFilters={handleClearFilters}
        showDateRange={true}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        showSearch={false}
      />

      {/* Live Sales Metrics from BigQuery */}
      <Card className={isLiveData ? 'border-green-200 dark:border-green-800' : 'border-amber-200 dark:border-amber-800'}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Today&apos;s Sales Performance
            </CardTitle>
            <DataSourceIndicator isLive={isLiveData} />
          </div>
          <CardDescription>
            Real-time contract data from BigQuery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Closed Won */}
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Closed Won</span>
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">{salesData.closedWon}</div>
              <div className="text-sm text-green-600 dark:text-green-400">{formatCurrency(salesData.closedWonValue)}</div>
            </div>

            {/* Canceled */}
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">Canceled</span>
              </div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">{salesData.canceled}</div>
              <div className="text-sm text-red-600 dark:text-red-400">{formatCurrency(salesData.canceledValue)}</div>
            </div>

            {/* New Contracts */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">New Contracts</span>
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{salesData.newContracts}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Today</div>
            </div>

            {/* Net Revenue */}
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Net Revenue</span>
              </div>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {formatCurrency(salesData.closedWonValue - salesData.canceledValue)}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Won - Canceled</div>
            </div>

            {/* Win Rate */}
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Win Rate</span>
              </div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{liveWinRate}%</div>
              <div className="text-sm text-amber-600 dark:text-amber-400">Won / Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backlog from BigQuery */}
      <Card className={backlogDataSource === 'bigquery' ? 'border-green-200 dark:border-green-800' : 'border-amber-200 dark:border-amber-800'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Sales Backlog
              <Badge variant="outline" className="ml-2">{backlogData.totalCount} items</Badge>
            </CardTitle>
            <DataSourceIndicator isLive={backlogDataSource === 'bigquery'} />
          </div>
          <CardDescription>
            Contracts sold but not yet started (last 90 days) - {formatCurrency(backlogData.totalValue)} total value
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Sold Date</TableHead>
                <TableHead className="text-right">Days Waiting</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Sales Rep</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backlogData.items.slice(0, 8).map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.customerName}</TableCell>
                  <TableCell>{item.serviceType}</TableCell>
                  <TableCell>{item.soldDate}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={item.daysSinceSold > 14 ? 'destructive' : item.daysSinceSold > 7 ? 'default' : 'secondary'}>
                      {item.daysSinceSold} days
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                  <TableCell>{item.salesPerson}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {backlogData.items.length > 8 && (
            <div className="mt-4 text-center">
              <Button variant="outline" asChild>
                <Link href="/sales/backlog">View All {backlogData.totalCount} Backlog Items</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Summary - Now from BigQuery! */}
      <Card className={kpisDataSource === 'bigquery' ? 'border-green-200 dark:border-green-800' : 'border-amber-200 dark:border-amber-800'}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              KPI Summary
            </CardTitle>
            <DataSourceIndicator isLive={kpisDataSource === 'bigquery'} />
          </div>
          <CardDescription>
            Key performance indicators (last 90 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div id="sales-kpi-cards" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Pipeline Value */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Pipeline (30/60/90)</div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(kpisData.pipelineValue)}</div>
              <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                {formatCurrency(kpisData.pipeline30Day)} / {formatCurrency(kpisData.pipeline60Day)} / {formatCurrency(kpisData.pipeline90Day)}
              </div>
            </div>

            {/* Win Rate */}
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
              <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Win Rate</div>
              <div className="text-xl font-bold text-green-700 dark:text-green-300">{kpisData.winRate}%</div>
              <div className="text-xs text-green-500 dark:text-green-400 mt-1">
                {kpisData.soldCount} / {kpisData.proposalsCount} proposals
              </div>
            </div>

            {/* Avg Cycle Time */}
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
              <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Avg Cycle Time</div>
              <div className="text-xl font-bold text-purple-700 dark:text-purple-300">{kpisData.avgCycleTimeDays} days</div>
              <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                Lead to close
              </div>
            </div>

            {/* Stalled Opps */}
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
              <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Stalled Opps</div>
              <div className="text-xl font-bold text-amber-700 dark:text-amber-300">{kpisData.stalledOppsCount}</div>
              <div className="text-xs text-amber-500 dark:text-amber-400 mt-1">
                {formatCurrency(kpisData.stalledOppsValue)} at risk
              </div>
            </div>

            {/* CRM Hygiene */}
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CRM Hygiene</div>
              <div className={`text-xl font-bold ${kpisData.crmHygieneScore >= 80 ? 'text-green-600' : kpisData.crmHygieneScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {kpisData.crmHygieneScore}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Data completeness
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel - Now from BigQuery! */}
        <Card id="pipeline-card" className={pipelineDataSource === 'bigquery' ? 'border-green-200 dark:border-green-800' : 'border-amber-200 dark:border-amber-800'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Pipeline by Stage
              </CardTitle>
              <DataSourceIndicator isLive={pipelineDataSource === 'bigquery'} />
            </div>
            <CardDescription>
              Active leads by funnel stage (last 90 days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <defs>
                    <filter id="glow-sales" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip content={<ChartTooltip formatter={formatCurrency} />} cursor={false} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} activeBar={{ filter: 'url(#glow-sales)' }}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stalled Opportunities - Now from BigQuery! */}
        <Card className={atRiskDataSource === 'bigquery' ? 'border-green-200 dark:border-green-800' : 'border-amber-200 dark:border-amber-800'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Stalled Opportunities
              </CardTitle>
              <DataSourceIndicator isLive={atRiskDataSource === 'bigquery'} />
            </div>
            <CardDescription>
              Leads stalled 14+ days in current stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {atRiskData.leads.slice(0, 6).map(lead => (
                <div key={lead.leadId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{lead.customerName}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{lead.currentStage}</Badge>
                      <span>{lead.daysInStage} days</span>
                      <span className="text-gray-400">|</span>
                      <span>{lead.assignedRep}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(lead.amount)}</div>
                    </div>
                    <Badge
                      variant={lead.riskLevel === 'high' ? 'destructive' : lead.riskLevel === 'medium' ? 'default' : 'secondary'}
                      className="text-xs capitalize"
                    >
                      {lead.riskLevel}
                    </Badge>
                  </div>
                </div>
              ))}
              {atRiskData.leads.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No stalled opportunities found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rep Coaching Panel - Now from BigQuery! */}
      <Card id="conversion-funnel" className={repDataSource === 'bigquery' ? 'border-green-200 dark:border-green-800' : 'border-amber-200 dark:border-amber-800'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Rep Performance
            </CardTitle>
            <DataSourceIndicator isLive={repDataSource === 'bigquery'} />
          </div>
          <CardDescription>
            Sales rep contract performance (last 30 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rep</TableHead>
                <TableHead className="text-right">Contracts</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Started</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Avg Deal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repData.reps.map(rep => (
                <TableRow key={rep.salesPersonId}>
                  <TableCell>
                    <div className="font-medium">{rep.salesPerson}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {rep.totalContracts}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(rep.totalValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={rep.startedContracts > 10 ? 'default' : 'secondary'}>
                      {rep.startedContracts}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress value={rep.winRate * 100} className="w-16 h-2" />
                      <span className="text-sm w-12">{(rep.winRate * 100).toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-gray-600 dark:text-gray-400">
                    {formatCurrency(rep.avgDealSize)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* At-Risk Leads - Now from BigQuery! */}
      <Card id="hygiene-score" className={atRiskDataSource === 'bigquery' ? 'border-green-200 dark:border-green-800' : 'border-amber-200 dark:border-amber-800'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              At-Risk Leads
            </CardTitle>
            <DataSourceIndicator isLive={atRiskDataSource === 'bigquery'} />
          </div>
          <CardDescription>
            Leads stalled in stage for 14+ days (last 90 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Days in Stage</TableHead>
                <TableHead>Assigned Rep</TableHead>
                <TableHead>Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRiskData.leads.map(lead => (
                <TableRow key={lead.leadId}>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <div className="font-medium truncate" title={lead.customerName}>{lead.customerName}</div>
                      <div className="text-xs text-gray-500">Branch: {lead.branch}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{stageLabels[lead.currentStage] || lead.currentStage}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(lead.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={lead.daysInStage > 21 ? 'text-red-600 font-medium' : ''}>
                      {lead.daysInStage}
                    </span>
                  </TableCell>
                  <TableCell>{lead.assignedRep}</TableCell>
                  <TableCell>
                    <Badge
                      variant={lead.riskLevel === 'high' ? 'destructive' : lead.riskLevel === 'medium' ? 'default' : 'secondary'}
                      className="text-xs capitalize"
                    >
                      {lead.riskLevel}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* BCG Analytics Enhancement - Data from BCG_RTD_DB (3.2M rows) */}
      {bcgSalesData.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              BCG Sales Analytics Enhancement
              <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700">BCG_RTD_DB</Badge>
            </CardTitle>
            <CardDescription>
              Enhanced contract sales analytics from BCG data warehouse (3.2M+ records)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {bcgLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-500">Loading BCG sales analytics...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {bcgSalesData.slice(0, 12).map((item, i) => (
                  <div key={i} className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {item.period}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {item.market || 'N/A'}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Contracts</span>
                        <span className="font-semibold text-blue-600">{item.total_contracts?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Started</span>
                        <span className="font-semibold text-green-600">{item.started_contracts?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Start Rate</span>
                        <span className="font-semibold">{((item.start_rate || 0) * 100).toFixed(1)}%</span>
                      </div>
                      {item.region && (
                        <div className="mt-2 pt-2 border-t dark:border-gray-600">
                          <span className="text-xs text-gray-500">Service: </span>
                          <span className="text-xs font-medium">{item.region}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {bcgSalesData.length > 12 && (
              <p className="text-sm text-center text-gray-500 mt-4">
                Showing 12 of {bcgSalesData.length} product/service combinations
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
