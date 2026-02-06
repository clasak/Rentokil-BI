"use client"

import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '@/store'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { generateForecast } from '@/lib/forecasting/exponential-smoothing'
import type { HistoricalRevenueRow } from '@/lib/bigquery/queries/forecast'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ComposedChart, Legend
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { format } from 'date-fns'
import { Target, TrendingUp, AlertTriangle, CheckCircle, Settings, RefreshCw, FileText, ExternalLink } from 'lucide-react'
import { Scenario, ForecastPoint, ForecastAssumption, BacktestResult } from '@/types'
import { DataSourceBadge } from '@/components/ui/data-source-badge'

export default function ForecastPage() {
  const { settings, setScenario } = useAppStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Explicit transform for historical revenue data with null handling
  function transformHistoricalRevenueData(bqData: HistoricalRevenueRow[]): HistoricalRevenueRow[] {
    return (bqData || []).map(row => ({
      week_ending: row.week_ending ?? '',
      total_revenue: row.total_revenue ?? 0,
      new_sales: row.new_sales ?? 0,
      renewals: row.renewals ?? 0,
      cancellations: row.cancellations ?? 0,
      net_change: row.net_change ?? 0,
    }))
  }

  // Fetch historical revenue data from BigQuery
  const {
    data: historicalData,
    isLoading,
    dataSource,
    error,
    refetch,
  } = useBigQueryData<HistoricalRevenueRow[], HistoricalRevenueRow[]>({
    queryName: 'forecast-historical-revenue',
    filters: { weeksBack: 26 },
    defaultData: [],
    transformBigQueryData: transformHistoricalRevenueData,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  // Generate forecast using exponential smoothing
  const { forecast, assumptions, backtest } = useMemo(() => {
    if (!mounted || historicalData.length === 0) {
      return { forecast: [], assumptions: [], backtest: [] }
    }

    return generateForecast(historicalData, {
      alpha: 0.3,
      horizonWeeks: 8,
      scenarioStdDevs: 1.0,
    })
  }, [historicalData, mounted])

  // Prepare chart data
  const chartData = forecast.map(point => ({
    date: format(point.date, 'MMM d'),
    base: point.base,
    upside: point.upside,
    downside: point.downside,
    actual: point.actual,
    confidenceLower: point.confidenceLower,
    confidenceUpper: point.confidenceUpper,
  }))

  // Calculate backtest metrics
  const mape = backtest.length > 0
    ? backtest.reduce((sum, b) => sum + b.errorPercent, 0) / backtest.length * 100
    : 0
  const mae = backtest.length > 0
    ? backtest.reduce((sum, b) => sum + b.error, 0) / backtest.length
    : 0

  // Forecast summary
  const currentWeekForecast = forecast.find(f => f.date > new Date() && !f.actual)
  const forecastValue = settings.scenario === 'upside' ? currentWeekForecast?.upside :
                        settings.scenario === 'downside' ? currentWeekForecast?.downside :
                        currentWeekForecast?.base

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[
          { label: 'Command Center', href: '/' },
          { label: 'Forecast' }
        ]} />
        <div>
          <h1 className="text-2xl font-bold">Forecast</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">8-week revenue forecast with scenarios</p>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Failed to Load Data</span>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {error}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{dataSource}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Query:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">forecast-historical-revenue</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open('/platform-admin', '_blank')}>
                <FileText className="h-3 w-3 mr-1.5" />
                View Logs
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Forecast' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Forecast</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">8-week revenue forecast with scenarios</p>
        </div>
        <div id="scenario-selector" className="flex items-center gap-4">
          <DataSourceBadge status={isLoading ? 'loading' : error ? 'error' : dataSource} />
          <Select value={settings.scenario} onValueChange={(v) => setScenario(v as Scenario)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Scenario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base">Base Case</SelectItem>
              <SelectItem value="upside">Upside</SelectItem>
              <SelectItem value="downside">Downside</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary to-green-600 text-white">
          <CardContent className="pt-6">
            <div className="text-sm opacity-80">8-Week Forecast ({settings.scenario})</div>
            <div className="text-3xl font-bold mt-1">
              {forecastValue ? formatCurrency(forecastValue) : '-'}
            </div>
            <div className="text-sm mt-2 opacity-80">
              Next week projection
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Confidence Band</div>
                <div className="font-bold">
                  {currentWeekForecast && (
                    <>
                      {formatCurrency(currentWeekForecast.confidenceLower)} -
                      {formatCurrency(currentWeekForecast.confidenceUpper)}
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${mape < 8 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                {mape < 8 ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                )}
              </div>
              <div>
                <div className="text-sm text-gray-500">Backtest MAPE</div>
                <div className={`text-xl font-bold ${mape < 8 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {mape.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Backtest MAE</div>
                <div className="text-xl font-bold">{formatCurrency(mae)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="forecast" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          <TabsTrigger value="backtest">Backtest</TabsTrigger>
        </TabsList>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          <Card id="forecast-chart">
            <CardHeader>
              <CardTitle>8-Week Revenue Forecast</CardTitle>
              <CardDescription>
                Showing {settings.scenario} scenario with confidence bands
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <defs>
                      <filter id="glow-forecast" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge>
                          <feMergeNode in="blur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={false} />
                    <Legend />

                    {/* Confidence Band */}
                    <Area
                      type="monotone"
                      dataKey="confidenceUpper"
                      stroke="none"
                      fill="#e0e7ff"
                      fillOpacity={0.5}
                      name="Confidence Upper"
                    />
                    <Area
                      type="monotone"
                      dataKey="confidenceLower"
                      stroke="none"
                      fill="#ffffff"
                      name="Confidence Lower"
                    />

                    {/* Scenario Lines */}
                    {settings.scenario === 'base' && (
                      <Line
                        type="monotone"
                        dataKey="base"
                        stroke="#00A651"
                        strokeWidth={2}
                        name="Base Case"
                        dot={false}
                        activeDot={{ r: 6, filter: 'url(#glow-forecast)' }}
                      />
                    )}
                    {settings.scenario === 'upside' && (
                      <Line
                        type="monotone"
                        dataKey="upside"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Upside"
                        dot={false}
                        activeDot={{ r: 6, filter: 'url(#glow-forecast)' }}
                      />
                    )}
                    {settings.scenario === 'downside' && (
                      <Line
                        type="monotone"
                        dataKey="downside"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Downside"
                        dot={false}
                        activeDot={{ r: 6, filter: 'url(#glow-forecast)' }}
                      />
                    )}

                    {/* Actual */}
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#6366f1"
                      strokeWidth={2}
                      name="Actual"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6, filter: 'url(#glow-forecast)' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Scenario Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={settings.scenario === 'downside' ? 'ring-2 ring-red-500' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="danger">Downside</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {currentWeekForecast ? formatCurrency(currentWeekForecast.downside) : '-'}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Conservative scenario with reduced close rates and higher churn
                </p>
              </CardContent>
            </Card>

            <Card className={settings.scenario === 'base' ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="default">Base</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {currentWeekForecast ? formatCurrency(currentWeekForecast.base) : '-'}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Most likely scenario based on historical averages
                </p>
              </CardContent>
            </Card>

            <Card className={settings.scenario === 'upside' ? 'ring-2 ring-green-500' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="success">Upside</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {currentWeekForecast ? formatCurrency(currentWeekForecast.upside) : '-'}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Optimistic scenario with improved conversion and retention
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assumptions Tab */}
        <TabsContent value="assumptions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Forecast Assumptions
              </CardTitle>
              <CardDescription>
                Key inputs driving the forecast model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assumption</TableHead>
                    <TableHead className="text-right">Base Value</TableHead>
                    <TableHead className="text-right">Upside</TableHead>
                    <TableHead className="text-right">Downside</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assumptions.map((assumption, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{assumption.name}</TableCell>
                      <TableCell className="text-right">
                        {assumption.unit === '%' ? formatPercent(assumption.baseValue) :
                         assumption.unit === '$' ? formatCurrency(assumption.baseValue) :
                         assumption.baseValue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {assumption.unit === '%' ? formatPercent(assumption.upsideValue) :
                         assumption.unit === '$' ? formatCurrency(assumption.upsideValue) :
                         assumption.upsideValue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {assumption.unit === '%' ? formatPercent(assumption.downsideValue) :
                         assumption.unit === '$' ? formatCurrency(assumption.downsideValue) :
                         assumption.downsideValue.toFixed(2)}
                      </TableCell>
                      <TableCell>{assumption.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backtest Tab */}
        <TabsContent value="backtest" className="space-y-6">
          <div id="backtest-results" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-sm text-gray-500">Mean Absolute Percentage Error (MAPE)</div>
                  <div className={`text-4xl font-bold mt-2 ${mape < 8 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {mape.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    Target: &lt; 8%
                  </div>
                  <Badge variant={mape < 8 ? 'success' : 'warning'} className="mt-2">
                    {mape < 8 ? 'Within Target' : 'Above Target'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-sm text-gray-500">Mean Absolute Error (MAE)</div>
                  <div className="text-4xl font-bold mt-2">
                    {formatCurrency(mae)}
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    Average forecast error per week
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Backtest Results (Last 12 Weeks)</CardTitle>
              <CardDescription>
                Comparing predicted vs actual revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week Ending</TableHead>
                    <TableHead className="text-right">Predicted</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Error</TableHead>
                    <TableHead className="text-right">Error %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backtest.map((result, i) => (
                    <TableRow key={i}>
                      <TableCell>{format(result.weekEnding, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">{formatCurrency(result.predicted)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(result.actual)}</TableCell>
                      <TableCell className="text-right">
                        <span className={result.error > mae * 1.5 ? 'text-red-600' : ''}>
                          {formatCurrency(result.error)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={result.errorPercent * 100 > 10 ? 'text-red-600' : 'text-green-600'}>
                          {(result.errorPercent * 100).toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
