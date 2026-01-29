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
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { TrendingUp, TrendingDown, Target, DollarSign, Calendar, AlertCircle, RefreshCw } from 'lucide-react'
import { DataSourceBadge, type DataSourceStatus } from '@/components/ui/data-source-badge'
import type {
  RevenueProjectionRecord,
  ProjectionAccuracyRecord,
  VarianceAnalysisRecord
} from '@/lib/bigquery/queries/finance'

// Empty data constants
const EMPTY_PROJECTIONS: RevenueProjectionRecord[] = []
const EMPTY_ACCURACY: ProjectionAccuracyRecord[] = []
const EMPTY_VARIANCE: VarianceAnalysisRecord[] = []

// Display types
interface ProjectionSummary {
  period: number // 30, 60, 90, 120
  projected: number
  actual: number
  variance: number
  variancePct: number
  accuracy: number
}

export default function ProjectionsPage() {
  const [projections, setProjections] = useState<RevenueProjectionRecord[]>(EMPTY_PROJECTIONS)
  const [accuracy, setAccuracy] = useState<ProjectionAccuracyRecord[]>(EMPTY_ACCURACY)
  const [variance, setVariance] = useState<VarianceAnalysisRecord[]>(EMPTY_VARIANCE)
  const [dataSource, setDataSource] = useState<DataSourceStatus>('loading')
  const [responseTime, setResponseTime] = useState<number | undefined>()
  const [dateRange, setDateRange] = useState<90 | 180 | 365>(90)

  const fetchData = useCallback(async () => {
    setDataSource('loading')
    try {
      const startTime = Date.now()
      const [projectionsRes, accuracyRes, varianceRes] = await Promise.all([
        fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'revenue-projections', filters: { daysBack: dateRange } }),
        }),
        fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'projection-accuracy', filters: { daysBack: dateRange } }),
        }),
        fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'variance-analysis', filters: { daysBack: dateRange, projectionPeriod: 30 } }),
        }),
      ])

      const [projectionsData, accuracyData, varianceData] = await Promise.all([
        projectionsRes.json(),
        accuracyRes.json(),
        varianceRes.json(),
      ])

      if (projectionsData.success) {
        setProjections(projectionsData.data || [])
      }
      if (accuracyData.success) {
        setAccuracy(accuracyData.data || [])
      }
      if (varianceData.success) {
        setVariance(varianceData.data || [])
      }

      setDataSource('bigquery')
      setResponseTime(Date.now() - startTime)
    } catch (err) {
      console.error('BigQuery fetch failed:', err)
      setProjections(EMPTY_PROJECTIONS)
      setAccuracy(EMPTY_ACCURACY)
      setVariance(EMPTY_VARIANCE)
      setDataSource('error')
    }
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate summary metrics from projections
  const summaryMetrics = useMemo(() => {
    if (projections.length === 0) {
      return {
        current30: { projected: 0, actual: 0, variance: 0, variancePct: 0 },
        current60: { projected: 0, actual: 0, variance: 0, variancePct: 0 },
        current90: { projected: 0, actual: 0, variance: 0, variancePct: 0 },
        avgAccuracy: 0,
      }
    }

    // Get most recent projection
    const latest = projections[0]

    const calc30 = {
      projected: latest.projected_revenue_30,
      actual: latest.actual_revenue,
      variance: latest.actual_revenue - latest.projected_revenue_30,
      variancePct: latest.projected_revenue_30 > 0
        ? ((latest.actual_revenue - latest.projected_revenue_30) / latest.projected_revenue_30) * 100
        : 0,
    }

    const calc60 = {
      projected: latest.projected_revenue_60,
      actual: latest.actual_revenue,
      variance: latest.actual_revenue - latest.projected_revenue_60,
      variancePct: latest.projected_revenue_60 > 0
        ? ((latest.actual_revenue - latest.projected_revenue_60) / latest.projected_revenue_60) * 100
        : 0,
    }

    const calc90 = {
      projected: latest.projected_revenue_90,
      actual: latest.actual_revenue,
      variance: latest.actual_revenue - latest.projected_revenue_90,
      variancePct: latest.projected_revenue_90 > 0
        ? ((latest.actual_revenue - latest.projected_revenue_90) / latest.projected_revenue_90) * 100
        : 0,
    }

    // Calculate average accuracy from accuracy records
    const avgAccuracy = accuracy.length > 0
      ? accuracy.reduce((sum, a) => sum + (a.avg_accuracy_pct || 0), 0) / accuracy.length
      : 0

    return {
      current30: calc30,
      current60: calc60,
      current90: calc90,
      avgAccuracy,
    }
  }, [projections, accuracy])

  // Projection trend chart data
  const trendChartData = useMemo(() => {
    return projections.slice(0, 12).reverse().map(p => ({
      date: new Date(p.projection_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      projected30: p.projected_revenue_30,
      projected60: p.projected_revenue_60,
      projected90: p.projected_revenue_90,
      actual: p.actual_revenue,
    }))
  }, [projections])

  // Accuracy metrics chart data
  const accuracyChartData = useMemo(() => {
    return accuracy.map(a => ({
      period: `${a.projection_period} days`,
      accuracy: a.avg_accuracy_pct || 0,
      variance: Math.abs(a.avg_variance_pct || 0),
    }))
  }, [accuracy])

  const getConfidenceBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">High</Badge>
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Medium</Badge>
      default: return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Low</Badge>
    }
  }

  const getVarianceBadge = (variancePct: number) => {
    if (Math.abs(variancePct) <= 5) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">On Target</Badge>
    } else if (Math.abs(variancePct) <= 10) {
      return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Slight Variance</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">High Variance</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Finance', href: '/finance' },
        { label: 'Revenue Projections' }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue Projections</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">30/60/90/120-day forward-looking revenue forecast from BCG_RTD_DB</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value) as 90 | 180 | 365)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value={90}>Last 3 Months</option>
            <option value={180}>Last 6 Months</option>
            <option value={365}>Last 12 Months</option>
          </select>
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">30-Day Projection</div>
                <div className="text-2xl font-bold">{formatCurrency(summaryMetrics.current30.projected)}</div>
                <div className={`text-xs flex items-center gap-1 ${summaryMetrics.current30.variancePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summaryMetrics.current30.variancePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {summaryMetrics.current30.variancePct >= 0 ? '+' : ''}{summaryMetrics.current30.variancePct.toFixed(1)}% vs actual
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">60-Day Projection</div>
                <div className="text-2xl font-bold">{formatCurrency(summaryMetrics.current60.projected)}</div>
                <div className={`text-xs flex items-center gap-1 ${summaryMetrics.current60.variancePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summaryMetrics.current60.variancePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {summaryMetrics.current60.variancePct >= 0 ? '+' : ''}{summaryMetrics.current60.variancePct.toFixed(1)}% vs actual
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">90-Day Projection</div>
                <div className="text-2xl font-bold">{formatCurrency(summaryMetrics.current90.projected)}</div>
                <div className={`text-xs flex items-center gap-1 ${summaryMetrics.current90.variancePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summaryMetrics.current90.variancePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {summaryMetrics.current90.variancePct >= 0 ? '+' : ''}{summaryMetrics.current90.variancePct.toFixed(1)}% vs actual
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Target className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Accuracy Score</div>
                <div className="text-2xl font-bold">{summaryMetrics.avgAccuracy.toFixed(1)}%</div>
                <div className="text-xs text-gray-500">Rolling 90-day average</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projection Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Projection vs Actual Trend
          </CardTitle>
          <CardDescription>Historical projection accuracy over time</CardDescription>
        </CardHeader>
        <CardContent>
          {trendChartData.length === 0 ? (
            <div className="h-[350px] flex items-center justify-center text-gray-500">
              No projection data available
            </div>
          ) : (
            <div className="h-[350px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload) return null
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium mb-2">{label}</p>
                          {payload.map((entry: any, i: number) => (
                            <p key={i} className="text-sm" style={{ color: entry.color }}>
                              {entry.name}: {formatCurrency(entry.value)}
                            </p>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={3} name="Actual Revenue" dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="projected30" stroke="#3b82f6" strokeWidth={2} name="30-Day Projection" strokeDasharray="5 5" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="projected60" stroke="#8b5cf6" strokeWidth={2} name="60-Day Projection" strokeDasharray="5 5" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="projected90" stroke="#f59e0b" strokeWidth={2} name="90-Day Projection" strokeDasharray="5 5" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Accuracy by Timeframe
            </CardTitle>
            <CardDescription>Projection accuracy for each timeframe</CardDescription>
          </CardHeader>
          <CardContent>
            {accuracyChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No accuracy data available
              </div>
            ) : (
              <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={accuracyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload, label }) => {
                        if (!active || !payload) return null
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                            <p className="font-medium mb-2">{label}</p>
                            {payload.map((entry: any, i: number) => (
                              <p key={i} className="text-sm" style={{ color: entry.color }}>
                                {entry.name}: {entry.value.toFixed(1)}%
                              </p>
                            ))}
                          </div>
                        )
                      }}
                    />
                    <Legend />
                    <Bar dataKey="accuracy" fill="#22c55e" name="Accuracy Score" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accuracy Details */}
        <Card>
          <CardHeader>
            <CardTitle>Accuracy Details</CardTitle>
            <CardDescription>Historical accuracy metrics by projection period</CardDescription>
          </CardHeader>
          <CardContent>
            {accuracy.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No accuracy data available</div>
            ) : (
              <div className="space-y-4">
                {accuracy.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div>
                      <div className="text-sm font-medium">{a.projection_period} Days</div>
                      <div className="text-xs text-gray-500">
                        {a.accurate_projections} of {a.total_projections} within 10%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{(a.avg_accuracy_pct || 0).toFixed(1)}%</div>
                      <div className="text-xs text-gray-500">
                        Avg variance: {Math.abs(a.avg_variance_pct || 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Variance Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Variance Analysis by Market/Region/Branch
          </CardTitle>
          <CardDescription>Top variances from 30-day projections</CardDescription>
        </CardHeader>
        <CardContent>
          {variance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No variance data available</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Projected</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-center">Variance %</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variance.slice(0, 20).map((v, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{v.market_name}</TableCell>
                    <TableCell>{v.region_name}</TableCell>
                    <TableCell className="font-mono text-sm">{v.branch_id || 'N/A'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(v.projected_revenue)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(v.actual_revenue)}</TableCell>
                    <TableCell className={`text-right font-bold ${v.variance_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {v.variance_amount >= 0 ? '+' : ''}{formatCurrency(v.variance_amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${Math.abs(v.variance_pct) <= 5 ? 'text-green-600' : Math.abs(v.variance_pct) <= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {v.variance_pct >= 0 ? '+' : ''}{v.variance_pct.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>{getConfidenceBadge(v.confidence_level)}</TableCell>
                    <TableCell>{getVarianceBadge(v.variance_pct)}</TableCell>
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
