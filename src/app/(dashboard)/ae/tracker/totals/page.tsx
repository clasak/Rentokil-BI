'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Target,
  DollarSign,
  TrendingUp,
  Edit2,
  Check,
  X,
  FileText,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  initializeAEData,
  getAEData,
  getTotalsDashboard,
  updateYearlyGoal,
} from '@/lib/sales-tracker-data'
import {
  AccountExecutive,
  TotalsDashboard,
  CategoryMetrics,
  MonthlyProgression,
} from '@/types/sales-tracker'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`
  }
  return formatCurrency(value)
}

export default function TotalsDashboardPage() {
  const [aeData, setAeData] = useState<AccountExecutive | null>(null)
  const [totals, setTotals] = useState<TotalsDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingGoal, setEditingGoal] = useState(false)
  const [newGoal, setNewGoal] = useState('')

  const refreshData = () => {
    const data = getAEData()
    if (data) {
      setAeData({ ...data })
      setTotals(getTotalsDashboard())
    }
  }

  useEffect(() => {
    const data = getAEData() || initializeAEData('Cody Lytle')
    setAeData(data)
    setTotals(getTotalsDashboard())
    setIsLoading(false)
  }, [])

  if (isLoading || !aeData || !totals) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const handleSaveGoal = () => {
    const goalValue = parseFloat(newGoal)
    if (!isNaN(goalValue)) {
      updateYearlyGoal(goalValue)
      refreshData()
    }
    setEditingGoal(false)
  }

  const goalProgress = totals.yearlyGoal > 0 ? (totals.yearlyActual / totals.yearlyGoal) * 100 : 0

  // Calculate grand totals for category matrix
  const categoryGrandTotals = {
    proposalTotal: totals.categoryBreakdown.reduce((sum, c) => sum + c.proposalTotal, 0),
    proposalCount: totals.categoryBreakdown.reduce((sum, c) => sum + c.proposalCount, 0),
    salesTotal: totals.categoryBreakdown.reduce((sum, c) => sum + c.salesTotal, 0),
    salesCount: totals.categoryBreakdown.reduce((sum, c) => sum + c.salesCount, 0),
  }

  // Chart data for monthly comparison
  const chartData = totals.monthlyProgression.map(m => ({
    month: m.month,
    proposals: m.totalProposals,
    sales: m.totalSales,
    started: m.totalStartedSales / 1000, // Convert to thousands for readability
    isq: m.isq / 1000,
  }))

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'My Dashboard', href: '/ae' },
          { label: 'Sales Tracker' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{totals.year} Totals Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Annual performance summary and goal tracking
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 2026 Goal Card */}
        <Card className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-200 text-sm">{totals.year} Goal</p>
                {editingGoal ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      className="h-10 w-32 text-black text-lg"
                      autoFocus
                    />
                    <Button size="sm" variant="secondary" onClick={handleSaveGoal}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingGoal(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold">{formatCurrency(totals.yearlyGoal)}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-indigo-200 hover:text-white"
                      onClick={() => {
                        setNewGoal(String(totals.yearlyGoal))
                        setEditingGoal(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <Target className="h-12 w-12 text-indigo-300" />
            </div>
          </CardContent>
        </Card>

        {/* 2026 Actual Card */}
        <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">{totals.year} Actual</p>
                <p className="text-3xl font-bold">{formatCurrency(totals.yearlyActual)}</p>
                <p className="text-green-200 text-sm mt-1">{goalProgress.toFixed(1)}% of goal</p>
              </div>
              <DollarSign className="h-12 w-12 text-green-300" />
            </div>
            <Progress value={Math.min(goalProgress, 100)} className="mt-4 h-2 bg-green-500" />
          </CardContent>
        </Card>

        {/* 2026 ISQ Card */}
        <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm">{totals.year} ISQ</p>
                <p className="text-3xl font-bold">{formatCurrency(totals.yearlyISQ)}</p>
                <p className="text-purple-200 text-sm mt-1">Individual Sales Quota</p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Service Category Breakdown</CardTitle>
          <CardDescription>Performance by service type - Proposals vs Sales</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800">
                <TableHead className="w-[150px]">Category</TableHead>
                <TableHead colSpan={2} className="text-center border-l bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-4 w-4" />
                    Proposals
                  </div>
                </TableHead>
                <TableHead colSpan={2} className="text-center border-l bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Sales
                  </div>
                </TableHead>
              </TableRow>
              <TableRow className="bg-gray-50 dark:bg-gray-800">
                <TableHead></TableHead>
                <TableHead className="text-right border-l bg-blue-50 dark:bg-blue-900/20">Total ($)</TableHead>
                <TableHead className="text-center bg-blue-50 dark:bg-blue-900/20">Count</TableHead>
                <TableHead className="text-right border-l bg-green-50 dark:bg-green-900/20">Total ($)</TableHead>
                <TableHead className="text-center bg-green-50 dark:bg-green-900/20">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {totals.categoryBreakdown.map((category) => (
                <TableRow key={category.category}>
                  <TableCell className="font-medium">{category.category}</TableCell>
                  <TableCell className="text-right border-l font-mono">
                    {formatCurrency(category.proposalTotal)}
                  </TableCell>
                  <TableCell className="text-center">{category.proposalCount}</TableCell>
                  <TableCell className="text-right border-l font-mono text-green-600 dark:text-green-400">
                    {formatCurrency(category.salesTotal)}
                  </TableCell>
                  <TableCell className="text-center">{category.salesCount}</TableCell>
                </TableRow>
              ))}
              {/* Grand Total Row */}
              <TableRow className="bg-gray-100 dark:bg-gray-800 font-bold">
                <TableCell>Grand Total</TableCell>
                <TableCell className="text-right border-l font-mono">
                  {formatCurrency(categoryGrandTotals.proposalTotal)}
                </TableCell>
                <TableCell className="text-center">{categoryGrandTotals.proposalCount}</TableCell>
                <TableCell className="text-right border-l font-mono text-green-600 dark:text-green-400">
                  {formatCurrency(categoryGrandTotals.salesTotal)}
                </TableCell>
                <TableCell className="text-center">{categoryGrandTotals.salesCount}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Progression Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance Trend</CardTitle>
          <CardDescription>Proposals vs Sales count by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <defs>
                  <filter id="glow-ae-totals" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip cursor={false} />
                <Legend />
                <Bar dataKey="proposals" name="Proposals" fill="#93c5fd" radius={[4, 4, 0, 0]} activeBar={{ filter: 'url(#glow-ae-totals)' }} />
                <Bar dataKey="sales" name="Sales" fill="#86efac" radius={[4, 4, 0, 0]} activeBar={{ filter: 'url(#glow-ae-totals)' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Progression Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Progression</CardTitle>
          <CardDescription>Detailed month-by-month breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="sticky left-0 bg-gray-50 dark:bg-gray-800">Metric</TableHead>
                  {totals.monthlyProgression.map(m => (
                    <TableHead key={m.month} className="text-center min-w-[80px]">{m.month}</TableHead>
                  ))}
                  <TableHead className="text-center font-bold bg-gray-100 dark:bg-gray-700">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Total Proposals Row */}
                <TableRow>
                  <TableCell className="sticky left-0 bg-white dark:bg-gray-900 font-medium">
                    Total Proposals
                  </TableCell>
                  {totals.monthlyProgression.map(m => (
                    <TableCell key={m.month} className="text-center">{m.totalProposals}</TableCell>
                  ))}
                  <TableCell className="text-center font-bold bg-gray-50 dark:bg-gray-800">
                    {totals.monthlyProgression.reduce((sum, m) => sum + m.totalProposals, 0)}
                  </TableCell>
                </TableRow>

                {/* Total Sales Row */}
                <TableRow>
                  <TableCell className="sticky left-0 bg-white dark:bg-gray-900 font-medium">
                    Total Sales
                  </TableCell>
                  {totals.monthlyProgression.map(m => (
                    <TableCell key={m.month} className="text-center">{m.totalSales}</TableCell>
                  ))}
                  <TableCell className="text-center font-bold bg-gray-50 dark:bg-gray-800">
                    {totals.monthlyProgression.reduce((sum, m) => sum + m.totalSales, 0)}
                  </TableCell>
                </TableRow>

                {/* Total Started Sales Row */}
                <TableRow>
                  <TableCell className="sticky left-0 bg-white dark:bg-gray-900 font-medium">
                    Started Sales ($)
                  </TableCell>
                  {totals.monthlyProgression.map(m => (
                    <TableCell key={m.month} className="text-center font-mono text-sm">
                      {formatCurrencyCompact(m.totalStartedSales)}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold bg-gray-50 dark:bg-gray-800 font-mono">
                    {formatCurrencyCompact(totals.monthlyProgression.reduce((sum, m) => sum + m.totalStartedSales, 0))}
                  </TableCell>
                </TableRow>

                {/* ISQ Row */}
                <TableRow className="bg-indigo-50 dark:bg-indigo-900/20">
                  <TableCell className="sticky left-0 bg-indigo-50 dark:bg-indigo-900/20 font-medium">
                    ISQ ($)
                  </TableCell>
                  {totals.monthlyProgression.map(m => (
                    <TableCell key={m.month} className="text-center font-mono text-sm">
                      {formatCurrencyCompact(m.isq)}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold bg-indigo-100 dark:bg-indigo-900/30 font-mono">
                    {formatCurrencyCompact(totals.monthlyProgression.reduce((sum, m) => sum + m.isq, 0))}
                  </TableCell>
                </TableRow>

                {/* Personal Goal Row */}
                <TableRow className="bg-amber-50 dark:bg-amber-900/20">
                  <TableCell className="sticky left-0 bg-amber-50 dark:bg-amber-900/20 font-medium">
                    Personal Goal ($)
                  </TableCell>
                  {totals.monthlyProgression.map(m => (
                    <TableCell key={m.month} className="text-center font-mono text-sm">
                      {formatCurrencyCompact(m.personalGoal)}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold bg-amber-100 dark:bg-amber-900/30 font-mono">
                    {formatCurrencyCompact(totals.monthlyProgression.reduce((sum, m) => sum + m.personalGoal, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/ae/tracker/proposals">
          <Card className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <CardContent className="pt-6 pb-6 flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold">View Proposals</p>
                <p className="text-sm text-gray-500">Manage your sales pipeline</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ae/tracker/sales">
          <Card className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <CardContent className="pt-6 pb-6 flex items-center gap-4">
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold">View Sales</p>
                <p className="text-sm text-gray-500">Track closed deals & commissions</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
