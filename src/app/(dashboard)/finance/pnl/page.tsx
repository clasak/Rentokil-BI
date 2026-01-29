'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { DollarSign, TrendingUp, TrendingDown, FileText, Calendar, RefreshCw } from 'lucide-react'
import { DataSourceBadge, type DataSourceStatus } from '@/components/ui/data-source-badge'
import type {
  PnLSummary,
  RevenueBreakdown,
  ExpenseBreakdown,
  PnLTrend
} from '@/lib/bigquery/queries/pnl'
import { useAppStore } from '@/store'

// Empty data constants
const EMPTY_PNL_SUMMARY: PnLSummary = {
  total_revenue: 0,
  total_cogs: 0,
  gross_profit: 0,
  gross_margin: 0,
  operating_expenses: 0,
  operating_income: 0,
  operating_margin: 0,
  ebitda: 0,
  ebitda_margin: 0,
  net_income: 0,
  net_margin: 0,
  revenue_mom_change: 0,
  expense_mom_change: 0,
  as_of_date: new Date().toISOString().split('T')[0],
}

const EMPTY_REVENUE_BREAKDOWN: RevenueBreakdown[] = []
const EMPTY_EXPENSE_BREAKDOWN: ExpenseBreakdown[] = []
const EMPTY_PNL_TREND: PnLTrend[] = []

export default function PnLPage() {
  const [mounted, setMounted] = useState(false)
  const [pnlSummary, setPnlSummary] = useState<PnLSummary>(EMPTY_PNL_SUMMARY)
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown[]>(EMPTY_REVENUE_BREAKDOWN)
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>(EMPTY_EXPENSE_BREAKDOWN)
  const [pnlTrend, setPnlTrend] = useState<PnLTrend[]>(EMPTY_PNL_TREND)
  const [dataSource, setDataSource] = useState<DataSourceStatus>('loading')
  const [responseTime, setResponseTime] = useState<number | undefined>()
  const [dateRange, setDateRange] = useState<'MTD' | 'QTD' | 'YTD'>('MTD')

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchData = useCallback(async () => {
    setDataSource('loading')
    try {
      const startTime = Date.now()

      const filters = {
        dateRange,
      }

      const [summaryRes, revenueRes, expenseRes, trendRes] = await Promise.all([
        fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'pnl-summary', filters }),
        }),
        fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'revenue-breakdown', filters }),
        }),
        fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'expense-breakdown', filters }),
        }),
        fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'pnl-trend', filters }),
        }),
      ])

      const [summaryData, revenueData, expenseData, trendData] = await Promise.all([
        summaryRes.json(),
        revenueRes.json(),
        expenseRes.json(),
        trendRes.json(),
      ])

      if (summaryData.success) {
        setPnlSummary(summaryData.data || EMPTY_PNL_SUMMARY)
      }

      if (revenueData.success) {
        setRevenueBreakdown(revenueData.data || EMPTY_REVENUE_BREAKDOWN)
      }

      if (expenseData.success) {
        setExpenseBreakdown(expenseData.data || EMPTY_EXPENSE_BREAKDOWN)
      }

      if (trendData.success) {
        setPnlTrend(trendData.data || EMPTY_PNL_TREND)
      }

      setDataSource('bigquery')
      setResponseTime(Date.now() - startTime)
    } catch (err) {
      console.error('BigQuery P&L fetch failed:', err)
      setPnlSummary(EMPTY_PNL_SUMMARY)
      setRevenueBreakdown(EMPTY_REVENUE_BREAKDOWN)
      setExpenseBreakdown(EMPTY_EXPENSE_BREAKDOWN)
      setPnlTrend(EMPTY_PNL_TREND)
      setDataSource('error')
    }
  }, [dateRange])

  useEffect(() => {
    if (mounted) {
      fetchData()
    }
  }, [mounted, fetchData])

  // Revenue breakdown chart data
  const revenueChartData = useMemo(() => {
    return revenueBreakdown.map((item, i) => ({
      name: item.service_line,
      value: item.revenue,
      fill: ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b'][i % 4]
    }))
  }, [revenueBreakdown])

  // Expense breakdown chart data
  const expenseChartData = useMemo(() => {
    return expenseBreakdown.slice(0, 6).map((item, i) => ({
      name: item.expense_category,
      value: item.expense_amount,
      fill: ['#ef4444', '#f59e0b', '#ec4899', '#6366f1', '#8b5cf6', '#14b8a6'][i % 6]
    }))
  }, [expenseBreakdown])

  // P&L trend chart data
  const trendChartData = useMemo(() => {
    return pnlTrend.map(t => ({
      period: t.period,
      revenue: t.revenue,
      expenses: t.operating_expenses + t.cogs,
      net_income: t.net_income,
      gross_margin: t.gross_margin * 100,
      net_margin: t.net_margin * 100,
    }))
  }, [pnlTrend])

  const getVarianceBadge = (variance: number) => {
    if (variance > 0) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">+{variance.toFixed(1)}%</Badge>
    } else if (variance < 0) {
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{variance.toFixed(1)}%</Badge>
    }
    return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">0%</Badge>
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Finance', href: '/finance' },
        { label: 'P&L Statement' }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profit &amp; Loss Statement</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {dateRange} - As of {new Date(pnlSummary.as_of_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</span>
            <div className="flex gap-2">
              {(['MTD', 'QTD', 'YTD'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 text-sm rounded ${
                    dateRange === range
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Revenue</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(pnlSummary.total_revenue)}</div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {pnlSummary.revenue_mom_change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={pnlSummary.revenue_mom_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                {pnlSummary.revenue_mom_change.toFixed(1)}% MoM
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Gross Profit</div>
            <div className="text-2xl font-bold">{formatCurrency(pnlSummary.gross_profit)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatPercent(pnlSummary.gross_margin)} margin
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Operating Expenses</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(pnlSummary.operating_expenses)}</div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {pnlSummary.expense_mom_change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-red-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-500" />
              )}
              <span className={pnlSummary.expense_mom_change >= 0 ? 'text-red-600' : 'text-green-600'}>
                {Math.abs(pnlSummary.expense_mom_change).toFixed(1)}% MoM
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">EBITDA</div>
            <div className="text-2xl font-bold">{formatCurrency(pnlSummary.ebitda)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatPercent(pnlSummary.ebitda_margin)} margin
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Net Income</div>
            <div className={`text-2xl font-bold ${pnlSummary.net_income >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {formatCurrency(pnlSummary.net_income)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatPercent(pnlSummary.net_margin)} margin
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Revenue by Service Line
            </CardTitle>
            <CardDescription>Revenue distribution across service types</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <div className="h-[300px] [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {revenueChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={false}
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                            <p className="font-medium">{payload[0].name}</p>
                            <p className="text-sm">{formatCurrency(payload[0].value as number)}</p>
                          </div>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No revenue data available for {dateRange}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-600" />
              Operating Expenses
            </CardTitle>
            <CardDescription>Top expense categories</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseChartData.length > 0 ? (
              <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                            <p className="font-medium">{payload[0].payload.name}</p>
                            <p className="text-sm">{formatCurrency(payload[0].value as number)}</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {expenseChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No expense data available for {dateRange}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* P&L Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            12-Month P&amp;L Trend
          </CardTitle>
          <CardDescription>Revenue, expenses, and net income over time</CardDescription>
        </CardHeader>
        <CardContent>
          {trendChartData.length > 0 ? (
            <div className="h-[350px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload) return null
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium mb-2">{label}</p>
                          {payload.map((entry: any, i: number) => (
                            <p key={i} className="text-sm" style={{ color: entry.color }}>
                              {entry.name}: {entry.name.includes('margin') ? `${entry.value.toFixed(1)}%` : formatCurrency(entry.value)}
                            </p>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Revenue" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Total Expenses" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="net_income" stroke="#3b82f6" name="Net Income" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              No trend data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed P&L Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed P&amp;L Statement</CardTitle>
          <CardDescription>Line item breakdown for {dateRange}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line Item</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">% of Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Revenue */}
              <TableRow className="bg-green-50 dark:bg-green-900/20 font-bold">
                <TableCell>Revenue</TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(pnlSummary.total_revenue)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>

              {/* COGS */}
              <TableRow>
                <TableCell className="pl-6">Cost of Goods Sold</TableCell>
                <TableCell className="text-right text-red-600">({formatCurrency(pnlSummary.total_cogs)})</TableCell>
                <TableCell className="text-right">{formatPercent(pnlSummary.total_revenue > 0 ? pnlSummary.total_cogs / pnlSummary.total_revenue : 0)}</TableCell>
              </TableRow>

              {/* Gross Profit */}
              <TableRow className="bg-blue-50 dark:bg-blue-900/20 font-bold border-t-2">
                <TableCell>Gross Profit</TableCell>
                <TableCell className="text-right text-blue-600">{formatCurrency(pnlSummary.gross_profit)}</TableCell>
                <TableCell className="text-right">{formatPercent(pnlSummary.gross_margin)}</TableCell>
              </TableRow>

              {/* Operating Expenses */}
              <TableRow>
                <TableCell className="pl-6">Operating Expenses</TableCell>
                <TableCell className="text-right text-orange-600">({formatCurrency(pnlSummary.operating_expenses)})</TableCell>
                <TableCell className="text-right">{formatPercent(pnlSummary.total_revenue > 0 ? pnlSummary.operating_expenses / pnlSummary.total_revenue : 0)}</TableCell>
              </TableRow>

              {/* Operating Income */}
              <TableRow className="bg-purple-50 dark:bg-purple-900/20 font-bold border-t-2">
                <TableCell>Operating Income</TableCell>
                <TableCell className="text-right text-purple-600">{formatCurrency(pnlSummary.operating_income)}</TableCell>
                <TableCell className="text-right">{formatPercent(pnlSummary.operating_margin)}</TableCell>
              </TableRow>

              {/* Net Income */}
              <TableRow className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 font-bold text-lg border-t-4 border-green-200 dark:border-green-800">
                <TableCell>Net Income</TableCell>
                <TableCell className={`text-right ${pnlSummary.net_income >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {formatCurrency(pnlSummary.net_income)}
                </TableCell>
                <TableCell className="text-right">{formatPercent(pnlSummary.net_margin)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Gross Margin</div>
              <div className="text-2xl font-bold text-blue-600">{formatPercent(pnlSummary.gross_margin)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Operating Margin</div>
              <div className="text-2xl font-bold text-purple-600">{formatPercent(pnlSummary.operating_margin)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Net Margin</div>
              <div className={`text-2xl font-bold ${pnlSummary.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(pnlSummary.net_margin)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
