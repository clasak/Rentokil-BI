'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell, Legend, AreaChart, Area
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { DollarSign, Clock, AlertTriangle, TrendingUp, TrendingDown, Users } from 'lucide-react'
import { generateMockARAgingSummary, generateMockARDetails, generateMockDSOMetrics } from '@/lib/mock/financeExtendedData'
import type { ARAgingSummary, ARDetailItem, DSOMetric } from '@/types/finance-extended'

export default function ARPage() {
  const [arSummary, setArSummary] = useState<ARAgingSummary | null>(null)
  const [arDetails, setArDetails] = useState<ARDetailItem[]>([])
  const [dsoMetrics, setDsoMetrics] = useState<DSOMetric[]>([])

  useEffect(() => {
    setArSummary(generateMockARAgingSummary())
    setArDetails(generateMockARDetails(50))
    setDsoMetrics(generateMockDSOMetrics(12))
  }, [])

  // Chart data for aging buckets
  const agingChartData = useMemo(() => {
    if (!arSummary) return []
    return arSummary.buckets.map(b => ({
      bucket: b.bucketLabel,
      amount: b.totalAmount,
      count: b.invoiceCount,
      fill: b.bucket === 'current' ? '#22c55e' :
            b.bucket === '1-30' ? '#84cc16' :
            b.bucket === '31-60' ? '#f59e0b' :
            b.bucket === '61-90' ? '#f97316' : '#ef4444'
    }))
  }, [arSummary])

  // DSO trend chart data
  const dsoChartData = useMemo(() => {
    return dsoMetrics.map(m => ({
      period: m.period,
      dso: m.dso,
      target: m.target,
    }))
  }, [dsoMetrics])

  // Top overdue accounts
  const topOverdueAccounts = useMemo(() => {
    return arDetails
      .filter(item => item.daysOutstanding > 30)
      .sort((a, b) => b.balanceDue - a.balanceDue)
      .slice(0, 10)
  }, [arDetails])

  const getBucketBadge = (bucket: string) => {
    switch (bucket) {
      case 'current': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Current</Badge>
      case '1-30': return <Badge className="bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400">1-30 Days</Badge>
      case '31-60': return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">31-60 Days</Badge>
      case '61-90': return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">61-90 Days</Badge>
      default: return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">90+ Days</Badge>
    }
  }

  if (!arSummary) return <div className="flex items-center justify-center h-64">Loading...</div>

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Finance', href: '/finance' },
        { label: 'AR Aging' }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts Receivable Aging</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            As of {arSummary.asOfDate.toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Outstanding</div>
                <div className="text-2xl font-bold">{formatCurrency(arSummary.totalOutstanding)}</div>
                <div className={`text-xs ${arSummary.totalVsLastMonthPercent <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {arSummary.totalVsLastMonthPercent > 0 ? '+' : ''}{arSummary.totalVsLastMonthPercent.toFixed(1)}% vs last month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">High Risk (61+ days)</div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(arSummary.highRiskAmount)}</div>
                <div className="text-xs text-gray-500">
                  {formatPercent(arSummary.highRiskPercent)} of total
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Collections MTD</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(arSummary.collectedMTD)}</div>
                <div className={`text-xs ${arSummary.collectedVsTarget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {arSummary.collectedVsTarget >= 0 ? '+' : ''}{arSummary.collectedVsTarget.toFixed(1)}% vs target
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Days Outstanding</div>
                <div className="text-2xl font-bold">{arSummary.avgDaysOutstanding.toFixed(1)}</div>
                <div className="text-xs text-gray-500">
                  {arSummary.totalInvoices.toLocaleString()} invoices
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Buckets Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              AR Aging Buckets
            </CardTitle>
            <CardDescription>Outstanding balance by aging period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingChartData}>
                  <defs>
                    <filter id="glow-ar" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{data.bucket}</p>
                          <p className="text-sm">{formatCurrency(data.amount)}</p>
                          <p className="text-xs text-gray-500">{data.count} invoices</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} activeBar={{ filter: 'url(#glow-ar)' }}>
                    {agingChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Bucket summary below chart */}
            <div className="grid grid-cols-5 gap-2 mt-4 text-center">
              {arSummary.buckets.map((bucket, i) => (
                <div key={i} className="p-2 rounded bg-gray-50 dark:bg-gray-800/50">
                  <div className="text-lg font-bold">{formatCurrency(bucket.totalAmount)}</div>
                  <div className="text-xs text-gray-500">{bucket.bucketLabel}</div>
                  <div className="text-xs text-gray-400">{bucket.invoiceCount} inv</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* DSO Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              DSO Trend
            </CardTitle>
            <CardDescription>Days Sales Outstanding over 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dsoChartData}>
                  <defs>
                    <linearGradient id="dsofill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis domain={[20, 50]} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload) return null
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium mb-2">{label}</p>
                          {payload.map((entry: any, i: number) => (
                            <p key={i} className="text-sm" style={{ color: entry.color }}>
                              {entry.name}: {entry.value.toFixed(1)} days
                            </p>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="dso" stroke="#3b82f6" fill="url(#dsofill)" name="DSO" strokeWidth={2} />
                  <Line type="monotone" dataKey="target" stroke="#ef4444" strokeDasharray="5 5" name="Target" dot={false} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Current DSO vs Target */}
            {dsoMetrics.length > 0 && (
              <div className="flex justify-around mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{dsoMetrics[dsoMetrics.length - 1].dso.toFixed(1)}</div>
                  <div className="text-xs text-gray-500">Current DSO</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{dsoMetrics[dsoMetrics.length - 1].target}</div>
                  <div className="text-xs text-gray-500">Target DSO</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${dsoMetrics[dsoMetrics.length - 1].variance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {dsoMetrics[dsoMetrics.length - 1].variance > 0 ? '+' : ''}{dsoMetrics[dsoMetrics.length - 1].variance.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">Variance</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Overdue Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-red-500" />
            Top Overdue Accounts
          </CardTitle>
          <CardDescription>Accounts with balances over 30 days outstanding</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead>Days Out</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topOverdueAccounts.map(item => (
                <TableRow key={item.invoiceId}>
                  <TableCell>
                    <div className="font-medium">{item.accountName}</div>
                    <div className="text-xs text-gray-500">{item.accountId}</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.invoiceNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{item.accountType}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(item.originalAmount)}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{formatCurrency(item.balanceDue)}</TableCell>
                  <TableCell className="text-center font-medium">{item.daysOutstanding}</TableCell>
                  <TableCell>{getBucketBadge(item.agingBucket)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      item.status === 'collections' ? 'danger' :
                      item.status === 'overdue' ? 'warning' : 'secondary'
                    } className="capitalize">
                      {item.status.replace('_', ' ')}
                    </Badge>
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
