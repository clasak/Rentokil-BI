'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { generateMockLeadGeographic } from '@/lib/mock/leadsData'
import { formatNumber, formatPercent } from '@/lib/utils'
import {
  MapPin,
  TrendingUp,
  Clock,
  Target,
  Filter,
  Building2,
} from 'lucide-react'

const MARKET_COLORS: Record<string, string> = {
  'Northeast': '#3b82f6',  // blue
  'Southeast': '#22c55e',  // green
  'Midwest': '#f59e0b',    // amber
  'Southwest': '#ef4444',  // red
  'West': '#8b5cf6',       // violet
  'Central': '#06b6d4',    // cyan
}

export default function LeadGeographicPage() {
  const [selectedMarket, setSelectedMarket] = useState<string>('All')

  const data = useMemo(() => generateMockLeadGeographic(), [])

  const markets = useMemo(
    () => ['All', ...Array.from(new Set(data.map((d) => d.market)))],
    [data]
  )

  const filteredData = useMemo(
    () =>
      selectedMarket === 'All'
        ? data
        : data.filter((d) => d.market === selectedMarket),
    [data, selectedMarket]
  )

  // Aggregate by market
  const marketSummary = useMemo(() => {
    const summary: Record<
      string,
      {
        market: string
        leads: number
        converted: number
        avgResponseTime: number
        regions: number
      }
    > = {}

    data.forEach((d) => {
      if (!summary[d.market]) {
        summary[d.market] = {
          market: d.market,
          leads: 0,
          converted: 0,
          avgResponseTime: 0,
          regions: 0,
        }
      }
      summary[d.market].leads += d.leads
      summary[d.market].converted += d.converted
      summary[d.market].avgResponseTime += d.avgResponseTime
      summary[d.market].regions++
    })

    return Object.values(summary)
      .map((s) => ({
        ...s,
        avgResponseTime: s.avgResponseTime / s.regions,
        conversionRate: s.converted / s.leads,
      }))
      .sort((a, b) => b.leads - a.leads)
  }, [data])

  const totalLeads = useMemo(
    () => filteredData.reduce((sum, d) => sum + d.leads, 0),
    [filteredData]
  )

  const totalConverted = useMemo(
    () => filteredData.reduce((sum, d) => sum + d.converted, 0),
    [filteredData]
  )

  const avgResponseTime = useMemo(
    () =>
      filteredData.reduce((sum, d) => sum + d.avgResponseTime, 0) /
      filteredData.length,
    [filteredData]
  )

  const chartData = useMemo(
    () =>
      marketSummary.map((m) => ({
        name: m.market,
        leads: m.leads,
        converted: m.converted,
        fill: MARKET_COLORS[m.market] || '#94a3b8',
      })),
    [marketSummary]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Geographic Lead Distribution
          </h1>
          <p className="text-sm text-muted-foreground">
            Analyze lead volume and performance by market and region
          </p>
        </div>

        {/* Market Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMarket} onValueChange={setSelectedMarket}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {markets.map((m) => (
                <SelectItem key={m} value={m}>
                  {m === 'All' ? 'All Markets' : m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-3xl">{formatNumber(totalLeads)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <Target className="h-4 w-4 mr-1" />
              {selectedMarket === 'All'
                ? `Across ${markets.length - 1} markets`
                : `In ${selectedMarket}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Converted</CardDescription>
            <CardTitle className="text-3xl">{formatNumber(totalConverted)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              {formatPercent(totalConverted / totalLeads)} conversion
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Response Time</CardDescription>
            <CardTitle className="text-3xl">{avgResponseTime.toFixed(0)} min</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-1" />
              First contact attempt
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Regions Covered</CardDescription>
            <CardTitle className="text-3xl">{filteredData.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 mr-1" />
              Active regions
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Summary Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Volume by Market</CardTitle>
          <CardDescription>
            Compare lead counts and conversions across markets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <defs>
                  <filter id="glow-geo" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{d.name}</p>
                          <p className="text-sm">
                            Leads: {formatNumber(d.leads)}
                          </p>
                          <p className="text-sm text-green-600">
                            Converted: {formatNumber(d.converted)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Rate: {formatPercent(d.converted / d.leads)}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="leads"
                  name="Leads"
                  radius={[4, 4, 0, 0]}
                  activeBar={{ filter: 'url(#glow-geo)' }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Market Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Market Performance Summary</CardTitle>
          <CardDescription>
            Aggregated metrics by market
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Market</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Converted</TableHead>
                <TableHead className="text-right">Conversion Rate</TableHead>
                <TableHead className="text-right">Avg Response (min)</TableHead>
                <TableHead className="text-right">Regions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marketSummary.map((market) => (
                <TableRow key={market.market}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            MARKET_COLORS[market.market] || '#94a3b8',
                        }}
                      />
                      <span className="font-medium">{market.market}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(market.leads)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">
                      {formatNumber(market.converted)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        market.conversionRate > 0.2
                          ? 'default'
                          : market.conversionRate > 0.15
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {formatPercent(market.conversionRate)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        market.avgResponseTime > 60
                          ? 'text-red-600'
                          : market.avgResponseTime > 30
                          ? 'text-amber-600'
                          : 'text-green-600'
                      }
                    >
                      {market.avgResponseTime.toFixed(0)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {market.regions}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Region Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Region Detail</CardTitle>
          <CardDescription>
            {selectedMarket === 'All'
              ? 'All regions across markets'
              : `Regions in ${selectedMarket}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region</TableHead>
                <TableHead>Market</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Converted</TableHead>
                <TableHead>Conversion Rate</TableHead>
                <TableHead className="text-right">Avg Response</TableHead>
                <TableHead>Heat Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData
                .sort((a, b) => b.leads - a.leads)
                .map((region) => {
                  const conversionRate = region.converted / region.leads
                  const maxHeatmap = Math.max(...data.map((d) => d.heatmapValue))
                  const heatPercent = (region.heatmapValue / maxHeatmap) * 100
                  return (
                    <TableRow key={region.region}>
                      <TableCell className="font-medium">{region.region}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                MARKET_COLORS[region.market] || '#94a3b8',
                            }}
                          />
                          {region.market}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(region.leads)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {formatNumber(region.converted)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={conversionRate * 100}
                            className="w-16 h-2"
                          />
                          <span className="text-sm w-12">
                            {formatPercent(conversionRate)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            region.avgResponseTime > 60
                              ? 'text-red-600 font-medium'
                              : region.avgResponseTime > 30
                              ? 'text-amber-600'
                              : 'text-green-600'
                          }
                        >
                          {region.avgResponseTime} min
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${heatPercent}%`,
                                backgroundColor:
                                  heatPercent > 70
                                    ? '#ef4444'
                                    : heatPercent > 40
                                    ? '#f59e0b'
                                    : '#22c55e',
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">
                            {region.heatmapValue.toFixed(0)}
                          </span>
                        </div>
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
