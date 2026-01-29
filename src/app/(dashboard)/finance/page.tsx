"use client"

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { getInvoices, filterByRole } from '@/lib/data'
import { calculateKPIValues, getARAgingBreakdown, getActionItems } from '@/lib/kpi-calculations'
import { KPICard } from '@/components/features/KPICard'
import { ActionList } from '@/components/features/ActionList'
import { ChartTooltip } from '@/components/features/ChartTooltip'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { DollarSign, Clock, ChevronRight, AlertTriangle, TrendingUp } from 'lucide-react'
import { Invoice, KPIValue } from '@/types'
import type { ARSummary, ARAging as BigQueryARAging } from '@/lib/bigquery/queries/finance'

// Types for page display
interface FinanceDisplayData {
  arSummary: ARSummary
  arAgingByBucket: Array<{
    bucket: string
    amount: number
    count: number
    fill: string
  }>
}

// Transform BigQuery AR data to display format
function transformBigQueryData(bqData: BigQueryARAging[]): FinanceDisplayData {
  // Group by aging bucket and sum amounts
  const bucketMap = new Map<string, { amount: number; count: number }>()

  bqData.forEach(row => {
    const bucket = row.aging_bucket
    const existing = bucketMap.get(bucket) || { amount: 0, count: 0 }
    bucketMap.set(bucket, {
      amount: existing.amount + row.total_amount,
      count: existing.count + row.invoice_count,
    })
  })

  // Create AR aging chart data with proper bucket ordering
  const bucketOrder = ['Current', '1-30', '31-60', '61-90', '90+']
  const arAgingByBucket = bucketOrder
    .filter(bucket => bucketMap.has(bucket))
    .map(bucket => {
      const data = bucketMap.get(bucket)!
      // Map bucket names for display
      const displayBucket = bucket === 'Current' ? '0-30' : bucket
      return {
        bucket: displayBucket,
        amount: data.amount,
        count: data.count,
        fill: bucket === 'Current' || bucket === '1-30' ? '#22c55e' :
              bucket === '31-60' ? '#f59e0b' :
              bucket === '61-90' ? '#f97316' : '#ef4444'
      }
    })

  // Calculate summary totals
  const currentAmount = bucketMap.get('Current')?.amount || 0
  const pastDue_1_30 = bucketMap.get('1-30')?.amount || 0
  const pastDue_31_60 = bucketMap.get('31-60')?.amount || 0
  const pastDue_61_90 = bucketMap.get('61-90')?.amount || 0
  const pastDue_90_plus = bucketMap.get('90+')?.amount || 0
  const totalAR = currentAmount + pastDue_1_30 + pastDue_31_60 + pastDue_61_90 + pastDue_90_plus
  const totalPastDue = pastDue_1_30 + pastDue_31_60 + pastDue_61_90 + pastDue_90_plus

  return {
    arSummary: {
      current_amount: currentAmount,
      past_due_1_30: pastDue_1_30,
      past_due_31_60: pastDue_31_60,
      past_due_61_90: pastDue_61_90,
      past_due_90_plus: pastDue_90_plus,
      total_ar: totalAR,
      total_past_due: totalPastDue,
    },
    arAgingByBucket,
  }
}

// Empty data constants
const EMPTY_FINANCE_DATA: FinanceDisplayData = {
  arSummary: {
    current_amount: 0,
    past_due_1_30: 0,
    past_due_31_60: 0,
    past_due_61_90: 0,
    past_due_90_plus: 0,
    total_ar: 0,
    total_past_due: 0,
  },
  arAgingByBucket: [],
}

export default function FinancePage() {
  const { settings } = useAppStore()
  const effectiveRole = useEffectiveRole()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [kpiValues, setKpiValues] = useState<Map<string, KPIValue>>(new Map())
  const [actions, setActions] = useState<any[]>([])

  // BigQuery integration for AR data
  const {
    data: financeData,
    isLoading,
    dataSource,
    responseTime,
    error,
    refetch,
  } = useBigQueryData<BigQueryARAging[], FinanceDisplayData>({
    queryName: 'ar-aging',
    filters: {},
    defaultData: EMPTY_FINANCE_DATA,
    transformBigQueryData,
  })

  useEffect(() => {
    let invs = getInvoices()
    setInvoices(invs)
    // Pass role and userId to filter KPI data to user's scope
    setKpiValues(calculateKPIValues(effectiveRole, settings.userId))
    setActions(getActionItems(effectiveRole, settings.userId).filter(a => a.type === 'collection_priority'))
  }, [settings, effectiveRole])

  const financeKpis = ['revenue_mtd', 'ar_aging', 'dso', 'nrr', 'margin_proxy']

  // Use BigQuery AR data or fallback to mock
  const arAgingChart = financeData?.arAgingByBucket || []
  const arSummary = financeData?.arSummary

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

  // Summary stats - use BigQuery data if available
  const totalAR = arSummary?.total_ar ?? invoices.filter(i => ['open', 'overdue', 'disputed'].includes(i.status))
    .reduce((sum, i) => sum + i.amount, 0)
  const totalOverdue = arSummary?.total_past_due ?? invoices.filter(i => i.status === 'overdue')
    .reduce((sum, i) => sum + i.amount, 0)
  const paidMTD = invoices.filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumbs */}
      <PageHeader
        title="Finance"
        breadcrumbs={[
          { label: 'Command Center', href: '/' },
          { label: 'Finance' },
        ]}
        dataSource={dataSource}
        responseTime={responseTime}
        error={error}
        onRefresh={refetch}
        isLoading={isLoading}
      />

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
        <Card className="glow-info">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total AR Balance</div>
                <div className="text-2xl font-bold">{formatCurrency(totalAR)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glow-danger">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Overdue</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalOverdue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glow-success">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Collections MTD</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(paidMTD)}</div>
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
                  <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="dark:opacity-30" />
                  <XAxis dataKey="bucket" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip content={<ChartTooltip formatter={formatCurrency} />} cursor={false} />
                  <Bar
                    dataKey="amount"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ filter: 'url(#glow)' }}
                  >
                    {arAgingChart.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
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
                <defs>
                  <filter id="glow-area" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur"/>
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="dark:opacity-30" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltip formatter={formatCurrency} valueLabel="Revenue" />} cursor={false} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#00A651"
                  fill="#00A65120"
                  strokeWidth={2}
                  activeDot={{ r: 6, filter: 'url(#glow-area)' }}
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
                  <TableCell>
                    <span className="block max-w-[180px] truncate" title={invoice.accountName}>
                      {invoice.accountName}
                    </span>
                  </TableCell>
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
