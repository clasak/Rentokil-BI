'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  TrendingUp,
  FileText,
  CheckCircle,
  Target,
  Plus,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
} from 'lucide-react'
import {
  initializeAEData,
  getAEData,
  getAEDashboardStats,
} from '@/lib/sales-tracker-data'
import { AccountExecutive, Proposal, Sale } from '@/types/sales-tracker'
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import Link from 'next/link'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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

export default function AccountExecutiveDashboard() {
  const [aeData, setAeData] = useState<AccountExecutive | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize data on mount
    const data = getAEData() || initializeAEData('Cody Lytle')
    setAeData(data)
    setIsLoading(false)
  }, [])

  if (isLoading || !aeData) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const stats = getAEDashboardStats(aeData)
  const currentMonth = new Date().getMonth()
  const currentMonthData = aeData.monthlyData[currentMonth]

  // Chart data
  const monthlyTrendData = aeData.monthlyData.slice(0, currentMonth + 1).map(m => ({
    month: m.month,
    proposals: m.proposalSummary.grandTotal,
    sales: m.salesSummary.grandTotal,
  }))

  const serviceBreakdown = currentMonthData?.proposals.reduce((acc, p) => {
    const service = p.service || 'Other'
    const existing = acc.find(a => a.name === service)
    if (existing) {
      existing.value += p.jobWorkPrice + p.termitePrice + (p.contractPrice * 12)
    } else {
      acc.push({
        name: service,
        value: p.jobWorkPrice + p.termitePrice + (p.contractPrice * 12),
      })
    }
    return acc
  }, [] as { name: string; value: number }[]) || []

  const leadSourceData = currentMonthData?.proposals.reduce((acc, p) => {
    const source = p.leadType || 'Unknown'
    const existing = acc.find(a => a.name === source)
    if (existing) {
      existing.count++
    } else {
      acc.push({ name: source, count: 1 })
    }
    return acc
  }, [] as { name: string; count: number }[]) || []

  // Recent activity
  const recentProposals = currentMonthData?.proposals.slice(-5).reverse() || []
  const recentSales = currentMonthData?.sales.slice(-5).reverse() || []

  // Pipeline (unsold, non-dead proposals)
  const pipeline = currentMonthData?.proposals.filter(p => !p.sold && !p.dead) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500">
            Welcome back, {aeData.name} • {aeData.branch}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="bg-primary">
            <Link href="/ae/import">
              <Upload className="h-4 w-4 mr-2" />
              Import Quote
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/ae/tracker/proposals">
              <Plus className="h-4 w-4 mr-2" />
              Add Proposal
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/ae/tracker/sales">
              <CheckCircle className="h-4 w-4 mr-2" />
              Log Sale
            </Link>
          </Button>
        </div>
      </div>

      {/* Goal Progress Banner */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Monthly Goal Progress</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(stats.mtdRevenue)} / {formatCurrency(stats.monthlyGoal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{stats.goalProgress.toFixed(0)}%</p>
              <p className="text-blue-100 text-sm">of target</p>
            </div>
          </div>
          <Progress
            value={Math.min(stats.goalProgress, 100)}
            className="mt-4 h-3 bg-blue-500"
          />
          <div className="flex justify-between mt-2 text-sm text-blue-100">
            <span>{formatCurrency(stats.monthlyGoal - stats.mtdRevenue)} to go</span>
            <span>
              {stats.goalProgress >= 100 ? '🎉 Goal Achieved!' : `${(100 - stats.goalProgress).toFixed(0)}% remaining`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">MTD Proposals</p>
                <p className="text-2xl font-bold">{stats.mtdProposals}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+3 this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">MTD Sales</p>
                <p className="text-2xl font-bold">{stats.mtdSales}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-500">Close rate: {stats.proposalToSaleRate.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Deal Size</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgDealSize)}</p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+12% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pipeline Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.pipelineValue)}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-500">{pipeline.length} open proposals</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
              <CardDescription>Proposals vs Sales revenue by month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendData}>
                    <defs>
                      <filter id="glow-ae" x="-50%" y="-50%" width="200%" height="200%">
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
                      labelStyle={{ color: '#374151' }}
                      cursor={false}
                    />
                    <Bar dataKey="proposals" name="Proposals" fill="#93c5fd" radius={[4, 4, 0, 0]} activeBar={{ filter: 'url(#glow-ae)' }} />
                    <Bar dataKey="sales" name="Sales" fill="#22c55e" radius={[4, 4, 0, 0]} activeBar={{ filter: 'url(#glow-ae)' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Lead Source & Service Mix */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Lead Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter id="glow-ae-pie1" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="3" result="blur"/>
                          <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <Pie
                        data={leadSourceData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        activeShape={{ filter: 'url(#glow-ae-pie1)' }}
                      >
                        {leadSourceData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Service Mix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter id="glow-ae-pie2" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="3" result="blur"/>
                          <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <Pie
                        data={serviceBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        label={({ name }) => name}
                        labelLine={false}
                        activeShape={{ filter: 'url(#glow-ae-pie2)' }}
                      >
                        {serviceBreakdown.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Activity & Pipeline */}
        <div className="space-y-6">
          {/* Pipeline */}
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
                  <p className="text-gray-500 text-sm text-center py-4">No open proposals</p>
                ) : (
                  pipeline.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer"
                    >
                      <div>
                        <p className="font-medium text-sm truncate max-w-[150px]">{p.companyName}</p>
                        <p className="text-xs text-muted-foreground">{p.service} • {p.leadType}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency(p.jobWorkPrice + p.termitePrice + (p.contractPrice * 12))}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {pipeline.length > 5 && (
                <Button variant="ghost" className="w-full mt-2" size="sm">
                  View all {pipeline.length} proposals
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="proposals">
                <TabsList className="w-full">
                  <TabsTrigger value="proposals" className="flex-1">Proposals</TabsTrigger>
                  <TabsTrigger value="sales" className="flex-1">Sales</TabsTrigger>
                </TabsList>
                <TabsContent value="proposals" className="mt-3">
                  <div className="space-y-2">
                    {recentProposals.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            p.sold ? 'bg-green-500' : p.dead ? 'bg-red-500' : 'bg-amber-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium truncate max-w-[120px]">{p.companyName}</p>
                            <p className="text-xs text-gray-500">{formatDate(p.date)}</p>
                          </div>
                        </div>
                        <Badge variant={p.sold ? 'default' : p.dead ? 'destructive' : 'secondary'}>
                          {p.sold ? 'Won' : p.dead ? 'Lost' : 'Open'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="sales" className="mt-3">
                  <div className="space-y-2">
                    {recentSales.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div>
                          <p className="text-sm font-medium truncate max-w-[120px]">{s.companyName}</p>
                          <p className="text-xs text-gray-500">{formatDate(s.date)} • {s.service}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-green-600">
                            {formatCurrency(s.jobWorkPrice + s.termitePrice + (s.contractPrice * 12))}
                          </p>
                          <div className="flex gap-1">
                            {s.started && <Badge variant="outline" className="text-xs">Started</Badge>}
                            {s.paid && <Badge variant="outline" className="text-xs">Paid</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* YTD Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">2026 YTD</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Sales</span>
                  <span className="font-semibold">{formatCurrency(aeData.yearlyTotals.actual)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Annual Goal</span>
                  <span className="font-semibold">{formatCurrency(aeData.yearlyTotals.goal)}</span>
                </div>
                <Progress
                  value={(aeData.yearlyTotals.actual / aeData.yearlyTotals.goal) * 100}
                  className="h-2"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {((aeData.yearlyTotals.actual / aeData.yearlyTotals.goal) * 100).toFixed(1)}% to goal
                  </span>
                  <span className="text-gray-500">
                    {formatCurrency(aeData.yearlyTotals.goal - aeData.yearlyTotals.actual)} remaining
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
