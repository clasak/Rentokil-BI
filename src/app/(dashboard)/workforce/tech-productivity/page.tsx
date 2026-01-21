'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ScatterChart, Scatter, ZAxis
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { Users, TrendingUp, Clock, DollarSign, Star, Target, Truck, Activity } from 'lucide-react'
import { generateMockTechnicians, generateMockTechProductivity } from '@/lib/mock/workforceData'
import type { Technician, TechProductivity } from '@/types/workforce'

export default function TechProductivityPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [productivity, setProductivity] = useState<TechProductivity[]>([])

  useEffect(() => {
    const techs = generateMockTechnicians(30)
    setTechnicians(techs)
    setProductivity(generateMockTechProductivity(techs, 'MTD'))
  }, [])

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    if (productivity.length === 0) return null
    const totalStops = productivity.reduce((sum, p) => sum + p.stopsCompleted, 0)
    const totalRevenue = productivity.reduce((sum, p) => sum + p.revenueGenerated, 0)
    const avgCompletionRate = productivity.reduce((sum, p) => sum + p.completionRate, 0) / productivity.length
    const avgRating = productivity.reduce((sum, p) => sum + p.customerRating, 0) / productivity.length
    const avgUtilization = productivity.reduce((sum, p) => sum + p.utilization, 0) / productivity.length
    const avgTimePerStop = productivity.reduce((sum, p) => sum + p.avgTimePerStop, 0) / productivity.length
    return { totalStops, totalRevenue, avgCompletionRate, avgRating, avgUtilization, avgTimePerStop }
  }, [productivity])

  // Top performers
  const topPerformers = useMemo(() => {
    return productivity.slice(0, 10)
  }, [productivity])

  // Productivity rankings chart
  const rankingsChart = useMemo(() => {
    return productivity.slice(0, 15).map(p => ({
      name: p.technicianName.split(' ')[0],
      revenue: p.revenueGenerated,
      stops: p.stopsCompleted,
      rating: p.customerRating,
    }))
  }, [productivity])

  // Efficiency scatter data
  const scatterData = useMemo(() => {
    return productivity.map(p => ({
      name: p.technicianName,
      x: p.stopsCompleted,
      y: p.revenueGenerated,
      z: p.customerRating * 20,
      utilization: p.utilization,
    }))
  }, [productivity])

  // Radar data for average tech metrics
  const radarData = useMemo(() => {
    if (!summaryMetrics) return []
    return [
      { metric: 'Completion Rate', value: summaryMetrics.avgCompletionRate * 100, fullMark: 100 },
      { metric: 'Customer Rating', value: (summaryMetrics.avgRating / 5) * 100, fullMark: 100 },
      { metric: 'Utilization', value: summaryMetrics.avgUtilization * 100, fullMark: 100 },
      { metric: 'First-Time Fix', value: 92, fullMark: 100 },
      { metric: 'On-Time Arrival', value: 88, fullMark: 100 },
    ]
  }, [summaryMetrics])

  const getPerformanceBadge = (percentile: number) => {
    if (percentile >= 90) return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Top 10%</Badge>
    if (percentile >= 75) return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Top 25%</Badge>
    if (percentile >= 50) return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Above Avg</Badge>
    return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">Below Avg</Badge>
  }

  const getSkillBadge = (level: string) => {
    switch (level) {
      case 'lead': return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Lead</Badge>
      case 'senior': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Senior</Badge>
      case 'junior': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Junior</Badge>
      default: return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">Trainee</Badge>
    }
  }

  if (!summaryMetrics) return <div className="flex items-center justify-center h-64">Loading...</div>

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Workforce', href: '/workforce/tech-productivity' },
        { label: 'Technician Productivity' }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Technician Productivity</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            MTD - Performance metrics and rankings
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Technicians</div>
                <div className="text-xl font-bold">{productivity.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Truck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Stops Completed</div>
                <div className="text-xl font-bold">{summaryMetrics.totalStops.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Revenue</div>
                <div className="text-xl font-bold">{formatCurrency(summaryMetrics.totalRevenue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Completion Rate</div>
                <div className="text-xl font-bold">{formatPercent(summaryMetrics.avgCompletionRate)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Avg Rating</div>
                <div className="text-xl font-bold">{summaryMetrics.avgRating.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Avg Time/Stop</div>
                <div className="text-xl font-bold">{summaryMetrics.avgTimePerStop.toFixed(0)}m</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productivity Rankings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performers - Revenue
            </CardTitle>
            <CardDescription>Revenue generated by technician</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingsChart} layout="vertical">
                  <defs>
                    <filter id="glow-productivity" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="name" width={60} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-green-600">Revenue: {formatCurrency(data.revenue)}</p>
                          <p className="text-sm">Stops: {data.stops}</p>
                          <p className="text-sm text-yellow-600">Rating: {data.rating.toFixed(2)}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} activeBar={{ filter: 'url(#glow-productivity)' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Team Performance Profile
            </CardTitle>
            <CardDescription>Average team performance across key metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Team Average" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} strokeWidth={2} />
                  <Legend />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{payload[0].payload.metric}</p>
                          <p className="text-sm">{typeof payload[0].value === 'number' ? payload[0].value.toFixed(1) : payload[0].value}%</p>
                        </div>
                      )
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stops vs Revenue Scatter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Efficiency Analysis
          </CardTitle>
          <CardDescription>Stops completed vs revenue generated (bubble size = customer rating)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="Stops" />
                <YAxis type="number" dataKey="y" name="Revenue" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Rating" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm">Stops: {data.x}</p>
                        <p className="text-sm text-green-600">Revenue: {formatCurrency(data.y)}</p>
                        <p className="text-sm text-yellow-600">Rating: {(data.z / 20).toFixed(2)}</p>
                        <p className="text-sm">Utilization: {formatPercent(data.utilization)}</p>
                      </div>
                    )
                  }}
                />
                <Scatter name="Technicians" data={scatterData} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Technician Rankings</CardTitle>
          <CardDescription>Complete productivity metrics for all technicians</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Skill Level</TableHead>
                <TableHead className="text-right">Stops</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Rev/Stop</TableHead>
                <TableHead className="text-right">Completion</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPerformers.map((p, i) => {
                const tech = technicians.find(t => t.id === p.technicianId)
                return (
                  <TableRow key={p.technicianId}>
                    <TableCell>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        i < 3 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {i + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{p.technicianName}</div>
                      <div className="text-xs text-gray-500">{p.technicianId}</div>
                    </TableCell>
                    <TableCell className="text-sm">{p.branchName}</TableCell>
                    <TableCell>{getSkillBadge(tech?.skillLevel || 'trainee')}</TableCell>
                    <TableCell className="text-right font-medium">{p.stopsCompleted}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(p.revenueGenerated)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.avgRevenuePerStop)}</TableCell>
                    <TableCell className="text-right">{formatPercent(p.completionRate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {p.customerRating.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatPercent(p.utilization)}</TableCell>
                    <TableCell>{getPerformanceBadge(p.percentile)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
