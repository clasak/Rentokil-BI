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
  RefreshCw, Phone, Calendar, FileText, DollarSign,
  Users, TrendingUp, TrendingDown, CheckCircle2, Target
} from 'lucide-react'
import {
  generateMockDailyCheckIns,
  generateMockCheckInSummary,
} from '@/lib/mock/saltiExtendedData'
import type { DailyCheckIn, DailyCheckInSummary } from '@/types/salti-extended'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

export default function DailyCheckInPage() {
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([])
  const [summary, setSummary] = useState<DailyCheckInSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMarket, setSelectedMarket] = useState<string>('all')

  useEffect(() => {
    setIsLoading(true)
    const data = generateMockDailyCheckIns(7)
    const summaryData = generateMockCheckInSummary(new Date())
    setCheckIns(data)
    setSummary(summaryData)
    setIsLoading(false)
  }, [])

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      const data = generateMockDailyCheckIns(7, `refresh-${Date.now()}`)
      const summaryData = generateMockCheckInSummary(new Date(), `refresh-${Date.now()}`)
      setCheckIns(data)
      setSummary(summaryData)
      setIsLoading(false)
    }, 500)
  }

  const filteredCheckIns = useMemo(() => {
    if (selectedMarket === 'all') return checkIns
    return checkIns.filter(c => c.market.toLowerCase() === selectedMarket.toLowerCase())
  }, [checkIns, selectedMarket])

  const todayCheckIns = useMemo(() => {
    const today = new Date().toDateString()
    return filteredCheckIns.filter(c => c.date.toDateString() === today)
  }, [filteredCheckIns])

  const repPerformanceData = useMemo(() => {
    return todayCheckIns.slice(0, 10).map(c => ({
      name: c.repName.split(' ')[0],
      calls: c.callsMade,
      appointments: c.appointmentsSet * 10,
      proposals: c.proposalsSent * 15,
      sales: c.salesClosed * 20,
      goalAttainment: Math.round(c.goalAttainment * 100),
    }))
  }, [todayCheckIns])

  if (isLoading || !summary) {
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
        { label: 'Daily Check-In' }
      ]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="h-7 w-7 text-primary" />
            Daily Check-In Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Rep activity summary with calls, appointments, proposals, and sales metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Check-In Rate Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Today&apos;s Check-In Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {summary.repsCheckedIn} of {summary.totalReps} reps checked in
                </span>
                <span className="font-semibold">{Math.round(summary.checkInRate * 100)}%</span>
              </div>
              <Progress value={summary.checkInRate * 100} className="h-3" />
            </div>
            <Badge variant={summary.checkInRate >= 0.9 ? 'default' : 'secondary'}
              className={summary.checkInRate >= 0.9 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
              {summary.checkInRate >= 0.9 ? 'On Track' : 'Needs Attention'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">{summary.totalCalls.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  Avg: {summary.avgCallsPerRep}/rep
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Appointments</p>
                <p className="text-2xl font-bold">{summary.totalAppointments}</p>
                <p className="text-xs text-muted-foreground">
                  Avg: {summary.avgAppointmentsPerRep}/rep
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Proposals</p>
                <p className="text-2xl font-bold">{summary.totalProposals}</p>
                <p className="text-xs text-muted-foreground">
                  Avg: {summary.avgProposalsPerRep}/rep
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sales</p>
                <p className="text-2xl font-bold">{summary.totalSales}</p>
                <p className="text-xs text-muted-foreground">
                  ${summary.totalValue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rep Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Rep Activity Summary
          </CardTitle>
          <CardDescription>
            Today&apos;s activity metrics by rep (scaled for visualization)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="calls" name="Calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="appointments" name="Appts (x10)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="proposals" name="Props (x15)" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sales" name="Sales (x20)" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Top Performers Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summary.topPerformers.map((performer, i) => (
              <div key={performer.repId} className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{performer.repName}</span>
                  <Badge variant="outline" className="capitalize">{performer.metric}</Badge>
                </div>
                <p className="text-2xl font-bold">
                  {performer.metric === 'sales' ? `$${performer.value.toLocaleString()}` : performer.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  #{i + 1} in {performer.metric}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Check-Ins Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Check-Ins</CardTitle>
          <CardDescription>
            Individual rep check-ins with goal attainment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">Rep</th>
                  <th className="text-left py-3 px-2 font-medium">Market</th>
                  <th className="text-right py-3 px-2 font-medium">Calls</th>
                  <th className="text-right py-3 px-2 font-medium">Appts</th>
                  <th className="text-right py-3 px-2 font-medium">Proposals</th>
                  <th className="text-right py-3 px-2 font-medium">Sales</th>
                  <th className="text-right py-3 px-2 font-medium">Goal %</th>
                </tr>
              </thead>
              <tbody>
                {todayCheckIns.slice(0, 10).map((checkIn) => (
                  <tr key={checkIn.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium">{checkIn.repName}</td>
                    <td className="py-3 px-2 text-muted-foreground">{checkIn.market}</td>
                    <td className="py-3 px-2 text-right">
                      <span className={checkIn.callsMade >= checkIn.callGoal ? 'text-green-600' : ''}>
                        {checkIn.callsMade}
                      </span>
                      <span className="text-muted-foreground">/{checkIn.callGoal}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={checkIn.appointmentsSet >= checkIn.appointmentGoal ? 'text-green-600' : ''}>
                        {checkIn.appointmentsSet}
                      </span>
                      <span className="text-muted-foreground">/{checkIn.appointmentGoal}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={checkIn.proposalsSent >= checkIn.proposalGoal ? 'text-green-600' : ''}>
                        {checkIn.proposalsSent}
                      </span>
                      <span className="text-muted-foreground">/{checkIn.proposalGoal}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={checkIn.salesClosed >= checkIn.salesGoal ? 'text-green-600' : ''}>
                        {checkIn.salesClosed}
                      </span>
                      <span className="text-muted-foreground">/{checkIn.salesGoal}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Badge variant={checkIn.goalAttainment >= 1 ? 'default' : 'secondary'}
                        className={checkIn.goalAttainment >= 1 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
                        {Math.round(checkIn.goalAttainment * 100)}%
                      </Badge>
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
