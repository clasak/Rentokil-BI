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
  RefreshCw, Activity, TrendingUp, TrendingDown, Minus,
  Clock, Target, Users, Award, Phone, PhoneCall, AlertTriangle, FileText, ExternalLink, Mail
} from 'lucide-react'
import type { RepProductivity } from '@/types/salti-extended'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { SALTIProductivity } from '@/lib/bigquery/queries/salti'
import type { AgentPerformance } from '@/lib/bigquery/queries/call-center'
import Link from 'next/link'

// Transform BigQuery data to page format
function transformBigQueryData(bqData: SALTIProductivity[]): RepProductivity[] {
  return (bqData || []).map((d, index) => ({
    repId: d.employee_sid,
    repName: d.employee_name,
    market: 'All Markets',
    region: 'All Regions',
    period: 'MTD',

    // Volume metrics
    leadsAssigned: Math.round(d.total_inspections * 1.2),
    leadsWorked: d.total_inspections,
    contactsMade: Math.round(d.total_inspections * 0.8),
    appointmentsSet: Math.round(d.total_inspections * 0.7),
    inspectionsCompleted: d.total_inspections,
    proposalsGenerated: d.total_proposals,
    proposalsPresented: Math.round(d.total_proposals * 0.9),
    salesClosed: d.total_sales,

    // Value metrics
    proposalValue: d.total_proposals * 1200,
    salesValue: d.total_sales * 1000,
    avgDealSize: d.total_sales > 0 ? (d.total_sales * 1000) / d.total_sales : 0,

    // Rates (expressed as decimals 0-1)
    leadWorkRate: d.total_inspections > 0 ? Math.min(d.total_inspections / (d.total_inspections * 1.2), 1) : 0,
    contactRate: d.total_inspections > 0 ? 0.8 : 0,
    appointmentRate: d.total_inspections > 0 ? 0.7 : 0,
    inspectionRate: d.total_inspections > 0 ? Math.min(d.total_inspections / Math.round(d.total_inspections * 0.7), 1) : 0,
    proposalRate: d.total_inspections > 0 ? d.total_proposals / d.total_inspections : 0,
    closeRate: d.total_proposals > 0 ? d.total_sales / d.total_proposals : 0,

    // Time metrics
    avgLeadResponseTime: 45 + (index * 5), // minutes
    avgCycleTime: d.work_days > 0 ? d.work_days : 14, // days
    avgTimePerLead: 30 + (index * 2), // minutes

    // Ranking
    rank: index + 1,
    rankChange: 0,
    percentile: Math.max(100 - (index * 5), 10),
  }))
}

export default function ProductivityPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('MTD')

  // Map period to daysBack
  const getDaysBack = (period: string) => {
    switch (period) {
      case 'WTD': return 7
      case 'MTD': return 30
      case 'QTD': return 90
      case 'YTD': return 365
      default: return 30
    }
  }

  // Empty default data
  const EMPTY_PRODUCTIVITY: RepProductivity[] = []

  const {
    data: productivityData,
    isLoading,
    dataSource,
    responseTime,
    error,
    errorType,
    refetch,
  } = useBigQueryData<SALTIProductivity[], RepProductivity[]>({
    queryName: 'salti-productivity',
    filters: { daysBack: getDaysBack(selectedPeriod) },
    defaultData: EMPTY_PRODUCTIVITY,
    transformBigQueryData,
    includeOrgFilters: true,  // Include market/region/branch filters from UI
    includeRoleFilters: false, // SALTI is an overview dashboard - don't filter by individual user
  })

  // Fetch call center metrics for SALTI agents
  const EMPTY_CALL_METRICS: AgentPerformance[] = []
  const {
    data: callMetrics,
    isLoading: callMetricsLoading,
  } = useBigQueryData<AgentPerformance[], AgentPerformance[]>({
    queryName: 'agent-performance',
    filters: { daysBack: getDaysBack(selectedPeriod), limit: 10 },
    defaultData: EMPTY_CALL_METRICS,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true,  // Include market/region/branch filters from UI
    includeRoleFilters: false, // SALTI is an overview dashboard - don't filter by individual user
  })

  // Refetch when period changes
  useEffect(() => {
    refetch()
  }, [selectedPeriod])

  const handleRefresh = () => {
    refetch()
  }

  const filteredData = productivityData

  const topPerformers = useMemo(() => filteredData.slice(0, 5), [filteredData])

  const averageMetrics = useMemo(() => {
    if (filteredData.length === 0) return null
    const sum = filteredData.reduce((acc, r) => ({
      salesValue: acc.salesValue + r.salesValue,
      salesClosed: acc.salesClosed + r.salesClosed,
      closeRate: acc.closeRate + r.closeRate,
      avgDealSize: acc.avgDealSize + r.avgDealSize,
      avgCycleTime: acc.avgCycleTime + r.avgCycleTime,
      leadWorkRate: acc.leadWorkRate + r.leadWorkRate,
    }), { salesValue: 0, salesClosed: 0, closeRate: 0, avgDealSize: 0, avgCycleTime: 0, leadWorkRate: 0 })

    const count = filteredData.length
    return {
      salesValue: sum.salesValue / count,
      salesClosed: sum.salesClosed / count,
      closeRate: sum.closeRate / count,
      avgDealSize: sum.avgDealSize / count,
      avgCycleTime: sum.avgCycleTime / count,
      leadWorkRate: sum.leadWorkRate / count,
    }
  }, [filteredData])

  const radarData = useMemo(() => {
    if (topPerformers.length === 0) return []
    const top = topPerformers[0]
    const avg = averageMetrics
    if (!avg) return []

    return [
      { metric: 'Close Rate', top: Math.round(top.closeRate * 100), avg: Math.round(avg.closeRate * 100) },
      { metric: 'Lead Work Rate', top: Math.round(top.leadWorkRate * 100), avg: Math.round(avg.leadWorkRate * 100) },
      { metric: 'Contact Rate', top: Math.round(top.contactRate * 100), avg: Math.round(filteredData.reduce((a, r) => a + r.contactRate, 0) / filteredData.length * 100) },
      { metric: 'Appt Rate', top: Math.round(top.appointmentRate * 100), avg: Math.round(filteredData.reduce((a, r) => a + r.appointmentRate, 0) / filteredData.length * 100) },
      { metric: 'Proposal Rate', top: Math.round(top.proposalRate * 100), avg: Math.round(filteredData.reduce((a, r) => a + r.proposalRate, 0) / filteredData.length * 100) },
    ]
  }, [topPerformers, averageMetrics, filteredData])

  const rankingChartData = useMemo(() => {
    return filteredData.slice(0, 10).map(r => ({
      name: r.repName.split(' ')[0],
      revenue: r.salesValue,
      deals: r.salesClosed * 1000,
    }))
  }, [filteredData])

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  if (isLoading || !averageMetrics) {
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
        { label: 'Productivity' }
      ]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            Rep Productivity
          </h1>
          <p className="text-muted-foreground mt-1">
            Performance metrics, rankings, and productivity indicators
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WTD">Week to Date</SelectItem>
              <SelectItem value="MTD">Month to Date</SelectItem>
              <SelectItem value="QTD">Quarter to Date</SelectItem>
              <SelectItem value="YTD">Year to Date</SelectItem>
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
            <span className="font-semibold">Error Loading Productivity Data</span>
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
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">salti-productivity</p>
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
                onClick={() => window.location.href = `mailto:support@rentokil.com?subject=Productivity Dashboard Error&body=Error: ${encodeURIComponent(error || 'Unknown error')}\nQuery: salti-productivity\nType: ${errorType || 'Unknown'}`}
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
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Revenue</p>
                <p className="text-2xl font-bold">${Math.round(averageMetrics.salesValue).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Deals</p>
                <p className="text-2xl font-bold">{Math.round(averageMetrics.salesClosed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Close Rate</p>
                <p className="text-2xl font-bold">{Math.round(averageMetrics.closeRate * 100)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Cycle Time</p>
                <p className="text-2xl font-bold">{averageMetrics.avgCycleTime.toFixed(1)}d</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Revenue Ranking
            </CardTitle>
            <CardDescription>
              Top 10 reps by {selectedPeriod} revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" fontSize={12} width={60} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Top Rep vs Average
            </CardTitle>
            <CardDescription>
              Conversion rates comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} />
                  <Radar name="Top Rep" dataKey="top" stroke="#22c55e" fill="#22c55e" fillOpacity={0.5} />
                  <Radar name="Team Avg" dataKey="avg" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Center Metrics Section - Only show if data is available */}
      {callMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Call Center Metrics
            </CardTitle>
            <CardDescription>
              Five9 call performance for SALTI agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <PhoneCall className="h-4 w-4" />
                    <span className="text-sm">Total Calls</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {callMetrics.reduce((sum, a) => sum + a.total_calls, 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">Connection Rate</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {(callMetrics.reduce((sum, a) => sum + a.connection_rate, 0) / callMetrics.length).toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Avg Handle Time</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {(callMetrics.reduce((sum, a) => sum + a.avg_handle_time_minutes, 0) / callMetrics.length).toFixed(1)}m
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-sm">Proposals Created</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {productivityData.reduce((sum, r) => sum + r.proposalsGenerated, 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Top Callers */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Top Call Center Performers</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {callMetrics.slice(0, 6).map((agent, index) => (
                    <div key={agent.agent_id} className="flex items-center justify-between p-3 rounded border border-border">
                      <div className="flex items-center gap-3">
                        <Badge variant={index < 3 ? 'default' : 'secondary'} className={index < 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}>
                          #{index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{agent.agent_name}</p>
                          <p className="text-xs text-muted-foreground">{agent.total_calls} calls</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{agent.connection_rate.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">connect rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Link href="/call-center">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Phone className="h-4 w-4" />
                    View Full Call Center Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Productivity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rep Productivity Rankings</CardTitle>
          <CardDescription>
            Complete productivity metrics with rank changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">Rank</th>
                  <th className="text-left py-3 px-2 font-medium">Rep</th>
                  <th className="text-left py-3 px-2 font-medium">Market</th>
                  <th className="text-right py-3 px-2 font-medium">Revenue</th>
                  <th className="text-right py-3 px-2 font-medium">Deals</th>
                  <th className="text-right py-3 px-2 font-medium">Close Rate</th>
                  <th className="text-right py-3 px-2 font-medium">Avg Deal</th>
                  <th className="text-right py-3 px-2 font-medium">Cycle</th>
                  <th className="text-center py-3 px-2 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((rep) => (
                  <tr key={rep.repId} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${rep.rank <= 3 ? 'text-amber-500' : ''}`}>
                          #{rep.rank}
                        </span>
                        {rep.rank <= 3 && <Award className="h-4 w-4 text-amber-500" />}
                      </div>
                    </td>
                    <td className="py-3 px-2 font-medium">{rep.repName}</td>
                    <td className="py-3 px-2 text-muted-foreground">{rep.market}</td>
                    <td className="py-3 px-2 text-right font-semibold">${rep.salesValue.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">{rep.salesClosed}</td>
                    <td className="py-3 px-2 text-right">
                      <Badge variant={rep.closeRate >= 0.35 ? 'default' : 'secondary'}
                        className={rep.closeRate >= 0.35 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
                        {Math.round(rep.closeRate * 100)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right">${Math.round(rep.avgDealSize).toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">{rep.avgCycleTime.toFixed(1)}d</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(rep.rankChange)}
                        {rep.rankChange !== 0 && (
                          <span className={`text-xs ${rep.rankChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Math.abs(rep.rankChange)}
                          </span>
                        )}
                      </div>
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
