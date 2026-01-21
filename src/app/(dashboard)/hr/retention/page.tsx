'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'
import { formatPercent } from '@/lib/utils'
import { Users, TrendingUp, TrendingDown, AlertTriangle, UserMinus, UserPlus, Target } from 'lucide-react'
import {
  generateMockRetentionMetrics,
  generateMockRetentionBySegment,
  generateMockTerminationReasons,
  generateMockHeadcountSummary
} from '@/lib/mock/hrData'
import type { RetentionMetrics, RetentionBySegment, TerminationReason, HeadcountSummary } from '@/types/hr'

export default function RetentionPage() {
  const [retention, setRetention] = useState<RetentionMetrics | null>(null)
  const [byDepartment, setByDepartment] = useState<RetentionBySegment[]>([])
  const [terminationReasons, setTerminationReasons] = useState<TerminationReason[]>([])
  const [headcount, setHeadcount] = useState<HeadcountSummary | null>(null)

  useEffect(() => {
    setRetention(generateMockRetentionMetrics('MTD'))
    setByDepartment(generateMockRetentionBySegment('department'))
    setTerminationReasons(generateMockTerminationReasons())
    setHeadcount(generateMockHeadcountSummary())
  }, [])

  // Department retention chart data
  const deptChartData = useMemo(() => {
    return byDepartment.map(d => ({
      department: d.segment.charAt(0).toUpperCase() + d.segment.slice(1).replace('_', ' '),
      turnover: d.turnoverRate * 100,
      retention: d.retentionRate * 100,
      headcount: d.headcount,
      risk: d.riskLevel,
    }))
  }, [byDepartment])

  // Termination reasons pie chart data
  const reasonsChartData = useMemo(() => {
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6']
    return terminationReasons.map((r, i) => ({
      name: r.reason,
      value: r.count,
      category: r.category,
      fill: colors[i % colors.length]
    }))
  }, [terminationReasons])

  // Simulated headcount trend data
  const headcountTrend = useMemo(() => {
    if (!headcount) return []
    const baseHeadcount = headcount.totalHeadcount
    return Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2024, i).toLocaleDateString('en-US', { month: 'short' }),
      headcount: Math.round(baseHeadcount * (0.95 + Math.random() * 0.1)),
      hires: Math.round(Math.random() * 15 + 5),
      terminations: Math.round(Math.random() * 10 + 2),
    }))
  }, [headcount])

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'high': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">High Risk</Badge>
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Medium Risk</Badge>
      default: return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Low Risk</Badge>
    }
  }

  if (!retention || !headcount) return <div className="flex items-center justify-center h-64">Loading...</div>

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'HR', href: '/people' },
        { label: 'Retention' }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HR Retention Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {retention.period} - Workforce retention and turnover analysis
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Headcount</div>
                <div className="text-2xl font-bold">{retention.endingHeadcount}</div>
                <div className={`text-xs ${retention.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {retention.netChange >= 0 ? '+' : ''}{retention.netChange} net change
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Retention Rate</div>
                <div className="text-2xl font-bold text-green-600">{formatPercent(retention.retentionRate)}</div>
                <div className="text-xs text-gray-500">Target: {formatPercent(1 - retention.companyTarget!)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Turnover Rate</div>
                <div className="text-2xl font-bold text-red-600">{formatPercent(retention.turnoverRate)}</div>
                <div className="text-xs text-gray-500">Industry: {formatPercent(retention.industryBenchmark!)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Hires</div>
                <div className="text-2xl font-bold text-purple-600">{retention.hires}</div>
                <div className="text-xs text-gray-500">This period</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <UserMinus className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Terminations</div>
                <div className="text-2xl font-bold text-orange-600">{retention.terminations}</div>
                <div className="text-xs text-gray-500">
                  {retention.voluntaryTerminations} voluntary
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retention by Department */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Turnover by Department
            </CardTitle>
            <CardDescription>Annualized turnover rate by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData} layout="vertical">
                  <defs>
                    <filter id="glow-retention" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} domain={[0, 50]} />
                  <YAxis type="category" dataKey="department" width={100} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{data.department}</p>
                          <p className="text-sm text-red-600">Turnover: {data.turnover.toFixed(1)}%</p>
                          <p className="text-sm text-green-600">Retention: {data.retention.toFixed(1)}%</p>
                          <p className="text-xs text-gray-500">{data.headcount} employees</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="turnover" fill="#ef4444" radius={[0, 4, 4, 0]} activeBar={{ filter: 'url(#glow-retention)' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Termination Reasons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Termination Reasons
            </CardTitle>
            <CardDescription>Breakdown of termination causes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reasonsChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {reasonsChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm">{data.value} terminations</p>
                          <p className="text-xs text-gray-500 capitalize">{data.category}</p>
                        </div>
                      )
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Headcount Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Headcount Trend
          </CardTitle>
          <CardDescription>12-month headcount with hires and terminations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={headcountTrend}>
                <defs>
                  <linearGradient id="headcountfill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" domain={['dataMin - 10', 'dataMax + 10']} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 5']} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (!active || !payload) return null
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                        <p className="font-medium mb-2">{label}</p>
                        {payload.map((entry: any, i: number) => (
                          <p key={i} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {entry.value}
                          </p>
                        ))}
                      </div>
                    )
                  }}
                />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="headcount" stroke="#3b82f6" fill="url(#headcountfill)" name="Headcount" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="hires" stroke="#22c55e" name="Hires" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="terminations" stroke="#ef4444" name="Terminations" strokeWidth={2} dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Department Risk Table */}
      <Card>
        <CardHeader>
          <CardTitle>Department Retention Analysis</CardTitle>
          <CardDescription>Detailed retention metrics by department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {byDepartment.map((dept, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium capitalize">{dept.segment.replace('_', ' ')}</div>
                    <div className="text-sm text-gray-500">{dept.headcount} employees</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Turnover</div>
                    <div className={`font-bold ${dept.turnoverRate > 0.25 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPercent(dept.turnoverRate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Avg Tenure</div>
                    <div className="font-bold">{dept.avgTenure.toFixed(1)} mo</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">vs Company</div>
                    <div className={`font-bold ${dept.vsCompanyAvg <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dept.vsCompanyAvg > 0 ? '+' : ''}{(dept.vsCompanyAvg * 100).toFixed(1)}%
                    </div>
                  </div>
                  {getRiskBadge(dept.riskLevel)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
