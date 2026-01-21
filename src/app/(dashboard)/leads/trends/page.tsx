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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts'
import { generateMockLeadTrends } from '@/lib/mock/leadsData'
import { formatNumber, formatPercent, formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Calendar, Filter, BarChart3 } from 'lucide-react'

const MARKETS = ['All Markets', 'Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Central']
const DATE_RANGES = [
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 14 Days', value: '14' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 60 Days', value: '60' },
  { label: 'Last 90 Days', value: '90' },
]

export default function LeadTrendsPage() {
  const [dateRange, setDateRange] = useState('30')
  const [market, setMarket] = useState('All Markets')

  const data = useMemo(
    () => generateMockLeadTrends(parseInt(dateRange)),
    [dateRange]
  )

  const totalLeads = useMemo(
    () => data.reduce((sum, d) => sum + d.leads, 0),
    [data]
  )

  const totalConverted = useMemo(
    () => data.reduce((sum, d) => sum + d.converted, 0),
    [data]
  )

  const avgDailyLeads = useMemo(
    () => totalLeads / data.length,
    [totalLeads, data.length]
  )

  const avgConversionRate = useMemo(
    () => totalConverted / totalLeads,
    [totalConverted, totalLeads]
  )

  // Calculate trend (comparing first half vs second half)
  const trend = useMemo(() => {
    const mid = Math.floor(data.length / 2)
    const firstHalf = data.slice(0, mid)
    const secondHalf = data.slice(mid)
    const firstHalfAvg =
      firstHalf.reduce((sum, d) => sum + d.leads, 0) / firstHalf.length
    const secondHalfAvg =
      secondHalf.reduce((sum, d) => sum + d.leads, 0) / secondHalf.length
    return (secondHalfAvg - firstHalfAvg) / firstHalfAvg
  }, [data])

  // Weekly summary
  const weeklySummary = useMemo(() => {
    const weeks: { week: string; leads: number; converted: number; avgRate: number }[] = []
    let weekStart = 0
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Lead Trends
          </h1>
          <p className="text-sm text-muted-foreground">
            Analyze lead volume and conversion trends over time
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKETS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

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
    </div>
  )
}
