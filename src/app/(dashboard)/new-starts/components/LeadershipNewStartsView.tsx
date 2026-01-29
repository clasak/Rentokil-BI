'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Clock,
  CheckCircle,
  Truck,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Package,
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import { useAppStore } from '@/store'
import type { NewStartRecord, NewStartsSummary } from '@/lib/bigquery/queries/new-starts'

// Empty defaults
const EMPTY_ENTRIES: NewStartRecord[] = []
const EMPTY_SUMMARY: NewStartsSummary = {
  total: 0,
  pendingOps: 0,
  scheduled: 0,
  confirmed: 0,
  inProgress: 0,
  completed: 0,
  onHold: 0,
  totalInitialValue: 0,
  totalContractValue: 0,
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

interface SalesByPerson {
  salesPerson: string
  total: number
  pending: number
  completed: number
  totalValue: number
}

/**
 * Leadership New Starts View
 *
 * Executive and management view with aggregated metrics
 * - High-level KPIs and trends
 * - Breakdown by sales rep and branch
 * - Pipeline value and completion rates
 */
export default function LeadershipNewStartsView() {
  const { organizationFilters } = useAppStore()
  const [dateRange] = useState('30days')

  // Fetch summary metrics
  const {
    data: summary,
    isLoading: summaryLoading,
    dataSource,
    responseTime,
  } = useBigQueryData<NewStartsSummary, NewStartsSummary>({
    queryName: 'new-starts-summary',
    filters: {
      market: organizationFilters.selectedMarket,
      region: organizationFilters.selectedRegion,
      branch: organizationFilters.selectedBranch,
      daysBack: dateRange === '30days' ? 30 : 90,
    },
    defaultData: EMPTY_SUMMARY,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true,
  })

  // Fetch sales rep breakdown
  const {
    data: salesByPerson,
    isLoading: salesLoading,
  } = useBigQueryData<SalesByPerson[], SalesByPerson[]>({
    queryName: 'new-starts-by-sales-person',
    filters: {
      market: organizationFilters.selectedMarket,
      region: organizationFilters.selectedRegion,
      branch: organizationFilters.selectedBranch,
      daysBack: dateRange === '30days' ? 30 : 90,
      limit: 20,
    },
    defaultData: [],
    transformBigQueryData: (data) => data,
    includeOrgFilters: true,
  })

  const isLoading = summaryLoading || salesLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  // Calculate derived metrics
  const completionRate = summary.total > 0
    ? ((summary.completed / summary.total) * 100).toFixed(1)
    : '0.0'

  const avgContractValue = summary.total > 0
    ? summary.totalContractValue / summary.total
    : 0

  const activeNewStarts = summary.scheduled + summary.confirmed + summary.inProgress

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Starts Overview</h1>
          <p className="text-gray-500 dark:text-gray-400">Executive view of new customer installations pipeline</p>
        </div>
        <DataSourceBadge status={dataSource} responseTime={responseTime} />
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Total New Starts</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{summary.total}</p>
              <span className="text-sm text-gray-500">last 30d</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Pending Operations</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-amber-600">{summary.pendingOps}</p>
              <span className="text-sm text-gray-500">
                {summary.total > 0 ? `${((summary.pendingOps / summary.total) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Active Installations</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-purple-600">{activeNewStarts}</p>
              <span className="text-sm text-gray-500">in progress</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-green-600">{completionRate}%</p>
              <span className="text-sm text-gray-500">completed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalInitialValue + summary.totalContractValue)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Initial + Contract Value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Avg Contract Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(avgContractValue)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Per new start
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              Pending Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency((summary.totalInitialValue + summary.totalContractValue) * (summary.pendingOps / Math.max(summary.total, 1)))}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Awaiting installation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Installation Pipeline Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <p className="text-3xl font-bold text-red-600">{summary.pendingOps}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pending Ops</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{summary.scheduled}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Scheduled</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{summary.confirmed}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Confirmed</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{summary.inProgress}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">In Progress</p>
            </div>
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
              <p className="text-3xl font-bold text-emerald-600">{summary.completed}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Rep Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">New Starts by Sales Rep</CardTitle>
            </div>
            <Badge variant="secondary">{salesByPerson.length} reps</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">Completion %</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesByPerson.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No sales data available
                    </TableCell>
                  </TableRow>
                ) : (
                  salesByPerson.map((rep, idx) => {
                    const completionPct = rep.total > 0 ? ((rep.completed / rep.total) * 100).toFixed(0) : '0'
                    return (
                      <TableRow key={`${rep.salesPerson}-${idx}`}>
                        <TableCell className="font-medium">{rep.salesPerson}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{rep.total}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {rep.pending > 0 ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400">
                              {rep.pending}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {rep.completed > 0 ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400">
                              {rep.completed}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${parseInt(completionPct) >= 80 ? 'text-green-600 dark:text-green-400' : parseInt(completionPct) >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                            {completionPct}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(rep.totalValue)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Info Footer */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 dark:text-blue-400 mt-1">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                New Starts Pipeline Overview
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                This dashboard shows the handoff process from Sales to Operations. Pending items require ops manager assignment.
                Use organization filters to view specific markets, regions, or branches.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
