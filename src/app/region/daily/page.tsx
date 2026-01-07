'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Cell,
} from 'recharts'
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  MapPin,
} from 'lucide-react'
import {
  initializeDailySalesData,
  getBranchesByRegion,
  getEntriesForDate,
  getRegionSummary,
  getAllRegions,
  DEFAULT_DAILY_GOALS,
} from '@/lib/daily-sales-data'
import { RegionCode, DailySalesEntry, Branch } from '@/types/daily-sales-cadence'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

const REGION_NAMES: Record<RegionCode, string> = {
  R16: 'Region 16 - Arkansas/Kansas',
  R23: 'Region 23 - Oklahoma/Kansas',
  R24: 'Region 24 - Illinois/Indiana',
  R52: 'Region 52 - Texas East',
  R54: 'Region 54 - Texas Central/West',
  R75: 'Region 75 - Texas (Combined)',
}

export default function RegionDailyPage() {
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>('R16')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(true)
  const [branchEntries, setBranchEntries] = useState<Map<string, DailySalesEntry | null>>(new Map())

  const regions = getAllRegions()

  useEffect(() => {
    initializeDailySalesData()
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      const branches = getBranchesByRegion(selectedRegion)
      const dateEntries = getEntriesForDate(selectedDate)

      const entriesMap = new Map<string, DailySalesEntry | null>()
      branches.forEach(branch => {
        const entry = dateEntries.find(e => e.branchCode === branch.code) || null
        entriesMap.set(branch.code, entry)
      })
      setBranchEntries(entriesMap)
    }
  }, [selectedRegion, selectedDate, isLoading])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  const summary = getRegionSummary(selectedRegion, selectedDate)
  const branches = getBranchesByRegion(selectedRegion)

  // Prepare chart data
  const chartData = branches.map(branch => {
    const entry = branchEntries.get(branch.code)
    const pcc = entry?.metrics.pccInField || 0
    const inspPrp = entry?.metrics.inspPrp || 0
    const goal = pcc * DEFAULT_DAILY_GOALS.inspPrpPerPcc
    const attainment = goal > 0 ? (inspPrp / goal) * 100 : 0

    return {
      name: branch.code,
      fullName: branch.name,
      inspPrp,
      goal: Math.round(goal),
      attainment,
      submitted: !!entry,
    }
  }).filter(d => d.submitted)

  const submittedCount = branches.filter(b => branchEntries.get(b.code)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Regional Daily Rollup</h1>
          <p className="text-gray-500">Area Manager view - Branch performance summary</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedRegion} onValueChange={(v) => setSelectedRegion(v as RegionCode)}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region} value={region}>
                  {REGION_NAMES[region]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      {/* Date Header */}
      <div className="flex items-center justify-between bg-gray-100 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-gray-600" />
          <div>
            <p className="font-semibold">{REGION_NAMES[selectedRegion]}</p>
            <p className="text-sm text-gray-500">{formatDate(selectedDate)}</p>
          </div>
        </div>
        <Badge variant={submittedCount === branches.length ? 'default' : 'secondary'}>
          {submittedCount} / {branches.length} branches reported
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500">Total PCCs</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.totalPccInField}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-500">Inspections</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.totalInspPrp}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-500">LOBs Prepared</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.totalLobsPrp}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500">LOBs Sold</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.totalLobsSold}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500">Revenue</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(summary.totalDollarsSold)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-500">Goal Attainment</span>
            </div>
            <p className="text-xl font-bold mt-1">{summary.avgGoalAttainment.toFixed(0)}%</p>
            <Progress value={Math.min(summary.avgGoalAttainment, 100)} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inspections vs Goal by Branch</CardTitle>
            <CardDescription>Daily inspection performance for reporting branches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={60} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-medium">{data.fullName}</p>
                          <p className="text-sm">Inspections: {data.inspPrp}</p>
                          <p className="text-sm">Goal: {data.goal}</p>
                          <p className="text-sm font-medium">
                            {data.attainment >= 100 ? '✓' : '✗'} {data.attainment.toFixed(0)}%
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="inspPrp" name="Actual">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.attainment >= 80 ? '#22c55e' : entry.attainment >= 60 ? '#f59e0b' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="goal" name="Goal" fill="#e5e7eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Branch Details Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Branch Details</CardTitle>
              <CardDescription>All branches in {REGION_NAMES[selectedRegion]}</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{summary.branchesOnTrack} on track</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span>{summary.branchesOffTrack} off track</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Branch Name</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="text-center">PCCs</TableHead>
                <TableHead className="text-center">INSP</TableHead>
                <TableHead className="text-center">LOBs PRP</TableHead>
                <TableHead className="text-center">LOBs Sold</TableHead>
                <TableHead className="text-right">Dollars</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => {
                const entry = branchEntries.get(branch.code)
                const pcc = entry?.metrics.pccInField || 0
                const goal = pcc * DEFAULT_DAILY_GOALS.inspPrpPerPcc
                const inspPrp = entry?.metrics.inspPrp || 0
                const onTrack = goal > 0 && inspPrp >= goal * 0.8

                return (
                  <TableRow key={branch.code} className={!entry ? 'bg-gray-50' : ''}>
                    <TableCell className="font-mono">{branch.code}</TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">{branch.name}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{branch.branchManager}</TableCell>
                    <TableCell className="text-center">
                      {entry ? entry.metrics.pccInField : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry ? (
                        <span className={onTrack ? 'text-green-600 font-medium' : 'text-red-600'}>
                          {entry.metrics.inspPrp}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry ? entry.metrics.lobsPrp : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry ? entry.metrics.lobsSold : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry ? formatCurrency(entry.metrics.dollarsSold) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry ? (
                        onTrack ? (
                          <Badge className="bg-green-100 text-green-800">On Track</Badge>
                        ) : (
                          <Badge variant="destructive">Behind</Badge>
                        )
                      ) : (
                        <Badge variant="outline">No Report</Badge>
                      )}
                    </TableCell>
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
