'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Target,
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
  Info,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useRouter } from 'next/navigation'
import { initializeDailySalesData } from '@/lib/daily-sales-data'
import type { Branch } from '@/types/daily-sales-cadence'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import { useOrganizationData } from '@/hooks/useOrganizationData'
import type { WIGBranchMetrics as BQWIGBranchMetrics } from '@/lib/bigquery/queries/wig'

// WIG Targets - these would normally come from configuration
const WIG_TARGETS = {
  salesDollarsPerRep: 15000, // Target sales dollars per rep
  tapDollarPerTech: 2500,    // TAP dollars per tech
  missedStops: 2,            // Max allowed missed stops per branch
  twentyFourHourStart: 35,   // Target % for 24-hour starts
  npsScore: 70,              // Target NPS/CVC Score
  pastDueCcmCfr: 5,          // Max allowed past due CCM/CFR
  techsOver55Hours: 0,       // Max techs working > 55 hours
  serviceRevPerHour: 85,     // Target service revenue per worked hour
  driverScore: 87,           // Target Azuga driver score
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

function getWeekStartDate(weekOffset: number = 0): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(today)
  monday.setDate(monday.getDate() - mondayOffset + (weekOffset * 7))
  return monday.toISOString().split('T')[0]
}

interface WigMetric {
  name: string
  icon: React.ReactNode
  value: number | string
  target: number | string
  unit: string
  status: 'success' | 'warning' | 'danger'
  trend?: 'up' | 'down' | 'flat'
  description: string
}

interface BranchWigData {
  branch: Branch
  salesDollarsPerRep: number
  tapDollarPerTech: number
  missedStops: number
  twentyFourHourStart: number
  npsScore: number
  pastDueCcmCfr: number
  techsOver55Hours: number
  serviceRevPerHour: number
  driverScore: number
}

// Empty default data
const EMPTY_WIG_DATA: BranchWigData[] = []

// Transform BigQuery data to UI format
function transformBigQueryData(bqData: BQWIGBranchMetrics[]): BranchWigData[] {
  return bqData.map(bm => ({
    branch: {
      code: bm.branch_code,
      name: bm.branch_name,
      region: bm.region,
      market: bm.market,
      branchManager: '', // Not available from BigQuery
      phone: '', // Not available from BigQuery
    } as Branch,
    salesDollarsPerRep: bm.sales_dollars_per_rep,
    tapDollarPerTech: bm.tap_dollars_per_tech,
    missedStops: bm.missed_stops,
    twentyFourHourStart: bm.twenty_four_hour_start_pct,
    npsScore: bm.nps_score,
    pastDueCcmCfr: bm.past_due_ccm_cfr,
    techsOver55Hours: bm.techs_over_55_hours,
    serviceRevPerHour: bm.service_rev_per_hour,
    driverScore: bm.driver_score,
  }))
}

export default function WigScorecardPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const weekStart = getWeekStartDate(0)

  // Get regions from BigQuery organization data
  const { regions, isLoading: regionsLoading } = useOrganizationData()

  useEffect(() => {
    initializeDailySalesData()
    setMounted(true)
  }, [])

  // Set initial region once data loads
  useEffect(() => {
    if (regions.length > 0 && !selectedRegion) {
      setSelectedRegion(regions[0].region_code)
    }
  }, [regions, selectedRegion])

  // BigQuery data hook
  const {
    data: wigData,
    isLoading,
    dataSource,
    responseTime,
    refetch,
  } = useBigQueryData<BQWIGBranchMetrics[], BranchWigData[]>({
    queryName: 'wig-branch-metrics',
    filters: { region: selectedRegion, daysBack: 7 },
    defaultData: EMPTY_WIG_DATA,
    transformBigQueryData,
    includeOrgFilters: false,
  })

  if (!mounted || isLoading || regionsLoading || !wigData || !selectedRegion) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
      </div>
    )
  }

  // Calculate region-level metrics
  const regionMetrics = {
    avgSalesDollarsPerRep: wigData.reduce((sum, d) => sum + d.salesDollarsPerRep, 0) / Math.max(wigData.length, 1),
    avgTapDollarPerTech: wigData.reduce((sum, d) => sum + d.tapDollarPerTech, 0) / Math.max(wigData.length, 1),
    totalMissedStops: wigData.reduce((sum, d) => sum + d.missedStops, 0),
    avgTwentyFourHourStart: wigData.reduce((sum, d) => sum + d.twentyFourHourStart, 0) / Math.max(wigData.length, 1),
    avgNpsScore: wigData.reduce((sum, d) => sum + d.npsScore, 0) / Math.max(wigData.length, 1),
    totalPastDue: wigData.reduce((sum, d) => sum + d.pastDueCcmCfr, 0),
    totalTechsOver55: wigData.reduce((sum, d) => sum + d.techsOver55Hours, 0),
    avgServiceRevPerHour: wigData.reduce((sum, d) => sum + d.serviceRevPerHour, 0) / Math.max(wigData.length, 1),
    avgDriverScore: wigData.reduce((sum, d) => sum + d.driverScore, 0) / Math.max(wigData.length, 1),
  }

  const getStatus = (value: number, target: number, isLowerBetter: boolean = false): 'success' | 'warning' | 'danger' => {
    const percentage = isLowerBetter ? (target / Math.max(value, 0.01)) * 100 : (value / target) * 100
    if (percentage >= 100) return 'success'
    if (percentage >= 80) return 'warning'
    return 'danger'
  }

  // Calculate branch-level status counts for each metric
  const getBranchStatusCounts = () => {
    const counts = {
      success: 0,
      warning: 0,
      danger: 0,
    }

    wigData.forEach(data => {
      // Check each key metric per branch
      const branchStatuses = [
        getStatus(data.salesDollarsPerRep, WIG_TARGETS.salesDollarsPerRep),
        getStatus(data.tapDollarPerTech, WIG_TARGETS.tapDollarPerTech),
        getStatus(data.missedStops, WIG_TARGETS.missedStops, true),
        getStatus(data.twentyFourHourStart, WIG_TARGETS.twentyFourHourStart),
        getStatus(data.npsScore, WIG_TARGETS.npsScore),
        getStatus(data.pastDueCcmCfr, WIG_TARGETS.pastDueCcmCfr, true),
        data.techsOver55Hours === 0 ? 'success' : 'danger',
        getStatus(data.serviceRevPerHour, WIG_TARGETS.serviceRevPerHour),
        getStatus(data.driverScore, WIG_TARGETS.driverScore),
      ] as const

      // A branch is critical if ANY metric is critical
      if (branchStatuses.includes('danger')) {
        counts.danger++
      } else if (branchStatuses.includes('warning')) {
        counts.warning++
      } else {
        counts.success++
      }
    })

    return counts
  }

  const branchHealthCounts = getBranchStatusCounts()
  const totalBranches = wigData.length
  const healthStatus = branchHealthCounts.danger > totalBranches * 0.5
    ? 'danger'
    : branchHealthCounts.danger > totalBranches * 0.25
      ? 'warning'
      : 'success'

  const wigCards: WigMetric[] = [
    {
      name: 'Sales $/Rep',
      icon: <DollarSign className="h-5 w-5" />,
      value: formatCurrency(regionMetrics.avgSalesDollarsPerRep),
      target: formatCurrency(WIG_TARGETS.salesDollarsPerRep),
      unit: 'avg',
      status: getStatus(regionMetrics.avgSalesDollarsPerRep, WIG_TARGETS.salesDollarsPerRep),
      description: 'Average sales dollars per sales representative',
    },
    {
      name: 'TAP $/Tech',
      icon: <TrendingUp className="h-5 w-5" />,
      value: formatCurrency(regionMetrics.avgTapDollarPerTech),
      target: formatCurrency(WIG_TARGETS.tapDollarPerTech),
      unit: 'avg',
      status: getStatus(regionMetrics.avgTapDollarPerTech, WIG_TARGETS.tapDollarPerTech),
      description: 'TAP Insulation revenue per technician',
    },
    {
      name: 'Missed Stops',
      icon: <AlertTriangle className="h-5 w-5" />,
      value: regionMetrics.totalMissedStops,
      target: WIG_TARGETS.missedStops * wigData.length,
      unit: 'total',
      status: getStatus(regionMetrics.totalMissedStops, WIG_TARGETS.missedStops * wigData.length, true),
      description: 'Total missed service stops across region',
    },
    {
      name: '24 Hour Start %',
      icon: <Timer className="h-5 w-5" />,
      value: `${regionMetrics.avgTwentyFourHourStart.toFixed(0)}%`,
      target: `${WIG_TARGETS.twentyFourHourStart}%`,
      unit: 'avg',
      status: getStatus(regionMetrics.avgTwentyFourHourStart, WIG_TARGETS.twentyFourHourStart),
      description: 'Percentage of new services started within 24 hours',
    },
    {
      name: 'NPS/CVC Score',
      icon: <Star className="h-5 w-5" />,
      value: regionMetrics.avgNpsScore.toFixed(0),
      target: WIG_TARGETS.npsScore,
      unit: 'avg',
      status: getStatus(regionMetrics.avgNpsScore, WIG_TARGETS.npsScore),
      description: 'Net Promoter Score / Customer Value Score',
    },
    {
      name: 'Past Due CCM/CFR',
      icon: <CreditCard className="h-5 w-5" />,
      value: regionMetrics.totalPastDue,
      target: WIG_TARGETS.pastDueCcmCfr * wigData.length,
      unit: 'total',
      status: getStatus(regionMetrics.totalPastDue, WIG_TARGETS.pastDueCcmCfr * wigData.length, true),
      description: 'Total overdue credit card/contract forms',
    },
    {
      name: 'Techs > 55 Hours',
      icon: <Clock className="h-5 w-5" />,
      value: regionMetrics.totalTechsOver55,
      target: WIG_TARGETS.techsOver55Hours,
      unit: 'total',
      status: regionMetrics.totalTechsOver55 === 0 ? 'success' : 'danger',
      description: 'Technicians working overtime (>55 hours/week)',
    },
    {
      name: 'Service Rev/Hour',
      icon: <Target className="h-5 w-5" />,
      value: formatCurrency(regionMetrics.avgServiceRevPerHour),
      target: formatCurrency(WIG_TARGETS.serviceRevPerHour),
      unit: '/hr avg',
      status: getStatus(regionMetrics.avgServiceRevPerHour, WIG_TARGETS.serviceRevPerHour),
      description: 'Average service revenue per worked hour',
    },
    {
      name: 'Driver Score (Azuga)',
      icon: <Car className="h-5 w-5" />,
      value: regionMetrics.avgDriverScore.toFixed(0),
      target: WIG_TARGETS.driverScore,
      unit: 'avg',
      status: getStatus(regionMetrics.avgDriverScore, WIG_TARGETS.driverScore),
      description: 'Average Azuga driver safety score',
    },
  ]

  const statusColors = {
    success: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-700',
    danger: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700',
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'WIG Scorecard' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WIG Scorecard</h1>
          <p className="text-gray-500 dark:text-gray-400">Wildly Important Goals - Weekly tracking</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Data Source Badge */}
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={refetch} disabled={isLoading} className="h-8 w-8">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

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

      {/* Branch Health Summary */}
      <Card className={`border-2 ${statusColors[healthStatus]}`}>
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

      {/* WIG Summary Cards */}
      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {wigCards.slice(0, 5).map((metric) => (
            <Card key={metric.name} className={`border-2 ${statusColors[metric.status]}`}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`${metric.status === 'success' ? 'text-green-600 dark:text-green-400' : metric.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                    {metric.icon}
                  </div>
                  {metric.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : metric.status === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-help inline-flex items-center gap-1">
                      {metric.name}
                      <Info className="h-3 w-3 text-gray-400" />
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{metric.description}</p>
                  </TooltipContent>
                </Tooltip>
                <p className="text-2xl font-bold mt-1">{metric.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Target: {metric.target} ({metric.unit})
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TooltipProvider>

      {/* Secondary Metrics */}
      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {wigCards.slice(5).map((metric) => (
            <Card key={metric.name} className={`border ${statusColors[metric.status]}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`${metric.status === 'success' ? 'text-green-600 dark:text-green-400' : metric.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                    {metric.icon}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm font-medium cursor-help inline-flex items-center gap-1">
                        {metric.name}
                        <Info className="h-3 w-3 text-gray-400" />
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{metric.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-xl font-bold">{metric.value}</p>
                  <p className="text-xs text-gray-500">/ {metric.target}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TooltipProvider>

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
                  <TableHead className="min-w-[150px]">Branch</TableHead>
                  <TableHead className="text-right">Sales $/Rep</TableHead>
                  <TableHead className="text-right">TAP $/Tech</TableHead>
                  <TableHead className="text-center">Missed</TableHead>
                  <TableHead className="text-center">24hr %</TableHead>
                  <TableHead className="text-center">NPS</TableHead>
                  <TableHead className="text-center">Past Due</TableHead>
                  <TableHead className="text-center">&gt;55 Hrs</TableHead>
                  <TableHead className="text-right">Rev/Hr</TableHead>
                  <TableHead className="text-center">Driver</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wigData.map((data) => (
                  <TableRow
                    key={data.branch.code}
                    onClick={() => router.push(`/branch/${data.branch.code}`)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <TableCell className="font-mono text-sm">{data.branch.code}</TableCell>
                    <TableCell>
                      <p className="font-medium truncate max-w-[140px]">{data.branch.name}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={getStatus(data.salesDollarsPerRep, WIG_TARGETS.salesDollarsPerRep) === 'success' ? 'text-green-600 font-medium' : getStatus(data.salesDollarsPerRep, WIG_TARGETS.salesDollarsPerRep) === 'danger' ? 'text-red-600' : ''}>
                        {formatCurrency(data.salesDollarsPerRep)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={getStatus(data.tapDollarPerTech, WIG_TARGETS.tapDollarPerTech) === 'success' ? 'text-green-600 font-medium' : getStatus(data.tapDollarPerTech, WIG_TARGETS.tapDollarPerTech) === 'danger' ? 'text-red-600' : ''}>
                        {formatCurrency(data.tapDollarPerTech)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={data.missedStops <= WIG_TARGETS.missedStops ? 'secondary' : 'destructive'}>
                        {data.missedStops}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={data.twentyFourHourStart >= WIG_TARGETS.twentyFourHourStart ? 'text-green-600 font-medium' : 'text-red-600'}>
                        {data.twentyFourHourStart}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={data.npsScore >= WIG_TARGETS.npsScore ? 'text-green-600 font-medium' : data.npsScore >= WIG_TARGETS.npsScore * 0.8 ? '' : 'text-red-600'}>
                        {data.npsScore}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={data.pastDueCcmCfr <= WIG_TARGETS.pastDueCcmCfr ? 'secondary' : 'destructive'}>
                        {data.pastDueCcmCfr}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {data.techsOver55Hours === 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <Badge variant="destructive">{data.techsOver55Hours}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={getStatus(data.serviceRevPerHour, WIG_TARGETS.serviceRevPerHour) === 'success' ? 'text-green-600 font-medium' : getStatus(data.serviceRevPerHour, WIG_TARGETS.serviceRevPerHour) === 'danger' ? 'text-red-600' : ''}>
                        {formatCurrency(data.serviceRevPerHour)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={data.driverScore >= WIG_TARGETS.driverScore ? 'text-green-600 font-medium' : data.driverScore >= WIG_TARGETS.driverScore * 0.9 ? '' : 'text-red-600'}>
                        {data.driverScore}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </TableCell>
                  </TableRow>
                ))}
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
            <p className="text-xs text-muted-foreground">
              Week of {new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
