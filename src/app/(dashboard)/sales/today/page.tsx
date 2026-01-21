"use client"

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Progress } from '@/components/ui/progress'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, DollarSign, FileText, Search,
  Phone, Users, RefreshCw, Clock, CheckCircle, XCircle
} from 'lucide-react'
import { generateMockSalesToday } from '@/lib/mock/salesExtendedData'
import type { SalesTodayMetrics } from '@/types/sales-extended'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: number
  trendLabel?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

function MetricCard({ title, value, subtitle, icon, trend, trendLabel, variant = 'default' }: MetricCardProps) {
  const bgColors = {
    default: 'bg-blue-50 dark:bg-blue-900/20',
    success: 'bg-green-50 dark:bg-green-900/20',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20',
    danger: 'bg-red-50 dark:bg-red-900/20',
  }

  return (
    <Card className={bgColors[variant]}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className={`flex items-center gap-1 mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="text-sm font-medium">
                  {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
                  {trendLabel && <span className="text-gray-500 dark:text-gray-400 ml-1">{trendLabel}</span>}
                </span>
              </div>
            )}
          </div>
          <div className="p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SalesTodayPage() {
  const [metrics, setMetrics] = useState<SalesTodayMetrics | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    setMetrics(generateMockSalesToday())
  }, [])

  const handleRefresh = () => {
    setMetrics(generateMockSalesToday(Date.now().toString()))
    setLastRefresh(new Date())
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Activity breakdown for chart
  const activityData = [
    { name: 'Won', value: metrics.closedWon, fill: '#22c55e' },
    { name: 'Lost', value: metrics.closedLost, fill: '#ef4444' },
    { name: 'Proposals', value: metrics.proposalsSent, fill: '#3b82f6' },
    { name: 'Inspections', value: metrics.inspectionsCompleted, fill: '#f59e0b' },
    { name: 'Appointments', value: metrics.appointmentsSet, fill: '#8b5cf6' },
  ]

  // Lead funnel data
  const leadFunnelData = [
    { name: 'Received', value: metrics.newLeadsReceived, fill: '#94a3b8' },
    { name: 'Assigned', value: metrics.leadsAssigned, fill: '#3b82f6' },
    { name: 'Contacted', value: metrics.leadsContacted, fill: '#22c55e' },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Sales', href: '/sales' },
        { label: 'Today' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Today&apos;s Sales</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time sales activity for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Closed Won"
          value={metrics.closedWon}
          subtitle={formatCurrency(metrics.closedWonValue)}
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          trend={metrics.vsYesterdayPercent}
          trendLabel="vs yesterday"
          variant="success"
        />
        <MetricCard
          title="Proposals Sent"
          value={metrics.proposalsSent}
          subtitle={formatCurrency(metrics.proposalsValue)}
          icon={<FileText className="h-6 w-6 text-blue-600" />}
          trend={metrics.vsSameDayLastWeekPercent}
          trendLabel="vs last week"
          variant="default"
        />
        <MetricCard
          title="Inspections Completed"
          value={metrics.inspectionsCompleted}
          subtitle={`${metrics.inspectionsScheduled} scheduled`}
          icon={<Search className="h-6 w-6 text-yellow-600" />}
          variant="warning"
        />
        <MetricCard
          title="New Leads"
          value={metrics.newLeadsReceived}
          subtitle={`${metrics.leadsAssigned} assigned`}
          icon={<Users className="h-6 w-6 text-purple-600" />}
          variant="default"
        />
      </div>

      {/* Performance vs Target */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance vs Daily Target
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Revenue Closed</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatCurrency(metrics.closedWonValue)} / Target
                </span>
              </div>
              <Progress
                value={Math.min(100 + metrics.vsDailyTargetPercent, 150)}
                className="h-3"
              />
              <div className="flex justify-between mt-1">
                <Badge variant={metrics.vsDailyTargetPercent >= 0 ? 'success' : 'danger'}>
                  {metrics.vsDailyTargetPercent >= 0 ? '+' : ''}{metrics.vsDailyTargetPercent.toFixed(1)}% vs target
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} layout="vertical">
                  <defs>
                    <filter id="glow-activity" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm">{payload[0].value} activities</p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    activeBar={{ filter: 'url(#glow-activity)' }}
                  >
                    {activityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Lead Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadFunnelData}>
                  <defs>
                    <filter id="glow-leads" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm">{payload[0].value} leads</p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ filter: 'url(#glow-leads)' }}
                  >
                    {leadFunnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Closed Lost</p>
                <p className="text-xl font-bold">{metrics.closedLost}</p>
                <p className="text-sm text-red-600">{formatCurrency(metrics.closedLostValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Proposals Accepted</p>
                <p className="text-xl font-bold">{metrics.proposalsAccepted}</p>
                <p className="text-sm text-gray-500">of {metrics.proposalsSent} sent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Calls</p>
                <p className="text-xl font-bold">{formatNumber(metrics.totalCalls)}</p>
                <p className="text-sm text-gray-500">{metrics.connectedCalls} connected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Appointments Set</p>
                <p className="text-xl font-bold">{metrics.appointmentsSet}</p>
                <p className="text-sm text-gray-500">for future dates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
