"use client"

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  Package, AlertTriangle, Clock, DollarSign, Calendar,
  Filter, AlertCircle, CheckCircle2
} from 'lucide-react'
// No mock data - BigQuery only
import type { BacklogItem, BacklogStatus, BacklogSummary } from '@/types/sales-extended'
import { DataSourceBadge, type DataSourceStatus } from '@/components/ui/data-source-badge'
import type { BacklogItem as BQBacklogItem } from '@/lib/bigquery/queries/sales'

// Transform BigQuery data to component format
// Uses deterministic logic based on actual data - NO random values
function transformBQToBacklogItems(bqData: BQBacklogItem[]): BacklogItem[] {
  return bqData.map((d) => {
    const daysSinceSold = d.days_since_sold
    const isAtRisk = daysSinceSold > 21

    // Deterministic status based on days since sold (real business logic)
    // 0-7 days: pending_schedule, 7-14: scheduled, 14-21: waiting_customer, 21+: blocked
    let status: BacklogStatus
    if (daysSinceSold <= 7) status = 'pending_schedule'
    else if (daysSinceSold <= 14) status = 'scheduled'
    else if (daysSinceSold <= 21) status = 'waiting_customer'
    else status = 'blocked'

    // Priority directly derived from age (deterministic)
    const priority: 'low' | 'medium' | 'high' =
      daysSinceSold > 21 ? 'high' : daysSinceSold > 14 ? 'medium' : 'low'

    return {
      id: d.sales_id,
      accountId: `A-${d.sales_id}`,
      accountName: d.customer_name,
      serviceType: d.service_type,
      amount: d.amount,
      repId: d.sales_person ? `REP-${d.sales_person.replace(/\s/g, '')}` : 'UNASSIGNED',
      repName: d.sales_person || 'Unassigned',
      soldDate: new Date(d.sold_date),
      daysSinceSold,
      status,
      priority,
      isAtRisk,
      blockedReason: isAtRisk ? `Aging ${daysSinceSold} days - needs attention` : undefined,
      branch: d.branch,
    }
  })
}

function generateSummaryFromItems(items: BacklogItem[]): BacklogSummary {
  const totalItems = items.length
  const totalValue = items.reduce((sum, i) => sum + i.amount, 0)
  const avgAge = totalItems > 0 ? items.reduce((sum, i) => sum + i.daysSinceSold, 0) / totalItems : 0
  const atRisk = items.filter(i => i.isAtRisk)
  const blocked = items.filter(i => i.status === 'blocked')

  const under7 = items.filter(i => i.daysSinceSold < 7)
  const days7to14 = items.filter(i => i.daysSinceSold >= 7 && i.daysSinceSold < 14)
  const days14to30 = items.filter(i => i.daysSinceSold >= 14 && i.daysSinceSold < 30)
  const over30 = items.filter(i => i.daysSinceSold >= 30)

  const byStatus = items.reduce((acc, item) => {
    if (!acc[item.status]) acc[item.status] = { count: 0, value: 0 }
    acc[item.status].count++
    acc[item.status].value += item.amount
    return acc
  }, {} as Record<BacklogStatus, { count: number; value: number }>)

  // Find oldest item's age
  const oldestItemAge = items.length > 0
    ? Math.max(...items.map(i => i.daysSinceSold))
    : 0

  return {
    totalItems,
    totalValue,
    avgAge,
    oldestItem: oldestItemAge,
    atRiskCount: atRisk.length,
    atRiskValue: atRisk.reduce((s, i) => s + i.amount, 0),
    blockedCount: blocked.length,
    blockedValue: blocked.reduce((s, i) => s + i.amount, 0),
    under7Days: { count: under7.length, value: under7.reduce((s, i) => s + i.amount, 0) },
    days7to14: { count: days7to14.length, value: days7to14.reduce((s, i) => s + i.amount, 0) },
    days14to30: { count: days14to30.length, value: days14to30.reduce((s, i) => s + i.amount, 0) },
    over30Days: { count: over30.length, value: over30.reduce((s, i) => s + i.amount, 0) },
    byStatus,
  }
}

const STATUS_LABELS: Record<BacklogStatus, string> = {
  pending_schedule: 'Pending Schedule',
  scheduled: 'Scheduled',
  parts_ordered: 'Parts Ordered',
  waiting_customer: 'Waiting Customer',
  blocked: 'Blocked',
  ready: 'Ready',
}

const STATUS_COLORS: Record<BacklogStatus, string> = {
  pending_schedule: '#94a3b8',
  scheduled: '#3b82f6',
  parts_ordered: '#f59e0b',
  waiting_customer: '#8b5cf6',
  blocked: '#ef4444',
  ready: '#22c55e',
}

// Empty summary for initial/error state
const EMPTY_SUMMARY: BacklogSummary = {
  totalItems: 0,
  totalValue: 0,
  avgAge: 0,
  oldestItem: 0,
  atRiskCount: 0,
  atRiskValue: 0,
  blockedCount: 0,
  blockedValue: 0,
  under7Days: { count: 0, value: 0 },
  days7to14: { count: 0, value: 0 },
  days14to30: { count: 0, value: 0 },
  over30Days: { count: 0, value: 0 },
  byStatus: {} as Record<BacklogStatus, { count: number; value: number }>,
}

export default function BacklogPage() {
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([])
  const [summary, setSummary] = useState<BacklogSummary>(EMPTY_SUMMARY)
  const [statusFilter, setStatusFilter] = useState<BacklogStatus | 'all'>('all')
  const [dataSource, setDataSource] = useState<DataSourceStatus>('loading')
  const [responseTime, setResponseTime] = useState<number | undefined>()
  const [error, setError] = useState<string | undefined>()

  const fetchData = useCallback(async () => {
    setDataSource('loading')
    setError(undefined)

    try {
      const startTime = Date.now()
      const response = await fetch('/api/bigquery/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'backlog', filters: { limit: 100 } }),
      })

      const data = await response.json()

      if (data.success && data.data?.length > 0) {
        const items = transformBQToBacklogItems(data.data)
        setBacklogItems(items)
        setSummary(generateSummaryFromItems(items))
        setDataSource('bigquery')
        setResponseTime(Date.now() - startTime)
      } else {
        throw new Error(data.error || 'No data returned from BigQuery')
      }
    } catch (err) {
      console.error('BigQuery fetch failed:', err)
      setDataSource('error')
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
      setBacklogItems([])
      setSummary(EMPTY_SUMMARY)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Age bucket data for chart
  const ageBucketData = [
    { name: '< 7 days', count: summary.under7Days.count, value: summary.under7Days.value, fill: '#22c55e' },
    { name: '7-14 days', count: summary.days7to14.count, value: summary.days7to14.value, fill: '#84cc16' },
    { name: '14-30 days', count: summary.days14to30.count, value: summary.days14to30.value, fill: '#f59e0b' },
    { name: '> 30 days', count: summary.over30Days.count, value: summary.over30Days.value, fill: '#ef4444' },
  ]

  // Status breakdown for pie chart
  const statusData = Object.entries(summary.byStatus).map(([status, data]) => ({
    name: STATUS_LABELS[status as BacklogStatus],
    value: data.count,
    amount: data.value,
    fill: STATUS_COLORS[status as BacklogStatus],
  }))

  // Filtered items
  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return backlogItems
    return backlogItems.filter(item => item.status === statusFilter)
  }, [backlogItems, statusFilter])

  // At-risk items
  const atRiskItems = backlogItems.filter(item => item.isAtRisk)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Sales', href: '/sales' },
        { label: 'Backlog' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Backlog</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pending installations and service starts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Badge variant={summary.atRiskCount > 10 ? 'danger' : summary.atRiskCount > 5 ? 'warning' : 'success'}>
            {summary.atRiskCount} at risk
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
                <p className="text-2xl font-bold">{summary.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Age</p>
                <p className="text-2xl font-bold">{summary.avgAge.toFixed(1)} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">At Risk</p>
                <p className="text-2xl font-bold">{summary.atRiskCount}</p>
                <p className="text-xs text-red-600">{formatCurrency(summary.atRiskValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <AlertCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Blocked</p>
                <p className="text-2xl font-bold">{summary.blockedCount}</p>
                <p className="text-xs text-purple-600">{formatCurrency(summary.blockedValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Bucket Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Backlog by Age
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageBucketData}>
                  <defs>
                    <filter id="glow-age" x="-50%" y="-50%" width="200%" height="200%">
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
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm">{data.count} items</p>
                          <p className="text-sm text-gray-500">{formatCurrency(data.value)}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ filter: 'url(#glow-age)' }}
                  >
                    {ageBucketData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${value}`}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm">{data.value} items</p>
                          <p className="text-sm text-gray-500">{formatCurrency(data.amount)}</p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {statusData.map((status) => (
                <span key={status.name} className="flex items-center gap-1 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.fill }}></span>
                  {status.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Items */}
      {atRiskItems.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="bg-red-50 dark:bg-red-900/20">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              At-Risk Items ({atRiskItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Rep</TableHead>
                    <TableHead className="text-right">Days Since Sold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atRiskItems.slice(0, 10).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-[150px] truncate" title={item.accountName}>
                        {item.accountName}
                      </TableCell>
                      <TableCell>{item.serviceType}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      <TableCell>{item.repName}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {item.daysSinceSold}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {STATUS_LABELS[item.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.blockedReason ? (
                          <span className="text-sm text-red-600">{item.blockedReason}</span>
                        ) : (
                          <span className="text-sm text-yellow-600">Aging</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Backlog Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              All Backlog Items
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as BacklogStatus | 'all')}
                className="px-3 py-1 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="all">All Status</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Rep</TableHead>
                  <TableHead>Sold Date</TableHead>
                  <TableHead className="text-right">Days Old</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.slice(0, 25).map((item) => (
                  <TableRow key={item.id} className={item.isAtRisk ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                    <TableCell className="font-mono text-sm">{item.id}</TableCell>
                    <TableCell className="max-w-[150px] truncate" title={item.accountName}>
                      {item.accountName}
                    </TableCell>
                    <TableCell>{item.serviceType}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                    <TableCell>{item.repName}</TableCell>
                    <TableCell>
                      {item.soldDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={item.daysSinceSold > 21 ? 'text-red-600 font-medium' : item.daysSinceSold > 14 ? 'text-yellow-600' : ''}>
                        {item.daysSinceSold}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'secondary'}
                        className="text-xs"
                      >
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: STATUS_COLORS[item.status], color: STATUS_COLORS[item.status] }}
                      >
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredItems.length > 25 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
              Showing 25 of {filteredItems.length} items
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
