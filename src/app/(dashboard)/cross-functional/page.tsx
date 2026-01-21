'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import {
  Layers,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Building,
  Briefcase,
  Headphones,
  PieChart,
} from 'lucide-react'
import { ChartTooltip } from '@/components/features/ChartTooltip'
import { formatCurrency, formatPercent } from '@/lib/utils'

// Cross-functional KPI definitions
interface CrossFunctionalKPI {
  id: string
  name: string
  value: number
  target: number
  format: 'currency' | 'percent' | 'number'
  departments: string[]
  trend: 'up' | 'down' | 'stable'
  trendValue: number
  status: 'good' | 'warning' | 'critical'
  description: string
}

// Department health
interface DepartmentHealth {
  name: string
  icon: React.ReactNode
  score: number
  kpiCount: number
  onTrack: number
  atRisk: number
  critical: number
  color: string
}

// Initiative tracking
interface Initiative {
  id: string
  name: string
  status: 'on-track' | 'at-risk' | 'delayed' | 'completed'
  progress: number
  owner: string
  departments: string[]
  dueDate: string
  impact: string
}

// Generate synthetic cross-functional data
function generateCrossFunctionalKPIs(): CrossFunctionalKPI[] {
  return [
    {
      id: 'total_revenue',
      name: 'Total Revenue',
      value: 18450000,
      target: 19000000,
      format: 'currency',
      departments: ['Sales', 'Finance', 'Operations'],
      trend: 'up',
      trendValue: 4.2,
      status: 'warning',
      description: 'Combined revenue across all service lines and regions',
    },
    {
      id: 'customer_satisfaction',
      name: 'Customer Satisfaction',
      value: 87,
      target: 90,
      format: 'percent',
      departments: ['Operations', 'Customer Service', 'Sales'],
      trend: 'up',
      trendValue: 2.1,
      status: 'warning',
      description: 'NPS-based satisfaction score from post-service surveys',
    },
    {
      id: 'employee_retention',
      name: 'Employee Retention',
      value: 82,
      target: 85,
      format: 'percent',
      departments: ['HR', 'Operations', 'Sales'],
      trend: 'down',
      trendValue: -1.5,
      status: 'warning',
      description: '12-month rolling retention rate across all departments',
    },
    {
      id: 'operational_efficiency',
      name: 'Operational Efficiency',
      value: 91,
      target: 88,
      format: 'percent',
      departments: ['Operations', 'Finance', 'IT'],
      trend: 'up',
      trendValue: 3.8,
      status: 'good',
      description: 'First-time fix rate combined with route optimization score',
    },
    {
      id: 'gross_margin',
      name: 'Gross Margin',
      value: 48.5,
      target: 50,
      format: 'percent',
      departments: ['Finance', 'Operations', 'Sales'],
      trend: 'stable',
      trendValue: 0.2,
      status: 'warning',
      description: 'Revenue minus direct costs as percentage of revenue',
    },
    {
      id: 'new_customer_acquisition',
      name: 'New Customer Acquisition',
      value: 342,
      target: 400,
      format: 'number',
      departments: ['Sales', 'Marketing', 'Operations'],
      trend: 'up',
      trendValue: 8.5,
      status: 'warning',
      description: 'New residential and commercial customers this month',
    },
  ]
}

function generateDepartmentHealth(): DepartmentHealth[] {
  return [
    {
      name: 'Sales',
      icon: <Briefcase className="h-5 w-5" />,
      score: 78,
      kpiCount: 12,
      onTrack: 8,
      atRisk: 3,
      critical: 1,
      color: 'bg-blue-500',
    },
    {
      name: 'Operations',
      icon: <Activity className="h-5 w-5" />,
      score: 85,
      kpiCount: 15,
      onTrack: 12,
      atRisk: 2,
      critical: 1,
      color: 'bg-green-500',
    },
    {
      name: 'Finance',
      icon: <DollarSign className="h-5 w-5" />,
      score: 82,
      kpiCount: 10,
      onTrack: 7,
      atRisk: 2,
      critical: 1,
      color: 'bg-amber-500',
    },
    {
      name: 'Customer Service',
      icon: <Headphones className="h-5 w-5" />,
      score: 88,
      kpiCount: 8,
      onTrack: 7,
      atRisk: 1,
      critical: 0,
      color: 'bg-purple-500',
    },
    {
      name: 'HR',
      icon: <Users className="h-5 w-5" />,
      score: 75,
      kpiCount: 6,
      onTrack: 4,
      atRisk: 1,
      critical: 1,
      color: 'bg-pink-500',
    },
  ]
}

function generateTrendData() {
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']
  return months.map((month, i) => ({
    month,
    revenue: 15000000 + i * 700000 + Math.random() * 500000,
    satisfaction: 82 + i * 1.2 + Math.random() * 2,
    efficiency: 85 + i * 1.5 + Math.random() * 2,
    retention: 84 - i * 0.3 + Math.random() * 1,
  }))
}

function generateInitiatives(): Initiative[] {
  return [
    {
      id: '1',
      name: 'Digital Service Transformation',
      status: 'on-track',
      progress: 72,
      owner: 'VP Operations',
      departments: ['Operations', 'IT', 'Customer Service'],
      dueDate: '2026-03-31',
      impact: 'Reduce service time by 20%',
    },
    {
      id: '2',
      name: 'Customer Experience Enhancement',
      status: 'at-risk',
      progress: 45,
      owner: 'VP Sales',
      departments: ['Sales', 'Customer Service', 'Marketing'],
      dueDate: '2026-02-28',
      impact: 'Increase NPS by 10 points',
    },
    {
      id: '3',
      name: 'Workforce Development Program',
      status: 'on-track',
      progress: 58,
      owner: 'HR Director',
      departments: ['HR', 'Operations', 'Sales'],
      dueDate: '2026-06-30',
      impact: 'Improve retention by 5%',
    },
    {
      id: '4',
      name: 'Cost Optimization Initiative',
      status: 'delayed',
      progress: 30,
      owner: 'CFO',
      departments: ['Finance', 'Operations', 'IT'],
      dueDate: '2026-01-31',
      impact: 'Reduce OPEX by $2M',
    },
    {
      id: '5',
      name: 'Lead Flow Automation',
      status: 'on-track',
      progress: 85,
      owner: 'Sales Ops Director',
      departments: ['Sales', 'Marketing', 'IT'],
      dueDate: '2026-01-31',
      impact: 'Increase lead traceability to 90%',
    },
  ]
}

function formatValue(value: number, format: 'currency' | 'percent' | 'number'): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value)
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'number':
      return value.toLocaleString()
    default:
      return String(value)
  }
}

export default function CrossFunctionalPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [kpis, setKpis] = useState<CrossFunctionalKPI[]>([])
  const [departments, setDepartments] = useState<DepartmentHealth[]>([])
  const [trendData, setTrendData] = useState<ReturnType<typeof generateTrendData>>([])
  const [initiatives, setInitiatives] = useState<Initiative[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      setKpis(generateCrossFunctionalKPIs())
      setDepartments(generateDepartmentHealth())
      setTrendData(generateTrendData())
      setInitiatives(generateInitiatives())
      setIsLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  const overallHealth = useMemo(() => {
    if (departments.length === 0) return 0
    return Math.round(departments.reduce((sum, d) => sum + d.score, 0) / departments.length)
  }, [departments])

  const initiativeStats = useMemo(() => {
    const total = initiatives.length
    const onTrack = initiatives.filter(i => i.status === 'on-track' || i.status === 'completed').length
    const atRisk = initiatives.filter(i => i.status === 'at-risk').length
    const delayed = initiatives.filter(i => i.status === 'delayed').length
    return { total, onTrack, atRisk, delayed }
  }, [initiatives])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Layers className="h-7 w-7 text-rentokil-red" />
            Cross-Functional Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            KPIs spanning multiple departments with unified visibility
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={overallHealth >= 80 ? 'success' : overallHealth >= 70 ? 'warning' : 'danger'}>
            Overall Health: {overallHealth}%
          </Badge>
        </div>
      </div>

      {/* Cross-Functional KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(kpi => {
          const progressPercent = kpi.format === 'currency'
            ? (kpi.value / kpi.target) * 100
            : (kpi.value / kpi.target) * 100
          const isOnTarget = kpi.value >= kpi.target

          return (
            <Card key={kpi.id} className={kpi.status === 'critical' ? 'border-red-200 dark:border-red-800' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {kpi.name}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {formatValue(kpi.value, kpi.format)}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${
                    kpi.trend === 'up' ? 'text-green-600' :
                    kpi.trend === 'down' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {kpi.trend === 'up' ? <TrendingUp className="h-4 w-4" /> :
                     kpi.trend === 'down' ? <TrendingDown className="h-4 w-4" /> :
                     <Activity className="h-4 w-4" />}
                    {kpi.trendValue > 0 ? '+' : ''}{kpi.trendValue}%
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">vs Target: {formatValue(kpi.target, kpi.format)}</span>
                    <span className={isOnTarget ? 'text-green-600' : 'text-orange-600'}>
                      {isOnTarget ? 'On Track' : `${(100 - progressPercent).toFixed(1)}% gap`}
                    </span>
                  </div>
                  <Progress value={Math.min(progressPercent, 100)} className="h-2" />
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {kpi.departments.map(dept => (
                    <Badge key={dept} variant="secondary" className="text-xs">
                      {dept}
                    </Badge>
                  ))}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {kpi.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Department Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Department Health Summary
          </CardTitle>
          <CardDescription>
            KPI performance by department with status breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {departments.map(dept => (
              <div
                key={dept.name}
                className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 rounded-lg ${dept.color} text-white`}>
                    {dept.icon}
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {dept.name}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Health Score</span>
                    <span className={`text-lg font-bold ${
                      dept.score >= 80 ? 'text-green-600' :
                      dept.score >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {dept.score}%
                    </span>
                  </div>
                  <Progress value={dept.score} className="h-2" />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs">
                  <div className="p-1 rounded bg-green-100 dark:bg-green-900/30">
                    <div className="font-bold text-green-600">{dept.onTrack}</div>
                    <div className="text-green-700 dark:text-green-400">On Track</div>
                  </div>
                  <div className="p-1 rounded bg-yellow-100 dark:bg-yellow-900/30">
                    <div className="font-bold text-yellow-600">{dept.atRisk}</div>
                    <div className="text-yellow-700 dark:text-yellow-400">At Risk</div>
                  </div>
                  <div className="p-1 rounded bg-red-100 dark:bg-red-900/30">
                    <div className="font-bold text-red-600">{dept.critical}</div>
                    <div className="text-red-700 dark:text-red-400">Critical</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cross-Department Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Cross-Department Trends
          </CardTitle>
          <CardDescription>
            6-month trend of key cross-functional metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" orientation="left" tickFormatter={(v) => `${v}%`} domain={[70, 100]} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (!active || !payload) return null
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                        <p className="font-semibold mb-2">{label}</p>
                        {payload.map((entry, i) => (
                          <p key={i} style={{ color: entry.color }} className="text-sm">
                            {entry.name}: {entry.name === 'Revenue'
                              ? formatCurrency(entry.value as number)
                              : `${(entry.value as number).toFixed(1)}%`
                            }
                          </p>
                        ))}
                      </div>
                    )
                  }}
                />
                <Legend />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Revenue"
                  dot={{ fill: '#22c55e' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="satisfaction"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Satisfaction"
                  dot={{ fill: '#3b82f6' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="efficiency"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Efficiency"
                  dot={{ fill: '#f59e0b' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="retention"
                  stroke="#ec4899"
                  strokeWidth={2}
                  name="Retention"
                  dot={{ fill: '#ec4899' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Key Initiative Tracking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Key Initiative Tracking
              </CardTitle>
              <CardDescription>
                Cross-functional initiatives with progress and impact
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">{initiativeStats.onTrack} On Track</Badge>
              <Badge variant="warning">{initiativeStats.atRisk} At Risk</Badge>
              <Badge variant="danger">{initiativeStats.delayed} Delayed</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Initiative</TableHead>
                <TableHead>Departments</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-center">Progress</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initiatives.map(initiative => (
                <TableRow key={initiative.id}>
                  <TableCell className="font-medium">
                    {initiative.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {initiative.departments.map(dept => (
                        <Badge key={dept} variant="outline" className="text-xs">
                          {dept}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {initiative.owner}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={initiative.progress} className="w-20 h-2" />
                      <span className="text-sm font-medium">{initiative.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {new Date(initiative.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        initiative.status === 'on-track' || initiative.status === 'completed'
                          ? 'success'
                          : initiative.status === 'at-risk'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {initiative.status === 'on-track' ? 'On Track' :
                       initiative.status === 'at-risk' ? 'At Risk' :
                       initiative.status === 'delayed' ? 'Delayed' :
                       'Completed'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {initiative.impact}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/sales">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Briefcase className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="font-medium">Sales Dashboard</div>
              <div className="text-sm text-gray-500">Pipeline and wins</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/ops">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="font-medium">Operations Dashboard</div>
              <div className="text-sm text-gray-500">Service metrics</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/finance">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <div className="font-medium">Finance Dashboard</div>
              <div className="text-sm text-gray-500">Revenue and AR</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/lead-flows">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-rentokil-red/30">
            <CardContent className="pt-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-rentokil-red" />
              <div className="font-medium">Lead Flows</div>
              <div className="text-sm text-gray-500">15 flows, 7 systems</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
