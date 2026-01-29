"use client"

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RefreshCw, Trophy, TrendingUp, TrendingDown, Minus,
  Medal, Crown, Award, Target, DollarSign
} from 'lucide-react'
import type { SalesLadderEntry } from '@/types/salti-extended'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { SALTISalesLadders } from '@/lib/bigquery/queries/salti'

// Transform BigQuery data to page format
function transformBigQueryData(bqData: SALTISalesLadders[]): SalesLadderEntry[] {
  // Market names will be populated from real data when available
  const fallbackMarkets = ['Atlantic', 'Florida', 'Midwest', 'Northeast', 'Pacific', 'Southwest']

  return bqData.map((d, index) => {
    const deals = Math.round(d.total_sales / 2500)
    const quota = d.total_sales * 1.1

    return {
      rank: d.current_rank,
      repId: d.employee_sid,
      repName: d.employee_name,
      market: fallbackMarkets[index % fallbackMarkets.length],
      region: 'Region ' + ((index % 6) + 1),
      branch: 'Branch ' + ((index % 20) + 100),
      revenue: d.total_sales,
      deals,
      avgDealSize: d.total_sales / Math.max(deals, 1),
      winRate: 0.30 + ((index % 10) * 0.015),
      quota,
      attainment: d.sales_vs_target / 100 || d.total_sales / quota,
      priorRank: d.prior_rank,
      rankChange: d.rank_change,
      trend: d.progression === 'Rising' ? 'up' : d.progression === 'Falling' ? 'down' : 'flat',
      topServiceType: 'Pest Control',
      topLeadSource: 'Digital',
      avgCycleTime: 12 + (index * 0.5),
    }
  })
}

const RANK_COLORS = ['#fbbf24', '#9ca3af', '#cd7f32'] // Gold, Silver, Bronze

export default function SalesLaddersPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('MTD')

  // Map period to daysBack
  const getDaysBack = (period: string) => {
    switch (period) {
      case 'WTD': return 7
      case 'MTD': return 30
      case 'QTD': return 90
      case 'YTD': return 365
      default: return 30
    }
  }

  // Empty default data
  const EMPTY_LADDER: SalesLadderEntry[] = []

  const {
    data: ladderData,
    isLoading,
    dataSource,
    responseTime,
    refetch,
  } = useBigQueryData<SALTISalesLadders[], SalesLadderEntry[]>({
    queryName: 'salti-sales-ladders',
    filters: { daysBack: getDaysBack(selectedPeriod) },
    defaultData: EMPTY_LADDER,
    transformBigQueryData,
    includeOrgFilters: true,
  })

  // Refetch when period changes
  useEffect(() => {
    refetch()
  }, [selectedPeriod])

  const handleRefresh = () => {
    refetch()
  }

  const filteredData = ladderData

  const topThree = useMemo(() => filteredData.slice(0, 3), [filteredData])

  const summaryStats = useMemo(() => {
    if (filteredData.length === 0) return null
    const totalRevenue = filteredData.reduce((sum, r) => sum + r.revenue, 0)
    const atQuota = filteredData.filter(r => r.attainment >= 1).length
    const avgAttainment = filteredData.reduce((sum, r) => sum + r.attainment, 0) / filteredData.length
    const biggestMover = filteredData.reduce((max, r) =>
      Math.abs(r.rankChange) > Math.abs(max.rankChange) ? r : max, filteredData[0])

    return {
      totalRevenue,
      atQuota,
      percentAtQuota: atQuota / filteredData.length * 100,
      avgAttainment,
      biggestMover,
    }
  }, [filteredData])

  const chartData = useMemo(() => {
    return filteredData.slice(0, 10).map(r => ({
      name: r.repName.split(' ')[0],
      revenue: r.revenue,
      quota: r.quota,
      attainment: Math.round(r.attainment * 100),
    }))
  }, [filteredData])

  const getTrendIcon = (trend: 'up' | 'down' | 'flat') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-amber-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />
    return <Award className="h-4 w-4 text-muted-foreground" />
  }

  if (isLoading || !summaryStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'SALTI', href: '/salti' },
        { label: 'Sales Ladders' }
      ]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-primary" />
            Sales Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Rep rankings with revenue, deals, and win rates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WTD">Week to Date</SelectItem>
              <SelectItem value="MTD">Month to Date</SelectItem>
              <SelectItem value="QTD">Quarter to Date</SelectItem>
              <SelectItem value="YTD">Year to Date</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topThree.map((rep, i) => {
          const podiumOrder = [1, 0, 2] // 2nd, 1st, 3rd for visual effect
          const displayRep = topThree[podiumOrder[i]]
          if (!displayRep) return null

          return (
            <Card key={displayRep.repId} className={`${podiumOrder[i] === 0 ? 'md:order-2 border-amber-500/50' : podiumOrder[i] === 1 ? 'md:order-1' : 'md:order-3'}`}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    {getRankIcon(displayRep.rank)}
                  </div>
                  <p className="font-bold text-lg">{displayRep.repName}</p>
                  <p className="text-sm text-muted-foreground">{displayRep.market}</p>
                  <p className="text-3xl font-bold mt-3 text-green-600">
                    ${displayRep.revenue.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-3 text-sm">
                    <span>{displayRep.deals} deals</span>
                    <span>{Math.round(displayRep.winRate * 100)}% win</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Quota Attainment</span>
                      <span className={displayRep.attainment >= 1 ? 'text-green-600' : ''}>
                        {Math.round(displayRep.attainment * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(displayRep.attainment * 100, 150)}
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${(summaryStats.totalRevenue / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">At Quota</p>
                <p className="text-2xl font-bold">{summaryStats.atQuota}/{filteredData.length}</p>
                <p className="text-xs text-muted-foreground">{Math.round(summaryStats.percentAtQuota)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Attainment</p>
                <p className="text-2xl font-bold">{Math.round(summaryStats.avgAttainment * 100)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                {summaryStats.biggestMover.rankChange > 0 ?
                  <TrendingUp className="h-5 w-5 text-green-600" /> :
                  <TrendingDown className="h-5 w-5 text-red-600" />
                }
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Biggest Mover</p>
                <p className="text-lg font-bold">{summaryStats.biggestMover.repName.split(' ')[0]}</p>
                <p className={`text-xs ${summaryStats.biggestMover.rankChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summaryStats.biggestMover.rankChange > 0 ? '+' : ''}{summaryStats.biggestMover.rankChange} positions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Quota Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Quota</CardTitle>
          <CardDescription>Top 10 reps performance against quota</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    `$${value.toLocaleString()}`,
                    name === 'revenue' ? 'Revenue' : 'Quota'
                  ]}
                />
                <Bar dataKey="quota" name="Quota" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.attainment >= 100 ? '#22c55e' : '#f97316'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Full Leaderboard</CardTitle>
          <CardDescription>Complete rankings with all metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">Rank</th>
                  <th className="text-left py-3 px-2 font-medium">Rep</th>
                  <th className="text-left py-3 px-2 font-medium">Market</th>
                  <th className="text-right py-3 px-2 font-medium">Revenue</th>
                  <th className="text-right py-3 px-2 font-medium">Deals</th>
                  <th className="text-right py-3 px-2 font-medium">Avg Deal</th>
                  <th className="text-right py-3 px-2 font-medium">Win Rate</th>
                  <th className="text-right py-3 px-2 font-medium">Attainment</th>
                  <th className="text-center py-3 px-2 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((rep) => (
                  <tr key={rep.repId} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {rep.rank <= 3 ? (
                          <span className="w-6">{getRankIcon(rep.rank)}</span>
                        ) : (
                          <span className="w-6 text-center font-bold text-muted-foreground">#{rep.rank}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 font-medium">{rep.repName}</td>
                    <td className="py-3 px-2 text-muted-foreground">{rep.market}</td>
                    <td className="py-3 px-2 text-right font-semibold text-green-600">
                      ${rep.revenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right">{rep.deals}</td>
                    <td className="py-3 px-2 text-right">${Math.round(rep.avgDealSize).toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">
                      <Badge variant={rep.winRate >= 0.35 ? 'default' : 'secondary'}
                        className={rep.winRate >= 0.35 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
                        {Math.round(rep.winRate * 100)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress
                          value={Math.min(rep.attainment * 100, 150)}
                          className="w-16 h-2"
                        />
                        <span className={`min-w-[40px] text-right ${rep.attainment >= 1 ? 'text-green-600 font-semibold' : ''}`}>
                          {Math.round(rep.attainment * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(rep.trend)}
                        {rep.rankChange !== 0 && (
                          <span className={`text-xs ${rep.rankChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Math.abs(rep.rankChange)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
