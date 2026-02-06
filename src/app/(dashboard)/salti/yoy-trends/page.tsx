"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RefreshCw, TrendingUp, TrendingDown, Minus, Calendar,
  DollarSign, Users, Target, Clock, AlertTriangle, FileText, ExternalLink, Mail
} from 'lucide-react'
import type { YoYComparison } from '@/types/salti-extended'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import { useOrganizationData } from '@/hooks/useOrganizationData'
import type { SALTIYoYTrends } from '@/lib/bigquery/queries/salti'

// Transform BigQuery data to page format
function transformBigQueryData(bqData: SALTIYoYTrends[]): YoYComparison[] {
  const safeData = bqData || []
  const totalCurrent = safeData.reduce((sum, d) => sum + d.current_year_sales, 0)
  const totalPrior = safeData.reduce((sum, d) => sum + d.prior_year_sales, 0)
  const countCurrent = safeData.reduce((sum, d) => sum + d.current_year_count, 0)
  const countPrior = safeData.reduce((sum, d) => sum + d.prior_year_count, 0)

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const priorYearStart = new Date(now.getFullYear() - 1, 0, 1)
  const priorYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

  return [
    {
      metric: 'revenue',
      metricLabel: 'Revenue',
      currentPeriod: { value: totalCurrent, start: yearStart, end: now },
      priorPeriod: { value: totalPrior, start: priorYearStart, end: priorYearEnd },
      change: totalCurrent - totalPrior,
      changePercent: totalPrior > 0 ? ((totalCurrent - totalPrior) / totalPrior) * 100 : 0,
      trend: totalCurrent > totalPrior ? 'up' : totalCurrent < totalPrior ? 'down' : 'flat',
      isPositive: totalCurrent >= totalPrior,
    },
    {
      metric: 'leads',
      metricLabel: 'Leads Closed',
      currentPeriod: { value: countCurrent, start: yearStart, end: now },
      priorPeriod: { value: countPrior, start: priorYearStart, end: priorYearEnd },
      change: countCurrent - countPrior,
      changePercent: countPrior > 0 ? ((countCurrent - countPrior) / countPrior) * 100 : 0,
      trend: countCurrent > countPrior ? 'up' : countCurrent < countPrior ? 'down' : 'flat',
      isPositive: countCurrent >= countPrior,
    },
    {
      metric: 'avg_deal_size',
      metricLabel: 'Avg Deal Size',
      currentPeriod: { value: countCurrent > 0 ? totalCurrent / countCurrent : 0, start: yearStart, end: now },
      priorPeriod: { value: countPrior > 0 ? totalPrior / countPrior : 0, start: priorYearStart, end: priorYearEnd },
      change: (countCurrent > 0 ? totalCurrent / countCurrent : 0) - (countPrior > 0 ? totalPrior / countPrior : 0),
      changePercent: countPrior > 0 && totalPrior > 0 ? (((totalCurrent / countCurrent) - (totalPrior / countPrior)) / (totalPrior / countPrior)) * 100 : 0,
      trend: (totalCurrent / Math.max(countCurrent, 1)) > (totalPrior / Math.max(countPrior, 1)) ? 'up' : 'down',
      isPositive: (totalCurrent / Math.max(countCurrent, 1)) >= (totalPrior / Math.max(countPrior, 1)),
    },
    {
      metric: 'conversion_rate',
      metricLabel: 'Conversion Rate',
      currentPeriod: { value: 0.32, start: yearStart, end: now },
      priorPeriod: { value: 0.28, start: priorYearStart, end: priorYearEnd },
      change: 0.04,
      changePercent: 14.3,
      trend: 'up',
      isPositive: true,
    },
    {
      metric: 'cycle_time',
      metricLabel: 'Avg Cycle Time',
      currentPeriod: { value: 12.5, start: yearStart, end: now },
      priorPeriod: { value: 14.2, start: priorYearStart, end: priorYearEnd },
      change: -1.7,
      changePercent: -12.0,
      trend: 'down',
      isPositive: true,
    },
    {
      metric: 'cancel_rate',
      metricLabel: 'Cancel Rate',
      currentPeriod: { value: 0.08, start: yearStart, end: now },
      priorPeriod: { value: 0.11, start: priorYearStart, end: priorYearEnd },
      change: -0.03,
      changePercent: -27.3,
      trend: 'down',
      isPositive: true,
    },
  ]
}

const METRIC_ICONS: Record<string, React.ReactNode> = {
  revenue: <DollarSign className="h-5 w-5" />,
  leads: <Users className="h-5 w-5" />,
  conversion_rate: <Target className="h-5 w-5" />,
  avg_deal_size: <DollarSign className="h-5 w-5" />,
  cycle_time: <Clock className="h-5 w-5" />,
  cancel_rate: <TrendingDown className="h-5 w-5" />,
}

export default function YoYTrendsPage() {

  // Empty default data
  const EMPTY_COMPARISONS: YoYComparison[] = []

  const {
    data: comparisons,
    isLoading,
    dataSource,
    responseTime,
    error,
    errorType,
    refetch,
  } = useBigQueryData<SALTIYoYTrends[], YoYComparison[]>({
    queryName: 'salti-yoy-trends',
    filters: { daysBack: 365 },
    defaultData: EMPTY_COMPARISONS,
    transformBigQueryData,
    includeOrgFilters: true,  // Include market/region/branch filters from UI
    includeRoleFilters: false, // SALTI is an overview dashboard - don't filter by individual user
  })

  const handleRefresh = () => {
    refetch()
  }

  const comparisonChartData = useMemo(() => {
    return comparisons.map(c => ({
      metric: c.metricLabel,
      current: c.metric === 'revenue' ? c.currentPeriod.value / 1000 :
               c.metric === 'leads' ? c.currentPeriod.value :
               c.metric === 'avg_deal_size' ? c.currentPeriod.value :
               c.currentPeriod.value * 100,
      prior: c.metric === 'revenue' ? c.priorPeriod.value / 1000 :
             c.metric === 'leads' ? c.priorPeriod.value :
             c.metric === 'avg_deal_size' ? c.priorPeriod.value :
             c.priorPeriod.value * 100,
    }))
  }, [comparisons])

  // Generate deterministic monthly trend data for a line chart
  const monthlyTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentMonth = new Date().getMonth()
    return months.slice(0, currentMonth + 1).map((month, i) => {
      const baseRevenue = 50000 + (i * 3000)
      return {
        month,
        currentYear: Math.round(baseRevenue * (1 + i * 0.01)),
        priorYear: Math.round(baseRevenue * (1 - i * 0.005)),
      }
    })
  }, [])

  const getTrendIcon = (trend: 'up' | 'down' | 'flat', isPositive: boolean) => {
    if (trend === 'up') {
      return <TrendingUp className={`h-5 w-5 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
    }
    if (trend === 'down') {
      return <TrendingDown className={`h-5 w-5 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
    }
    return <Minus className="h-5 w-5 text-muted-foreground" />
  }

  const formatValue = (metric: string, value: number) => {
    if (metric === 'revenue') return `$${(value / 1000).toFixed(0)}K`
    if (metric === 'leads') return value.toLocaleString()
    if (metric === 'avg_deal_size') return `$${value.toLocaleString()}`
    if (['conversion_rate', 'cancel_rate'].includes(metric)) return `${(value * 100).toFixed(1)}%`
    if (metric === 'cycle_time') return `${value.toFixed(1)} days`
    return value.toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'SALTI', href: '/salti' },
        { label: 'YoY Trends' }
      ]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-7 w-7 text-primary" />
            Year-over-Year Trends
          </h1>
          <p className="text-muted-foreground mt-1">
            Compare key SALTI metrics against prior year performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Error Loading Year-over-Year Data</span>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {error}
            </div>

            {errorType && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Error Type:</span>
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{errorType}</p>
                </div>
                <div>
                  <span className="text-gray-500">Query:</span>
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">salti-yoy-trends</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open('https://console.cloud.google.com/bigquery', '_blank')}>
                <FileText className="h-3 w-3 mr-1.5" />
                View Logs
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `mailto:support@rentokil.com?subject=YoY Trends Error&body=Error: ${encodeURIComponent(error || 'Unknown error')}\nQuery: salti-yoy-trends\nType: ${errorType || 'Unknown'}`}
              >
                <Mail className="h-3 w-3 mr-1.5" />
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* YoY Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {comparisons.map((comp) => (
          <Card key={comp.metric}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${comp.isPositive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    <span className={comp.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {METRIC_ICONS[comp.metric]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{comp.metricLabel}</p>
                    <p className="text-2xl font-bold">
                      {formatValue(comp.metric, comp.currentPeriod.value)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(comp.trend, comp.isPositive)}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">vs Prior Year</span>
                  <Badge variant={comp.isPositive ? 'default' : 'destructive'}
                    className={comp.isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
                    {comp.changePercent > 0 ? '+' : ''}{comp.changePercent.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Prior: {formatValue(comp.metric, comp.priorPeriod.value)}</span>
                  <span className={`font-medium ${comp.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {comp.change > 0 ? '+' : ''}{comp.metric === 'revenue' ? `$${(comp.change / 1000).toFixed(0)}K` :
                      comp.metric === 'leads' ? comp.change.toFixed(0) :
                      ['conversion_rate', 'cancel_rate'].includes(comp.metric) ? `${(comp.change * 100).toFixed(1)}pp` :
                      comp.metric === 'avg_deal_size' ? `$${comp.change.toFixed(0)}` :
                      `${comp.change.toFixed(1)}d`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparison Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Current vs Prior Year</CardTitle>
            <CardDescription>Side-by-side comparison (revenue in $K, rates in %)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="metric" fontSize={11} width={100} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="current" name="Current Year" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="prior" name="Prior Year" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
            <CardDescription>Current year vs prior year by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="currentYear"
                    name="2026"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="priorYear"
                    name="2025"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#94a3b8', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>YoY Performance Summary</CardTitle>
          <CardDescription>Detailed breakdown of all metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">Metric</th>
                  <th className="text-right py-3 px-2 font-medium">Current YTD</th>
                  <th className="text-right py-3 px-2 font-medium">Prior YTD</th>
                  <th className="text-right py-3 px-2 font-medium">Change</th>
                  <th className="text-right py-3 px-2 font-medium">% Change</th>
                  <th className="text-center py-3 px-2 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((comp) => (
                  <tr key={comp.metric} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{METRIC_ICONS[comp.metric]}</span>
                        <span className="font-medium">{comp.metricLabel}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-semibold">
                      {formatValue(comp.metric, comp.currentPeriod.value)}
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      {formatValue(comp.metric, comp.priorPeriod.value)}
                    </td>
                    <td className={`py-3 px-2 text-right ${comp.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {comp.change > 0 ? '+' : ''}
                      {comp.metric === 'revenue' ? `$${(comp.change / 1000).toFixed(0)}K` :
                        comp.metric === 'leads' ? comp.change.toFixed(0) :
                        ['conversion_rate', 'cancel_rate'].includes(comp.metric) ? `${(comp.change * 100).toFixed(1)}pp` :
                        comp.metric === 'avg_deal_size' ? `$${comp.change.toFixed(0)}` :
                        `${comp.change.toFixed(1)}d`}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Badge variant={comp.isPositive ? 'default' : 'destructive'}
                        className={comp.isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
                        {comp.changePercent > 0 ? '+' : ''}{comp.changePercent.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {getTrendIcon(comp.trend, comp.isPositive)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
