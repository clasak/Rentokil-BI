"use client"

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { getTechnicianCapacity, getBranches, getUsers } from '@/lib/data'
import { calculateKPIValues } from '@/lib/kpi-calculations'
import { KPICard } from '@/components/features/KPICard'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import {
  Users, MapPin, Clock, AlertTriangle, TrendingUp, DollarSign,
  TrendingDown, AlertCircle
} from 'lucide-react'
import { KPIValue, TechnicianCapacity } from '@/types'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type {
  LaborCostAnalysis,
  OvertimeTrend,
  RevenuePerLaborDollar,
  CompensationBenchmark
} from '@/lib/bigquery/queries/payroll'

// Empty states for BigQuery data
const EMPTY_LABOR_COST: LaborCostAnalysis[] = []
const EMPTY_OVERTIME: OvertimeTrend[] = []
const EMPTY_REVENUE_PER_DOLLAR: RevenuePerLaborDollar[] = []
const EMPTY_BENCHMARKS: CompensationBenchmark[] = []

export default function PeoplePage() {
  const [mounted, setMounted] = useState(false)
  const { settings } = useAppStore()
  const [capacity, setCapacity] = useState<TechnicianCapacity[]>([])
  const [kpiValues, setKpiValues] = useState<Map<string, KPIValue>>(new Map())

  useEffect(() => {
    setMounted(true)
    setCapacity(getTechnicianCapacity())
    setKpiValues(calculateKPIValues(settings.role, settings.userId))
  }, [settings])

  // BigQuery data for payroll analytics
  const {
    data: laborCostData,
    isLoading: laborCostLoading,
    dataSource: laborCostSource,
  } = useBigQueryData<LaborCostAnalysis[], LaborCostAnalysis[]>({
    queryName: 'labor-cost-analysis',
    filters: { daysBack: 90 },
    defaultData: EMPTY_LABOR_COST,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true,
    includeRoleFilters: true,
  })

  const {
    data: overtimeData,
    isLoading: overtimeLoading,
  } = useBigQueryData<OvertimeTrend[], OvertimeTrend[]>({
    queryName: 'overtime-trends',
    filters: { daysBack: 365 },
    defaultData: EMPTY_OVERTIME,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true,
    includeRoleFilters: true,
  })

  const {
    data: revPerDollarData,
    isLoading: revPerDollarLoading,
  } = useBigQueryData<RevenuePerLaborDollar[], RevenuePerLaborDollar[]>({
    queryName: 'revenue-per-labor-dollar',
    filters: { daysBack: 90 },
    defaultData: EMPTY_REVENUE_PER_DOLLAR,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true,
    includeRoleFilters: true,
  })

  const {
    data: benchmarksData,
    isLoading: benchmarksLoading,
  } = useBigQueryData<CompensationBenchmark[], CompensationBenchmark[]>({
    queryName: 'compensation-benchmarks',
    filters: { daysBack: 90 },
    defaultData: EMPTY_BENCHMARKS,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true,
    includeRoleFilters: true,
  })

  // Calculate summary metrics from labor cost data
  const latestLaborCost = laborCostData[0] || null
  const totalLaborCost = latestLaborCost?.total_labor_cost || 0
  const avgHourlyRate = latestLaborCost?.avg_hourly_rate || 0
  const laborCostChange = latestLaborCost?.change_from_prior_month || 0

  // Calculate overtime percentage
  const latestOvertime = overtimeData[0] || null
  const overtimePct = latestOvertime?.overtime_pct_of_total || 0

  // Calculate revenue per labor dollar
  const latestRevPerDollar = revPerDollarData[0] || null
  const revPerDollar = latestRevPerDollar?.revenue_per_labor_dollar || 0
  const efficiencyRating = latestRevPerDollar?.efficiency_rating || 'N/A'

  const peopleKpis = ['capacity_utilization', 'scheduling_pressure_index']
  const branches = getBranches()
  const users = getUsers()

  // Get recent capacity data
  const today = new Date()
  const recentCapacity = capacity.filter(c =>
    c.date >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) &&
    c.date <= today
  )

  // Branch utilization summary
  const branchUtilization = branches.map(branch => {
    const branchCap = recentCapacity.filter(c => c.branchId === branch.id)
    const avgUtilization = branchCap.length > 0
      ? branchCap.reduce((sum, c) => sum + c.utilization, 0) / branchCap.length
      : 0
    const overutilizedDays = branchCap.filter(c => c.utilization > 1).length
    const totalHours = branchCap.reduce((sum, c) => sum + c.availableHours, 0)
    const usedHours = branchCap.reduce((sum, c) => sum + c.usedHours, 0)

    return {
      id: branch.id,
      name: branch.name,
      market: branch.name.split(' - ')[0],
      utilization: avgUtilization,
      overutilizedDays,
      totalHours,
      usedHours,
      techCount: new Set(branchCap.map(c => c.technicianId)).size,
    }
  }).sort((a, b) => b.utilization - a.utilization)

  // Weekly heatmap data (simulated) - use deterministic values based on branch index
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const heatmapData = mounted ? branches.slice(0, 8).map((branch, branchIndex) => ({
    branch: branch.name.split(' - ')[1] || branch.name,
    ...daysOfWeek.reduce((acc, day, dayIndex) => ({
      ...acc,
      [day]: 60 + ((branchIndex * 7 + dayIndex * 13 + 17) % 50)
    }), {})
  })) : []

  // Capacity distribution chart
  const capacityDistribution = [
    { range: '<60%', count: branchUtilization.filter(b => b.utilization < 0.6).length, fill: '#3b82f6' },
    { range: '60-80%', count: branchUtilization.filter(b => b.utilization >= 0.6 && b.utilization < 0.8).length, fill: '#22c55e' },
    { range: '80-95%', count: branchUtilization.filter(b => b.utilization >= 0.8 && b.utilization < 0.95).length, fill: '#84cc16' },
    { range: '95-100%', count: branchUtilization.filter(b => b.utilization >= 0.95 && b.utilization <= 1).length, fill: '#f59e0b' },
    { range: '>100%', count: branchUtilization.filter(b => b.utilization > 1).length, fill: '#ef4444' },
  ]

  const getUtilizationColor = (util: number): string => {
    if (util > 1) return 'text-red-600'
    if (util > 0.95) return 'text-orange-600'
    if (util > 0.8) return 'text-green-600'
    if (util > 0.6) return 'text-blue-600'
    return 'text-gray-600'
  }

  const getUtilizationBadge = (util: number) => {
    if (util > 1) return <Badge variant="danger">Overutilized</Badge>
    if (util > 0.95) return <Badge variant="warning">At Capacity</Badge>
    if (util > 0.8) return <Badge variant="success">Optimal</Badge>
    return <Badge variant="secondary">Underutilized</Badge>
  }

  const getEfficiencyBadgeVariant = (rating: string) => {
    if (rating === 'Excellent') return 'success'
    if (rating === 'Good') return 'default'
    if (rating === 'Fair') return 'warning'
    return 'danger'
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'People' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">People & Capacity</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Workforce utilization, labor costs, and compensation analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={laborCostSource} />
        </div>
      </div>

      <Tabs defaultValue="capacity" className="w-full">
        <TabsList>
          <TabsTrigger value="capacity">Capacity & Utilization</TabsTrigger>
          <TabsTrigger value="payroll">Labor Cost Analytics</TabsTrigger>
        </TabsList>

        {/* CAPACITY TAB */}
        <TabsContent value="capacity" className="space-y-6 mt-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {peopleKpis.map(slug => {
              const kpiValue = kpiValues.get(slug)
              if (!kpiValue) return null
              return <KPICard key={slug} kpiValue={kpiValue} />
            })}

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Total Technicians</div>
                    <div className="text-2xl font-bold">
                      {users.filter(u => u.title?.includes('Technician') || u.title?.includes('Specialist')).length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Overutilized Branches</div>
                    <div className="text-2xl font-bold text-red-600">
                      {branchUtilization.filter(b => b.utilization > 1).length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Capacity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Capacity Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={capacityDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip cursor={false} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {capacityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Scheduling Pressure Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Weekly Scheduling Pressure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left pb-2">Branch</th>
                        {daysOfWeek.map(day => (
                          <th key={day} className="text-center pb-2 w-12">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.map((row, i) => (
                        <tr key={i}>
                          <td className="py-1 pr-2 text-gray-700 dark:text-gray-300 truncate max-w-[100px]">{row.branch}</td>
                          {daysOfWeek.map(day => {
                            const value = (row as Record<string, string | number>)[day] as number
                            const bgColor = value > 100 ? 'bg-red-500' :
                                           value > 90 ? 'bg-orange-400' :
                                           value > 75 ? 'bg-yellow-400' :
                                           value > 60 ? 'bg-green-400' :
                                           'bg-blue-400'
                            return (
                              <td key={day} className="p-1">
                                <div
                                  className={`w-10 h-8 rounded flex items-center justify-center text-xs font-medium text-white ${bgColor}`}
                                  title={`${value.toFixed(0)}%`}
                                >
                                  {value.toFixed(0)}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-blue-400 rounded" />
                    <span>&lt;60%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-green-400 rounded" />
                    <span>60-75%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-yellow-400 rounded" />
                    <span>75-90%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-orange-400 rounded" />
                    <span>90-100%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-red-500 rounded" />
                    <span>&gt;100%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Branch Utilization Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Branch Capacity Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Market</TableHead>
                    <TableHead className="text-right">Technicians</TableHead>
                    <TableHead className="text-right">Used / Available Hours</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead className="text-right">Overutilized Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchUtilization.slice(0, 15).map(branch => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name.split(' - ')[1] || branch.name}</TableCell>
                      <TableCell className="text-gray-500">{branch.market}</TableCell>
                      <TableCell className="text-right">{branch.techCount}</TableCell>
                      <TableCell className="text-right">
                        {branch.usedHours.toFixed(0)} / {branch.totalHours.toFixed(0)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={Math.min(branch.utilization * 100, 120)}
                            className="w-24 h-2"
                          />
                          <span className={`text-sm font-medium ${getUtilizationColor(branch.utilization)}`}>
                            {(branch.utilization * 100).toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={branch.overutilizedDays > 0 ? 'text-red-600 font-medium' : ''}>
                          {branch.overutilizedDays}
                        </span>
                      </TableCell>
                      <TableCell>{getUtilizationBadge(branch.utilization)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYROLL TAB */}
        <TabsContent value="payroll" className="space-y-6 mt-6">
          {/* Labor Cost KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Labor Cost</div>
                    <div className="text-2xl font-bold">
                      {laborCostLoading ? '...' : `$${(totalLaborCost / 1000).toFixed(0)}K`}
                    </div>
                    {!laborCostLoading && laborCostChange !== 0 && (
                      <div className={`text-xs flex items-center gap-1 ${laborCostChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {laborCostChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(laborCostChange)}% MoM
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Average Hourly Rate</div>
                    <div className="text-2xl font-bold">
                      {laborCostLoading ? '...' : `$${avgHourlyRate.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    overtimePct > 15 ? 'bg-red-100 dark:bg-red-900' : 'bg-yellow-100 dark:bg-yellow-900'
                  }`}>
                    {overtimePct > 15 ? (
                      <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    ) : (
                      <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Overtime % of Total</div>
                    <div className={`text-2xl font-bold ${overtimePct > 15 ? 'text-red-600' : ''}`}>
                      {overtimeLoading ? '...' : `${overtimePct.toFixed(1)}%`}
                    </div>
                    {!overtimeLoading && overtimePct > 15 && (
                      <div className="text-xs text-red-600">Above 15% threshold</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Revenue per Labor Dollar</div>
                    <div className="text-2xl font-bold">
                      {revPerDollarLoading ? '...' : `$${revPerDollar.toFixed(2)}`}
                    </div>
                    {!revPerDollarLoading && (
                      <Badge variant={getEfficiencyBadgeVariant(efficiencyRating)} className="mt-1">
                        {efficiencyRating}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overtime Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Overtime Trends (12 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overtimeLoading ? (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Loading overtime data...
                  </div>
                ) : overtimeData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    No overtime data available
                  </div>
                ) : (
                  <div className="h-64 [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overtimeData.slice().reverse()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip cursor={false} />
                        <Line
                          type="monotone"
                          dataKey="overtime_pct_of_total"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ fill: '#f59e0b' }}
                          name="Overtime %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue per Labor Dollar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Labor Efficiency (Revenue per $1 Labor)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revPerDollarLoading ? (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Loading efficiency data...
                  </div>
                ) : revPerDollarData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    No efficiency data available
                  </div>
                ) : (
                  <div className="h-64 [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revPerDollarData.slice().reverse()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip cursor={false} />
                        <Line
                          type="monotone"
                          dataKey="revenue_per_labor_dollar"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={{ fill: '#8b5cf6' }}
                          name="$/Labor $"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Compensation Benchmarks Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Compensation Benchmarks by Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              {benchmarksLoading ? (
                <div className="py-12 text-center text-gray-500">
                  Loading compensation data...
                </div>
              ) : benchmarksData.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  No compensation data available
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Market</TableHead>
                      <TableHead className="text-right">Avg Rate</TableHead>
                      <TableHead className="text-right">Min Rate</TableHead>
                      <TableHead className="text-right">Max Rate</TableHead>
                      <TableHead className="text-right">Median Rate</TableHead>
                      <TableHead className="text-right">Employee Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {benchmarksData.slice(0, 20).map((benchmark, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{benchmark.position_title}</TableCell>
                        <TableCell className="text-gray-500">{benchmark.market}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${benchmark.avg_hourly_rate.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-gray-500">
                          ${benchmark.min_hourly_rate.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-gray-500">
                          ${benchmark.max_hourly_rate.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ${benchmark.median_hourly_rate.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-gray-500">
                          {benchmark.employee_count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
