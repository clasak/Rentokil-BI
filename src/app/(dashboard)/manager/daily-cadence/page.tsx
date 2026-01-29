'use client'

import { useState, useEffect } from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Calendar,
  Users,
  Target,
  DollarSign,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import { useOrganizationData } from '@/hooks/useOrganizationData'
import type { BranchDaily } from '@/lib/bigquery/queries/branch'

// BigQuery display types
interface BranchDailyMetrics {
  branch_id: string
  branch_name: string
  leads: number
  sales: number
  close_rate: number
}

interface CadenceDisplayData {
  branches: BranchDailyMetrics[]
  totals: {
    totalLeads: number
    totalSales: number
    avgCloseRate: number
    branchCount: number
  }
}

// Empty default data
const EMPTY_CADENCE_DATA: CadenceDisplayData = {
  branches: [],
  totals: {
    totalLeads: 0,
    totalSales: 0,
    avgCloseRate: 0,
    branchCount: 0,
  },
}

// Transform BigQuery data
function transformBigQueryData(bqData: BranchDaily[]): CadenceDisplayData {
  if (!bqData || bqData.length === 0) return EMPTY_CADENCE_DATA

  const branches = bqData.map(row => ({
    branch_id: row.branch_id,
    branch_name: row.branch_name,
    leads: row.leads,
    sales: row.sales,
    close_rate: row.close_rate,
  }))

  const totals = {
    totalLeads: bqData.reduce((sum, b) => sum + b.leads, 0),
    totalSales: bqData.reduce((sum, b) => sum + b.sales, 0),
    avgCloseRate: bqData.reduce((sum, b) => sum + b.close_rate, 0) / bqData.length,
    branchCount: bqData.length,
  }

  return { branches, totals }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getWeekDates(weekOffset: number = 0): { start: Date; end: Date; dates: Date[] } {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const monday = new Date(today)
  monday.setDate(monday.getDate() - mondayOffset + (weekOffset * 7))

  const friday = new Date(monday)
  friday.setDate(friday.getDate() + 4)

  const dates: Date[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }

  return { start: monday, end: friday, dates }
}

export default function DailyCadencePage() {
  const [mounted, setMounted] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const [weekOffset, setWeekOffset] = useState(0)

  // Get regions from BigQuery organization data
  const { regions, isLoading: regionsLoading } = useOrganizationData()

  // Calculate days back from selected date
  const daysBackFromDate = Math.max(
    1,
    Math.floor((new Date().getTime() - new Date(selectedDate).getTime()) / (1000 * 60 * 60 * 24))
  )

  // BigQuery integration - fetch branch daily metrics
  const {
    data: cadenceData,
    isLoading: isBQLoading,
    dataSource,
    responseTime,
    refetch: refetchBQ,
  } = useBigQueryData<BranchDaily[], CadenceDisplayData>({
    queryName: 'branch-daily',
    filters: {
      region: selectedRegion,
      daysBack: daysBackFromDate + 1, // +1 to ensure we get the selected date
    },
    defaultData: EMPTY_CADENCE_DATA,
    transformBigQueryData,
    includeOrgFilters: false, // We're manually setting region
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Set initial region once data loads
  useEffect(() => {
    if (regions.length > 0 && !selectedRegion) {
      setSelectedRegion(regions[0].region_code)
    }
  }, [regions, selectedRegion])

  const handleExportCSV = () => {
    const headers = ['Branch Code', 'Branch Name', 'Leads', 'Sales', 'Close Rate %']
    const rows = cadenceData.branches.map(branch => [
      branch.branch_id,
      branch.branch_name,
      branch.leads.toString(),
      branch.sales.toString(),
      branch.close_rate.toFixed(1),
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-cadence-${selectedRegion}-${selectedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!mounted || regionsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
      </div>
    )
  }

  const week = getWeekDates(weekOffset)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Daily Cadence' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Branch Performance</h1>
          <p className="text-gray-500 dark:text-gray-400">Branch-level daily metrics and performance tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={refetchBQ} disabled={isBQLoading}>
            <RefreshCw className={`h-4 w-4 ${isBQLoading ? 'animate-spin' : ''}`} />
          </Button>
          <SearchableSelect
            options={regions.map(r => ({
              value: r.region_code,
              label: r.region_name,
              description: `${r.branch_count} branches`
            }))}
            value={selectedRegion}
            onValueChange={setSelectedRegion}
            placeholder="Select Region"
            searchPlaceholder="Search regions..."
            className="w-64"
          />
          <Button variant="outline" onClick={handleExportCSV} disabled={cadenceData.branches.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                Week of {week.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {week.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset(w => w + 1)}
                disabled={weekOffset >= 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              {week.dates.map(date => {
                const dateStr = formatDate(date)
                const isSelected = dateStr === selectedDate
                const isToday = dateStr === formatDate(new Date())

                return (
                  <Button
                    key={dateStr}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDate(dateStr)}
                    className={`min-w-[80px] ${isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span>{date.getDate()}</span>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Region Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Branches</span>
            </div>
            <p className="text-2xl font-bold mt-1">{cadenceData.totals.branchCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Leads</span>
            </div>
            <p className="text-2xl font-bold mt-1">{cadenceData.totals.totalLeads.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Sales</span>
            </div>
            <p className="text-2xl font-bold mt-1">{cadenceData.totals.totalSales.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Avg Close Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">{cadenceData.totals.avgCloseRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isBQLoading ? (
            <div className="p-8 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : cadenceData.branches.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No data available for the selected date and region.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800">
                    <TableHead className="w-[80px]">Code</TableHead>
                    <TableHead className="min-w-[200px]">Branch Name</TableHead>
                    <TableHead className="w-[100px] text-right">Leads</TableHead>
                    <TableHead className="w-[100px] text-right">Sales</TableHead>
                    <TableHead className="w-[120px] text-right">Close Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cadenceData.branches.map((branch) => {
                    const closeRateColor =
                      branch.close_rate >= 30 ? 'text-green-600 dark:text-green-400' :
                      branch.close_rate >= 20 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'

                    return (
                      <TableRow key={branch.branch_id}>
                        <TableCell className="font-mono text-sm">{branch.branch_id}</TableCell>
                        <TableCell>
                          <p className="font-medium">{branch.branch_name}</p>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {branch.leads.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {branch.sales.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${closeRateColor}`}>
                          {branch.close_rate.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-600 dark:bg-green-400 rounded" />
                <span>Close rate &ge; 30%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-600 dark:bg-yellow-400 rounded" />
                <span>Close rate 20-30%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 dark:bg-red-400 rounded" />
                <span>Close rate &lt; 20%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Data refreshes automatically from BigQuery | Close rate = Sales / Leads
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
