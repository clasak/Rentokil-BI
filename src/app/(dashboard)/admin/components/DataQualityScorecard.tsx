"use client"

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Shield, TrendingUp, TrendingDown, Minus, CheckCircle,
  AlertTriangle, Target, Info, RefreshCw, ExternalLink, Bell
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { DataQualityScorecardDimension } from '@/lib/bigquery/queries/data-quality'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

const dimensionDescriptions: Record<string, string> = {
  Accuracy: 'Data correctly represents the real-world entity it describes',
  Completeness: 'All required data fields are populated',
  Consistency: 'Data values are consistent across different systems',
  Timeliness: 'Data is available within expected time frames',
  Validity: 'Data conforms to defined formats and business rules',
  Uniqueness: 'No duplicate records exist in the dataset',
}

export function DataQualityScorecard() {
  const router = useRouter()

  // Fetch dimensions from BigQuery (real data quality measurements)
  const {
    data: dimensions,
    isLoading,
    error,
    dataSource,
    refetch,
  } = useBigQueryData<DataQualityScorecardDimension[], DataQualityScorecardDimension[]>({
    queryName: 'data-quality-scorecard-dimensions',
    defaultData: [],
    transformBigQueryData: (data) => data, // Already in correct format
  })

  // Fetch period comparisons (WoW/MoM)
  const {
    data: periodComparisons,
    isLoading: comparisonsLoading,
  } = useBigQueryData<
    Array<{
      dimension: string
      current_score: number
      week_over_week_change: number
      month_over_month_change: number
      trend: 'improving' | 'stable' | 'declining'
    }>,
    Array<{
      dimension: string
      current_score: number
      week_over_week_change: number
      month_over_month_change: number
      trend: 'improving' | 'stable' | 'declining'
    }>
  >({
    queryName: 'data-quality-period-comparisons',
    defaultData: [],
    transformBigQueryData: (data) => data,
  })

  // Fetch active alerts
  const {
    data: alerts,
    isLoading: alertsLoading,
  } = useBigQueryData<
    Array<{
      dimension: string
      current_score: number
      alert_reason: string
      snapshot_date: string
    }>,
    Array<{
      dimension: string
      current_score: number
      alert_reason: string
      snapshot_date: string
    }>
  >({
    queryName: 'data-quality-alerts',
    defaultData: [],
    transformBigQueryData: (data) => data,
  })

  // Fetch 30-day trends for sparklines
  const {
    data: historicalTrends,
    isLoading: trendsLoading,
  } = useBigQueryData<
    Array<{ date: string; dimension: string; score: number; target: number; target_met: boolean }>,
    Array<{ date: string; dimension: string; score: number; target: number; target_met: boolean }>
  >({
    queryName: 'data-quality-historical-trends',
    filters: { days: 30 },
    defaultData: [],
    transformBigQueryData: (data) => data,
  })

  // Group trends by dimension for sparklines
  const trendsByDimension = historicalTrends.reduce((acc, trend) => {
    if (!acc[trend.dimension]) {
      acc[trend.dimension] = []
    }
    acc[trend.dimension].push({ date: trend.date, score: trend.score })
    return acc
  }, {} as Record<string, Array<{ date: string; score: number }>>)

  // Get comparison data for each dimension
  const getComparisonForDimension = (dimensionName: string) => {
    return periodComparisons.find((c) => c.dimension === dimensionName)
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
          <TrendingUp className="h-3 w-3" />
          <span className="text-xs font-medium">+{change.toFixed(1)}%</span>
        </div>
      )
    } else if (change < 0) {
      return (
        <div className="flex items-center gap-0.5 text-red-600 dark:text-red-400">
          <TrendingDown className="h-3 w-3" />
          <span className="text-xs font-medium">{change.toFixed(1)}%</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-0.5 text-gray-500 dark:text-gray-400">
          <Minus className="h-3 w-3" />
          <span className="text-xs font-medium">0.0%</span>
        </div>
      )
    }
  }

  const getScoreStatus = (current: number, target: number) => {
    if (current >= target) return 'met'
    if (current >= target - 5) return 'close'
    return 'below'
  }

  const getScoreColor = (current: number, target: number) => {
    const status = getScoreStatus(current, target)
    switch (status) {
      case 'met':
        return 'text-green-600 dark:text-green-400'
      case 'close':
        return 'text-amber-600 dark:text-amber-400'
      default:
        return 'text-red-600 dark:text-red-400'
    }
  }

  const getProgressColor = (current: number, target: number) => {
    const status = getScoreStatus(current, target)
    switch (status) {
      case 'met':
        return '[&>div]:bg-green-500'
      case 'close':
        return '[&>div]:bg-amber-500'
      default:
        return '[&>div]:bg-red-500'
    }
  }

  const overallScore = dimensions.length > 0
    ? dimensions.reduce((acc, d) => acc + d.currentScore, 0) / dimensions.length
    : 0
  const metCount = dimensions.filter(d => d.currentScore >= d.target).length

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Enterprise Data Quality Scorecard
          </CardTitle>
          <CardDescription>6 dimensions of data quality health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-gray-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Loading data quality metrics...
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Enterprise Data Quality Scorecard
          </CardTitle>
          <CardDescription>6 dimensions of data quality health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold">Failed to load data quality metrics</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-300 mb-3">
              {error || 'An error occurred while calculating data quality scores'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Enterprise Data Quality Scorecard
              </CardTitle>
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={dataSource === 'bigquery' ? 'default' : 'outline'}
                      className={
                        dataSource === 'bigquery'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }
                    >
                      {dataSource === 'bigquery' ? 'Live Data' : 'Loading...'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {dataSource === 'bigquery'
                        ? 'Real-time data quality measurements from BigQuery'
                        : 'Calculating data quality metrics...'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>6 dimensions of data quality health</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {overallScore.toFixed(1)}%
            </div>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mt-1">
              {metCount}/6 targets met
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Active Alerts Banner */}
        {alerts.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                  {alerts.length} Active Quality Alert{alerts.length > 1 ? 's' : ''}
                </h4>
                <div className="space-y-2">
                  {alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2 rounded"
                    >
                      <span className="font-medium">{alert.dimension}:</span> {alert.alert_reason}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <TooltipProvider delayDuration={300}>
            {dimensions.map((dimension) => {
              const comparison = getComparisonForDimension(dimension.dimension)
              const trendData = trendsByDimension[dimension.dimension] || []
              const hasAlert = alerts.some((a) => a.dimension === dimension.dimension)

              return (
                <div
                  key={dimension.dimension}
                  onClick={() => router.push(`/governance/data-quality/${dimension.dimension}`)}
                  className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border ${
                    hasAlert
                      ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                      : 'border-gray-200 dark:border-gray-700'
                  } cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-primary/50 transition-all group`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {dimension.dimension}
                      </span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm">{dimensionDescriptions[dimension.dimension]}</p>
                        </TooltipContent>
                      </Tooltip>
                      {hasAlert && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Bell className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-sm">Quality alert active</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    {getTrendIcon(dimension.trend)}
                  </div>

                  <div className="flex items-end justify-between mb-2">
                    <div className={`text-3xl font-bold ${getScoreColor(dimension.currentScore, dimension.target)}`}>
                      {dimension.currentScore}%
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Target className="h-3 w-3" />
                      {dimension.target}%
                    </div>
                  </div>

                  <Progress
                    value={dimension.currentScore}
                    className={`h-2 ${getProgressColor(dimension.currentScore, dimension.target)}`}
                  />

                  {/* 30-day sparkline */}
                  {trendData.length > 0 && (
                    <div className="mt-2 h-10 -mx-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke={
                              dimension.currentScore >= dimension.target
                                ? '#10b981'
                                : dimension.currentScore >= dimension.target - 5
                                ? '#f59e0b'
                                : '#ef4444'
                            }
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* WoW/MoM badges */}
                  {comparison && !comparisonsLoading && (
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 dark:text-gray-400">WoW:</span>
                            {getChangeIndicator(comparison.week_over_week_change)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Week-over-week change</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 dark:text-gray-400">MoM:</span>
                            {getChangeIndicator(comparison.month_over_month_change)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Month-over-month change</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-2">
                      {dimension.currentScore >= dimension.target ? (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          {dimension.topIssue}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {dimension.affectedRecords.toLocaleString()} affected records
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details
                          <ExternalLink className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}
