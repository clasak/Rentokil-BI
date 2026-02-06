"use client"

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store'
import { calculateKPIValues, getPipelineByStage } from '@/lib/kpi-calculations'
import { getActiveBusinessUnits } from '@/lib/business-units'
import { ViewToggle } from '@/components/features/ViewToggle'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts'
import {
  TrendingUp, DollarSign, Target, Users, ArrowRight,
  Building2, Percent, Trophy, AlertTriangle, ChevronRight, RefreshCw
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { SalesKPIs, TopOpportunity } from '@/lib/bigquery/queries/sales-pipeline'

const STAGE_COLORS = {
  prospecting: '#94a3b8',
  qualification: '#60a5fa',
  proposal: '#a78bfa',
  negotiation: '#f97316',
  closed_won: '#22c55e',
  closed_lost: '#ef4444'
}

// BigQuery data types and transformers
interface SalesNationalDisplay {
  pipelineValue: number
  pipeline30Day: number
  pipeline60Day: number
  pipeline90Day: number
  winRate: number
  avgCycleTime: number
  stalledCount: number
  totalLeads: number
  proposalsCount: number
  soldCount: number
}

const EMPTY_SALES_DATA: SalesNationalDisplay = {
  pipelineValue: 0,
  pipeline30Day: 0,
  pipeline60Day: 0,
  pipeline90Day: 0,
  winRate: 0,
  avgCycleTime: 0,
  stalledCount: 0,
  totalLeads: 0,
  proposalsCount: 0,
  soldCount: 0,
}

function transformBigQueryData(bqData: SalesKPIs[]): SalesNationalDisplay {
  const data = (bqData || [])[0] || {}
  return {
    pipelineValue: data.pipeline_value || 0,
    pipeline30Day: data.pipeline_30_day || 0,
    pipeline60Day: data.pipeline_60_day || 0,
    pipeline90Day: data.pipeline_90_day || 0,
    winRate: data.win_rate || 0,
    avgCycleTime: data.avg_cycle_time_days || 0,
    stalledCount: data.stalled_opps_count || 0,
    totalLeads: data.total_leads || 0,
    proposalsCount: data.proposals_count || 0,
    soldCount: data.sold_count || 0,
  }
}

export default function NationalSalesPage() {
  const [mounted, setMounted] = useState(false)
  const { settings } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // BigQuery integration for sales KPIs
  const {
    data: salesBQData,
    isLoading: isBQLoading,
    dataSource,
    responseTime,
    error,
    refetch,
  } = useBigQueryData<SalesKPIs[], SalesNationalDisplay>({
    queryName: 'sales-kpis',
    filters: { daysBack: 90 },
    defaultData: EMPTY_SALES_DATA,
    transformBigQueryData,
    includeOrgFilters: false, // National view - intentionally shows company-wide sales data
    includeRoleFilters: false, // National aggregate, no user-specific filtering
  })

  // BigQuery integration for top opportunities
  const {
    data: opportunities,
    isLoading: isOppsLoading,
    dataSource: oppsDataSource,
  } = useBigQueryData<TopOpportunity[], TopOpportunity[]>({
    queryName: 'top-opportunities',
    filters: { daysBack: 90, limit: 20 },
    defaultData: [],
    transformBigQueryData: (data) => data,
    includeOrgFilters: true,
    includeRoleFilters: true,
  })

  // Pass role and userId to filter KPI data to user's scope
  const kpiValues = useMemo(() => calculateKPIValues(settings.role, settings.userId), [settings.role, settings.userId])
  const pipelineByStage = useMemo(() => getPipelineByStage(settings.role, settings.userId), [settings.role, settings.userId])
  const businessUnits = useMemo(() => getActiveBusinessUnits(), [])

  // Calculate key metrics - prefer BigQuery data when available
  const revenueMTD = kpiValues.get('revenue_mtd')
  const pipelineValue = salesBQData?.pipelineValue || kpiValues.get('pipeline_30_60_90')?.value || 0
  const winRateValue = salesBQData?.winRate || kpiValues.get('win_rate')?.value || 0
  const avgDealSize = kpiValues.get('avg_deal_size')

  // Calculate regional breakdown from business unit metrics
  const regionalData = businessUnits.map((bu, idx) => {
    // Deterministic win rate variation per business unit (no randomness)
    const baseWinRate = Math.round(winRateValue * 100) || 40
    const winRateOffsets = [5, -3, 2, -1, 4, -2]
    return {
      name: bu.shortName,
      color: bu.color,
      revenue: bu.metrics.annualRevenue / 12, // Monthly estimate
      pipeline: Math.round(bu.metrics.annualRevenue * 0.3), // 30% of annual as pipeline
      winRate: Math.max(20, Math.min(65, baseWinRate + winRateOffsets[idx % winRateOffsets.length])),
      deals: Math.round(bu.metrics.accounts * 0.05) // 5% active deals
    }
  })

  // Top opportunities (already sorted by value from BigQuery)
  const topOpportunities = mounted ? opportunities.slice(0, 10) : []

  // Pipeline chart data
  const pipelineChartData = pipelineByStage.map(stage => ({
    stage: stage.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count: stage.count,
    value: stage.value,
    weighted: stage.weightedValue
  }))

  // Hydration guard
  if (!mounted) {
    return null
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <TrendingUp className="h-7 w-7 text-blue-600" />
          National Sales View
        </h1>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Failed to Load Data</span>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {error}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{dataSource}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Query:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">sales-kpis</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open('/platform-admin', '_blank')}>
                View Logs
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-blue-600" />
            National Sales View
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Cross-regional sales performance and pipeline analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={refetch} disabled={isBQLoading} className="h-8 w-8">
            <RefreshCw className={`h-3.5 w-3.5 ${isBQLoading ? 'animate-spin' : ''}`} />
          </Button>
          <ViewToggle variant="dropdown" />
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 opacity-80" />
              <div>
                <div className="text-sm opacity-80">Revenue MTD</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(revenueMTD?.value ?? 0)}
                </div>
                <div className="text-xs opacity-70 flex items-center gap-1">
                  {revenueMTD && revenueMTD.deltaPercent >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {revenueMTD?.deltaPercent?.toFixed(1)}% vs prior
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 opacity-80" />
              <div>
                <div className="text-sm opacity-80">Total Pipeline</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(pipelineValue)}
                </div>
                <div className="text-xs opacity-70">30/60/90 day weighted</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Percent className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Win Rate</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(winRateValue * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">All time</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-500" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Deal Size</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(avgDealSize?.value ?? 0)}
                </div>
                <div className="text-xs text-gray-500">Closed won</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
            <CardDescription>Opportunity count and value by sales stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="stage" width={100} tick={{ fontSize: 12 }} />
                  <RechartsTooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="weighted" fill="#3b82f6" name="Weighted Value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Regional Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Sales Performance</CardTitle>
            <CardDescription>Pipeline and win rates by business unit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regionalData.slice(0, 5).map(region => (
                <div key={region.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: region.color }}
                      />
                      <span className="font-medium">{region.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{region.deals} deals</span>
                      <Badge variant={region.winRate >= 45 ? 'success' : region.winRate >= 35 ? 'warning' : 'secondary'}>
                        {region.winRate}% win rate
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Progress value={Math.min(100, (region.pipeline / 300) * 100)} className="flex-1" />
                    <span className="text-sm font-medium text-green-600 w-20 text-right">
                      ${region.pipeline}M
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Opportunities Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Opportunities</CardTitle>
              <CardDescription>Highest value open opportunities across all regions</CardDescription>
            </div>
            <Link href="/sales">
              <Button variant="outline" size="sm">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opportunity</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-center">Probability</TableHead>
                <TableHead className="text-right">Weighted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topOpportunities.map(opp => (
                <TableRow key={opp.id}>
                  <TableCell>
                    <div className="max-w-[180px]">
                      <div className="font-medium truncate" title={opp.name}>{opp.name}</div>
                      <div className="text-xs text-gray-500">{opp.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="block max-w-[150px] truncate" title={opp.accountName}>{opp.accountName}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: STAGE_COLORS[opp.stage as keyof typeof STAGE_COLORS] || '#94a3b8',
                        color: STAGE_COLORS[opp.stage as keyof typeof STAGE_COLORS] || '#94a3b8'
                      }}
                    >
                      {opp.stage.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(opp.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {Math.round(opp.probability * 100)}%
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {formatCurrency(opp.amount * opp.probability)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/sales/opportunity/${opp.id}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/lead-service-engine">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="font-medium">Lead Engine</div>
              <div className="text-sm text-gray-500">Pipeline intake</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/forecast">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="font-medium">Forecast</div>
              <div className="text-sm text-gray-500">Revenue projections</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sales">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="font-medium">Sales Dashboard</div>
              <div className="text-sm text-gray-500">Detailed view</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/wbr">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <div className="font-medium">WBR</div>
              <div className="text-sm text-gray-500">Weekly review</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
