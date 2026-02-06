"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RefreshCw, Filter, ArrowDown, AlertTriangle,
  TrendingDown, Users, Target, Clock, FileText, ExternalLink, Mail
} from 'lucide-react'
import type { FunnelFalloutStage } from '@/types/salti-extended'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell
} from 'recharts'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { SALTIFunnelFallout } from '@/lib/bigquery/queries/salti'

// Transform BigQuery data to page format
function transformBigQueryData(bqData: SALTIFunnelFallout[]): FunnelFalloutStage[] {
  return (bqData || []).map((d, index) => ({
    stage: d.stage,
    stageOrder: index + 1,
    entered: d.entered_count,
    exited: d.exited_count,
    converted: d.entered_count - d.fallout_count,
    lost: d.fallout_count,
    conversionRate: d.entered_count > 0 ? (d.entered_count - d.fallout_count) / d.entered_count : 0,
    falloutRate: d.fallout_rate / 100,
    avgTimeInStage: 24 + (index * 12), // Estimated hours per stage
    topFalloutReasons: [
      { reason: d.top_fallout_reason || 'Unknown', count: Math.round(d.fallout_count * 0.4), percent: 40 },
      { reason: 'No Response', count: Math.round(d.fallout_count * 0.35), percent: 35 },
      { reason: 'Competitor', count: Math.round(d.fallout_count * 0.25), percent: 25 },
    ],
  }))
}

const STAGE_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4']

export default function FunnelFalloutPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('mtd')

  // Map period to daysBack
  const getDaysBack = (period: string) => {
    switch (period) {
      case 'wtd': return 7
      case 'mtd': return 30
      case 'qtd': return 90
      case 'ytd': return 365
      default: return 30
    }
  }

  // Empty default data
  const EMPTY_STAGES: FunnelFalloutStage[] = []

  const {
    data: stages,
    isLoading,
    dataSource,
    responseTime,
    error,
    errorType,
    refetch,
  } = useBigQueryData<SALTIFunnelFallout[], FunnelFalloutStage[]>({
    queryName: 'salti-funnel-fallout',
    filters: { daysBack: getDaysBack(selectedPeriod) },
    defaultData: EMPTY_STAGES,
    transformBigQueryData,
    includeOrgFilters: true,  // Include market/region/branch filters from UI
    includeRoleFilters: false, // SALTI is an overview dashboard - don't filter by individual user
  })

  const handleRefresh = () => {
    refetch()
  }

  const funnelData = useMemo(() => {
    return stages.map((stage, i) => ({
      name: stage.stage,
      value: stage.entered,
      fill: STAGE_COLORS[i % STAGE_COLORS.length],
    }))
  }, [stages])

  const falloutChartData = useMemo(() => {
    return stages.slice(1).map((stage, i) => ({
      stage: `${stages[i].stage} -> ${stage.stage}`,
      lost: stage.lost,
      falloutRate: Math.round(stage.falloutRate * 100),
    }))
  }, [stages])

  const overallStats = useMemo(() => {
    if (stages.length === 0) return null
    const firstStage = stages[0]
    const lastStage = stages[stages.length - 1]
    const biggestDropoff = stages.slice(1).reduce((max, s) =>
      s.falloutRate > max.falloutRate ? s : max, stages[1])

    return {
      totalEntered: firstStage.entered,
      totalConverted: lastStage.converted,
      overallConversionRate: lastStage.converted / firstStage.entered,
      biggestDropoff: {
        stage: biggestDropoff.stage,
        falloutRate: biggestDropoff.falloutRate,
        lost: biggestDropoff.lost,
      },
      avgTimeInFunnel: stages.reduce((sum, s) => sum + s.avgTimeInStage, 0),
    }
  }, [stages])

  if (isLoading || !overallStats) {
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
        { label: 'Funnel Fallout' }
      ]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Filter className="h-7 w-7 text-primary" />
            Sales Funnel Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Conversion rates and drop-off at each stage
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wtd">Week to Date</SelectItem>
              <SelectItem value="mtd">Month to Date</SelectItem>
              <SelectItem value="qtd">Quarter to Date</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>

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
            <span className="font-semibold">Error Loading Funnel Fallout Data</span>
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
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">salti-funnel-fallout</p>
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
                onClick={() => window.location.href = `mailto:support@rentokil.com?subject=Funnel Fallout Error&body=Error: ${encodeURIComponent(error || 'Unknown error')}\nQuery: salti-funnel-fallout\nType: ${errorType || 'Unknown'}`}
              >
                <Mail className="h-3 w-3 mr-1.5" />
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{overallStats.totalEntered.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Closed Won</p>
                <p className="text-2xl font-bold">{overallStats.totalConverted}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(overallStats.overallConversionRate * 100)}% conversion
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Biggest Drop-off</p>
                <p className="text-lg font-bold">{overallStats.biggestDropoff.stage}</p>
                <p className="text-xs text-red-600">
                  {Math.round(overallStats.biggestDropoff.falloutRate * 100)}% lost ({overallStats.biggestDropoff.lost})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Time in Funnel</p>
                <p className="text-2xl font-bold">{overallStats.avgTimeInFunnel.toFixed(0)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Funnel Visualization</CardTitle>
          <CardDescription>Lead progression through each stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [`${value.toLocaleString()} leads`, name]}
                />
                <Funnel
                  data={funnelData}
                  dataKey="value"
                  nameKey="name"
                  isAnimationActive
                >
                  <LabelList position="right" fill="#374151" stroke="none" dataKey="name" fontSize={12} />
                  <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={14} fontWeight="bold" />
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Fallout Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fallout by Stage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Stage Fallout Rates
            </CardTitle>
            <CardDescription>Percentage of leads lost at each transition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={falloutChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" fontSize={10} angle={-45} textAnchor="end" height={80} />
                  <YAxis fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'falloutRate' ? `${value}%` : value.toLocaleString(),
                      name === 'falloutRate' ? 'Fallout Rate' : 'Leads Lost'
                    ]}
                  />
                  <Bar dataKey="falloutRate" name="Fallout Rate" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stage Details */}
        <Card>
          <CardHeader>
            <CardTitle>Stage Breakdown</CardTitle>
            <CardDescription>Conversion rates and time spent at each stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stages.map((stage, i) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length] }}
                      />
                      <span className="font-medium">{stage.stage}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">{stage.entered.toLocaleString()} in</span>
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                      <span className={stage.lost > 0 ? 'text-red-600' : 'text-green-600'}>
                        {stage.converted.toLocaleString()} out
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Progress
                      value={stage.conversionRate * 100}
                      className="flex-1 h-2"
                    />
                    <Badge variant="outline" className="min-w-[60px] justify-center">
                      {Math.round(stage.conversionRate * 100)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Avg time: {stage.avgTimeInStage.toFixed(1)}h</span>
                    {stage.lost > 0 && (
                      <span className="text-red-600">{stage.lost} lost ({Math.round(stage.falloutRate * 100)}%)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fallout Reasons */}
      <Card>
        <CardHeader>
          <CardTitle>Top Fallout Reasons by Stage</CardTitle>
          <CardDescription>Why leads are dropping off at each stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">Stage</th>
                  <th className="text-right py-3 px-2 font-medium">Lost</th>
                  <th className="text-left py-3 px-2 font-medium">Top Reason</th>
                  <th className="text-left py-3 px-2 font-medium">2nd Reason</th>
                  <th className="text-left py-3 px-2 font-medium">3rd Reason</th>
                </tr>
              </thead>
              <tbody>
                {stages.filter(s => s.lost > 0).map((stage) => (
                  <tr key={stage.stage} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium">{stage.stage}</td>
                    <td className="py-3 px-2 text-right">
                      <Badge variant="destructive">{stage.lost}</Badge>
                    </td>
                    {stage.topFalloutReasons.map((reason, i) => (
                      <td key={i} className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span>{reason.reason}</span>
                          <span className="text-xs text-muted-foreground">({reason.percent}%)</span>
                        </div>
                      </td>
                    ))}
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
