"use client"

import { useEffect, useState, useMemo } from 'react'
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
  DollarSign, Users, Target, Clock
} from 'lucide-react'
import { generateMockYoYComparisons } from '@/lib/mock/saltiExtendedData'
import type { YoYComparison } from '@/types/salti-extended'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'

const METRIC_ICONS: Record<string, React.ReactNode> = {
  revenue: <DollarSign className="h-5 w-5" />,
  leads: <Users className="h-5 w-5" />,
  conversion_rate: <Target className="h-5 w-5" />,
  avg_deal_size: <DollarSign className="h-5 w-5" />,
  cycle_time: <Clock className="h-5 w-5" />,
  cancel_rate: <TrendingDown className="h-5 w-5" />,
}

export default function YoYTrendsPage() {
  const [comparisons, setComparisons] = useState<YoYComparison[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMarket, setSelectedMarket] = useState<string>('all')

  useEffect(() => {
    setIsLoading(true)
    const data = generateMockYoYComparisons()
    setComparisons(data)
    setIsLoading(false)
  }, [])

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      const data = generateMockYoYComparisons(`refresh-${Date.now()}`)
      setComparisons(data)
      setIsLoading(false)
    }, 500)
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

  // Generate mock monthly trend data for a line chart
  const monthlyTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentMonth = new Date().getMonth()
    return months.slice(0, currentMonth + 1).map((month, i) => {
      const baseRevenue = 50000 + Math.random() * 30000
      return {
        month,
        currentYear: Math.round(baseRevenue * (1 + 0.1 * Math.random())),
        priorYear: Math.round(baseRevenue * (1 - 0.1 * Math.random())),
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
          <Select value={selectedMarket} onValueChange={setSelectedMarket}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Market" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              <SelectItem value="northeast">Northeast</SelectItem>
              <SelectItem value="southeast">Southeast</SelectItem>
              <SelectItem value="midwest">Midwest</SelectItem>
              <SelectItem value="southwest">Southwest</SelectItem>
              <SelectItem value="west">West</SelectItem>
              <SelectItem value="central">Central</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

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
