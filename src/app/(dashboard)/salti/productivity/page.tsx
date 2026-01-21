"use client"

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RefreshCw, Activity, TrendingUp, TrendingDown, Minus,
  Clock, Target, Users, Award
} from 'lucide-react'
import { generateMockRepProductivity } from '@/lib/mock/saltiExtendedData'
import type { RepProductivity } from '@/types/salti-extended'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts'

export default function ProductivityPage() {
  const [productivityData, setProductivityData] = useState<RepProductivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('MTD')
  const [selectedMarket, setSelectedMarket] = useState<string>('all')

  useEffect(() => {
    setIsLoading(true)
    const data = generateMockRepProductivity(selectedPeriod)
    setProductivityData(data)
    setIsLoading(false)
  }, [selectedPeriod])

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      const data = generateMockRepProductivity(selectedPeriod, `refresh-${Date.now()}`)
      setProductivityData(data)
      setIsLoading(false)
    }, 500)
  }

  const filteredData = useMemo(() => {
    if (selectedMarket === 'all') return productivityData
    return productivityData.filter(r => r.market.toLowerCase() === selectedMarket.toLowerCase())
  }, [productivityData, selectedMarket])

  const topPerformers = useMemo(() => filteredData.slice(0, 5), [filteredData])

  const averageMetrics = useMemo(() => {
    if (filteredData.length === 0) return null
    const sum = filteredData.reduce((acc, r) => ({
      salesValue: acc.salesValue + r.salesValue,
      salesClosed: acc.salesClosed + r.salesClosed,
      closeRate: acc.closeRate + r.closeRate,
      avgDealSize: acc.avgDealSize + r.avgDealSize,
      avgCycleTime: acc.avgCycleTime + r.avgCycleTime,
      leadWorkRate: acc.leadWorkRate + r.leadWorkRate,
    }), { salesValue: 0, salesClosed: 0, closeRate: 0, avgDealSize: 0, avgCycleTime: 0, leadWorkRate: 0 })

    const count = filteredData.length
    return {
      salesValue: sum.salesValue / count,
      salesClosed: sum.salesClosed / count,
      closeRate: sum.closeRate / count,
      avgDealSize: sum.avgDealSize / count,
      avgCycleTime: sum.avgCycleTime / count,
      leadWorkRate: sum.leadWorkRate / count,
    }
  }, [filteredData])

  const radarData = useMemo(() => {
    if (topPerformers.length === 0) return []
    const top = topPerformers[0]
    const avg = averageMetrics
    if (!avg) return []

    return [
      { metric: 'Close Rate', top: Math.round(top.closeRate * 100), avg: Math.round(avg.closeRate * 100) },
      { metric: 'Lead Work Rate', top: Math.round(top.leadWorkRate * 100), avg: Math.round(avg.leadWorkRate * 100) },
      { metric: 'Contact Rate', top: Math.round(top.contactRate * 100), avg: Math.round(filteredData.reduce((a, r) => a + r.contactRate, 0) / filteredData.length * 100) },
      { metric: 'Appt Rate', top: Math.round(top.appointmentRate * 100), avg: Math.round(filteredData.reduce((a, r) => a + r.appointmentRate, 0) / filteredData.length * 100) },
      { metric: 'Proposal Rate', top: Math.round(top.proposalRate * 100), avg: Math.round(filteredData.reduce((a, r) => a + r.proposalRate, 0) / filteredData.length * 100) },
    ]
  }, [topPerformers, averageMetrics, filteredData])

  const rankingChartData = useMemo(() => {
    return filteredData.slice(0, 10).map(r => ({
      name: r.repName.split(' ')[0],
      revenue: r.salesValue,
      deals: r.salesClosed * 1000,
    }))
  }, [filteredData])

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  if (isLoading || !averageMetrics) {
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
        { label: 'Productivity' }
      ]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            Rep Productivity
          </h1>
          <p className="text-muted-foreground mt-1">
            Performance metrics, rankings, and productivity indicators
          </p>
        </div>

        <div className="flex items-center gap-3">
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

          <Select value={selectedMarket} onValueChange={setSelectedMarket}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Market" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              <SelectItem value="northeast">Northeast</SelectItem>
              <SelectItem value="southeast">Southeast</SelectItem>
              <SelectItem value="midwest">Midwest</SelectItem>
              <SelectItem value="southwest">Southwest</SelectItem>
              <SelectItem value="west">West</SelectItem>
              <SelectItem value="central">Central</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Revenue</p>
                <p className="text-2xl font-bold">${Math.round(averageMetrics.salesValue).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Deals</p>
                <p className="text-2xl font-bold">{Math.round(averageMetrics.salesClosed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Close Rate</p>
                <p className="text-2xl font-bold">{Math.round(averageMetrics.closeRate * 100)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Cycle Time</p>
                <p className="text-2xl font-bold">{averageMetrics.avgCycleTime.toFixed(1)}d</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Revenue Ranking
            </CardTitle>
            <CardDescription>
              Top 10 reps by {selectedPeriod} revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" fontSize={12} width={60} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Top Rep vs Average
            </CardTitle>
            <CardDescription>
              Conversion rates comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} />
                  <Radar name="Top Rep" dataKey="top" stroke="#22c55e" fill="#22c55e" fillOpacity={0.5} />
                  <Radar name="Team Avg" dataKey="avg" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rep Productivity Rankings</CardTitle>
          <CardDescription>
            Complete productivity metrics with rank changes
          </CardDescription>
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
                  <th className="text-right py-3 px-2 font-medium">Close Rate</th>
                  <th className="text-right py-3 px-2 font-medium">Avg Deal</th>
                  <th className="text-right py-3 px-2 font-medium">Cycle</th>
                  <th className="text-center py-3 px-2 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((rep) => (
                  <tr key={rep.repId} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${rep.rank <= 3 ? 'text-amber-500' : ''}`}>
                          #{rep.rank}
                        </span>
                        {rep.rank <= 3 && <Award className="h-4 w-4 text-amber-500" />}
                      </div>
                    </td>
                    <td className="py-3 px-2 font-medium">{rep.repName}</td>
                    <td className="py-3 px-2 text-muted-foreground">{rep.market}</td>
                    <td className="py-3 px-2 text-right font-semibold">${rep.salesValue.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">{rep.salesClosed}</td>
                    <td className="py-3 px-2 text-right">
                      <Badge variant={rep.closeRate >= 0.35 ? 'default' : 'secondary'}
                        className={rep.closeRate >= 0.35 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
                        {Math.round(rep.closeRate * 100)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right">${Math.round(rep.avgDealSize).toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">{rep.avgCycleTime.toFixed(1)}d</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(rep.rankChange)}
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
