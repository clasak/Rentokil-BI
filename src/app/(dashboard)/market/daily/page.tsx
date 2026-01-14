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
  Legend,
} from 'recharts'
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  MapPin,
  Building2,
  ChevronRight,
} from 'lucide-react'
import {
  initializeDailySalesData,
  getAllMarkets,
  getRegionsForMarket,
  getBranchesByRegion,
  getEntriesForDate,
  getMarketSummary,
  getRegionSummary,
  DEFAULT_DAILY_GOALS,
  REGION_NAMES,
  MARKET_NAMES,
} from '@/lib/daily-sales-data'
import { MarketCode, RegionCode, DailySalesEntry } from '@/types/daily-sales-cadence'

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

export default function MarketDailyPage() {
  const [selectedMarket, setSelectedMarket] = useState<MarketCode>('MIDWEST')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedRegion, setExpandedRegion] = useState<RegionCode | null>(null)
  const [branchEntries, setBranchEntries] = useState<Map<string, DailySalesEntry | null>>(new Map())

  const markets = getAllMarkets()

  useEffect(() => {
    initializeDailySalesData()
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      // Load all branch entries for the selected date
      const dateEntries = getEntriesForDate(selectedDate)
      const entriesMap = new Map<string, DailySalesEntry | null>()
      dateEntries.forEach(entry => {
        entriesMap.set(entry.branchCode, entry)
      })
      setBranchEntries(entriesMap)
    }
  }, [selectedMarket, selectedDate, isLoading])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  const marketSummary = getMarketSummary(selectedMarket, selectedDate)
  const regions = getRegionsForMarket(selectedMarket)

  // Prepare chart data by region
  const regionChartData = marketSummary.regionBreakdown.map(region => ({
    name: region.region,
    fullName: REGION_NAMES[region.region],
    inspPrp: region.totalInspPrp,
    lobsSold: region.totalLobsSold,
    dollarsSold: region.totalDollarsSold,
    attainment: region.avgGoalAttainment,
    branchCount: region.branchCount,
    onTrack: region.branchesOnTrack,
    offTrack: region.branchesOffTrack,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Market Daily Rollup</h1>
          <p className="text-gray-500 dark:text-gray-400">Market Director view - Regional performance summary</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedMarket} onValueChange={(v) => setSelectedMarket(v as MarketCode)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {markets.map((market) => (
                <SelectItem key={market} value={market}>
                  {MARKET_NAMES[market]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
      </div>

      {/* Date Header */}
      <div className="flex items-center justify-between bg-muted rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-semibold">{MARKET_NAMES[selectedMarket]}</p>
            <p className="text-sm text-muted-foreground">{formatDate(selectedDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            {marketSummary.regionCount} Regions
          </Badge>
          <Badge variant={marketSummary.branchesOnTrack + marketSummary.branchesOffTrack === marketSummary.branchCount ? 'default' : 'secondary'}>
            {marketSummary.branchesOnTrack + marketSummary.branchesOffTrack} / {marketSummary.branchCount} branches reported
          </Badge>
        </div>
      </div>

      {/* Market Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500">Total PCCs</span>
            </div>
            <p className="text-2xl font-bold mt-1">{marketSummary.totalPccInField}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-500">Inspections</span>
            </div>
            <p className="text-2xl font-bold mt-1">{marketSummary.totalInspPrp}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-500">LOBs Prepared</span>
            </div>
            <p className="text-2xl font-bold mt-1">{marketSummary.totalLobsPrp}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500">LOBs Sold</span>
            </div>
            <p className="text-2xl font-bold mt-1">{marketSummary.totalLobsSold}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500">Revenue</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(marketSummary.totalDollarsSold)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-500">Goal Attainment</span>
            </div>
            <p className="text-xl font-bold mt-1">{marketSummary.avgGoalAttainment.toFixed(0)}%</p>
            <Progress value={Math.min(marketSummary.avgGoalAttainment, 100)} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-500" />
              <span className="text-sm text-gray-500">Regions</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-green-600 font-bold">{marketSummary.regionsOnTrack}</span>
              <span className="text-gray-400">/</span>
              <span className="text-red-600 font-bold">{marketSummary.regionsOffTrack}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">on track / off track</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="regions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="regions">By Region</TabsTrigger>
          <TabsTrigger value="chart">Performance Chart</TabsTrigger>
          <TabsTrigger value="branches">All Branches</TabsTrigger>
        </TabsList>

        {/* By Region Tab */}
        <TabsContent value="regions" className="space-y-4">
          {marketSummary.regionBreakdown.map((region) => {
            const branches = getBranchesByRegion(region.region)
            const isExpanded = expandedRegion === region.region

            return (
              <Card key={region.region}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedRegion(isExpanded ? null : region.region)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{REGION_NAMES[region.region]}</CardTitle>
                        <CardDescription>{region.branchCount} branches</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{formatCurrency(region.totalDollarsSold)}</p>
                        <p className="text-xs text-gray-500">Revenue</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${region.avgGoalAttainment >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                          {region.avgGoalAttainment.toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-500">Goal</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={region.avgGoalAttainment >= 80 ? 'default' : 'destructive'}>
                          {region.branchesOnTrack} on track
                        </Badge>
                        {region.branchesOffTrack > 0 && (
                          <Badge variant="outline" className="text-red-600 border-red-200">
                            {region.branchesOffTrack} off track
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Branch Name</TableHead>
                          <TableHead>Manager</TableHead>
                          <TableHead className="text-center">PCCs</TableHead>
                          <TableHead className="text-center">INSP</TableHead>
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
                            <TableRow key={branch.code} className={!entry ? 'bg-muted/50' : ''}>
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
                                {entry ? entry.metrics.lobsSold : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {entry ? formatCurrency(entry.metrics.dollarsSold) : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {entry ? (
                                  onTrack ? (
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">On Track</Badge>
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
                )}
              </Card>
            )
          })}
        </TabsContent>

        {/* Chart Tab */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Region Performance Comparison</CardTitle>
              <CardDescription>Goal attainment and revenue by region for {formatDate(selectedDate)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionChartData} layout="vertical">
                    <defs>
                      <filter id="glow-market" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge>
                          <feMergeNode in="blur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={60} />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const data = payload[0].payload
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                            <p className="font-medium">{data.fullName}</p>
                            <p className="text-sm">Branches: {data.branchCount}</p>
                            <p className="text-sm">Inspections: {data.inspPrp}</p>
                            <p className="text-sm">LOBs Sold: {data.lobsSold}</p>
                            <p className="text-sm">Revenue: {formatCurrency(data.dollarsSold)}</p>
                            <p className="text-sm font-medium mt-1">
                              {data.attainment >= 80 ? '✓' : '✗'} {data.attainment.toFixed(0)}% Goal
                            </p>
                          </div>
                        )
                      }}
                    />
                    <Legend />
                    <Bar dataKey="inspPrp" name="Inspections" fill="#8884d8" activeBar={{ filter: 'url(#glow-market)' }} />
                    <Bar dataKey="lobsSold" name="LOBs Sold" fill="#82ca9d" activeBar={{ filter: 'url(#glow-market)' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Branches Tab */}
        <TabsContent value="branches">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Branches - {MARKET_NAMES[selectedMarket]}</CardTitle>
                  <CardDescription>Detailed view of all branches across regions</CardDescription>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{marketSummary.branchesOnTrack} on track</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span>{marketSummary.branchesOffTrack} off track</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
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
                  {regions.flatMap(regionCode => {
                    const branches = getBranchesByRegion(regionCode)
                    return branches.map((branch, idx) => {
                      const entry = branchEntries.get(branch.code)
                      const pcc = entry?.metrics.pccInField || 0
                      const goal = pcc * DEFAULT_DAILY_GOALS.inspPrpPerPcc
                      const inspPrp = entry?.metrics.inspPrp || 0
                      const onTrack = goal > 0 && inspPrp >= goal * 0.8

                      return (
                        <TableRow key={branch.code} className={!entry ? 'bg-muted/50' : ''}>
                          {idx === 0 ? (
                            <TableCell rowSpan={branches.length} className="font-medium border-r">
                              {regionCode}
                            </TableCell>
                          ) : null}
                          <TableCell className="font-mono">{branch.code}</TableCell>
                          <TableCell className="font-medium max-w-[140px] truncate">{branch.name}</TableCell>
                          <TableCell className="max-w-[110px] truncate">{branch.branchManager}</TableCell>
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
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">On Track</Badge>
                              ) : (
                                <Badge variant="destructive">Behind</Badge>
                              )
                            ) : (
                              <Badge variant="outline">No Report</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
