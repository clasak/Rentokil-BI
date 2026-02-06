'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  LineChart,
  Line,
} from 'recharts'
import { formatNumber, formatPercent, formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Calendar, Database, AlertTriangle, RefreshCw } from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { PageHeader } from '@/components/layout/PageHeader'
import type { LeadTrend as BQLeadTrend } from '@/lib/bigquery/queries/leads'
import type { LeadTrend } from '@/types/leads'
import type { BCGLeadAnalytics } from '@/lib/bigquery/queries/bcg-analytics'
const DATE_RANGES = [
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 14 Days', value: '14' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 60 Days', value: '60' },
  { label: 'Last 90 Days', value: '90' },
]

const EMPTY_LEAD_TRENDS: LeadTrend[] = []

function transformBigQueryTrends(bqData: BQLeadTrend[]): LeadTrend[] {
  return (bqData || []).map((d) => ({
    date: d.date,
    leads: d.leads,
    converted: d.converted,
    conversionRate: d.conversion_rate,
    avgValue: 2500, // Default estimate since BigQuery doesn't track this
  }))
}

export default function LeadTrendsPage() {
  const [dateRange, setDateRange] = useState('30')

  const EMPTY_BCG_LEADS: BCGLeadAnalytics[] = []

  // BCG Analytics data (enhanced data from BCG_RTD_DB - 3.3M rows)
  // Uses useBigQueryData to ensure role/org filters are applied
  const {
    data: bcgLeadData,
    isLoading: bcgLoading,
  } = useBigQueryData<BCGLeadAnalytics[], BCGLeadAnalytics[]>({
    queryName: 'bcg-lead-analytics',
    filters: { daysBack: parseInt(dateRange), limit: 50 },
    defaultData: EMPTY_BCG_LEADS,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true, // Scope to user's org hierarchy
    includeRoleFilters: false, // Lead analytics overview - not filtered to individual
  })

  const {
    data,
    isLoading,
    dataSource,
    responseTime,
    error,
    errorType,
    refetch,
  } = useBigQueryData<BQLeadTrend[], LeadTrend[]>({
    queryName: 'lead-trends',
    filters: {
      daysBack: parseInt(dateRange),
    },
    defaultData: EMPTY_LEAD_TRENDS,
    transformBigQueryData: transformBigQueryTrends,
  })

  // Auto-refetch when filters change (handled by useBigQueryData dependencies)

  const totalLeads = useMemo(
    () => data.reduce((sum, d) => sum + d.leads, 0),
    [data]
  )

  const totalConverted = useMemo(
    () => data.reduce((sum, d) => sum + d.converted, 0),
    [data]
  )

  const avgDailyLeads = useMemo(
    () => data.length > 0 ? totalLeads / data.length : 0,
    [totalLeads, data.length]
  )

  const avgConversionRate = useMemo(
    () => totalLeads > 0 ? totalConverted / totalLeads : 0,
    [totalConverted, totalLeads]
  )

  // Calculate trend (comparing first half vs second half)
  const trend = useMemo(() => {
    if (data.length < 2) return 0
    const mid = Math.floor(data.length / 2)
    const firstHalf = data.slice(0, mid)
    const secondHalf = data.slice(mid)
    const firstHalfAvg = firstHalf.length > 0
      ? firstHalf.reduce((sum, d) => sum + d.leads, 0) / firstHalf.length
      : 0
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, d) => sum + d.leads, 0) / secondHalf.length
      : 0
    return firstHalfAvg > 0 ? (secondHalfAvg - firstHalfAvg) / firstHalfAvg : 0
  }, [data])

  // Weekly summary
  const weeklySummary = useMemo(() => {
    const weeks: { week: string; leads: number; converted: number; avgRate: number }[] = []
    for (let i = 0; i < data.length; i += 7) {
      const weekData = data.slice(i, Math.min(i + 7, data.length))
      const leads = weekData.reduce((sum, d) => sum + d.leads, 0)
      const converted = weekData.reduce((sum, d) => sum + d.converted, 0)
      weeks.push({
        week: `Week ${weeks.length + 1}`,
        leads,
        converted,
        avgRate: converted / leads,
      })
    }
    return weeks
  }, [data])

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumbs */}
      <PageHeader
        title="Lead Trends"
        breadcrumbs={[
          { label: 'Leads', href: '/leads' },
          { label: 'Trends' },
        ]}
        dataSource={dataSource}
        responseTime={responseTime}
        error={error}
        onRefresh={refetch}
        isLoading={isLoading}
      >
        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Error Loading Lead Trends</span>
          </div>

          <div className="space-y-3">
            {/* Error message */}
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {error}
            </div>

            {/* Context */}
            {errorType && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Error Type:</span>
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{errorType}</p>
                </div>
                <div>
                  <span className="text-gray-500">Query:</span>
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">lead-trends</p>
                </div>
              </div>
            )}

            {/* Recovery actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-3xl">{formatNumber(totalLeads)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`flex items-center text-sm ${
                trend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              {formatPercent(Math.abs(trend))} vs prior period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily Average</CardDescription>
            <CardTitle className="text-3xl">{avgDailyLeads.toFixed(1)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Leads per day
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Converted</CardDescription>
            <CardTitle className="text-3xl">{formatNumber(totalConverted)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              {formatPercent(avgConversionRate)} avg rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Est. Revenue</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(data.reduce((sum, d) => sum + (d.avgValue || 2500) * d.converted, 0))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              From converted leads
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Volume Over Time</CardTitle>
          <CardDescription>
            Daily lead intake and conversion counts for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const date = new Date(label)
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium mb-2">
                            {date.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          {payload.map((entry, index) => (
                            <p
                              key={index}
                              className="text-sm"
                              style={{ color: entry.color }}
                            >
                              {entry.name}: {formatNumber(entry.value as number)}
                            </p>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="leads"
                  name="Leads"
                  stroke="#3b82f6"
                  fill="url(#colorLeads)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="converted"
                  name="Converted"
                  stroke="#22c55e"
                  fill="url(#colorConverted)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Rate Trend</CardTitle>
          <CardDescription>
            Daily conversion rate percentage over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const date = new Date(label)
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">
                            {date.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-sm text-orange-600">
                            Conversion: {formatPercent(payload[0].value as number)}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="conversionRate"
                  name="Conversion Rate"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Summary</CardTitle>
          <CardDescription>
            Aggregated lead metrics by week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead className="text-right">Total Leads</TableHead>
                <TableHead className="text-right">Converted</TableHead>
                <TableHead className="text-right">Conversion Rate</TableHead>
                <TableHead className="text-right">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklySummary.map((week, index) => {
                const prevWeek = index > 0 ? weeklySummary[index - 1] : null
                const change = prevWeek
                  ? (week.leads - prevWeek.leads) / prevWeek.leads
                  : 0
                return (
                  <TableRow key={week.week}>
                    <TableCell className="font-medium">{week.week}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(week.leads)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {formatNumber(week.converted)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          week.avgRate > 0.15
                            ? 'default'
                            : week.avgRate > 0.1
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {formatPercent(week.avgRate)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {index === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : change >= 0 ? (
                        <span className="text-green-600 flex items-center justify-end gap-1">
                          <TrendingUp className="h-4 w-4" />
                          {formatPercent(change)}
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center justify-end gap-1">
                          <TrendingDown className="h-4 w-4" />
                          {formatPercent(Math.abs(change))}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* BCG Analytics Enhancement - Data from BCG_RTD_DB (3.3M rows) */}
      {bcgLeadData.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              BCG Lead Analytics Enhancement
              <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700">BCG_RTD_DB</Badge>
            </CardTitle>
            <CardDescription>
              Enhanced lead analytics by market and source from BCG data warehouse (3.3M+ records)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {bcgLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <span className="ml-2 text-gray-500">Loading BCG lead analytics...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {bcgLeadData.slice(0, 12).map((item, i) => (
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
                        <span className="text-gray-500">Total Leads</span>
                        <span className="font-semibold text-blue-600">{item.total_leads?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Converted</span>
                        <span className="font-semibold text-green-600">{item.converted_leads?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Conversion Rate</span>
                        <span className="font-semibold">{((item.conversion_rate || 0) * 100).toFixed(1)}%</span>
                      </div>
                      {item.lead_source && (
                        <div className="mt-2 pt-2 border-t dark:border-gray-600">
                          <span className="text-xs text-gray-500">Source: </span>
                          <span className="text-xs font-medium">{item.lead_source}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {bcgLeadData.length > 12 && (
              <p className="text-sm text-center text-gray-500 mt-4">
                Showing 12 of {bcgLeadData.length} market/source combinations
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
