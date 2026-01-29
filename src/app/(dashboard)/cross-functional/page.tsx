'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import {
  Layers,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
  Building,
  Briefcase,
  Headphones,
  PieChart,
  MapPin,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import { GlobalOrganizationFilter } from '@/components/layout/GlobalOrganizationFilter'
import { useAppStore } from '@/store'
import type {
  CrossFunctionalKPI,
  DepartmentHealth,
  CrossFunctionalTrend,
  CrossFunctionalSummary,
  MarketBreakdown,
} from '@/lib/bigquery/queries/cross-functional'

// Department icon mapping
const departmentIcons: Record<string, React.ReactNode> = {
  Sales: <Briefcase className="h-5 w-5" />,
  Operations: <Activity className="h-5 w-5" />,
  Finance: <DollarSign className="h-5 w-5" />,
  'Customer Service': <Headphones className="h-5 w-5" />,
  HR: <Users className="h-5 w-5" />,
}

const departmentColors: Record<string, string> = {
  Sales: 'bg-blue-500',
  Operations: 'bg-green-500',
  Finance: 'bg-amber-500',
  'Customer Service': 'bg-purple-500',
  HR: 'bg-pink-500',
}

// Default empty data structures
const defaultSummaryData: CrossFunctionalSummary = {
  kpis: [],
  departments: [],
  trends: [],
  overall_health: 0,
}

const defaultMarketData: MarketBreakdown[] = []

// Transform BigQuery response to match expected format
function transformSummary(raw: CrossFunctionalSummary): CrossFunctionalSummary {
  return {
    kpis: raw.kpis || [],
    departments: raw.departments || [],
    trends: raw.trends || [],
    overall_health: raw.overall_health || 0,
  }
}

function transformMarkets(raw: MarketBreakdown[]): MarketBreakdown[] {
  if (!Array.isArray(raw)) return []
  return raw.map(m => ({
    ...m,
    trend: (m.trend || 'stable') as 'up' | 'down' | 'stable',
  }))
}

function formatValue(value: number, format: 'currency' | 'percent' | 'number'): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value)
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'number':
      return value.toLocaleString()
    default:
      return String(value)
  }
}

export default function CrossFunctionalPage() {
  const [mounted, setMounted] = useState(false)
  const { organizationFilters } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Build filters based on selected organization
  const filters = mounted ? {
    market: organizationFilters.selectedMarket || undefined,
    region: organizationFilters.selectedRegion || undefined,
  } : {}

  // Fetch cross-functional summary from BigQuery
  const {
    data: summaryData,
    isLoading: summaryLoading,
    dataSource,
    error: summaryError,
    refetch: refetchSummary,
  } = useBigQueryData<CrossFunctionalSummary, CrossFunctionalSummary>({
    queryName: 'cross-functional-summary',
    filters,
    transformBigQueryData: transformSummary,
    defaultData: defaultSummaryData,
  })

  // Fetch market breakdown
  const {
    data: marketData,
    isLoading: marketLoading,
    error: marketError,
  } = useBigQueryData<MarketBreakdown[], MarketBreakdown[]>({
    queryName: 'cross-functional-by-market',
    filters: { daysBack: 30 },
    transformBigQueryData: transformMarkets,
    defaultData: defaultMarketData,
  })

  const { kpis, departments, trends, overall_health } = summaryData
  const isLoading = summaryLoading || marketLoading
  const error = summaryError || marketError

  // Show filter description
  const getFilterDescription = () => {
    if (!mounted) return 'All Markets'
    if (organizationFilters.selectedRegion) return `Region: ${organizationFilters.selectedRegion}`
    if (organizationFilters.selectedMarket) return `Market: ${organizationFilters.selectedMarket}`
    return 'All Markets (National)'
  }

  if (!mounted) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Layers className="h-7 w-7 text-rentokil-red" />
            Cross-Functional Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            KPIs spanning multiple departments with unified visibility - {getFilterDescription()}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <GlobalOrganizationFilter compact showBranch={false} />
          <div className="flex items-center gap-2">
            <DataSourceBadge status={dataSource} />
            <Badge variant={overall_health >= 80 ? 'success' : overall_health >= 70 ? 'warning' : 'danger'}>
              Health: {overall_health}%
            </Badge>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Error loading data: {error}</span>
              <button
                onClick={refetchSummary}
                className="ml-4 text-sm underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      )}

      {/* Cross-Functional KPI Cards */}
      {!isLoading && kpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map(kpi => {
            const progressPercent = kpi.target > 0 ? (kpi.value / kpi.target) * 100 : 0
            const isOnTarget = kpi.value >= kpi.target

            return (
              <Card key={kpi.id} className={kpi.status === 'critical' ? 'border-red-200 dark:border-red-800' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {kpi.name}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {formatValue(kpi.value, kpi.format)}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${
                      kpi.trend === 'up' ? 'text-green-600' :
                      kpi.trend === 'down' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                      {kpi.trend === 'up' ? <TrendingUp className="h-4 w-4" /> :
                       kpi.trend === 'down' ? <TrendingDown className="h-4 w-4" /> :
                       <Activity className="h-4 w-4" />}
                      {kpi.trend_value > 0 ? '+' : ''}{kpi.trend_value || 0}%
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">vs Target: {formatValue(kpi.target, kpi.format)}</span>
                      <span className={isOnTarget ? 'text-green-600' : 'text-orange-600'}>
                        {isOnTarget ? 'On Track' : `${Math.abs(100 - progressPercent).toFixed(1)}% gap`}
                      </span>
                    </div>
                    <Progress value={Math.min(progressPercent, 100)} className="h-2" />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {kpi.departments.map(dept => (
                      <Badge key={dept} variant="secondary" className="text-xs">
                        {dept}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {kpi.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* No Data State */}
      {!isLoading && kpis.length === 0 && !error && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            <p>No KPI data available. Check BigQuery connection.</p>
          </CardContent>
        </Card>
      )}

      {/* Market Breakdown Table */}
      {!isLoading && marketData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Performance by Market
            </CardTitle>
            <CardDescription>
              Cross-functional KPIs broken down by market
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                  <TableHead className="text-right">New Customers</TableHead>
                  <TableHead className="text-right">Efficiency</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketData.slice(0, 10).map(market => (
                  <TableRow key={market.market_code}>
                    <TableCell className="font-medium">{market.market_name || market.market_code}</TableCell>
                    <TableCell className="text-right">{formatCurrency(market.revenue)}</TableCell>
                    <TableCell className="text-right">{market.revenue_pct?.toFixed(1) || 0}%</TableCell>
                    <TableCell className="text-right">{market.new_customers?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-right">{market.efficiency?.toFixed(1) || 0}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={market.overall_score >= 80 ? 'success' : market.overall_score >= 60 ? 'warning' : 'danger'}>
                        {market.overall_score || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {market.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-600 mx-auto" />
                      ) : market.trend === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-red-600 mx-auto" />
                      ) : (
                        <Activity className="h-4 w-4 text-gray-400 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Market Revenue Chart */}
      {!isLoading && marketData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Market</CardTitle>
            <CardDescription>Top markets by revenue contribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marketData.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="market_code" width={80} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload[0]) return null
                      const data = payload[0].payload as MarketBreakdown
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-semibold">{data.market_name || data.market_code}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Revenue: {formatCurrency(data.revenue)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Efficiency: {data.efficiency?.toFixed(1)}%
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            New Customers: {data.new_customers?.toLocaleString()}
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="revenue" fill="#dc2626" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Department Health Summary */}
      {!isLoading && departments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Department Health Summary
            </CardTitle>
            <CardDescription>
              KPI performance by department with status breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {departments.map(dept => (
                <div
                  key={dept.name}
                  className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-2 rounded-lg ${departmentColors[dept.name] || 'bg-gray-500'} text-white`}>
                      {departmentIcons[dept.name] || <Activity className="h-5 w-5" />}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {dept.name}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Health Score</span>
                      <span className={`text-lg font-bold ${
                        dept.score >= 80 ? 'text-green-600' :
                        dept.score >= 70 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {dept.score}%
                      </span>
                    </div>
                    <Progress value={dept.score} className="h-2" />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs">
                    <div className="p-1 rounded bg-green-100 dark:bg-green-900/30">
                      <div className="font-bold text-green-600">{dept.on_track}</div>
                      <div className="text-green-700 dark:text-green-400">On Track</div>
                    </div>
                    <div className="p-1 rounded bg-yellow-100 dark:bg-yellow-900/30">
                      <div className="font-bold text-yellow-600">{dept.at_risk}</div>
                      <div className="text-yellow-700 dark:text-yellow-400">At Risk</div>
                    </div>
                    <div className="p-1 rounded bg-red-100 dark:bg-red-900/30">
                      <div className="font-bold text-red-600">{dept.critical}</div>
                      <div className="text-red-700 dark:text-red-400">Critical</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cross-Department Trends Chart */}
      {!isLoading && trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Cross-Department Trends
            </CardTitle>
            <CardDescription>
              6-month trend of key cross-functional metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" tickFormatter={(v) => `${v}%`} domain={[70, 100]} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload) return null
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-semibold mb-2">{label}</p>
                          {payload.map((entry, i) => (
                            <p key={i} style={{ color: entry.color }} className="text-sm">
                              {entry.name}: {entry.name === 'Revenue'
                                ? formatCurrency(entry.value as number)
                                : `${(entry.value as number).toFixed(1)}%`
                              }
                            </p>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Revenue"
                    dot={{ fill: '#22c55e' }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="satisfaction"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Satisfaction"
                    dot={{ fill: '#3b82f6' }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="efficiency"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Efficiency"
                    dot={{ fill: '#f59e0b' }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="retention"
                    stroke="#ec4899"
                    strokeWidth={2}
                    name="Retention"
                    dot={{ fill: '#ec4899' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/sales">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Briefcase className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="font-medium">Sales Dashboard</div>
              <div className="text-sm text-gray-500">Pipeline and wins</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/ops">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="font-medium">Operations Dashboard</div>
              <div className="text-sm text-gray-500">Service metrics</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/finance">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <div className="font-medium">Finance Dashboard</div>
              <div className="text-sm text-gray-500">Revenue and AR</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/lead-service-engine">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-rentokil-red/30">
            <CardContent className="pt-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-rentokil-red" />
              <div className="font-medium">Lead Service Engine</div>
              <div className="text-sm text-gray-500">Lead tracking</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
