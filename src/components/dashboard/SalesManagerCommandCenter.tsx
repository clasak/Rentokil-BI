"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface RepPerformance {
  id: string
  name: string
  mtdRevenue: number
  goal: number
  proposals: number
  sales: number
  closeRate: number
  stalledDeals: number
  hygieneScore: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function SalesManagerCommandCenter() {
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [repData, setRepData] = useState<RepPerformance[]>([])

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }, [])

  useEffect(() => {
    // Simulated team data
    const mockRepData: RepPerformance[] = [
      { id: '1', name: 'Sarah Chen', mtdRevenue: 42500, goal: 50000, proposals: 12, sales: 8, closeRate: 67, stalledDeals: 1, hygieneScore: 92 },
      { id: '2', name: 'Marcus Johnson', mtdRevenue: 38000, goal: 45000, proposals: 15, sales: 7, closeRate: 47, stalledDeals: 3, hygieneScore: 78 },
      { id: '3', name: 'Emily Rodriguez', mtdRevenue: 51000, goal: 50000, proposals: 18, sales: 11, closeRate: 61, stalledDeals: 2, hygieneScore: 85 },
      { id: '4', name: 'David Kim', mtdRevenue: 28000, goal: 45000, proposals: 8, sales: 4, closeRate: 50, stalledDeals: 4, hygieneScore: 65 },
    ]

    setTimeout(() => {
      setRepData(mockRepData)
      setIsLoading(false)
    }, 300)
  }, [])

  // Team aggregations
  const teamStats = {
    totalRevenue: repData.reduce((sum, r) => sum + r.mtdRevenue, 0),
    totalGoal: repData.reduce((sum, r) => sum + r.goal, 0),
    totalProposals: repData.reduce((sum, r) => sum + r.proposals, 0),
    totalSales: repData.reduce((sum, r) => sum + r.sales, 0),
    avgCloseRate: repData.length > 0 ? repData.reduce((sum, r) => sum + r.closeRate, 0) / repData.length : 0,
    totalStalledDeals: repData.reduce((sum, r) => sum + r.stalledDeals, 0),
    avgHygieneScore: repData.length > 0 ? repData.reduce((sum, r) => sum + r.hygieneScore, 0) / repData.length : 0,
  }

  const teamGoalProgress = teamStats.totalGoal > 0 ? (teamStats.totalRevenue / teamStats.totalGoal) * 100 : 0

  // Chart data for rep comparison
  const repChartData = repData.map(r => ({
    name: r.name.split(' ')[0],
    revenue: r.mtdRevenue,
    goal: r.goal,
  }))

  // At-risk deals (simulated)
  const atRiskDeals = [
    { id: '1', company: 'TechCorp Inc', owner: 'Marcus Johnson', value: 15000, daysStalled: 21, reason: 'No activity' },
    { id: '2', company: 'BuildRight LLC', owner: 'David Kim', value: 8500, daysStalled: 18, reason: 'Awaiting decision' },
    { id: '3', company: 'FoodServ Pro', owner: 'Emily Rodriguez', value: 12000, daysStalled: 14, reason: 'Budget concerns' },
  ]

  // CRM hygiene issues
  const hygieneIssues = repData.filter(r => r.hygieneScore < 80).map(r => ({
    rep: r.name,
    score: r.hygieneScore,
    issue: r.hygieneScore < 70 ? 'Missing required fields' : 'Stale activities',
  }))

  if (isLoading) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Command Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sales Manager • {repData.length} Account Executives • {currentDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {teamStats.totalStalledDeals > 0 && (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {teamStats.totalStalledDeals} Stalled Deals
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {currentTime}
          </Badge>
        </div>
      </div>

      {/* Team Goal Progress */}
      <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Team Monthly Goal</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(teamStats.totalRevenue)} / {formatCurrency(teamStats.totalGoal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{teamGoalProgress.toFixed(0)}%</p>
              <p className="text-white/80 text-sm">of target</p>
            </div>
          </div>
          <Progress
            value={Math.min(teamGoalProgress, 100)}
            className="mt-4 h-3 bg-white/20"
          />
          <div className="flex justify-between mt-2 text-sm text-white/80">
            <span>{formatCurrency(teamStats.totalGoal - teamStats.totalRevenue)} to goal</span>
            <span>{repData.filter(r => r.mtdRevenue >= r.goal).length} of {repData.length} reps on target</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Team Pipeline</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.totalProposals}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Open proposals</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Team Sales MTD</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.totalSales}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Close rate: {teamStats.avgCloseRate.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Stalled Deals</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.totalStalledDeals}</p>
              </div>
              <div className={`h-12 w-12 ${teamStats.totalStalledDeals > 3 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'} rounded-lg flex items-center justify-center`}>
                <AlertTriangle className={`h-6 w-6 ${teamStats.totalStalledDeals > 3 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className={teamStats.totalStalledDeals > 3 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}>
                {teamStats.totalStalledDeals > 3 ? 'Needs attention' : 'Monitor closely'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">CRM Hygiene</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.avgHygieneScore.toFixed(0)}</p>
              </div>
              <div className={`h-12 w-12 ${teamStats.avgHygieneScore >= 80 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'} rounded-lg flex items-center justify-center`}>
                <Target className={`h-6 w-6 ${teamStats.avgHygieneScore >= 80 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className={teamStats.avgHygieneScore >= 80 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                {teamStats.avgHygieneScore >= 80 ? 'Good data quality' : 'Needs improvement'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Rep Performance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rep Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rep Performance vs Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={repChartData} layout="vertical">
                    <defs>
                      <filter id="glow-sales-mgr" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge>
                          <feMergeNode in="blur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={60} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                      cursor={false}
                    />
                    <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[0, 4, 4, 0]} activeBar={{ filter: 'url(#glow-sales-mgr)' }} />
                    <Bar dataKey="goal" name="Goal" fill="#e5e7eb" radius={[0, 4, 4, 0]} activeBar={{ filter: 'url(#glow-sales-mgr)' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Rep Leaderboard */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Leaderboard
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {repData.sort((a, b) => b.mtdRevenue - a.mtdRevenue).map((rep, index) => {
                  const progress = (rep.mtdRevenue / rep.goal) * 100
                  const isOnTarget = progress >= 100
                  const isNearTarget = progress >= 80 && progress < 100
                  return (
                    <div
                      key={rep.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        index === 1 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                        index === 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">{rep.name}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(rep.mtdRevenue)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <Progress value={Math.min(progress, 100)} className="h-1.5 flex-1 mr-4" />
                          <span className={`text-xs ${isOnTarget ? 'text-green-600 dark:text-green-400' : isNearTarget ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      {rep.stalledDeals > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {rep.stalledDeals} stalled
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - At Risk & Issues */}
        <div className="space-y-6">
          {/* At-Risk Deals */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  At-Risk Deals
                </CardTitle>
                <Badge variant="warning">{atRiskDeals.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {atRiskDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-3 rounded-lg border border-yellow-200 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{deal.company}</span>
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(deal.value)}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {deal.owner} • {deal.daysStalled} days stalled
                    </div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {deal.reason}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CRM Hygiene Issues */}
          {hygieneIssues.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">CRM Hygiene Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {hygieneIssues.map((issue, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-900/20"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{issue.rep}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{issue.issue}</p>
                      </div>
                      <Badge variant="destructive">{issue.score}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
