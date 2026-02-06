"use client"

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  RefreshCw, Zap, Target, Users, Calendar,
  DollarSign, TrendingUp, CheckCircle2, Clock, AlertTriangle, FileText, ExternalLink, Mail
} from 'lucide-react'
import type { WeekendBlitzCampaign } from '@/types/salti-extended'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Legend
} from 'recharts'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { SALTIWeekendBlitz } from '@/lib/bigquery/queries/salti'

// Transform BigQuery data to page format
function transformBigQueryData(bqData: SALTIWeekendBlitz[]): WeekendBlitzCampaign[] {
  // Group by date to create campaigns
  const groupedByDate = (bqData || []).reduce((acc, d) => {
    const dateKey = d.blitz_date
    if (!acc[dateKey]) {
      acc[dateKey] = {
        appointments_scheduled: 0,
        appointments_completed: 0,
        proposals_generated: 0,
        sales_closed: 0,
        rep_count: 0,
      }
    }
    acc[dateKey].appointments_scheduled += d.appointments_scheduled
    acc[dateKey].appointments_completed += d.appointments_completed
    acc[dateKey].proposals_generated += d.proposals_generated
    acc[dateKey].sales_closed += d.sales_closed
    acc[dateKey].rep_count++
    return acc
  }, {} as Record<string, { appointments_scheduled: number; appointments_completed: number; proposals_generated: number; sales_closed: number; rep_count: number }>)

  return Object.entries(groupedByDate).slice(0, 5).map(([dateStr, data], index) => {
    const blitzDate = new Date(dateStr)
    const endDate = new Date(blitzDate)
    endDate.setDate(endDate.getDate() + 1)

    const leadGoal = Math.max(data.appointments_scheduled, 50)
    const appointmentGoal = Math.max(Math.round(data.appointments_scheduled * 0.8), 40)
    const salesGoal = Math.max(Math.round(data.sales_closed * 1.2), 10)
    const revenueGoal = salesGoal * 2500

    return {
      id: `blitz-${index + 1}`,
      name: `Weekend Blitz ${blitzDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      startDate: blitzDate,
      endDate: endDate,
      status: (index === 0 ? 'active' : index < 2 ? 'completed' : 'upcoming') as 'upcoming' | 'active' | 'completed',
      leadGoal,
      appointmentGoal,
      salesGoal,
      revenueGoal,
      leadsGenerated: data.appointments_scheduled,
      appointmentsSet: data.appointments_completed,
      salesClosed: data.sales_closed,
      revenueGenerated: data.sales_closed * 2500,
      totalReps: Math.max(data.rep_count, 25),
      activeReps: data.rep_count,
      leadAttainment: data.appointments_scheduled / leadGoal,
      appointmentAttainment: data.appointments_completed / appointmentGoal,
      salesAttainment: data.sales_closed / salesGoal,
      revenueAttainment: (data.sales_closed * 2500) / revenueGoal,
    }
  })
}

const STATUS_CONFIG = {
  upcoming: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  active: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: Zap },
  completed: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: CheckCircle2 },
}

export default function WeekendBlitzPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<WeekendBlitzCampaign | null>(null)

  // Empty default data
  const EMPTY_CAMPAIGNS: WeekendBlitzCampaign[] = []

  const {
    data: campaigns,
    isLoading,
    dataSource,
    responseTime,
    error,
    errorType,
    refetch,
  } = useBigQueryData<SALTIWeekendBlitz[], WeekendBlitzCampaign[]>({
    queryName: 'salti-weekend-blitz',
    filters: { daysBack: 90 },
    defaultData: EMPTY_CAMPAIGNS,
    transformBigQueryData,
    includeOrgFilters: true,  // Include market/region/branch filters from UI
    includeRoleFilters: false, // SALTI is an overview dashboard - don't filter by individual user
  })

  // Set selected campaign when data loads
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaign) {
      setSelectedCampaign(campaigns[0])
    }
  }, [campaigns, selectedCampaign])

  const handleRefresh = () => {
    refetch()
  }

  const attainmentGaugeData = useMemo(() => {
    if (!selectedCampaign) return []
    return [
      { name: 'Revenue', value: Math.round(selectedCampaign.revenueAttainment * 100), fill: '#22c55e' },
      { name: 'Sales', value: Math.round(selectedCampaign.salesAttainment * 100), fill: '#3b82f6' },
      { name: 'Appointments', value: Math.round(selectedCampaign.appointmentAttainment * 100), fill: '#8b5cf6' },
      { name: 'Leads', value: Math.round(selectedCampaign.leadAttainment * 100), fill: '#f97316' },
    ]
  }, [selectedCampaign])

  const comparisonData = useMemo(() => {
    return campaigns.map(c => ({
      name: c.name.replace('Weekend Blitz ', 'Blitz '),
      leads: c.leadsGenerated,
      appointments: c.appointmentsSet,
      sales: c.salesClosed,
      revenue: c.revenueGenerated / 1000,
    }))
  }, [campaigns])

  const totalStats = useMemo(() => {
    return campaigns.reduce((acc, c) => ({
      leads: acc.leads + c.leadsGenerated,
      appointments: acc.appointments + c.appointmentsSet,
      sales: acc.sales + c.salesClosed,
      revenue: acc.revenue + c.revenueGenerated,
    }), { leads: 0, appointments: 0, sales: 0, revenue: 0 })
  }, [campaigns])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
  }

  if (isLoading || !selectedCampaign) {
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
        { label: 'Weekend Blitz' }
      ]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-7 w-7 text-primary" />
            Weekend Blitz Campaigns
          </h1>
          <p className="text-muted-foreground mt-1">
            Campaign tracking with goals vs actuals
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
            <span className="font-semibold">Error Loading Weekend Blitz Data</span>
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
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">salti-weekend-blitz</p>
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
                onClick={() => window.location.href = `mailto:support@rentokil.com?subject=Weekend Blitz Error&body=Error: ${encodeURIComponent(error || 'Unknown error')}\nQuery: salti-weekend-blitz\nType: ${errorType || 'Unknown'}`}
              >
                <Mail className="h-3 w-3 mr-1.5" />
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Selector */}
      <div className="flex flex-wrap gap-2">
        {campaigns.map((campaign) => {
          const StatusIcon = STATUS_CONFIG[campaign.status].icon
          return (
            <Button
              key={campaign.id}
              variant={selectedCampaign.id === campaign.id ? 'default' : 'outline'}
              className="flex items-center gap-2"
              onClick={() => setSelectedCampaign(campaign)}
            >
              <StatusIcon className="h-4 w-4" />
              {campaign.name}
              <Badge variant="outline" className={STATUS_CONFIG[campaign.status].color}>
                {campaign.status}
              </Badge>
            </Button>
          )
        })}
      </div>

      {/* Selected Campaign Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {selectedCampaign.name}
                <Badge className={STATUS_CONFIG[selectedCampaign.status].color}>
                  {selectedCampaign.status}
                </Badge>
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                {formatDate(selectedCampaign.startDate)} - {formatDate(selectedCampaign.endDate)}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Rep Participation</p>
              <p className="text-2xl font-bold">
                {selectedCampaign.activeReps}/{selectedCampaign.totalReps}
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.round(selectedCampaign.activeReps / selectedCampaign.totalReps * 100)}% active
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Goals vs Actuals Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Leads */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Leads</span>
                <Users className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-2xl font-bold">{selectedCampaign.leadsGenerated}</p>
              <p className="text-xs text-muted-foreground mb-2">Goal: {selectedCampaign.leadGoal}</p>
              <Progress
                value={selectedCampaign.leadAttainment * 100}
                className="h-2"
              />
              <p className={`text-xs mt-1 ${selectedCampaign.leadAttainment >= 1 ? 'text-green-600' : 'text-amber-600'}`}>
                {Math.round(selectedCampaign.leadAttainment * 100)}% of goal
              </p>
            </div>

            {/* Appointments */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Appointments</span>
                <Calendar className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold">{selectedCampaign.appointmentsSet}</p>
              <p className="text-xs text-muted-foreground mb-2">Goal: {selectedCampaign.appointmentGoal}</p>
              <Progress
                value={selectedCampaign.appointmentAttainment * 100}
                className="h-2"
              />
              <p className={`text-xs mt-1 ${selectedCampaign.appointmentAttainment >= 1 ? 'text-green-600' : 'text-amber-600'}`}>
                {Math.round(selectedCampaign.appointmentAttainment * 100)}% of goal
              </p>
            </div>

            {/* Sales */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Sales</span>
                <Target className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{selectedCampaign.salesClosed}</p>
              <p className="text-xs text-muted-foreground mb-2">Goal: {selectedCampaign.salesGoal}</p>
              <Progress
                value={selectedCampaign.salesAttainment * 100}
                className="h-2"
              />
              <p className={`text-xs mt-1 ${selectedCampaign.salesAttainment >= 1 ? 'text-green-600' : 'text-amber-600'}`}>
                {Math.round(selectedCampaign.salesAttainment * 100)}% of goal
              </p>
            </div>

            {/* Revenue */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Revenue</span>
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold">${(selectedCampaign.revenueGenerated / 1000).toFixed(0)}K</p>
              <p className="text-xs text-muted-foreground mb-2">Goal: ${(selectedCampaign.revenueGoal / 1000).toFixed(0)}K</p>
              <Progress
                value={selectedCampaign.revenueAttainment * 100}
                className="h-2"
              />
              <p className={`text-xs mt-1 ${selectedCampaign.revenueAttainment >= 1 ? 'text-green-600' : 'text-amber-600'}`}>
                {Math.round(selectedCampaign.revenueAttainment * 100)}% of goal
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attainment Gauge */}
        <Card>
          <CardHeader>
            <CardTitle>Goal Attainment</CardTitle>
            <CardDescription>Performance against targets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="20%"
                  outerRadius="90%"
                  barSize={20}
                  data={attainmentGaugeData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={10}
                  />
                  <Legend
                    iconSize={10}
                    layout="horizontal"
                    verticalAlign="bottom"
                    formatter={(value, entry: any) => (
                      <span className="text-sm">
                        {value}: {entry.payload.value}%
                      </span>
                    )}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Attainment']}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Comparison</CardTitle>
            <CardDescription>Results across all blitz campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="leads" name="Leads" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="appointments" name="Appts" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sales" name="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All-Time Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            All-Time Blitz Performance
          </CardTitle>
          <CardDescription>
            Cumulative results from all {campaigns.length} weekend blitz campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <Users className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-3xl font-bold">{totalStats.leads.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Leads</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Calendar className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-3xl font-bold">{totalStats.appointments.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Appointments</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Target className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-3xl font-bold">{totalStats.sales.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Sales</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-3xl font-bold">${(totalStats.revenue / 1000).toFixed(0)}K</p>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign History</CardTitle>
          <CardDescription>Complete list of weekend blitz campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">Campaign</th>
                  <th className="text-left py-3 px-2 font-medium">Dates</th>
                  <th className="text-center py-3 px-2 font-medium">Status</th>
                  <th className="text-right py-3 px-2 font-medium">Leads</th>
                  <th className="text-right py-3 px-2 font-medium">Appts</th>
                  <th className="text-right py-3 px-2 font-medium">Sales</th>
                  <th className="text-right py-3 px-2 font-medium">Revenue</th>
                  <th className="text-right py-3 px-2 font-medium">Participation</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className={`border-b border-border/50 hover:bg-muted/50 cursor-pointer ${selectedCampaign.id === campaign.id ? 'bg-muted/50' : ''}`}
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <td className="py-3 px-2 font-medium">{campaign.name}</td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge className={STATUS_CONFIG[campaign.status].color}>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={campaign.leadAttainment >= 1 ? 'text-green-600' : ''}>
                        {campaign.leadsGenerated}
                      </span>
                      <span className="text-muted-foreground">/{campaign.leadGoal}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={campaign.appointmentAttainment >= 1 ? 'text-green-600' : ''}>
                        {campaign.appointmentsSet}
                      </span>
                      <span className="text-muted-foreground">/{campaign.appointmentGoal}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={campaign.salesAttainment >= 1 ? 'text-green-600' : ''}>
                        {campaign.salesClosed}
                      </span>
                      <span className="text-muted-foreground">/{campaign.salesGoal}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={campaign.revenueAttainment >= 1 ? 'text-green-600 font-semibold' : ''}>
                        ${(campaign.revenueGenerated / 1000).toFixed(0)}K
                      </span>
                      <span className="text-muted-foreground">/${(campaign.revenueGoal / 1000).toFixed(0)}K</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {campaign.activeReps}/{campaign.totalReps}
                      <span className="text-muted-foreground ml-1">
                        ({Math.round(campaign.activeReps / campaign.totalReps * 100)}%)
                      </span>
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
