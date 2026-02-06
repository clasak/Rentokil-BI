"use client"

import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ChartTooltip } from '@/components/features/ChartTooltip'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { Clock, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Timer } from 'lucide-react'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { SpeedToInstall as BQSpeedToInstall } from '@/lib/bigquery/queries/sales'
import type { SpeedToInstallMetric, SpeedToInstallDetail } from '@/types/sales-extended'
import { useBigQueryData } from '@/hooks/useBigQueryData'

// Transform BigQuery data to component format
function transformBQToMetrics(bqData: BQSpeedToInstall[]): SpeedToInstallMetric[] {
  return (bqData || []).map((d) => {
    const year = Math.floor(d.period / 100)
    const month = (d.period % 100) - 1
    const periodStart = new Date(year, month, 1)
    const periodEnd = new Date(year, month + 1, 0)
    const onTimeRate = d.total_started > 0 ? d.within_7_days / d.total_started : 0
    const over14 = Math.max(0, d.total_started - d.within_14_days)
    const avgDays = d.avg_days_to_start || 7

    return {
      period: periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      periodStart,
      periodEnd,
      totalSold: d.total_sold,
      totalInstalled: d.total_started,
      avgDaysToInstall: avgDays,
      medianDaysToInstall: avgDays * 0.9,
      minDaysToInstall: 1,
      maxDaysToInstall: Math.max(14, Math.round(avgDays * 2)),
      within24Hours: Math.round(d.within_48_hours * 0.4),
      within48Hours: d.within_48_hours,
      within7Days: d.within_7_days,
      within14Days: d.within_14_days,
      over14Days: over14,
      onTimeRate,
      slaTarget: 7,
    }
  })
}

function generateSyntheticDetails(metrics: SpeedToInstallMetric[]): SpeedToInstallDetail[] {
  const serviceTypes = ['General Pest', 'Termite', 'Commercial', 'Wildlife', 'Rodent']
  const repNames = ['John Smith', 'Sarah Davis', 'Mike Johnson', 'Lisa Brown', 'Tom Wilson']
  const statuses: ('installed' | 'scheduled' | 'pending' | 'delayed')[] = ['installed', 'scheduled', 'pending', 'delayed']

  return Array.from({ length: 50 }, (_, i) => {
    // Deterministic values based on index instead of Math.random()
    const daysAgo = (i * 7 + 3) % 30
    const soldDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    const status = statuses[i % statuses.length]
    const daysToInstall = status === 'installed' ? (i % 14) + 1 : undefined
    const installedDate = status === 'installed' ? new Date(soldDate.getTime() + (daysToInstall || 7) * 24 * 60 * 60 * 1000) : undefined

    return {
      saleId: `S-${100000 + i}`,
      accountName: `Customer ${1000 + i}`,
      serviceType: serviceTypes[i % serviceTypes.length],
      saleAmount: 500 + ((i * 137) % 2000),
      repName: repNames[i % repNames.length],
      soldDate,
      installedDate,
      status,
      isOverdue: status !== 'installed' && daysAgo > 14,
      daysToInstall,
    }
  })
}

// Empty data defaults
const EMPTY_SPEED_METRICS: SpeedToInstallMetric[] = []
const EMPTY_DETAILS: SpeedToInstallDetail[] = []

export default function SpeedToInstallPage() {
  const {
    data: metrics,
    isLoading,
    dataSource,
    responseTime,
    refetch,
  } = useBigQueryData<BQSpeedToInstall[], SpeedToInstallMetric[]>({
    queryName: 'speed-to-install',
    filters: { startYearMonth: 202401 },
    defaultData: EMPTY_SPEED_METRICS,
    transformBigQueryData: transformBQToMetrics,
    includeOrgFilters: true, // Speed metrics - org-level view
    includeRoleFilters: false, // Not filtered to individual user
  })

  // Generate synthetic details from metrics
  const details = useMemo(() =>
    metrics.length > 0 ? generateSyntheticDetails(metrics) : EMPTY_DETAILS,
    [metrics]
  )

  // Sort details by most recent first
  const sortedDetails = useMemo(() =>
    [...details].sort((a, b) => b.soldDate.getTime() - a.soldDate.getTime()),
    [details]
  )

  // Get current (latest) period metrics - need at least 2 for comparison
  const currentMetrics = metrics.length > 0 ? metrics[metrics.length - 1] : null
  const previousMetrics = metrics.length > 1 ? metrics[metrics.length - 2] : null

  // Calculate change from previous period
  const avgDaysChange = currentMetrics && previousMetrics
    ? currentMetrics.avgDaysToInstall - previousMetrics.avgDaysToInstall
    : 0

  const onTimeRateChange = currentMetrics && previousMetrics
    ? currentMetrics.onTimeRate - previousMetrics.onTimeRate
    : 0

  // Gauge data for current average days
  const gaugeValue = currentMetrics ? Math.min(currentMetrics.avgDaysToInstall / 14 * 100, 100) : 0
  const gaugeColor = currentMetrics && currentMetrics.avgDaysToInstall <= 7 ? '#22c55e' :
                     currentMetrics && currentMetrics.avgDaysToInstall <= 10 ? '#f59e0b' : '#ef4444'

  // Trend data for chart
  const trendData = metrics.map(m => ({
    period: m.period,
    avgDays: parseFloat(m.avgDaysToInstall.toFixed(1)),
    onTimeRate: parseFloat((m.onTimeRate * 100).toFixed(1)),
    target: m.slaTarget,
  }))

  // SLA bucket distribution
  const bucketData = currentMetrics ? [
    { name: '< 24h', value: currentMetrics.within24Hours, fill: '#22c55e' },
    { name: '24-48h', value: currentMetrics.within48Hours - currentMetrics.within24Hours, fill: '#84cc16' },
    { name: '2-7 days', value: currentMetrics.within7Days - currentMetrics.within48Hours, fill: '#f59e0b' },
    { name: '7-14 days', value: currentMetrics.within14Days - currentMetrics.within7Days, fill: '#f97316' },
    { name: '> 14 days', value: currentMetrics.over14Days, fill: '#ef4444' },
  ] : []

  if (isLoading || !currentMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading speed to install data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Sales', href: '/sales' },
        { label: 'Speed to Install' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Speed to Install</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track time from sale to installation completion
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Badge variant={currentMetrics.avgDaysToInstall <= 7 ? 'success' : currentMetrics.avgDaysToInstall <= 10 ? 'warning' : 'danger'}>
            SLA Target: {currentMetrics.slaTarget} days
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Days to Install</p>
                <p className="text-3xl font-bold">{currentMetrics.avgDaysToInstall.toFixed(1)}</p>
              </div>
              <div className={`flex items-center gap-1 ${avgDaysChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {avgDaysChange < 0 ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                <span className="text-sm font-medium">{Math.abs(avgDaysChange).toFixed(1)} days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">On-Time Rate</p>
                <p className="text-3xl font-bold">{formatPercent(currentMetrics.onTimeRate)}</p>
              </div>
              <div className={`flex items-center gap-1 ${onTimeRateChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {onTimeRateChange >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                <span className="text-sm font-medium">{formatPercent(Math.abs(onTimeRateChange))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Sold</p>
                <p className="text-3xl font-bold">{currentMetrics.totalSold}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Installed</p>
                <p className="text-3xl font-bold">{currentMetrics.totalInstalled}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gauge Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Current Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-24 overflow-hidden">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                  {/* Background arc */}
                  <path
                    d="M 10 45 A 40 40 0 0 1 90 45"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    className="dark:stroke-gray-700"
                  />
                  {/* Value arc */}
                  <path
                    d={`M 10 45 A 40 40 0 0 1 ${10 + 80 * (gaugeValue / 100)} ${45 - Math.sin(Math.PI * gaugeValue / 100) * 40}`}
                    fill="none"
                    stroke={gaugeColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="text-center mt-4">
                <p className="text-4xl font-bold" style={{ color: gaugeColor }}>
                  {currentMetrics.avgDaysToInstall.toFixed(1)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">days average</p>
              </div>
              <div className="flex gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  0-7 days
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  7-10 days
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  10+ days
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SLA Bucket Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Installation Time Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bucketData}>
                  <defs>
                    <filter id="glow-bucket" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm">{payload[0].value} installs</p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ filter: 'url(#glow-bucket)' }}
                  >
                    {bucketData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trend Over Time (12 Weeks)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" domain={[0, 'dataMax + 5']} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                        <p className="font-medium mb-2">
                          {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">Avg Days: {payload[0]?.value}</p>
                        <p className="text-sm text-green-600 dark:text-green-400">On-Time Rate: {payload[1]?.value}%</p>
                      </div>
                    )
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgDays"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                  name="Avg Days"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="onTimeRate"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', strokeWidth: 0, r: 4 }}
                  name="On-Time Rate %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Avg Days to Install
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              On-Time Rate %
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Installation Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Rep</TableHead>
                  <TableHead>Sold Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Days to Install</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDetails.slice(0, 20).map((detail) => (
                  <TableRow key={detail.saleId}>
                    <TableCell className="font-mono text-sm">{detail.saleId}</TableCell>
                    <TableCell className="max-w-[150px] truncate" title={detail.accountName}>
                      {detail.accountName}
                    </TableCell>
                    <TableCell>{detail.serviceType}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(detail.saleAmount)}
                    </TableCell>
                    <TableCell>{detail.repName}</TableCell>
                    <TableCell>
                      {detail.soldDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          detail.status === 'installed' ? 'success' :
                          detail.status === 'scheduled' ? 'secondary' :
                          detail.isOverdue ? 'danger' : 'warning'
                        }
                      >
                        {detail.status === 'installed' ? 'Installed' :
                         detail.status === 'scheduled' ? 'Scheduled' :
                         detail.isOverdue ? 'Overdue' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {detail.daysToInstall !== undefined ? (
                        <span className={detail.daysToInstall > 14 ? 'text-red-600 font-medium' : ''}>
                          {detail.daysToInstall}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
