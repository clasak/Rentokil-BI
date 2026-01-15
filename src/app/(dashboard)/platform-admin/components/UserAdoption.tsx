"use client"

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Users, UserPlus, Eye, TrendingUp, TrendingDown,
  Download, GitBranch, Search, Moon, Presentation
} from 'lucide-react'
import { UserAdoptionMetrics } from '@/lib/platform-admin-data'

interface UserAdoptionProps {
  metrics: UserAdoptionMetrics
}

export function UserAdoption({ metrics }: UserAdoptionProps) {
  const adoptionRate = (metrics.activeUsers / metrics.totalUsers) * 100

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          User Adoption Metrics
        </CardTitle>
        <CardDescription>User engagement and feature utilization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Active Users</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {metrics.activeUsers}/{metrics.totalUsers}
                </div>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
            <Progress value={adoptionRate} className="h-2 mt-3" />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {adoptionRate.toFixed(1)}% adoption rate
            </div>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-600 dark:text-green-400">New This Week</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  +{metrics.newUsersThisWeek}
                </div>
              </div>
              <UserPlus className="h-8 w-8 text-green-500 opacity-50" />
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              6% increase from last week
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg. Session</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  12.4 min
                </div>
              </div>
              <Eye className="h-8 w-8 text-primary opacity-50" />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Target: 10+ minutes
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Most Viewed Dashboards */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Most Viewed Dashboards
            </h4>
            <div className="space-y-2">
              {metrics.mostViewedDashboards.map((dashboard, index) => (
                <div
                  key={dashboard.name}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-5">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {dashboard.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {dashboard.views.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {dashboard.uniqueUsers} users
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Least Viewed Dashboards */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Needs Attention
            </h4>
            <div className="space-y-2">
              {metrics.leastViewedDashboards.map((dashboard) => (
                <div
                  key={dashboard.name}
                  className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                >
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {dashboard.name}
                  </span>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      {dashboard.views}
                    </div>
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      {dashboard.uniqueUsers} users
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Consider reviewing these dashboards for user experience improvements
            </p>
          </div>
        </div>

        {/* Feature Usage */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Feature Usage Stats
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {metrics.featureUsage.map((feature) => {
              const Icon = getFeatureIcon(feature.feature)
              return (
                <div
                  key={feature.feature}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center"
                >
                  <Icon className="h-5 w-5 mx-auto text-primary mb-2" />
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {feature.feature}
                  </div>
                  <div className="text-lg font-bold text-primary mt-1">
                    {feature.usagePercent}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {feature.usageCount.toLocaleString()} uses
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
