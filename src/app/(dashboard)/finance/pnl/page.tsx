'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { DollarSign, TrendingUp, TrendingDown, Minus, FileText } from 'lucide-react'
import { generateMockPnL } from '@/lib/mock/financeExtendedData'
import type { PnLStatement, PnLLineItem } from '@/types/finance-extended'

export default function PnLPage() {
  const [pnl, setPnl] = useState<PnLStatement | null>(null)

  useEffect(() => {
    setPnl(generateMockPnL('MTD'))
  }, [])

  // Group line items by category
  const groupedItems = useMemo(() => {
    if (!pnl) return {}
    return pnl.lineItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {} as Record<string, PnLLineItem[]>)
  }, [pnl])

  // Revenue breakdown chart data
  const revenueBreakdown = useMemo(() => {
    if (!groupedItems.revenue) return []
    return groupedItems.revenue.map((item, i) => ({
      name: item.label,
      value: item.amount,
      fill: ['#22c55e', '#3b82f6', '#8b5cf6'][i % 3]
    }))
  }, [groupedItems])

  // Expense breakdown chart data
  const expenseBreakdown = useMemo(() => {
    if (!groupedItems.operating_expenses) return []
    return groupedItems.operating_expenses.map((item, i) => ({
      name: item.label,
      value: item.amount,
      fill: ['#ef4444', '#f59e0b', '#ec4899', '#6366f1'][i % 4]
    }))
  }, [groupedItems])

  // Margin trend data
  const marginData = useMemo(() => {
    if (!pnl) return []
    return [
      { name: 'Gross Margin', value: pnl.grossMargin * 100, fill: '#22c55e' },
      { name: 'Operating Margin', value: pnl.operatingMargin * 100, fill: '#3b82f6' },
      { name: 'Net Margin', value: pnl.netMargin * 100, fill: '#8b5cf6' },
    ]
  }, [pnl])

  const getVarianceBadge = (variance: number) => {
    if (variance > 0) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">+{variance.toFixed(1)}%</Badge>
    } else if (variance < 0) {
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{variance.toFixed(1)}%</Badge>
    }
    return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">0%</Badge>
  }

  if (!pnl) return <div className="flex items-center justify-center h-64">Loading...</div>

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Finance', href: '/finance' },
        { label: 'P&L Statement' }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">P&L Statement</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pnl.period} - {pnl.periodStart.toLocaleDateString()} to {pnl.periodEnd.toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Revenue</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(pnl.revenue)}</div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {pnl.vsBudget.revenue >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={pnl.vsBudget.revenue >= 0 ? 'text-green-600' : 'text-red-600'}>
                {pnl.vsBudget.revenue.toFixed(1)}% vs budget
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">COGS</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(pnl.costOfGoodsSold)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatPercent(pnl.costOfGoodsSold / pnl.revenue)} of revenue
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Gross Profit</div>
            <div className="text-2xl font-bold">{formatCurrency(pnl.grossProfit)}</div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {pnl.vsBudget.grossProfit >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={pnl.vsBudget.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                {pnl.vsBudget.grossProfit.toFixed(1)}% vs budget
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Operating Income</div>
            <div className="text-2xl font-bold">{formatCurrency(pnl.operatingIncome)}</div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {pnl.vsBudget.operatingIncome >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={pnl.vsBudget.operatingIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                {pnl.vsBudget.operatingIncome.toFixed(1)}% vs budget
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Net Income</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(pnl.netIncome)}</div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {pnl.vsBudget.netIncome >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={pnl.vsBudget.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                {pnl.vsBudget.netIncome.toFixed(1)}% vs budget
              </span>
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
              Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {revenueBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
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
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-600" />
              Operating Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="name" width={100} />
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
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Margin Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Margin Analysis
          </CardTitle>
          <CardDescription>Key profitability margins</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marginData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                        <p className="font-medium">{payload[0].payload.name}</p>
                        <p className="text-sm">{(payload[0].value as number).toFixed(1)}%</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {marginData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed P&L Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed P&L</CardTitle>
          <CardDescription>Line item breakdown with budget comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Revenue Section */}
            <div>
              <h3 className="font-semibold text-green-600 mb-2">Revenue</h3>
              <div className="space-y-2">
                {groupedItems.revenue?.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 bg-green-50 dark:bg-green-900/20 px-2 rounded font-bold">
                  <span>Total Revenue</span>
                  <span className="text-green-600">{formatCurrency(pnl.revenue)}</span>
                </div>
              </div>
            </div>

            {/* COGS Section */}
            <div>
              <h3 className="font-semibold text-red-600 mb-2">Cost of Goods Sold</h3>
              <div className="space-y-2">
                {groupedItems.cost_of_goods_sold?.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                    <span className="font-medium text-red-600">({formatCurrency(item.amount)})</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 bg-red-50 dark:bg-red-900/20 px-2 rounded font-bold">
                  <span>Total COGS</span>
                  <span className="text-red-600">({formatCurrency(pnl.costOfGoodsSold)})</span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between items-center py-3 bg-blue-50 dark:bg-blue-900/20 px-3 rounded-lg font-bold text-lg">
              <span>Gross Profit</span>
              <div className="flex items-center gap-3">
                <span className="text-blue-600">{formatCurrency(pnl.grossProfit)}</span>
                {getVarianceBadge(pnl.vsBudget.grossProfit)}
              </div>
            </div>

            {/* Operating Expenses */}
            <div>
              <h3 className="font-semibold text-orange-600 mb-2">Operating Expenses</h3>
              <div className="space-y-2">
                {groupedItems.operating_expenses?.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                    <span className="font-medium text-orange-600">({formatCurrency(item.amount)})</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 bg-orange-50 dark:bg-orange-900/20 px-2 rounded font-bold">
                  <span>Total Operating Expenses</span>
                  <span className="text-orange-600">({formatCurrency(pnl.operatingExpenses)})</span>
                </div>
              </div>
            </div>

            {/* Net Income */}
            <div className="flex justify-between items-center py-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-4 rounded-lg font-bold text-xl border-2 border-green-200 dark:border-green-800">
              <span>Net Income</span>
              <div className="flex items-center gap-3">
                <span className="text-green-700 dark:text-green-400">{formatCurrency(pnl.netIncome)}</span>
                {getVarianceBadge(pnl.vsBudget.netIncome)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
