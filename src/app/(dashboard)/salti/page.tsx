"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  RefreshCw, Download, BarChart3, Calendar, AlertTriangle, FileText, ExternalLink, Mail
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { SALTIOverview } from '@/lib/bigquery/queries/salti'
import { PageSkeleton } from '@/components/ui/skeleton-loader'

// BigQuery display types
interface SALTIDisplay {
  overview: {
    mqlCount: number
    sqlCount: number
    scheduledCount: number
    inspectedCount: number
    proposedCount: number
    soldCount: number
    closeRate: number
    scheduleRate: number
    winRate: number
  }
}

// Transform BigQuery data
function transformBigQueryData(bqData: SALTIOverview[]): SALTIDisplay {
  const safeData = bqData || []
  // Aggregate across all reps
  const totals = safeData.reduce((acc, rep) => ({
    mqlCount: acc.mqlCount + (rep.mql_count || 0),
    sqlCount: acc.sqlCount + (rep.sql_count || 0),
    scheduledCount: acc.scheduledCount + (rep.scheduled_count || 0),
    inspectedCount: acc.inspectedCount + (rep.inspected_count || 0),
    proposedCount: acc.proposedCount + (rep.proposed_count || 0),
    soldCount: acc.soldCount + (rep.sold_count || 0),
  }), { mqlCount: 0, sqlCount: 0, scheduledCount: 0, inspectedCount: 0, proposedCount: 0, soldCount: 0 })

  const avgCloseRate = safeData.length > 0
    ? safeData.reduce((sum, r) => sum + (r.close_rate || 0), 0) / safeData.length
    : 0
  const avgScheduleRate = safeData.length > 0
    ? safeData.reduce((sum, r) => sum + (r.schedule_rate || 0), 0) / safeData.length
    : 0
  const avgWinRate = safeData.length > 0
    ? safeData.reduce((sum, r) => sum + (r.win_rate || 0), 0) / safeData.length
    : 0

  return {
    overview: {
      ...totals,
      closeRate: avgCloseRate,
      scheduleRate: avgScheduleRate,
      winRate: avgWinRate,
    }
  }
}

// Empty default data for BigQuery
const EMPTY_SALTI_OVERVIEW: SALTIDisplay = {
  overview: {
    mqlCount: 0,
    sqlCount: 0,
    scheduledCount: 0,
    inspectedCount: 0,
    proposedCount: 0,
    soldCount: 0,
    closeRate: 0,
    scheduleRate: 0,
    winRate: 0,
  }
}

export default function SALTIPage() {
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('mtd')

  // BigQuery integration for overview metrics
  const {
    data: bqOverview,
    isLoading,
    dataSource,
    responseTime,
    error,
    errorType,
    refetch,
  } = useBigQueryData<SALTIOverview[], SALTIDisplay>({
    queryName: 'salti-overview',
    filters: { daysBack: 30 },
    defaultData: EMPTY_SALTI_OVERVIEW,
    transformBigQueryData,
    includeOrgFilters: true,  // Include market/region/branch filters from UI
    includeRoleFilters: false, // SALTI is an overview dashboard - don't filter by individual user
  })

  const handleRefresh = () => {
    refetch()
  }

  if (isLoading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumbs */}
      <PageHeader
        title="SALTI Dashboard"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'SALTI Dashboard' },
        ]}
        dataSource={dataSource}
        responseTime={responseTime}
        error={error}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      >
        <Select value={selectedTimePeriod} onValueChange={setSelectedTimePeriod}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wtd">Week to Date</SelectItem>
            <SelectItem value="mtd">Month to Date</SelectItem>
            <SelectItem value="qtd">Quarter to Date</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </PageHeader>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Error Loading SALTI Overview</span>
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
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">salti-overview</p>
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
                onClick={() => window.location.href = `mailto:support@rentokil.com?subject=SALTI Dashboard Error&body=Error: ${encodeURIComponent(error || 'Unknown error')}\nQuery: salti-overview\nType: ${errorType || 'Unknown'}`}
              >
                <Mail className="h-3 w-3 mr-1.5" />
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SALTI Overview - BigQuery Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            SALTI Lead Funnel Overview
          </CardTitle>
          <CardDescription>
            Marketing Qualified Leads to Sold conversions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div id="salti-lead-funnel" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-muted-foreground">MQL</p>
              <p className="text-2xl font-bold">{bqOverview.overview.mqlCount.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-muted-foreground">SQL</p>
              <p className="text-2xl font-bold">{bqOverview.overview.sqlCount.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-bold">{bqOverview.overview.scheduledCount.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Inspected</p>
              <p className="text-2xl font-bold">{bqOverview.overview.inspectedCount.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Proposed</p>
              <p className="text-2xl font-bold">{bqOverview.overview.proposedCount.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Sold</p>
              <p className="text-2xl font-bold">{bqOverview.overview.soldCount.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Close Rate</p>
              <p className="text-2xl font-bold">{bqOverview.overview.closeRate.toFixed(1)}%</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Schedule Rate</p>
              <p className="text-2xl font-bold">{bqOverview.overview.scheduleRate.toFixed(1)}%</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold">{bqOverview.overview.winRate.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation to Detail Pages */}
      <div id="salti-nav-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/salti/daily-check-in'}>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Daily Check-In</h3>
            <p className="text-sm text-muted-foreground">View daily rep activity and goal attainment</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/salti/productivity'}>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Rep Productivity</h3>
            <p className="text-sm text-muted-foreground">Performance metrics and rankings</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/salti/sales-ladders'}>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Sales Leaderboard</h3>
            <p className="text-sm text-muted-foreground">Rep rankings with revenue and deals</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/salti/yoy-trends'}>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Year-over-Year</h3>
            <p className="text-sm text-muted-foreground">Compare metrics vs prior year</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/salti/funnel-fallout'}>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Funnel Fallout</h3>
            <p className="text-sm text-muted-foreground">Conversion and drop-off analysis</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/salti/weekend-blitz'}>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Weekend Blitz</h3>
            <p className="text-sm text-muted-foreground">Campaign tracking with goals vs actuals</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/salti/proposal-pipeline'}>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Proposal Pipeline</h3>
            <p className="text-sm text-muted-foreground">Proposals by status with values</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
