"use client"

import { useState, useEffect } from 'react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import {
  Users, TrendingUp, TrendingDown, AlertTriangle, DollarSign,
  Target, Activity, ArrowUpDown
} from 'lucide-react'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type {
  AccountRetention,
  RevenueChurn,
  CustomerLifetimeValue,
  PortfolioGrowth
} from '@/lib/bigquery/queries/portfolio'

// Empty states for BigQuery data
const EMPTY_RETENTION: AccountRetention[] = []
const EMPTY_CHURN: RevenueChurn[] = []
const EMPTY_CLV: CustomerLifetimeValue[] = []
const EMPTY_GROWTH: PortfolioGrowth[] = []

export default function PortfolioPage() {
  const [mounted, setMounted] = useState(false)
  const [dateRange, setDateRange] = useState<30 | 60 | 90 | 180>(90)

  useEffect(() => {
    setMounted(true)
  }, [])

  // BigQuery data for portfolio analytics
  const {
    data: retentionData,
    isLoading: retentionLoading,
    dataSource,
  } = useBigQueryData<AccountRetention[], AccountRetention[]>({
    queryName: 'account-retention',
    filters: { daysBack: 365 },
    defaultData: EMPTY_RETENTION,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true,
    includeRoleFilters: true,
  })

  const {
    data: churnData,
    isLoading: churnLoading,
  } = useBigQueryData<RevenueChurn[], RevenueChurn[]>({
    queryName: 'revenue-churn',
    filters: { daysBack: dateRange },
    defaultData: EMPTY_CHURN,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true,
    includeRoleFilters: true,
  })

  const {
    data: clvData,
    isLoading: clvLoading,
  } = useBigQueryData<CustomerLifetimeValue[], CustomerLifetimeValue[]>({
    queryName: 'customer-lifetime-value',
    filters: { daysBack: 365 },
    defaultData: EMPTY_CLV,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true,
    includeRoleFilters: true,
  })

  const {
    data: growthData,
    isLoading: growthLoading,
  } = useBigQueryData<PortfolioGrowth[], PortfolioGrowth[]>({
    queryName: 'portfolio-growth',
    filters: { daysBack: dateRange },
    defaultData: EMPTY_GROWTH,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true,
    includeRoleFilters: true,
  })

  // Calculate summary metrics
  const latestGrowth = growthData[0] || null
  const activeAccounts = latestGrowth?.total_active_accounts || 0
  const netGrowth = latestGrowth?.net_growth || 0
  const growthRate = latestGrowth?.growth_rate || 0

  // Calculate average retention rate
  const avgRetentionRate = retentionData.length > 0
    ? retentionData.reduce((sum, r) => sum + r.retention_rate, 0) / retentionData.length
    : 0

  // Calculate average churn rate
  const avgChurnRate = churnData.length > 0
    ? churnData.reduce((sum, c) => sum + c.churn_rate, 0) / churnData.length
    : 0

  // Calculate average CLV
  const avgCLV = clvData.length > 0
    ? clvData.reduce((sum, c) => sum + c.customer_lifetime_value, 0) / clvData.length
    : 0

  // Prepare churn by service type for chart
  const churnByServiceType = churnData.reduce((acc, item) => {
    const existing = acc.find(i => i.service_type === item.service_type)
    if (existing) {
      existing.churn_rate = (existing.churn_rate + item.churn_rate) / 2
    } else {
      acc.push({
        service_type: item.service_type,
        churn_rate: item.churn_rate
      })
    }
    return acc
  }, [] as { service_type: string; churn_rate: number }[])

  // Prepare growth chart data (reversed for chronological order)
  const growthChartData = growthData.slice().reverse()

  // Get churn badge variant
  const getChurnBadgeVariant = (churnRate: number) => {
    if (churnRate >= 10) return 'danger'
    if (churnRate >= 5) return 'warning'
    return 'success'
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Portfolio' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Portfolio Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Customer retention, churn analysis, and portfolio growth</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Button
              variant={dateRange === 30 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(30)}
            >
              30 Days
            </Button>
            <Button
              variant={dateRange === 60 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(60)}
            >
              60 Days
            </Button>
            <Button
              variant={dateRange === 90 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(90)}
            >
              90 Days
            </Button>
            <Button
              variant={dateRange === 180 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(180)}
            >
              180 Days
            </Button>
          </div>
          <DataSourceBadge status={dataSource} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Active Accounts</div>
                <div className="text-2xl font-bold">
                  {growthLoading ? '...' : activeAccounts.toLocaleString()}
                </div>
                {!growthLoading && netGrowth !== 0 && (
                  <div className={`text-xs flex items-center gap-1 ${netGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netGrowth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(netGrowth)} this month
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Retention Rate</div>
                <div className="text-2xl font-bold">
                  {retentionLoading ? '...' : `${avgRetentionRate.toFixed(1)}%`}
                </div>
                <div className="text-xs text-gray-500">vs 85% target</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                avgChurnRate >= 5 ? 'bg-red-100 dark:bg-red-900' : 'bg-yellow-100 dark:bg-yellow-900'
              }`}>
                {avgChurnRate >= 5 ? (
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                ) : (
                  <Activity className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                )}
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Monthly Churn %</div>
                <div className={`text-2xl font-bold ${avgChurnRate >= 5 ? 'text-red-600' : ''}`}>
                  {churnLoading ? '...' : `${avgChurnRate.toFixed(1)}%`}
                </div>
                {!churnLoading && (
                  <Badge variant={getChurnBadgeVariant(avgChurnRate)} className="mt-1">
                    {avgChurnRate >= 5 ? 'Above target' : 'Within target'}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Average CLV</div>
                <div className="text-2xl font-bold">
                  {clvLoading ? '...' : `$${(avgCLV / 1000).toFixed(1)}K`}
                </div>
                <div className="text-xs text-gray-500">Customer Lifetime Value</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Portfolio Growth (New vs Lost)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {growthLoading ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Loading growth data...
              </div>
            ) : growthData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No growth data available
              </div>
            ) : (
              <div className="h-64 [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip cursor={false} />
                    <Line
                      type="monotone"
                      dataKey="new_accounts"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e' }}
                      name="New Accounts"
                    />
                    <Line
                      type="monotone"
                      dataKey="lost_accounts"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444' }}
                      name="Lost Accounts"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Churn by Service Type Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Churn Rate by Service Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {churnLoading ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Loading churn data...
              </div>
            ) : churnByServiceType.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No churn data available
              </div>
            ) : (
              <div className="h-64 [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={churnByServiceType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="service_type" />
                    <YAxis />
                    <Tooltip cursor={false} />
                    <Bar dataKey="churn_rate" radius={[4, 4, 0, 0]}>
                      {churnByServiceType.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.churn_rate >= 5 ? '#ef4444' : entry.churn_rate >= 3 ? '#f59e0b' : '#22c55e'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Lifetime Value Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Customer Lifetime Value by Service Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clvLoading ? (
              <div className="py-12 text-center text-gray-500">
                Loading CLV data...
              </div>
            ) : clvData.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No CLV data available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Market</TableHead>
                    <TableHead className="text-right">Avg Monthly Revenue</TableHead>
                    <TableHead className="text-right">Avg Tenure (Mo)</TableHead>
                    <TableHead className="text-right">CLV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clvData.slice(0, 10).map((clv, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{clv.service_type}</TableCell>
                      <TableCell className="text-gray-500">{clv.market}</TableCell>
                      <TableCell className="text-right">
                        ${clv.avg_monthly_revenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {clv.avg_tenure_months.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${clv.customer_lifetime_value.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Retention by Cohort Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Retention by Cohort
            </CardTitle>
          </CardHeader>
          <CardContent>
            {retentionLoading ? (
              <div className="py-12 text-center text-gray-500">
                Loading retention data...
              </div>
            ) : retentionData.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No retention data available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cohort</TableHead>
                    <TableHead>Market</TableHead>
                    <TableHead className="text-right">Initial</TableHead>
                    <TableHead className="text-right">Retained</TableHead>
                    <TableHead className="text-right">Retention Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retentionData.slice(0, 10).map((retention, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{retention.cohort_month}</TableCell>
                      <TableCell className="text-gray-500">{retention.market}</TableCell>
                      <TableCell className="text-right">
                        {retention.initial_accounts}
                      </TableCell>
                      <TableCell className="text-right">
                        {retention.retained_accounts}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-medium ${
                          retention.retention_rate >= 85 ? 'text-green-600' :
                          retention.retention_rate >= 75 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {retention.retention_rate.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Churn Analysis Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Churn Analysis Detail
          </CardTitle>
        </CardHeader>
        <CardContent>
          {churnLoading ? (
            <div className="py-12 text-center text-gray-500">
              Loading churn analysis...
            </div>
          ) : churnData.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No churn data available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Churn Reason</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Churned Revenue</TableHead>
                  <TableHead className="text-right">Churn Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {churnData.slice(0, 15).map((churn, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{churn.period}</TableCell>
                    <TableCell className="text-gray-500">{churn.market}</TableCell>
                    <TableCell>{churn.service_type}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{churn.churn_reason}</TableCell>
                    <TableCell className="text-right">
                      ${(churn.total_revenue / 1000).toFixed(1)}K
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      ${(churn.churned_revenue / 1000).toFixed(1)}K
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getChurnBadgeVariant(churn.churn_rate)}>
                        {churn.churn_rate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
