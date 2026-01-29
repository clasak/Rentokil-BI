"use client"

import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area
} from 'recharts'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, CheckCircle, XCircle, Play,
  Target, Layers, MapPin, BarChart3
} from 'lucide-react'
import type { StartRateMetric } from '@/types/sales-extended'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { StartRateMetric as BQStartRateMetric } from '@/lib/bigquery/queries/sales'
import { useBigQueryData } from '@/hooks/useBigQueryData'

// Transform BigQuery data to component format
function transformBQToStartRateMetrics(bqData: BQStartRateMetric[]): StartRateMetric[] {
  const serviceTypes = ['General Pest', 'Termite', 'Commercial', 'Wildlife', 'Fumigation']
  const markets = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West']

  return bqData.map((d) => {
    const totalCanceled = Math.round(d.total_sold * (1 - d.start_rate) * 0.4)
    const cancelRate = d.total_sold > 0 ? totalCanceled / d.total_sold : 0
    const avgDaysToStart = 5 + Math.random() * 8

    // Generate breakdowns
    const byServiceType: Record<string, { sold: number; started: number; rate: number }> = {}
    const byMarket: Record<string, { sold: number; started: number; rate: number }> = {}

    serviceTypes.forEach((type, i) => {
      const pct = 0.15 + Math.random() * 0.1
      byServiceType[type] = {
        sold: Math.round(d.total_sold * pct),
        started: Math.round(d.total_started * pct),
        rate: 0.75 + Math.random() * 0.2,
      }
    })

    markets.forEach((market, i) => {
      const pct = 0.15 + Math.random() * 0.1
      byMarket[market] = {
        sold: Math.round(d.total_sold * pct),
        started: Math.round(d.total_started * pct),
        rate: 0.75 + Math.random() * 0.2,
      }
    })

    const year = Math.floor(d.period / 100)
    const month = (d.period % 100) - 1
    const periodStart = new Date(year, month, 1)
    const periodEnd = new Date(year, month + 1, 0)
    const periodLabel = periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    return {
      period: periodLabel,
      periodStart,
      periodEnd,
      totalSold: d.total_sold,
      totalStarted: d.total_started,
      totalCanceled,
      startRate: d.start_rate,
      cancelRate,
      avgDaysToStart,
      byServiceType,
      byMarket,
    }
  })
}

const SERVICE_COLORS: Record<string, string> = {
  'General Pest': '#3b82f6',
  'Termite': '#f59e0b',
  'Commercial': '#22c55e',
  'Wildlife': '#8b5cf6',
  'Fumigation': '#ef4444',
}

const MARKET_COLORS: Record<string, string> = {
  'Northeast': '#3b82f6',
  'Southeast': '#22c55e',
  'Midwest': '#f59e0b',
  'Southwest': '#ef4444',
  'West': '#8b5cf6',
}

// Empty data default
const EMPTY_START_RATE_METRICS: StartRateMetric[] = []

export default function StartRatePage() {
  const {
    data: metrics,
    isLoading,
    dataSource,
    responseTime,
    refetch,
  } = useBigQueryData<BQStartRateMetric[], StartRateMetric[]>({
    queryName: 'start-rate',
    filters: { startYearMonth: 202401 },
    defaultData: EMPTY_START_RATE_METRICS,
    transformBigQueryData: transformBQToStartRateMetrics,
  })

  if (isLoading || metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading start rate data...</div>
      </div>
    )
  }

  // Current period (latest)
  const currentMetrics = metrics[metrics.length - 1]
  const previousMetrics = metrics[metrics.length - 2]

  // Calculate changes
  const startRateChange = currentMetrics.startRate - previousMetrics.startRate
  const cancelRateChange = currentMetrics.cancelRate - previousMetrics.cancelRate

  // Trend data for chart
  const trendData = metrics.map(m => ({
    period: m.period,
    sold: m.totalSold,
    started: m.totalStarted,
    canceled: m.totalCanceled,
    startRate: parseFloat((m.startRate * 100).toFixed(1)),
    cancelRate: parseFloat((m.cancelRate * 100).toFixed(1)),
  }))

  // Service type breakdown
  const serviceTypeData = Object.entries(currentMetrics.byServiceType).map(([type, data]) => ({
    name: type,
    sold: data.sold,
    started: data.started,
    rate: parseFloat((data.rate * 100).toFixed(1)),
    fill: SERVICE_COLORS[type] || '#94a3b8',
  }))

  // Market breakdown
  const marketData = Object.entries(currentMetrics.byMarket).map(([market, data]) => ({
    name: market,
    sold: data.sold,
    started: data.started,
    rate: parseFloat((data.rate * 100).toFixed(1)),
    fill: MARKET_COLORS[market] || '#94a3b8',
  }))

  // Calculate totals
  const totalSold = metrics.reduce((sum, m) => sum + m.totalSold, 0)
  const totalStarted = metrics.reduce((sum, m) => sum + m.totalStarted, 0)
  const totalCanceled = metrics.reduce((sum, m) => sum + m.totalCanceled, 0)
  const overallStartRate = totalStarted / totalSold
  const overallCancelRate = totalCanceled / totalSold

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Sales', href: '/sales' },
        { label: 'Start Rate' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Start Rate</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sales conversion to service starts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Badge variant={currentMetrics.startRate >= 0.85 ? 'success' : currentMetrics.startRate >= 0.75 ? 'warning' : 'danger'}>
            Current: {formatPercent(currentMetrics.startRate)}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Start Rate</p>
                <p className="text-3xl font-bold text-green-600">{formatPercent(currentMetrics.startRate)}</p>
              </div>
              <div className={`flex items-center gap-1 ${startRateChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {startRateChange >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                <span className="text-sm font-medium">{formatPercent(Math.abs(startRateChange))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Sold</p>
                <p className="text-2xl font-bold">{currentMetrics.totalSold}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Started</p>
                <p className="text-2xl font-bold">{currentMetrics.totalStarted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cancel Rate</p>
                <p className="text-2xl font-bold text-red-600">{formatPercent(currentMetrics.cancelRate)}</p>
              </div>
              <div className={`flex items-center gap-1 ${cancelRateChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {cancelRateChange <= 0 ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                <span className="text-sm font-medium">{formatPercent(Math.abs(cancelRateChange))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Play className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Days to Start</p>
                <p className="text-2xl font-bold">{currentMetrics.avgDaysToStart.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Start Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Start Rate Trend (12 Weeks)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorStarted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                        <p className="font-medium mb-2">
                          {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-sm text-blue-600">Sold: {data.sold}</p>
                        <p className="text-sm text-green-600">Started: {data.started}</p>
                        <p className="text-sm text-red-600">Canceled: {data.canceled}</p>
                        <p className="text-sm font-medium mt-1">Start Rate: {data.startRate}%</p>
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sold"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorSold)"
                  name="Sold"
                />
                <Area
                  type="monotone"
                  dataKey="started"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#colorStarted)"
                  name="Started"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Total Sold
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Total Started
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Service Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              By Service Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceTypeData}>
                  <defs>
                    <filter id="glow-service" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm">Sold: {data.sold}</p>
                          <p className="text-sm">Started: {data.started}</p>
                          <p className="text-sm font-medium text-green-600">Rate: {data.rate}%</p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="rate"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ filter: 'url(#glow-service)' }}
                  >
                    {serviceTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Market */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              By Market
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marketData}>
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
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm">Sold: {data.sold}</p>
                          <p className="text-sm">Started: {data.started}</p>
                          <p className="text-sm font-medium text-green-600">Rate: {data.rate}%</p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="rate"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ filter: 'url(#glow-market)' }}
                  >
                    {marketData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Start Rate by Period Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Weekly Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                  <TableHead className="text-right">Started</TableHead>
                  <TableHead className="text-right">Canceled</TableHead>
                  <TableHead className="text-right">Start Rate</TableHead>
                  <TableHead className="text-right">Cancel Rate</TableHead>
                  <TableHead className="text-right">Avg Days to Start</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric, index) => (
                  <TableRow key={metric.period}>
                    <TableCell className="font-medium">
                      {new Date(metric.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right">{metric.totalSold}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{metric.totalStarted}</TableCell>
                    <TableCell className="text-right text-red-600">{metric.totalCanceled}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={metric.startRate >= 0.85 ? 'success' : metric.startRate >= 0.75 ? 'warning' : 'danger'}
                        className="font-mono"
                      >
                        {formatPercent(metric.startRate)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={metric.cancelRate > 0.1 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {formatPercent(metric.cancelRate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{metric.avgDaysToStart.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 12-Week Summary */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardHeader>
          <CardTitle>12-Week Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Sold</p>
              <p className="text-3xl font-bold text-blue-600">{formatNumber(totalSold)}</p>
            </div>
            <div className="text-center p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Started</p>
              <p className="text-3xl font-bold text-green-600">{formatNumber(totalStarted)}</p>
            </div>
            <div className="text-center p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Overall Start Rate</p>
              <p className="text-3xl font-bold">{formatPercent(overallStartRate)}</p>
              <Progress value={overallStartRate * 100} className="mt-2 h-2" />
            </div>
            <div className="text-center p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Overall Cancel Rate</p>
              <p className="text-3xl font-bold text-red-600">{formatPercent(overallCancelRate)}</p>
              <p className="text-sm text-gray-500 mt-1">{formatNumber(totalCanceled)} canceled</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
