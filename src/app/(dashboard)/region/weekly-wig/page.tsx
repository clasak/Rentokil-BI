'use client'

import { useState, useEffect, useMemo } from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DollarSign,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Car,
  Star,
  Timer,
  CreditCard,
  ShieldCheck,
  UserCheck,
  Percent,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import { RegionCode, MarketCode } from '@/types/daily-sales-cadence'
import {
  WIG_TARGETS,
  LAGGING_TARGETS,
  RegionWeeklyWIG,
  BranchWIGMetrics,
  LaggingMetrics,
  BranchWIGEntry,
} from '@/types/weekly-wig'
import {
  getWeekEndDate,
  getMetricStatus,
  getLaggingMetricStatus,
  formatCurrency,
  formatPercent,
  MetricStatus,
} from '@/lib/weekly-wig-data'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import { useOrganizationData } from '@/hooks/useOrganizationData'
import type { WIGRegionSummary, WIGBranchMetrics as BQWIGBranchMetrics } from '@/lib/bigquery/queries/wig'

const statusColors: Record<MetricStatus, string> = {
  success: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-700',
  danger: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700',
}

const statusTextColors: Record<MetricStatus, string> = {
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  danger: 'text-red-600 dark:text-red-400',
}

// Transform BigQuery data to UI format
function transformBigQueryToUI(bqData: WIGRegionSummary): RegionWeeklyWIG {
  const branches: BranchWIGEntry[] = bqData.branch_metrics.map((bm: BQWIGBranchMetrics) => ({
    branch: {
      code: bm.branch_code,
      name: bm.branch_name,
      region: bm.region as RegionCode,
      market: bm.market as MarketCode,
      branchManager: '', // Not available from BigQuery
      phone: '', // Not available from BigQuery
    },
    metrics: {
      salesDollarsPerRep: bm.sales_dollars_per_rep,
      tapDollarPerTech: bm.tap_dollars_per_tech,
      missedStops: bm.missed_stops,
      twentyFourHourStart: bm.twenty_four_hour_start_pct,
      npsScore: bm.nps_score,
      pastDueCcmCfr: bm.past_due_ccm_cfr,
      techsOver55Hours: bm.techs_over_55_hours,
      serviceRevPerHour: bm.service_rev_per_hour,
      driverScore: bm.driver_score,
      fundamentalsChecklistMTD: bm.fundamentals_checklist_mtd,
      rdBranchMeetingsMTD: bm.rd_branch_meetings_mtd,
    },
  }))

  const lagging = bqData.lagging_metrics
  const laggingMetrics: LaggingMetrics = {
    salesYOY: lagging.sales_yoy_pct,
    revenueGrowth: lagging.revenue_growth_pct,
    retention: lagging.retention_pct,
    profitVsAOP: lagging.profit_vs_aop_pct,
    colleagueRetention: lagging.colleague_retention_pct,
    safetyYOYReduction: lagging.safety_yoy_reduction_pct,
  }

  const totals: BranchWIGMetrics = {
    salesDollarsPerRep: bqData.totals.avg_sales_per_rep,
    tapDollarPerTech: bqData.totals.avg_tap_per_tech,
    missedStops: bqData.totals.total_missed_stops,
    twentyFourHourStart: bqData.totals.avg_24hr_start_pct,
    npsScore: bqData.totals.avg_nps_score,
    pastDueCcmCfr: bqData.totals.total_past_due,
    techsOver55Hours: bqData.totals.total_techs_over_55,
    serviceRevPerHour: bqData.totals.avg_service_rev_per_hour,
    driverScore: bqData.totals.avg_driver_score,
    fundamentalsChecklistMTD: bqData.totals.total_fundamentals,
    rdBranchMeetingsMTD: bqData.totals.total_rd_meetings,
  }

  return {
    regionCode: bqData.region as RegionCode,
    weekEndDate: bqData.week_end_date,
    laggingMetrics,
    branches,
    totals,
  }
}

export default function WeeklyWIGPage() {
  const [mounted, setMounted] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [weekOffset, setWeekOffset] = useState(0)

  // Get regions from BigQuery organization data
  const { regions, isLoading: regionsLoading } = useOrganizationData()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Set initial region once data loads
  useEffect(() => {
    if (regions.length > 0 && !selectedRegion) {
      setSelectedRegion(regions[0].region_code)
    }
  }, [regions, selectedRegion])

  const weekEndDate = useMemo(() => getWeekEndDate(weekOffset), [weekOffset])

  // Empty default state (no mock data - BigQuery only)
  const EMPTY_WIG_DATA: RegionWeeklyWIG = useMemo(() => ({
    regionCode: (selectedRegion || 'NE') as RegionCode,
    weekEndDate,
    laggingMetrics: {
      salesYOY: 0,
      revenueGrowth: 0,
      retention: 0,
      profitVsAOP: 0,
      colleagueRetention: 0,
      safetyYOYReduction: 0,
    },
    branches: [],
    totals: {
      salesDollarsPerRep: 0,
      tapDollarPerTech: 0,
      missedStops: 0,
      twentyFourHourStart: 0,
      npsScore: 0,
      pastDueCcmCfr: 0,
      techsOver55Hours: 0,
      serviceRevPerHour: 0,
      driverScore: 0,
      fundamentalsChecklistMTD: 0,
      rdBranchMeetingsMTD: 0,
    },
  }), [selectedRegion, weekEndDate])

  // BigQuery data hook
  const {
    data: wigData,
    isLoading,
    dataSource,
    responseTime,
    refetch,
  } = useBigQueryData<WIGRegionSummary, RegionWeeklyWIG>({
    queryName: 'wig-region-summary',
    filters: { region: selectedRegion, weekEndDate },
    defaultData: EMPTY_WIG_DATA,
    transformBigQueryData: transformBigQueryToUI,
    includeOrgFilters: false, // WIG uses its own region filter
  })

  if (!mounted || isLoading || regionsLoading || !wigData || !selectedRegion) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <div className="grid grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
      </div>
    )
  }

  // Calculate branch health counts
  const getBranchHealthCounts = () => {
    const counts = { success: 0, warning: 0, danger: 0 }

    wigData.branches.forEach(({ metrics }) => {
      const statuses: MetricStatus[] = [
        getMetricStatus(metrics.salesDollarsPerRep, WIG_TARGETS.salesDollarsPerRep),
        getMetricStatus(metrics.tapDollarPerTech, WIG_TARGETS.tapDollarPerTech),
        getMetricStatus(metrics.missedStops, WIG_TARGETS.missedStops, true),
        getMetricStatus(metrics.twentyFourHourStart, WIG_TARGETS.twentyFourHourStart),
        getMetricStatus(metrics.npsScore, WIG_TARGETS.npsScore),
        getMetricStatus(metrics.pastDueCcmCfr, WIG_TARGETS.pastDueCcmCfr, true),
        metrics.techsOver55Hours === 0 ? 'success' : 'danger',
        getMetricStatus(metrics.serviceRevPerHour, WIG_TARGETS.serviceRevPerHour),
        getMetricStatus(metrics.driverScore, WIG_TARGETS.driverScore),
      ]

      if (statuses.includes('danger')) {
        counts.danger++
      } else if (statuses.includes('warning')) {
        counts.warning++
      } else {
        counts.success++
      }
    })

    return counts
  }

  const branchHealthCounts = getBranchHealthCounts()
  const totalBranches = wigData.branches.length

  // Format week date for display
  const formatWeekDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Check if it&apos;s a Friday and before 9am (due date reminder)
  const isDueDateWarning = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const hour = now.getHours()
    return dayOfWeek === 5 && hour < 9 && weekOffset === 0
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Weekly WIG' }
      ]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly WIG Scorecard</h1>
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            DUE FRIDAY&apos;S BY 9am
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Data Source Badge */}
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={refetch} disabled={isLoading} className="h-8 w-8">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Week Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset(prev => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 py-2 text-sm font-medium min-w-[180px] text-center">
              {weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `${Math.abs(weekOffset)} weeks ago`}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset(prev => Math.min(prev + 1, 0))}
              disabled={weekOffset >= 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Region Selector */}
          <SearchableSelect
            options={regions.map(r => ({
              value: r.region_code,
              label: r.region_name,
              description: `${r.branch_count} branches`
            }))}
            value={selectedRegion}
            onValueChange={setSelectedRegion}
            placeholder="Select Region"
            searchPlaceholder="Search regions..."
            className="w-64"
          />
        </div>
      </div>

      {/* Due Date Warning Banner */}
      {isDueDateWarning() && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-700 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">Weekly WIG Due Today</p>
            <p className="text-sm text-amber-600 dark:text-amber-400">Submit your Weekly WIG scorecard by 9am</p>
          </div>
        </div>
      )}

      {/* Lagging Metrics Header - 6 Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Lagging Metrics - Outcome Focused
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Sales YOY */}
          <Card className={`border-2 ${statusColors[getLaggingMetricStatus('salesYOY', wigData.laggingMetrics.salesYOY)]}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className={`h-5 w-5 ${statusTextColors[getLaggingMetricStatus('salesYOY', wigData.laggingMetrics.salesYOY)]}`} />
                {getLaggingMetricStatus('salesYOY', wigData.laggingMetrics.salesYOY) === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : getLaggingMetricStatus('salesYOY', wigData.laggingMetrics.salesYOY) === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">SALES</p>
              <p className="text-xl font-bold">{formatPercent(wigData.laggingMetrics.salesYOY, true)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Target: {LAGGING_TARGETS.salesYOY}% YOY</p>
            </CardContent>
          </Card>

          {/* Revenue Growth */}
          <Card className={`border-2 ${statusColors[getLaggingMetricStatus('revenueGrowth', wigData.laggingMetrics.revenueGrowth)]}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className={`h-5 w-5 ${statusTextColors[getLaggingMetricStatus('revenueGrowth', wigData.laggingMetrics.revenueGrowth)]}`} />
                {getLaggingMetricStatus('revenueGrowth', wigData.laggingMetrics.revenueGrowth) === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : getLaggingMetricStatus('revenueGrowth', wigData.laggingMetrics.revenueGrowth) === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">PRODUCTION</p>
              <p className="text-xl font-bold">{formatPercent(wigData.laggingMetrics.revenueGrowth, true)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Target: {LAGGING_TARGETS.revenueGrowth}% Growth</p>
            </CardContent>
          </Card>

          {/* Retention */}
          <Card className={`border-2 ${statusColors[getLaggingMetricStatus('retention', wigData.laggingMetrics.retention)]}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <UserCheck className={`h-5 w-5 ${statusTextColors[getLaggingMetricStatus('retention', wigData.laggingMetrics.retention)]}`} />
                {getLaggingMetricStatus('retention', wigData.laggingMetrics.retention) === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : getLaggingMetricStatus('retention', wigData.laggingMetrics.retention) === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">RETENTION</p>
              <p className="text-xl font-bold">{wigData.laggingMetrics.retention.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Target: {LAGGING_TARGETS.retention}%</p>
            </CardContent>
          </Card>

          {/* Profit vs AOP */}
          <Card className={`border-2 ${statusColors[getLaggingMetricStatus('profitVsAOP', wigData.laggingMetrics.profitVsAOP)]}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Percent className={`h-5 w-5 ${statusTextColors[getLaggingMetricStatus('profitVsAOP', wigData.laggingMetrics.profitVsAOP)]}`} />
                {getLaggingMetricStatus('profitVsAOP', wigData.laggingMetrics.profitVsAOP) === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : getLaggingMetricStatus('profitVsAOP', wigData.laggingMetrics.profitVsAOP) === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">PROFIT</p>
              <p className="text-xl font-bold">{formatPercent(wigData.laggingMetrics.profitVsAOP, true)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Target: AOP</p>
            </CardContent>
          </Card>

          {/* Colleague Retention */}
          <Card className={`border-2 ${statusColors[getLaggingMetricStatus('colleagueRetention', wigData.laggingMetrics.colleagueRetention)]}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Users className={`h-5 w-5 ${statusTextColors[getLaggingMetricStatus('colleagueRetention', wigData.laggingMetrics.colleagueRetention)]}`} />
                {getLaggingMetricStatus('colleagueRetention', wigData.laggingMetrics.colleagueRetention) === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : getLaggingMetricStatus('colleagueRetention', wigData.laggingMetrics.colleagueRetention) === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">CULTURE</p>
              <p className="text-xl font-bold">{wigData.laggingMetrics.colleagueRetention.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Target: {LAGGING_TARGETS.colleagueRetention}% Retention</p>
            </CardContent>
          </Card>

          {/* Safety YOY Reduction */}
          <Card className={`border-2 ${statusColors[getLaggingMetricStatus('safetyYOYReduction', wigData.laggingMetrics.safetyYOYReduction)]}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <ShieldCheck className={`h-5 w-5 ${statusTextColors[getLaggingMetricStatus('safetyYOYReduction', wigData.laggingMetrics.safetyYOYReduction)]}`} />
                {getLaggingMetricStatus('safetyYOYReduction', wigData.laggingMetrics.safetyYOYReduction) === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : getLaggingMetricStatus('safetyYOYReduction', wigData.laggingMetrics.safetyYOYReduction) === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">SAFETY</p>
              <p className="text-xl font-bold">{formatPercent(wigData.laggingMetrics.safetyYOYReduction, true)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Target: {LAGGING_TARGETS.safetyYOYReduction}% YOY Reduction</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Branch Health Summary */}
      <Card className={`border-2 ${
        branchHealthCounts.danger > totalBranches * 0.5 ? statusColors.danger :
        branchHealthCounts.danger > totalBranches * 0.25 ? statusColors.warning :
        statusColors.success
      }`}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Branch Health Summary</h3>
              <p className="text-2xl font-bold mt-1">
                {branchHealthCounts.danger > 0 ? (
                  <span className="text-red-600 dark:text-red-400">
                    {branchHealthCounts.danger} of {totalBranches} branches need attention
                  </span>
                ) : branchHealthCounts.warning > 0 ? (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    {branchHealthCounts.warning} branches approaching targets
                  </span>
                ) : (
                  <span className="text-green-600 dark:text-green-400">
                    All {totalBranches} branches meeting targets
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{branchHealthCounts.success}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">On Target</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{branchHealthCounts.warning}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Warning</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{branchHealthCounts.danger}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Critical</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branch Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Breakdown</CardTitle>
          <CardDescription>Individual branch performance against WIG targets</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="w-[80px]">Code</TableHead>
                  <TableHead className="min-w-[140px]">Branch</TableHead>
                  <TableHead className="text-right">Sales $/Rep</TableHead>
                  <TableHead className="text-right">TAP $/Tech</TableHead>
                  <TableHead className="text-center">Missed</TableHead>
                  <TableHead className="text-center">24hr %</TableHead>
                  <TableHead className="text-center">NPS</TableHead>
                  <TableHead className="text-center">Past Due</TableHead>
                  <TableHead className="text-center">&gt;55 Hrs</TableHead>
                  <TableHead className="text-right">Rev/Hr</TableHead>
                  <TableHead className="text-center">Driver</TableHead>
                  <TableHead className="text-center">Fund. MTD</TableHead>
                  <TableHead className="text-center">RD Mtgs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wigData.branches.map(({ branch, metrics }) => (
                  <TableRow key={branch.code}>
                    <TableCell className="font-mono text-sm">{branch.code}</TableCell>
                    <TableCell>
                      <p className="font-medium truncate max-w-[130px]">{branch.name}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={
                        getMetricStatus(metrics.salesDollarsPerRep, WIG_TARGETS.salesDollarsPerRep) === 'success'
                          ? 'text-green-600 font-medium'
                          : getMetricStatus(metrics.salesDollarsPerRep, WIG_TARGETS.salesDollarsPerRep) === 'danger'
                            ? 'text-red-600'
                            : ''
                      }>
                        {formatCurrency(metrics.salesDollarsPerRep)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={
                        getMetricStatus(metrics.tapDollarPerTech, WIG_TARGETS.tapDollarPerTech) === 'success'
                          ? 'text-green-600 font-medium'
                          : getMetricStatus(metrics.tapDollarPerTech, WIG_TARGETS.tapDollarPerTech) === 'danger'
                            ? 'text-red-600'
                            : ''
                      }>
                        {formatCurrency(metrics.tapDollarPerTech)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={metrics.missedStops <= WIG_TARGETS.missedStops ? 'secondary' : 'destructive'}>
                        {metrics.missedStops}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={
                        metrics.twentyFourHourStart >= WIG_TARGETS.twentyFourHourStart
                          ? 'text-green-600 font-medium'
                          : 'text-red-600'
                      }>
                        {metrics.twentyFourHourStart}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={
                        metrics.npsScore >= WIG_TARGETS.npsScore
                          ? 'text-green-600 font-medium'
                          : metrics.npsScore >= WIG_TARGETS.npsScore * 0.8
                            ? ''
                            : 'text-red-600'
                      }>
                        {metrics.npsScore}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={metrics.pastDueCcmCfr <= WIG_TARGETS.pastDueCcmCfr ? 'secondary' : 'destructive'}>
                        {metrics.pastDueCcmCfr}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {metrics.techsOver55Hours === 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <Badge variant="destructive">{metrics.techsOver55Hours}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={
                        getMetricStatus(metrics.serviceRevPerHour, WIG_TARGETS.serviceRevPerHour) === 'success'
                          ? 'text-green-600 font-medium'
                          : getMetricStatus(metrics.serviceRevPerHour, WIG_TARGETS.serviceRevPerHour) === 'danger'
                            ? 'text-red-600'
                            : ''
                      }>
                        {formatCurrency(metrics.serviceRevPerHour)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={
                        metrics.driverScore >= WIG_TARGETS.driverScore
                          ? 'text-green-600 font-medium'
                          : metrics.driverScore >= WIG_TARGETS.driverScore * 0.9
                            ? ''
                            : 'text-red-600'
                      }>
                        {metrics.driverScore}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={
                        metrics.fundamentalsChecklistMTD >= WIG_TARGETS.fundamentalsChecklistMTD
                          ? 'text-green-600 font-medium'
                          : ''
                      }>
                        {metrics.fundamentalsChecklistMTD}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={
                        metrics.rdBranchMeetingsMTD >= WIG_TARGETS.rdBranchMeetingsMTD
                          ? 'text-green-600 font-medium'
                          : ''
                      }>
                        {metrics.rdBranchMeetingsMTD}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totals Row */}
                <TableRow className="bg-gray-100 dark:bg-gray-800 font-semibold border-t-2">
                  <TableCell className="font-bold">TOTAL</TableCell>
                  <TableCell className="font-bold">ALL REGION</TableCell>
                  <TableCell className="text-right">{formatCurrency(wigData.totals.salesDollarsPerRep)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(wigData.totals.tapDollarPerTech)}</TableCell>
                  <TableCell className="text-center">{wigData.totals.missedStops}</TableCell>
                  <TableCell className="text-center">{wigData.totals.twentyFourHourStart}%</TableCell>
                  <TableCell className="text-center">{wigData.totals.npsScore}</TableCell>
                  <TableCell className="text-center">{wigData.totals.pastDueCcmCfr}</TableCell>
                  <TableCell className="text-center">{wigData.totals.techsOver55Hours}</TableCell>
                  <TableCell className="text-right">{formatCurrency(wigData.totals.serviceRevPerHour)}</TableCell>
                  <TableCell className="text-center">{wigData.totals.driverScore}</TableCell>
                  <TableCell className="text-center">{wigData.totals.fundamentalsChecklistMTD}</TableCell>
                  <TableCell className="text-center">{wigData.totals.rdBranchMeetingsMTD}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>At or above target (100%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>Close to target (80-99%)</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span>Below target (&lt;80%)</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Week ending: {formatWeekDate(wigData.weekEndDate)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
