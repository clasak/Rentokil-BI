"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store'
import { getInvoices, filterByRole } from '@/lib/data'
import { calculateKPIValues, getARAgingBreakdown, getActionItems } from '@/lib/kpi-calculations'
import { KPICard } from '@/components/features/KPICard'
import { ActionList } from '@/components/features/ActionList'
import { ChartTooltip } from '@/components/features/ChartTooltip'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { DollarSign, Clock, ChevronRight, AlertTriangle, TrendingUp } from 'lucide-react'
import { Invoice, KPIValue } from '@/types'

export default function FinancePage() {
  const { settings } = useAppStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [kpiValues, setKpiValues] = useState<Map<string, KPIValue>>(new Map())
  const [arAging, setArAging] = useState<any[]>([])
  const [actions, setActions] = useState<any[]>([])

  useEffect(() => {
    let invs = getInvoices()
    setInvoices(invs)
    setKpiValues(calculateKPIValues())
    setArAging(getARAgingBreakdown())
    setActions(getActionItems().filter(a => a.type === 'collection_priority'))
  }, [settings])

  const financeKpis = ['revenue_mtd', 'ar_aging', 'dso', 'nrr', 'margin_proxy']

  // AR Aging chart data
  const arAgingChart = arAging.map(bucket => ({
    bucket: bucket.bucket,
    amount: bucket.amount,
    count: bucket.count,
    fill: bucket.bucket === '0-30' ? '#22c55e' :
          bucket.bucket === '31-60' ? '#f59e0b' :
          bucket.bucket === '61-90' ? '#f97316' :
          '#ef4444'
  }))

  // Revenue trend - simulated
  const revenueTrend = kpiValues.get('revenue_mtd')?.trend || []
  const revenueTrendChart = revenueTrend.map((value, i) => ({
    period: `Week ${i + 1}`,
    revenue: value,
  }))

  // Top overdue invoices
  const overdueInvoices = invoices
    .filter(i => i.status === 'overdue' || (i.status === 'open' && i.agingBucket !== '0-30'))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 15)

  // Summary stats
  const totalAR = invoices.filter(i => ['open', 'overdue', 'disputed'].includes(i.status))
    .reduce((sum, i) => sum + i.amount, 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue')
    .reduce((sum, i) => sum + i.amount, 0)
  const paidMTD = invoices.filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-sm text-gray-500">Revenue, AR aging, and collections</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {financeKpis.map(slug => {
          const kpiValue = kpiValues.get(slug)
          if (!kpiValue) return null
          return <KPICard key={slug} kpiValue={kpiValue} compact />
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Total AR Balance</div>
                <div className="text-2xl font-bold">{formatCurrency(totalAR)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Overdue</div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Collections MTD</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(paidMTD)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AR Aging Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              AR Aging Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={arAgingChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip content={<ChartTooltip formatter={formatCurrency} />} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {arAgingChart.map((entry, index) => (
                      <Bar key={index} dataKey="amount" fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              {arAgingChart.map(bucket => (
                <div key={bucket.bucket} className="text-center">
                  <div className="text-lg font-bold">{formatCurrency(bucket.amount)}</div>
                  <div className="text-xs text-gray-500">{bucket.bucket} days</div>
                  <div className="text-xs text-gray-400">{bucket.count} invoices</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Collections Actions */}
        <ActionList
          actions={actions}
          title="Collection Priorities"
          maxItems={6}
          type="collection_priority"
        />
      </div>

      {/* Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltip formatter={formatCurrency} valueLabel="Revenue" />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#00A651"
                  fill="#00A65120"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Overdue Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueInvoices.map(invoice => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-sm">{invoice.id}</TableCell>
                  <TableCell>{invoice.accountName}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(invoice.amount)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {invoice.invoiceDate.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {invoice.dueDate.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      invoice.agingBucket === '90+' ? 'danger' :
                      invoice.agingBucket === '61-90' ? 'warning' :
                      'secondary'
                    }>
                      {invoice.agingBucket} days
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      invoice.status === 'overdue' ? 'danger' :
                      invoice.status === 'disputed' ? 'warning' : 'outline'
                    } className="capitalize">
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/finance/invoice/${invoice.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
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
