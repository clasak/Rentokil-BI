'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  ShieldCheck,
  UserCheck,
  Percent,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Calendar,
} from 'lucide-react'
import { RegionCode } from '@/types/daily-sales-cadence'
import {
  WIG_TARGETS,
  LAGGING_TARGETS,
  RegionWeeklyWIG,
  BranchWIGEntry,
} from '@/types/weekly-wig'
import {
  getRegionWeeklyWIG,
  getWeekEndDate,
  getMetricStatus,
  getLaggingMetricStatus,
  formatCurrency,
  formatPercent,
  MetricStatus,
} from '@/lib/weekly-wig-data'

const REGIONS: { code: RegionCode; name: string }[] = [
  { code: 'R16', name: 'Region 16 - Arkansas/Kansas' },
  { code: 'R23', name: 'Region 23 - Oklahoma/Kansas' },
  { code: 'R24', name: 'Region 24 - Illinois/Indiana' },
  { code: 'R52', name: 'Region 52 - Texas East' },
  { code: 'R54', name: 'Region 54 - Texas Central/West' },
]

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

export default function WeeklyWIGPage() {
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>('R54')
  const [weekOffset, setWeekOffset] = useState(0)
  const [wigData, setWigData] = useState<RegionWeeklyWIG | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    setIsLoading(true)
    const weekEndDate = getWeekEndDate(weekOffset)
    const data = getRegionWeeklyWIG(selectedRegion, weekEndDate)
    setWigData(data)
    setIsLoading(false)
  }, [selectedRegion, weekOffset, mounted])

  if (!mounted || isLoading || !wigData) {
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

  // Check if it's a Friday and before 9am (due date reminder)
  const isDueDateWarning = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const hour = now.getHours()
    return dayOfWeek === 5 && hour < 9 && weekOffset === 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly WIG Scorecard</h1>
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            DUE FRIDAY&apos;S BY 9am
          </p>
        </div>
        <div className="flex items-center gap-3">
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
