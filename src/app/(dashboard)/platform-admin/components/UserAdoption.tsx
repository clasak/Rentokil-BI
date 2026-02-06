"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Users, UserPlus, TrendingUp, TrendingDown, BarChart3,
  Eye, Download, Search, GitBranch, Filter
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { UserAdoptionMetrics } from '@/lib/bigquery/queries/user-adoption'

// Empty state (BigQuery-only)
const EMPTY_ADOPTION: UserAdoptionMetrics = {
  activeUsers: 0,
  totalUsers: 0,
  newUsersThisWeek: 0,
  mostViewedDashboards: [],
  featureUsage: [],
  trackingAvailable: false,
  lastUpdated: new Date(),
}

function TrendBadge({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center text-xs text-green-600 dark:text-green-400">
        <TrendingUp className="h-3 w-3 mr-0.5" />
        +{value.toFixed(1)}%
      </span>
    )
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center text-xs text-red-600 dark:text-red-400">
        <TrendingDown className="h-3 w-3 mr-0.5" />
        {value.toFixed(1)}%
      </span>
    )
  }
  return null
}

function FeatureIcon({ feature }: { feature: string }) {
  const icons: Record<string, typeof Download> = {
    'Export CSV': Download,
    'Lineage View': GitBranch,
    'Search': Search,
    'KPI Drill-down': BarChart3,
    'Filter by Region': Filter
  }
  const Icon = icons[feature] || BarChart3
  return <Icon className="h-4 w-4 text-muted-foreground" />
}

export function UserAdoption() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Explicit transform for user adoption metrics with null handling
  function transformUserAdoptionMetrics(data: UserAdoptionMetrics): UserAdoptionMetrics {
    if (!data) return { activeUsers: 0, totalUsers: 0, newUsersThisWeek: 0, mostViewedDashboards: [], featureUsage: [], trackingAvailable: false, lastUpdated: new Date() }
    return {
      activeUsers: data.activeUsers ?? 0,
      totalUsers: data.totalUsers ?? 0,
      newUsersThisWeek: data.newUsersThisWeek ?? 0,
      mostViewedDashboards: (data.mostViewedDashboards ?? []).map(dash => ({
        name: dash.name ?? '',
        views: dash.views ?? 0,
      })),
      featureUsage: (data.featureUsage ?? []).map(feat => ({
        feature: feat.feature ?? '',
        usageCount: feat.usageCount ?? 0,
      })),
      trackingAvailable: data.trackingAvailable ?? false,
      lastUpdated: data.lastUpdated ?? new Date(),
    }
  }

  // Fetch user adoption metrics from BigQuery
  const {
    data: metrics,
    isLoading,
  } = useBigQueryData<UserAdoptionMetrics, UserAdoptionMetrics>({
    queryName: 'user-adoption-summary',
    defaultData: EMPTY_ADOPTION,
    transformBigQueryData: transformUserAdoptionMetrics,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  const adoptionRate = metrics.totalUsers > 0 ? (metrics.activeUsers / metrics.totalUsers) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Active Users</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{metrics.activeUsers}</span>
                  <span className="text-sm text-muted-foreground">/ {metrics.totalUsers}</span>
                </div>
                <Progress value={adoptionRate} className="h-1.5 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{adoptionRate.toFixed(0)}% adoption</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New Users This Week</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{metrics.newUsersThisWeek}</span>
                  <TrendBadge value={15.3} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Eye className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Page Views</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {metrics.mostViewedDashboards.reduce((sum, d) => sum + d.views, 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">this week</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Viewed Dashboards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Most Viewed Dashboards
            </CardTitle>
            <CardDescription>Top 5 dashboards by page views this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.mostViewedDashboards.map((dashboard, index) => (
                <div key={dashboard.name} className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{dashboard.name}</span>
                      <span className="text-sm font-bold">{dashboard.views.toLocaleString()}</span>
                    </div>
                    <Progress
                      value={(dashboard.views / metrics.mostViewedDashboards[0].views) * 100}
                      className="h-1.5 mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Feature Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Feature Usage
            </CardTitle>
            <CardDescription>How users interact with platform features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.featureUsage.map(feature => {
                const maxUsage = Math.max(...metrics.featureUsage.map(f => f.usageCount))
                const usagePercent = maxUsage > 0 ? Math.round((feature.usageCount / maxUsage) * 100) : 0
                return (
                  <div key={feature.feature} className="flex items-center gap-3">
                    <FeatureIcon feature={feature.feature} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{feature.feature}</span>
                        <span className="text-xs text-muted-foreground">
                          {feature.usageCount} uses ({usagePercent}%)
                        </span>
                      </div>
                      <Progress value={usagePercent} className="h-1.5" />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Least Viewed Dashboards */}
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-yellow-500" />
            Least Viewed Dashboards
            <Badge variant="outline" className="ml-2 text-xs">Needs Attention</Badge>
          </CardTitle>
          <CardDescription>
            Consider investigating low adoption or deprecating unused dashboards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.mostViewedDashboards.slice().reverse().slice(0, 3).map(dashboard => (
              <div
                key={dashboard.name}
                className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800"
              >
                <div className="text-sm font-medium">{dashboard.name}</div>
                <div className="text-2xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">
                  {dashboard.views}
                </div>
                <div className="text-xs text-muted-foreground">views this week</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
