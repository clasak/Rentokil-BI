"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Users, UserPlus, Eye, TrendingUp, TrendingDown,
  Download, GitBranch, Search, Moon, Presentation,
  RefreshCw, Calendar, BarChart3, Clock, Activity
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import { getUserAdoptionMetrics, UserAdoptionMetrics } from '@/lib/platform-admin-data'

export default function UserAdoptionPage() {
  const [metrics, setMetrics] = useState<UserAdoptionMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')

  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setMetrics(getUserAdoptionMetrics())
      setIsLoading(false)
    }, 300)
  }, [dateRange])

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'Export CSV':
        return Download
      case 'Lineage View':
        return GitBranch
      case 'Search':
        return Search
      case 'Dark Mode':
        return Moon
      case 'Presenter Mode':
        return Presentation
      default:
        return Eye
    }
  }

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const adoptionRate = (metrics.activeUsers / metrics.totalUsers) * 100

  // Mock data for charts
  const usersByRole = [
    { role: 'Executive', count: 12, color: '#3b82f6' },
    { role: 'Market VP', count: 6, color: '#6366f1' },
    { role: 'Region Dir', count: 18, color: '#8b5cf6' },
    { role: 'Manager', count: 45, color: '#a855f7' },
    { role: 'Sales Rep', count: 52, color: '#d946ef' },
    { role: 'Technician', count: 14, color: '#ec4899' },
  ]

  const loginActivity = [
    { day: 'Mon', sessions: 145 },
    { day: 'Tue', sessions: 167 },
    { day: 'Wed', sessions: 158 },
    { day: 'Thu', sessions: 172 },
    { day: 'Fri', sessions: 134 },
    { day: 'Sat', sessions: 23 },
    { day: 'Sun', sessions: 18 },
  ]

  const hourlyUsage = [
    { hour: '6am', users: 12 },
    { hour: '8am', users: 45 },
    { hour: '10am', users: 89 },
    { hour: '12pm', users: 67 },
    { hour: '2pm', users: 92 },
    { hour: '4pm', users: 78 },
    { hour: '6pm', users: 34 },
    { hour: '8pm', users: 15 },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Admin', href: '/admin' },
        { label: 'User Adoption' }
      ]} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            User Adoption
          </h1>
          <p className="text-muted-foreground mt-1">
            Track user engagement and feature utilization
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Active Users</div>
                <div className="text-3xl font-bold">{metrics.activeUsers}</div>
              </div>
              <Users className="h-10 w-10 text-primary opacity-50" />
            </div>
            <Progress value={adoptionRate} className="h-2 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">
              {adoptionRate.toFixed(1)}% of {metrics.totalUsers} total
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-600 dark:text-green-400">New This Week</div>
                <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                  +{metrics.newUsersThisWeek}
                </div>
              </div>
              <UserPlus className="h-10 w-10 text-green-500 opacity-50" />
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-3 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              6% increase from last week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Avg. Session</div>
                <div className="text-3xl font-bold">12.4 min</div>
              </div>
              <Clock className="h-10 w-10 text-primary opacity-50" />
            </div>
            <div className="text-xs text-green-600 mt-3 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Above 10 min target
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Weekly Sessions</div>
                <div className="text-3xl font-bold">817</div>
              </div>
              <Activity className="h-10 w-10 text-primary opacity-50" />
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              Avg 5.6 sessions/user
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Users by Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usersByRole} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="role" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="font-medium">{payload[0].payload.role}</div>
                            <div className="text-lg font-bold">{payload[0].value} users</div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {usersByRole.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Login Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Weekly Login Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loginActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="font-medium">{payload[0].payload.day}</div>
                            <div className="text-lg font-bold">{payload[0].value} sessions</div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Usage & Feature Adoption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Viewed Dashboards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Most Viewed Dashboards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.mostViewedDashboards.map((dashboard, index) => (
                <div
                  key={dashboard.name}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <span className="font-medium">{dashboard.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{dashboard.views.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{dashboard.uniqueUsers} users</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Needs Attention
            </CardTitle>
            <CardDescription>Low-engagement dashboards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.leastViewedDashboards.map((dashboard) => (
                <div
                  key={dashboard.name}
                  className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                >
                  <span className="font-medium text-amber-800 dark:text-amber-300">
                    {dashboard.name}
                  </span>
                  <div className="text-right">
                    <div className="font-semibold text-amber-700 dark:text-amber-300">
                      {dashboard.views}
                    </div>
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      {dashboard.uniqueUsers} users
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                Consider reviewing these dashboards for user experience improvements
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Adoption</CardTitle>
          <CardDescription>Usage statistics for platform features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {metrics.featureUsage.map((feature) => {
              const Icon = getFeatureIcon(feature.feature)
              return (
                <div
                  key={feature.feature}
                  className="p-4 bg-muted/50 rounded-lg text-center"
                >
                  <Icon className="h-6 w-6 mx-auto text-primary mb-3" />
                  <div className="font-medium text-sm">{feature.feature}</div>
                  <div className="text-2xl font-bold text-primary mt-1">
                    {feature.usagePercent}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {feature.usageCount.toLocaleString()} uses
                  </div>
                  <Progress value={feature.usagePercent} className="h-1.5 mt-3" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
