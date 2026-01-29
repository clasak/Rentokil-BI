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
  RefreshCw, Calendar, BarChart3, Clock, Activity, AlertCircle, Info
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line
} from 'recharts'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { UserAdoptionMetrics } from '@/lib/bigquery/queries/user-adoption'

// Empty state (no mock fallback - BigQuery only)
const EMPTY_METRICS: UserAdoptionMetrics = {
  activeUsers: 0,
  totalUsers: 0,
  newUsersThisWeek: 0,
  mostViewedDashboards: [],
  featureUsage: [],
  trackingAvailable: false,
  lastUpdated: new Date(),
}

export default function UserAdoptionPage() {
  const [mounted, setMounted] = useState(false)
  const [dateRange, setDateRange] = useState('30d')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch user adoption metrics
  const {
    data: metrics,
    isLoading,
    error,
    refetch,
  } = useBigQueryData<UserAdoptionMetrics, UserAdoptionMetrics>({
    queryName: 'user-adoption-summary',
    defaultData: EMPTY_METRICS,
    transformBigQueryData: (data) => data,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

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

  if (!mounted) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <p className="text-lg font-medium">Error Loading User Adoption</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const adoptionRate = metrics.totalUsers > 0
    ? (metrics.activeUsers / metrics.totalUsers) * 100
    : 0

  // Calculate feature usage percentages
  const maxFeatureUsage = Math.max(...metrics.featureUsage.map(f => f.usageCount), 1)
  const featureUsageWithPercent = metrics.featureUsage.map(f => ({
    ...f,
    usagePercent: Math.round((f.usageCount / maxFeatureUsage) * 100),
  }))

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
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tracking Disclaimer */}
      {!metrics.trackingAvailable && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Partial Data - Dashboard Tracking Not Yet Instrumented
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  User counts are from Workday employee data. Dashboard view tracking and feature usage will be available once ops_events instrumentation is complete.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Active Users</div>
                <div className="text-3xl font-bold">{metrics.activeUsers.toLocaleString()}</div>
              </div>
              <Users className="h-10 w-10 text-primary opacity-50" />
            </div>
            <Progress value={adoptionRate} className="h-2 mt-3" />
            <div className="text-xs text-muted-foreground mt-2">
              {adoptionRate.toFixed(1)}% of {metrics.totalUsers.toLocaleString()} total
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-600 dark:text-green-400">New This Week</div>
                <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                  +{metrics.newUsersThisWeek.toLocaleString()}
                </div>
              </div>
              <UserPlus className="h-10 w-10 text-green-500 opacity-50" />
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-3">
              New employee records from Workday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total Users</div>
                <div className="text-3xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
              </div>
              <Activity className="h-10 w-10 text-primary opacity-50" />
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              From tmx_employee table
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Usage */}
      {metrics.trackingAvailable && metrics.mostViewedDashboards.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Viewed Dashboards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Most Viewed Dashboards
              </CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.mostViewedDashboards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No dashboard view data available</p>
                </div>
              ) : (
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
                        <div className="text-xs text-muted-foreground">views</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feature Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature Adoption</CardTitle>
              <CardDescription>Usage statistics for platform features</CardDescription>
            </CardHeader>
            <CardContent>
              {featureUsageWithPercent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No feature usage data available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {featureUsageWithPercent.map((feature) => {
                    const Icon = getFeatureIcon(feature.feature)
                    return (
                      <div
                        key={feature.feature}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-primary" />
                          <span className="font-medium">{feature.feature}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-semibold">{feature.usageCount.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">uses</div>
                          </div>
                          <div className="w-20">
                            <Progress value={feature.usagePercent} className="h-2" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State for Tracking Not Available */}
      {!metrics.trackingAvailable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dashboard & Feature Analytics</CardTitle>
            <CardDescription>Detailed usage tracking coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                Dashboard Tracking Not Yet Available
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                To enable detailed analytics, instrument page_view events in ops_events table.
                Once configured, this section will show most viewed dashboards, feature usage,
                and engagement metrics.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Source Info */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>
              Data from S0_TMX.tmx_employee (1.2M+ rows)
              {metrics.trackingAvailable && ' and Supabase ops_events'}
              {' • '}
              Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
