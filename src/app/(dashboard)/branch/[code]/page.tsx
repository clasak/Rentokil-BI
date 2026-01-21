'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  ArrowLeft,
  DollarSign,
  Users,
  Target,
  Star,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Timer,
  CreditCard,
  Car,
  Info,
  Building2,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react'
import {
  initializeDailySalesData,
  getBranches,
} from '@/lib/daily-sales-data'
import { Branch } from '@/types/daily-sales-cadence'

// WIG Targets - same as WIG Scorecard page
const WIG_TARGETS = {
  salesDollarsPerRep: 15000,
  tapDollarPerTech: 2500,
  missedStops: 2,
  twentyFourHourStart: 35,
  npsScore: 70,
  pastDueCcmCfr: 5,
  techsOver55Hours: 0,
  serviceRevPerHour: 85,
  driverScore: 87,
}

// Metric definitions for tooltips
const METRIC_DEFINITIONS: Record<string, string> = {
  'Sales $/Rep': 'Total sales revenue divided by number of Account Executives',
  'TAP $/Tech': 'TAP Insulation revenue per technician this period',
  'Missed Stops': 'Service appointments not completed as scheduled',
  '24-Hour Start %': 'Percentage of new services started within 24 hours of sale',
  'NPS/CVC Score': 'Net Promoter Score measuring customer satisfaction',
  'Past Due CCM/CFR': 'Overdue credit card and contract forms count',
  'Techs > 55 Hours': 'Technicians working more than 55 hours this week',
  'Service Rev/Hour': 'Revenue generated per technician hour worked',
  'Driver Score': 'Azuga fleet safety score average',
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

// Generate synthetic branch WIG data
function generateBranchWigData(branch: Branch, weekStart: string) {
  const seed = parseInt(branch.code) || 1
  const random = (min: number, max: number) => min + ((seed * 7 + parseInt(weekStart.replace(/-/g, ''))) % (max - min + 1))

  return {
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

// Generate historical data for trends (last 4 weeks)
function generateHistoricalData(branch: Branch) {
  const weeks = []
  for (let i = 3; i >= 0; i--) {
    const weekStart = getWeekStartDate(-i)
    const data = generateBranchWigData(branch, weekStart)
    weeks.push({
      weekStart,
      ...data,
    })
  }
  return weeks
}

// Generate synthetic branch info
function generateBranchInfo(branch: Branch) {
  const seed = parseInt(branch.code) || 1
  const managerNames = ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'Robert Wilson']
  const techCounts = [8, 10, 12, 14, 16]
  const repCounts = [3, 4, 5, 6, 7]

  return {
    manager: managerNames[seed % managerNames.length],
    techCount: techCounts[seed % techCounts.length],
    repCount: repCounts[seed % repCounts.length],
    phone: `(${500 + (seed % 400)}) ${100 + (seed % 900)}-${1000 + (seed % 9000)}`,
    email: `${branch.code.toLowerCase()}@rentokil.com`,
    address: `${1000 + (seed * 123) % 9000} Main St, ${branch.name.split(' - ')[1] || branch.name}`,
  }
}

export default function BranchDetailPage() {
  const params = useParams()
  const branchCode = params.code as string

  const [isLoading, setIsLoading] = useState(true)
  const [branch, setBranch] = useState<Branch | null>(null)
  const [wigData, setWigData] = useState<ReturnType<typeof generateBranchWigData> | null>(null)
  const [historicalData, setHistoricalData] = useState<ReturnType<typeof generateHistoricalData>>([])
  const [branchInfo, setBranchInfo] = useState<ReturnType<typeof generateBranchInfo> | null>(null)

  const weekStart = getWeekStartDate(0)

  useEffect(() => {
    initializeDailySalesData()

    const branches = getBranches()
    const foundBranch = branches.find(b => b.code === branchCode)

    if (foundBranch) {
      setBranch(foundBranch)
      setWigData(generateBranchWigData(foundBranch, weekStart))
      setHistoricalData(generateHistoricalData(foundBranch))
      setBranchInfo(generateBranchInfo(foundBranch))
    }

    setIsLoading(false)
  }, [branchCode, weekStart])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  if (!branch || !wigData || !branchInfo) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[
          { label: 'Command Center', href: '/' },
          { label: 'WIG Scorecard', href: '/manager/wig-scorecard' },
          { label: branchCode }
        ]} />
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Branch Not Found</h2>
            <p className="text-gray-500 mb-4">Could not find branch with code: {branchCode}</p>
            <Link href="/manager/wig-scorecard">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to WIG Scorecard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatus = (value: number, target: number, isLowerBetter: boolean = false): 'success' | 'warning' | 'danger' => {
    const percentage = isLowerBetter ? (target / Math.max(value, 0.01)) * 100 : (value / target) * 100
    if (percentage >= 100) return 'success'
    if (percentage >= 80) return 'warning'
    return 'danger'
  }

  const getProgressPercent = (value: number, target: number, isLowerBetter: boolean = false): number => {
    if (isLowerBetter) {
      return Math.min(100, (target / Math.max(value, 0.01)) * 100)
    }
    return Math.min(100, (value / target) * 100)
  }

  const statusColors = {
    success: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-700',
    danger: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700',
  }

  const metrics = [
    {
      name: 'Sales $/Rep',
      icon: <DollarSign className="h-5 w-5" />,
      value: wigData.salesDollarsPerRep,
      target: WIG_TARGETS.salesDollarsPerRep,
      format: formatCurrency,
      isLowerBetter: false,
    },
    {
      name: 'TAP $/Tech',
      icon: <TrendingUp className="h-5 w-5" />,
      value: wigData.tapDollarPerTech,
      target: WIG_TARGETS.tapDollarPerTech,
      format: formatCurrency,
      isLowerBetter: false,
    },
    {
      name: 'Missed Stops',
      icon: <AlertTriangle className="h-5 w-5" />,
      value: wigData.missedStops,
      target: WIG_TARGETS.missedStops,
      format: (v: number) => v.toString(),
      isLowerBetter: true,
    },
    {
      name: '24-Hour Start %',
      icon: <Timer className="h-5 w-5" />,
      value: wigData.twentyFourHourStart,
      target: WIG_TARGETS.twentyFourHourStart,
      format: (v: number) => `${v}%`,
      isLowerBetter: false,
    },
    {
      name: 'NPS/CVC Score',
      icon: <Star className="h-5 w-5" />,
      value: wigData.npsScore,
      target: WIG_TARGETS.npsScore,
      format: (v: number) => v.toString(),
      isLowerBetter: false,
    },
    {
      name: 'Past Due CCM/CFR',
      icon: <CreditCard className="h-5 w-5" />,
      value: wigData.pastDueCcmCfr,
      target: WIG_TARGETS.pastDueCcmCfr,
      format: (v: number) => v.toString(),
      isLowerBetter: true,
    },
    {
      name: 'Techs > 55 Hours',
      icon: <Clock className="h-5 w-5" />,
      value: wigData.techsOver55Hours,
      target: WIG_TARGETS.techsOver55Hours,
      format: (v: number) => v.toString(),
      isLowerBetter: true,
    },
    {
      name: 'Service Rev/Hour',
      icon: <Target className="h-5 w-5" />,
      value: wigData.serviceRevPerHour,
      target: WIG_TARGETS.serviceRevPerHour,
      format: formatCurrency,
      isLowerBetter: false,
    },
    {
      name: 'Driver Score',
      icon: <Car className="h-5 w-5" />,
      value: wigData.driverScore,
      target: WIG_TARGETS.driverScore,
      format: (v: number) => v.toString(),
      isLowerBetter: false,
    },
  ]

  // Calculate overall branch health
  const criticalCount = metrics.filter(m => getStatus(m.value, m.target, m.isLowerBetter) === 'danger').length
  const warningCount = metrics.filter(m => getStatus(m.value, m.target, m.isLowerBetter) === 'warning').length
  const successCount = metrics.filter(m => getStatus(m.value, m.target, m.isLowerBetter) === 'success').length

  const overallStatus = criticalCount > 0 ? 'danger' : warningCount > 2 ? 'warning' : 'success'

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'WIG Scorecard', href: '/manager/wig-scorecard' },
        { label: `Branch ${branch.code}` }
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/manager/wig-scorecard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Branch {branch.code}
              </h1>
              <Badge
                variant={overallStatus === 'success' ? 'success' : overallStatus === 'warning' ? 'warning' : 'destructive'}
                className="ml-2"
              >
                {overallStatus === 'success' ? 'On Track' : overallStatus === 'warning' ? 'At Risk' : 'Critical'}
              </Badge>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{branch.name}</p>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500">
          Week of {new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Branch Info + Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Branch Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Branch Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Manager:</span>
              <span className="font-medium">{branchInfo.manager}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Technicians:</span>
              <span className="font-medium">{branchInfo.techCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Sales Reps:</span>
              <span className="font-medium">{branchInfo.repCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Phone:</span>
              <span className="font-medium">{branchInfo.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500 truncate">Email:</span>
              <span className="font-medium truncate">{branchInfo.email}</span>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card className={`border-2 ${statusColors[overallStatus]}`}>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{successCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Metrics On Target</div>
            <div className="flex items-center justify-center gap-1 mt-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-gray-500">of {metrics.length} total</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Approaching Target</div>
            <div className="flex items-center justify-center gap-1 mt-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-gray-500">80-99% of goal</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Below Target</div>
            <div className="flex items-center justify-center gap-1 mt-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs text-gray-500">&lt;80% of goal</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WIG Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>WIG Metrics Detail</CardTitle>
          <CardDescription>Current week performance with targets and progress</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <TooltipProvider delayDuration={200}>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="w-[200px]">Metric</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="w-[200px]">Progress</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric) => {
                  const status = getStatus(metric.value, metric.target, metric.isLowerBetter)
                  const progress = getProgressPercent(metric.value, metric.target, metric.isLowerBetter)

                  return (
                    <TableRow key={metric.name}>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help">
                              <div className={status === 'success' ? 'text-green-600' : status === 'warning' ? 'text-yellow-600' : 'text-red-600'}>
                                {metric.icon}
                              </div>
                              <span className="font-medium">{metric.name}</span>
                              <Info className="h-3 w-3 text-gray-400" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{METRIC_DEFINITIONS[metric.name]}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {metric.format(metric.value)}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {metric.format(metric.target)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={progress}
                            className={`h-2 flex-1 ${
                              status === 'success' ? '[&>div]:bg-green-500' :
                              status === 'warning' ? '[&>div]:bg-yellow-500' :
                              '[&>div]:bg-red-500'
                            }`}
                          />
                          <span className="text-xs text-gray-500 w-10 text-right">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={status === 'success' ? 'success' : status === 'warning' ? 'warning' : 'destructive'}
                        >
                          {status === 'success' ? 'On Track' : status === 'warning' ? 'At Risk' : 'Critical'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* 4-Week Trend Table */}
      <Card>
        <CardHeader>
          <CardTitle>4-Week Trend</CardTitle>
          <CardDescription>Historical performance for key metrics</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="w-[140px]">Week</TableHead>
                  <TableHead className="text-right">Sales $/Rep</TableHead>
                  <TableHead className="text-right">TAP $/Tech</TableHead>
                  <TableHead className="text-center">Missed</TableHead>
                  <TableHead className="text-center">24hr %</TableHead>
                  <TableHead className="text-center">NPS</TableHead>
                  <TableHead className="text-center">Driver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicalData.map((week, index) => (
                  <TableRow
                    key={week.weekStart}
                    className={index === historicalData.length - 1 ? 'bg-blue-50/50 dark:bg-blue-900/10 font-medium' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {index === historicalData.length - 1 && (
                          <Badge variant="outline" className="text-xs">Current</Badge>
                        )}
                        {new Date(week.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={week.salesDollarsPerRep >= WIG_TARGETS.salesDollarsPerRep ? 'text-green-600' : ''}>
                        {formatCurrency(week.salesDollarsPerRep)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={week.tapDollarPerTech >= WIG_TARGETS.tapDollarPerTech ? 'text-green-600' : ''}>
                        {formatCurrency(week.tapDollarPerTech)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={week.missedStops <= WIG_TARGETS.missedStops ? 'secondary' : 'destructive'}>
                        {week.missedStops}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={week.twentyFourHourStart >= WIG_TARGETS.twentyFourHourStart ? 'text-green-600' : ''}>
                        {week.twentyFourHourStart}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={week.npsScore >= WIG_TARGETS.npsScore ? 'text-green-600' : ''}>
                        {week.npsScore}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={week.driverScore >= WIG_TARGETS.driverScore ? 'text-green-600' : ''}>
                        {week.driverScore}
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
                <span>On Track: At or above target (100%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>At Risk: Close to target (80-99%)</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span>Critical: Below target (&lt;80%)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
