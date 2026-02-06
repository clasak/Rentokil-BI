"use client"

import { useEffect, useState } from 'react'
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
  RefreshCw,
  Phone,
  Clock,
  CheckCircle2,
  TrendingUp,
  Users,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Activity,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type {
  CallVolume,
  AgentPerformance,
  CallOutcome,
  HourlyDistribution,
} from '@/lib/bigquery/queries/call-center'

// Empty default states
const EMPTY_CALL_VOLUME: CallVolume[] = []
const EMPTY_AGENT_PERFORMANCE: AgentPerformance[] = []
const EMPTY_CALL_OUTCOMES: CallOutcome[] = []
const EMPTY_HOURLY_DISTRIBUTION: HourlyDistribution[] = []

// Pie chart colors
const OUTCOME_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

export default function CallCenterPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch call volume data
  const {
    data: callVolumeData,
    isLoading: volumeLoading,
    dataSource: volumeDataSource,
    responseTime: volumeResponseTime,
    refetch: refetchVolume,
  } = useBigQueryData<CallVolume[], CallVolume[]>({
    queryName: 'call-volume',
    filters: { daysBack: parseInt(selectedPeriod) },
    defaultData: EMPTY_CALL_VOLUME,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true, // Call center data - org-level view
    includeRoleFilters: false, // Not filtered to individual user
  })

  // Fetch agent performance data
  const {
    data: agentPerformanceData,
    isLoading: agentLoading,
    refetch: refetchAgents,
  } = useBigQueryData<AgentPerformance[], AgentPerformance[]>({
    queryName: 'agent-performance',
    filters: { daysBack: parseInt(selectedPeriod) },
    defaultData: EMPTY_AGENT_PERFORMANCE,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true, // Call center data - org-level view
    includeRoleFilters: false, // Not filtered to individual user
  })

  // Fetch call outcomes data
  const {
    data: callOutcomesData,
    isLoading: outcomesLoading,
    refetch: refetchOutcomes,
  } = useBigQueryData<CallOutcome[], CallOutcome[]>({
    queryName: 'call-outcomes',
    filters: { daysBack: parseInt(selectedPeriod) },
    defaultData: EMPTY_CALL_OUTCOMES,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true, // Call center data - org-level view
    includeRoleFilters: false, // Not filtered to individual user
  })

  // Fetch hourly distribution data
  const {
    data: hourlyDistributionData,
    isLoading: hourlyLoading,
    refetch: refetchHourly,
  } = useBigQueryData<HourlyDistribution[], HourlyDistribution[]>({
    queryName: 'hourly-distribution',
    filters: { daysBack: parseInt(selectedPeriod) },
    defaultData: EMPTY_HOURLY_DISTRIBUTION,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true, // Call center data - org-level view
    includeRoleFilters: false, // Not filtered to individual user
  })

  // Note: No manual refetch on period change needed — useBigQueryData
  // automatically re-fetches when filters (including daysBack from selectedPeriod) change.

  const handleRefresh = () => {
    refetchVolume()
    refetchAgents()
    refetchOutcomes()
    refetchHourly()
  }

  const isLoading = volumeLoading || agentLoading || outcomesLoading || hourlyLoading

  // Calculate summary KPIs
  const summaryKPIs = {
    totalCalls: callVolumeData.reduce((sum, d) => sum + d.total_calls, 0),
    inboundCalls: callVolumeData.reduce((sum, d) => sum + d.inbound_calls, 0),
    outboundCalls: callVolumeData.reduce((sum, d) => sum + d.outbound_calls, 0),
    avgHandleTime:
      callVolumeData.length > 0
        ? callVolumeData.reduce((sum, d) => sum + d.avg_handle_time_minutes, 0) / callVolumeData.length
        : 0,
    connectionRate:
      callVolumeData.length > 0
        ? callVolumeData.reduce((sum, d) => sum + d.connection_rate, 0) / callVolumeData.length
        : 0,
    fcrRate:
      agentPerformanceData.length > 0
        ? agentPerformanceData.reduce((sum, a) => sum + a.first_call_resolution_rate, 0) /
          agentPerformanceData.length
        : 0,
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Operations', href: '/ops' },
          { label: 'Call Center Performance' },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-7 w-7 text-primary" />
            Call Center Performance
          </h1>
          <p className="text-muted-foreground mt-1">
            Five9 call center metrics, agent performance, and staffing insights
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="14">Last 14 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="60">Last 60 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <DataSourceBadge status={volumeDataSource} responseTime={volumeResponseTime} />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <PhoneCall className="h-4 w-4" />
                <span className="text-sm">Total Calls</span>
              </div>
              <p className="text-2xl font-bold">{summaryKPIs.totalCalls.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <PhoneIncoming className="h-3 w-3" />
                <span>{summaryKPIs.inboundCalls.toLocaleString()} in</span>
                <PhoneOutgoing className="h-3 w-3 ml-1" />
                <span>{summaryKPIs.outboundCalls.toLocaleString()} out</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Avg Handle Time</span>
              </div>
              <p className="text-2xl font-bold">{summaryKPIs.avgHandleTime.toFixed(1)}m</p>
              <p className="text-xs text-muted-foreground mt-1">
                Minutes per call
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">First Call Res.</span>
              </div>
              <p className="text-2xl font-bold">{summaryKPIs.fcrRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Resolved on first call
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Connection Rate</span>
              </div>
              <p className="text-2xl font-bold">{summaryKPIs.connectionRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Successfully connected
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">Active Agents</span>
              </div>
              <p className="text-2xl font-bold">{agentPerformanceData.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Agents with 10+ calls
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span className="text-sm">Daily Avg</span>
              </div>
              <p className="text-2xl font-bold">
                {callVolumeData.length > 0
                  ? Math.round(summaryKPIs.totalCalls / callVolumeData.length)
                  : 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Calls per day
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Volume Trend & Hourly Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Call Volume Trend
            </CardTitle>
            <CardDescription>Daily call volume over last {selectedPeriod} days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={callVolumeData.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="call_date"
                    fontSize={11}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                  />
                  <YAxis fontSize={11} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_calls"
                    name="Total Calls"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="inbound_calls"
                    name="Inbound"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="outbound_calls"
                    name="Outbound"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Hourly Call Distribution
            </CardTitle>
            <CardDescription>Call volume by hour for staffing optimization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour_of_day"
                    fontSize={11}
                    tickFormatter={(hour) => `${hour}:00`}
                  />
                  <YAxis fontSize={11} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(hour) => `${hour}:00 - ${hour + 1}:00`}
                  />
                  <Legend />
                  <Bar dataKey="inbound_count" name="Inbound" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="outbound_count" name="Outbound" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Call Outcomes Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Call Outcomes Breakdown
          </CardTitle>
          <CardDescription>Distribution of call outcomes and dispositions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="h-[300px] flex-1 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={callOutcomesData}
                    dataKey="call_count"
                    nameKey="outcome"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ outcome, percentage }) => `${outcome}: ${percentage.toFixed(1)}%`}
                    labelLine={true}
                  >
                    {callOutcomesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={OUTCOME_COLORS[index % OUTCOME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any, name: any, props: any) => [
                      `${value.toLocaleString()} calls (${props.payload.percentage.toFixed(1)}%)`,
                      props.payload.outcome,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Outcome Details</h4>
                <div className="space-y-2">
                  {callOutcomesData.map((outcome, index) => (
                    <div key={outcome.outcome} className="flex items-center justify-between p-2 rounded border border-border">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: OUTCOME_COLORS[index % OUTCOME_COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{outcome.outcome}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{outcome.call_count.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {outcome.avg_duration_minutes.toFixed(1)}m avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Agent Performance Rankings
          </CardTitle>
          <CardDescription>Top agents by productivity score (weighted: 40% connection, 40% FCR, 20% efficiency)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">Rank</th>
                  <th className="text-left py-3 px-2 font-medium">Agent</th>
                  <th className="text-left py-3 px-2 font-medium">Branch</th>
                  <th className="text-right py-3 px-2 font-medium">Calls</th>
                  <th className="text-right py-3 px-2 font-medium">Handled</th>
                  <th className="text-right py-3 px-2 font-medium">AHT</th>
                  <th className="text-right py-3 px-2 font-medium">FCR %</th>
                  <th className="text-right py-3 px-2 font-medium">Connect %</th>
                  <th className="text-right py-3 px-2 font-medium">Talk Hours</th>
                  <th className="text-right py-3 px-2 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformanceData.map((agent, index) => (
                  <tr key={agent.agent_id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <Badge variant={index < 3 ? 'default' : 'secondary'} className={index < 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}>
                        #{index + 1}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 font-medium">{agent.agent_name}</td>
                    <td className="py-3 px-2 text-muted-foreground">{agent.branch_id}</td>
                    <td className="py-3 px-2 text-right">{agent.total_calls.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">{agent.calls_handled.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">{agent.avg_handle_time_minutes.toFixed(1)}m</td>
                    <td className="py-3 px-2 text-right">
                      <Badge variant={agent.first_call_resolution_rate >= 70 ? 'default' : 'secondary'} className={agent.first_call_resolution_rate >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
                        {agent.first_call_resolution_rate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Badge variant={agent.connection_rate >= 60 ? 'default' : 'secondary'} className={agent.connection_rate >= 60 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}>
                        {agent.connection_rate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right">{agent.total_talk_time_hours.toFixed(1)}h</td>
                    <td className="py-3 px-2 text-right">
                      <span className="font-semibold text-primary">{agent.productivity_score.toFixed(1)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {agentPerformanceData.length === 0 && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No agent performance data available for the selected period.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
