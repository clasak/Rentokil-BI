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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { generateMockLeads, generateMockLeadTrends } from '@/lib/mock/leadsData'
import { formatNumber, formatPercent, formatCurrency } from '@/lib/utils'
import {
  XCircle,
  TrendingDown,
  AlertTriangle,
  Calendar,
  DollarSign,
  Filter,
} from 'lucide-react'

const CANCEL_REASONS = [
  { reason: 'No Contact', color: '#ef4444', description: 'Unable to reach customer' },
  { reason: 'Not Interested', color: '#f59e0b', description: 'Customer declined service' },
  { reason: 'Bad Contact', color: '#8b5cf6', description: 'Invalid contact information' },
  { reason: 'Competitor', color: '#3b82f6', description: 'Chose a competitor' },
  { reason: 'Price', color: '#22c55e', description: 'Price objection' },
  { reason: 'Timing', color: '#06b6d4', description: 'Not ready for service' },
  { reason: 'Duplicate', color: '#94a3b8', description: 'Duplicate lead entry' },
]

const DATE_RANGES = [
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 14 Days', value: '14' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 60 Days', value: '60' },
]

// Generate synthetic cancel data based on mock leads
function generateCancelData(daysBack: number) {
  const leads = generateMockLeads(500)
  const closedLost = leads.filter((l) => l.stage === 'Closed Lost')

  // Distribute across reasons
  const reasonCounts: Record<string, { count: number; value: number }> = {}
  CANCEL_REASONS.forEach((r) => {
    reasonCounts[r.reason] = { count: 0, value: 0 }
  })

  closedLost.forEach((lead, i) => {
    const reasonIndex = i % CANCEL_REASONS.length
    const reason = CANCEL_REASONS[reasonIndex].reason
    reasonCounts[reason].count++
    reasonCounts[reason].value += lead.estimatedValue || 0
  })

  const reasonData = CANCEL_REASONS.map((r) => ({
    ...r,
    count: reasonCounts[r.reason].count,
    value: reasonCounts[r.reason].value,
    percentage: reasonCounts[r.reason].count / closedLost.length,
  })).sort((a, b) => b.count - a.count)

  // Generate trend data
  const trends = generateMockLeadTrends(daysBack)
  const cancelTrends = trends.map((t) => ({
    date: t.date,
    total: t.leads,
    canceled: Math.floor(t.leads * 0.25 + Math.random() * 5),
  }))

  // By market
  const markets = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Central']
  const byMarket = markets.map((market) => {
    const marketLeads = closedLost.filter((l) => l.market === market)
    return {
      market,
      cancels: marketLeads.length,
      value: marketLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0),
      rate: marketLeads.length / (leads.filter((l) => l.market === market).length || 1),
    }
  }).sort((a, b) => b.cancels - a.cancels)

  return {
    total: closedLost.length,
    totalValue: closedLost.reduce((sum, l) => sum + (l.estimatedValue || 0), 0),
    cancelRate: closedLost.length / leads.length,
    reasonData,
    cancelTrends,
    byMarket,
  }
}

export default function LeadCancelsPage() {
  const [dateRange, setDateRange] = useState('30')

  const data = useMemo(
    () => generateCancelData(parseInt(dateRange)),
    [dateRange]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <XCircle className="h-6 w-6 text-red-500" />
            Canceled Leads Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            Analyze canceled leads, identify patterns, and reduce churn
          </p>
        </div>

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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cancellations</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {formatNumber(data.total)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-red-600">
              <TrendingDown className="h-4 w-4 mr-1" />
              {formatPercent(data.cancelRate)} of all leads
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lost Revenue</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {formatCurrency(data.totalValue)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4 mr-1" />
              Potential value lost
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Cancel Reason</CardDescription>
            <CardTitle className="text-3xl">{data.reasonData[0]?.reason}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 mr-1" />
              {formatNumber(data.reasonData[0]?.count)} occurrences
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Lost Value</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(data.totalValue / data.total)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Per canceled lead</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reason Breakdown Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cancellation Reasons</CardTitle>
            <CardDescription>
              Distribution of cancellation reasons by count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.reasonData} layout="vertical">
                  <defs>
                    <filter id="glow-cancel" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="reason" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                            <p className="font-medium">{d.reason}</p>
                            <p className="text-sm text-muted-foreground">
                              {d.description}
                            </p>
                            <p className="text-sm">
                              Count: {formatNumber(d.count)}
                            </p>
                            <p className="text-sm text-red-600">
                              Lost: {formatCurrency(d.value)}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    activeBar={{ filter: 'url(#glow-cancel)' }}
                  >
                    {data.reasonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Reason Distribution</CardTitle>
            <CardDescription>
              Percentage breakdown of cancellation reasons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.reasonData}
                    dataKey="count"
                    nameKey="reason"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ reason, percentage }) =>
                      `${reason}: ${formatPercent(percentage)}`
                    }
                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                  >
                    {data.reasonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                            <p className="font-medium">{d.reason}</p>
                            <p className="text-sm">
                              {formatPercent(d.percentage)}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cancellation Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Cancellation Trend</CardTitle>
          <CardDescription>
            Daily cancellations compared to total leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.cancelTrends}>
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
                          <p className="font-medium">
                            {date.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-sm text-blue-600">
                            Total Leads: {payload[0]?.value}
                          </p>
                          <p className="text-sm text-red-600">
                            Canceled: {payload[1]?.value}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total Leads"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="canceled"
                  name="Canceled"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Reason Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cancellation Reasons Detail</CardTitle>
          <CardDescription>
            Detailed breakdown with descriptions and lost revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
                <TableHead className="text-right">Lost Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.reasonData.map((reason) => (
                <TableRow key={reason.reason}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: reason.color }}
                      />
                      <span className="font-medium">{reason.reason}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {reason.description}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(reason.count)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">
                      {formatPercent(reason.percentage)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-red-600 font-medium">
                    {formatCurrency(reason.value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* By Market Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cancellations by Market</CardTitle>
          <CardDescription>
            Compare cancellation rates across markets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Market</TableHead>
                <TableHead className="text-right">Cancellations</TableHead>
                <TableHead className="text-right">Cancel Rate</TableHead>
                <TableHead className="text-right">Lost Revenue</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byMarket.map((market) => (
                <TableRow key={market.market}>
                  <TableCell className="font-medium">{market.market}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(market.cancels)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        market.rate > 0.3
                          ? 'destructive'
                          : market.rate > 0.2
                          ? 'secondary'
                          : 'default'
                      }
                    >
                      {formatPercent(market.rate)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-red-600 font-medium">
                    {formatCurrency(market.value)}
                  </TableCell>
                  <TableCell>
                    {market.rate > 0.3 ? (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <AlertTriangle className="h-3 w-3" /> High
                      </Badge>
                    ) : market.rate > 0.2 ? (
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <Filter className="h-3 w-3" /> Medium
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="w-fit">Normal</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
