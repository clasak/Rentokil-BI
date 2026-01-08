"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DollarSign,
  TrendingUp,
  FileText,
  CheckCircle,
  Target,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  Calendar,
} from 'lucide-react'
import {
  initializeAEData,
  getAEData,
  getAEDashboardStats,
} from '@/lib/sales-tracker-data'
import { AccountExecutive } from '@/types/sales-tracker'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import Link from 'next/link'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RepCommandCenter() {
  const [aeData, setAeData] = useState<AccountExecutive | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
  }, [])

  useEffect(() => {
    const data = getAEData() || initializeAEData('Cody Lytle')
    setAeData(data)
    setIsLoading(false)
  }, [])

  if (isLoading || !aeData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  const stats = getAEDashboardStats(aeData)
  const currentMonth = new Date().getMonth()
  const currentMonthData = aeData.monthlyData[currentMonth]

  // Pipeline (unsold, non-dead proposals)
  const pipeline = currentMonthData?.proposals.filter(p => !p.sold && !p.dead) || []

  // Monthly trend for mini chart
  const monthlyTrendData = aeData.monthlyData.slice(0, currentMonth + 1).map(m => ({
    month: m.month.substring(0, 3),
    sales: m.salesSummary.grandTotal,
  }))

  // Today's tasks (simulated)
  const todaysTasks = [
    { id: 1, type: 'follow_up', company: 'ABC Manufacturing', action: 'Follow up on proposal', priority: 'high' },
    { id: 2, type: 'call', company: 'Downtown Cafe', action: 'Schedule inspection', priority: 'medium' },
    { id: 3, type: 'proposal', company: 'Tech Solutions', action: 'Send revised quote', priority: 'high' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Command Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {aeData.name} • {aeData.branch} • {currentDate}
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Badge>
      </div>

      {/* Goal Progress Banner */}
      <Card className="bg-gradient-to-r from-rentokil-red to-rentokil-darkred text-white">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Monthly Goal Progress</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(stats.mtdRevenue)} / {formatCurrency(stats.monthlyGoal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{stats.goalProgress.toFixed(0)}%</p>
              <p className="text-white/80 text-sm">of target</p>
            </div>
          </div>
          <Progress
            value={Math.min(stats.goalProgress, 100)}
            className="mt-4 h-3 bg-white/20"
          />
          <div className="flex justify-between mt-2 text-sm text-white/80">
            <span>{formatCurrency(stats.monthlyGoal - stats.mtdRevenue)} to go</span>
            <span>
              {stats.goalProgress >= 100 ? 'Goal Achieved!' : `${(100 - stats.goalProgress).toFixed(0)}% remaining`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">MTD Proposals</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.mtdProposals}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 dark:text-green-400">Active selling</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">MTD Sales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.mtdSales}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Close rate: {stats.proposalToSaleRate.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Deal Size</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.avgDealSize)}</p>
              </div>
              <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 dark:text-green-400">+12% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.pipelineValue)}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{pipeline.length} open proposals</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Chart & Pipeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sales Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendData}>
                    <defs>
                      <filter id="glow-rep" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge>
                          <feMergeNode in="blur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                      cursor={false}
                    />
                    <Bar dataKey="sales" name="Sales" fill="#22c55e" radius={[4, 4, 0, 0]} activeBar={{ filter: 'url(#glow-rep)' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Open Pipeline */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Open Pipeline</CardTitle>
                <Badge variant="secondary">{pipeline.length} proposals</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pipeline.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No open proposals</p>
                ) : (
                  pipeline.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[200px]">{p.companyName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{p.service} • {p.leadType}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">
                          {formatCurrency(p.jobWorkPrice + p.termitePrice + (p.contractPrice * 12))}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(p.date)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {pipeline.length > 5 && (
                <Link href="/ae/tracker/proposals" className="block mt-3">
                  <p className="text-sm text-center text-primary hover:underline">
                    View all {pipeline.length} proposals
                  </p>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tasks & YTD */}
        <div className="space-y-6">
          {/* Today's Tasks */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Today&apos;s Priorities</CardTitle>
                <Badge variant="outline">{todaysTasks.length} tasks</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaysTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center ${
                      task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      {task.type === 'call' ? (
                        <Phone className={`h-4 w-4 ${task.priority === 'high' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                      ) : task.type === 'follow_up' ? (
                        <Calendar className={`h-4 w-4 ${task.priority === 'high' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                      ) : (
                        <FileText className={`h-4 w-4 ${task.priority === 'high' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{task.action}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{task.company}</p>
                    </div>
                    {task.priority === 'high' && (
                      <Badge variant="destructive" className="text-xs">Urgent</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* YTD Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                2026 YTD Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Total Sales</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(aeData.yearlyTotals.actual)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">Annual Goal</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(aeData.yearlyTotals.goal)}</span>
                  </div>
                  <Progress
                    value={(aeData.yearlyTotals.actual / aeData.yearlyTotals.goal) * 100}
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      {((aeData.yearlyTotals.actual / aeData.yearlyTotals.goal) * 100).toFixed(1)}% to goal
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatCurrency(aeData.yearlyTotals.goal - aeData.yearlyTotals.actual)} remaining
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
