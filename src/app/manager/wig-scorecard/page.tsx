'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import {
  initializeDailySalesData,
  getBranches,
  getBranchesByRegion,
  getWeeklyRollup,
  getRegionSummary,
  DEFAULT_DAILY_GOALS,
} from '@/lib/daily-sales-data'
import {
  Branch,
  RegionCode,
} from '@/types/daily-sales-cadence'

const REGIONS: { code: RegionCode; name: string }[] = [
  { code: 'R16', name: 'Region 16 - Arkansas/Kansas' },
  { code: 'R23', name: 'Region 23 - Oklahoma/Kansas' },
  { code: 'R24', name: 'Region 24 - Illinois/Indiana' },
  { code: 'R52', name: 'Region 52 - Texas East' },
  { code: 'R54', name: 'Region 54 - Texas Central/West' },
]

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

// Generate synthetic WIG data for branches
function generateBranchWigData(branch: Branch, weekStart: string): BranchWigData {
  // Use branch code to seed consistent random data
  const seed = parseInt(branch.code) || 1
  const random = (min: number, max: number) => min + ((seed * 7 + parseInt(weekStart.replace(/-/g, ''))) % (max - min + 1))

  return {
    branch,
    salesDollarsPerRep: 10000 + random(0, 10000),
    tapDollarPerTech: 1500 + random(0, 2000),
    missedStops: random(0, 5),
    twentyFourHourStart: 25 + random(0, 20),
    npsScore: 55 + random(0, 30),
    pastDueCcmCfr: random(0, 12),
    techsOver55Hours: random(0, 3),
    serviceRevPerHour: 70 + random(0, 30),
    driverScore: 75 + random(0, 20),
  }
}

export default function WigScorecardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>('R16')
  const [branches, setBranches] = useState<Branch[]>([])
  const [wigData, setWigData] = useState<BranchWigData[]>([])
  const weekStart = getWeekStartDate(0)

  useEffect(() => {
    initializeDailySalesData()
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const regionBranches = getBranchesByRegion(selectedRegion)
    setBranches(regionBranches)

    // Generate WIG data for each branch
    const data = regionBranches.map(branch => generateBranchWigData(branch, weekStart))
    setWigData(data)
  }, [selectedRegion, weekStart])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WIG Scorecard</h1>
          <p className="text-gray-500 dark:text-gray-400">Wildly Important Goals - Weekly tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedRegion} onValueChange={(v) => setSelectedRegion(v as RegionCode)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select Region" />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => (
                <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{metric.name}</p>
              <p className="text-2xl font-bold mt-1">{metric.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Target: {metric.target} ({metric.unit})
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {wigCards.slice(5).map((metric) => (
          <Card key={metric.name} className={`border ${statusColors[metric.status]}`}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`${metric.status === 'success' ? 'text-green-600 dark:text-green-400' : metric.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                  {metric.icon}
                </div>
                <p className="text-sm font-medium">{metric.name}</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl font-bold">{metric.value}</p>
                <p className="text-xs text-gray-500">/ {metric.target}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {wigData.map((data) => (
                  <TableRow key={data.branch.code}>
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
