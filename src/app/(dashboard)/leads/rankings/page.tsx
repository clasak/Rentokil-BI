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
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { generateMockLeadRankings } from '@/lib/mock/leadsData'
import { formatNumber, formatPercent } from '@/lib/utils'
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Medal,
  Filter,
} from 'lucide-react'

type SortField = 'rank' | 'leads' | 'converted' | 'conversionRate' | 'change'
type SortDirection = 'asc' | 'desc'
type GroupBy = 'market' | 'region' | 'branch'

export default function LeadRankingsPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>('market')
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const data = useMemo(
    () => generateMockLeadRankings(groupBy, groupBy === 'branch' ? 15 : 12),
    [groupBy]
  )

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aVal: number
      let bVal: number

      switch (sortField) {
        case 'rank':
          aVal = a.rank
          bVal = b.rank
          break
        case 'leads':
          aVal = a.leads
          bVal = b.leads
          break
        case 'converted':
          aVal = a.converted
          bVal = b.converted
          break
        case 'conversionRate':
          aVal = a.conversionRate
          bVal = b.conversionRate
          break
        case 'change':
          aVal = a.change
          bVal = b.change
          break
        default:
          aVal = a.rank
          bVal = b.rank
      }

      if (sortDirection === 'asc') {
        return aVal - bVal
      }
      return bVal - aVal
    })

    return sorted
  }, [data, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'rank' ? 'asc' : 'desc')
    }
  }

  const topPerformers = useMemo(
    () => data.filter((d) => d.rank <= 3),
    [data]
  )

  const totalLeads = useMemo(
    () => data.reduce((sum, d) => sum + d.leads, 0),
    [data]
  )

  const avgConversion = useMemo(
    () =>
      data.reduce((sum, d) => sum + d.conversionRate, 0) / data.length,
    [data]
  )

  const SortHeader = ({
    field,
    children,
    className = '',
  }: {
    field: SortField
    children: React.ReactNode
    className?: string
  }) => (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 -ml-2 hover:bg-transparent"
        onClick={() => handleSort(field)}
      >
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="ml-1 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-1 h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
        )}
      </Button>
    </TableHead>
  )

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600">
          <Trophy className="h-3 w-3 mr-1" /> 1st
        </Badge>
      )
    if (rank === 2)
      return (
        <Badge className="bg-gray-400 hover:bg-gray-500">
          <Medal className="h-3 w-3 mr-1" /> 2nd
        </Badge>
      )
    if (rank === 3)
      return (
        <Badge className="bg-amber-700 hover:bg-amber-800">
          <Medal className="h-3 w-3 mr-1" /> 3rd
        </Badge>
      )
    return <span className="text-muted-foreground">#{rank}</span>
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'flat', change: number) => {
    if (trend === 'up')
      return (
        <span className="flex items-center text-green-600">
          <TrendingUp className="h-4 w-4 mr-1" />+{change.toFixed(1)}%
        </span>
      )
    if (trend === 'down')
      return (
        <span className="flex items-center text-red-600">
          <TrendingDown className="h-4 w-4 mr-1" />
          {change.toFixed(1)}%
        </span>
      )
    return (
      <span className="flex items-center text-muted-foreground">
        <Minus className="h-4 w-4 mr-1" />
        0%
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Lead Rankings
          </h1>
          <p className="text-sm text-muted-foreground">
            Compare lead performance across markets, regions, and branches
          </p>
        </div>

        {/* Group By Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">By Market</SelectItem>
              <SelectItem value="region">By Region</SelectItem>
              <SelectItem value="branch">By Branch</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topPerformers.map((performer, index) => (
          <Card
            key={performer.entity}
            className={
              index === 0
                ? 'border-yellow-500 border-2'
                : index === 1
                ? 'border-gray-400 border-2'
                : 'border-amber-700 border-2'
            }
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                {getRankBadge(performer.rank)}
                {getTrendIcon(performer.trend, performer.change)}
              </div>
              <CardTitle className="text-xl mt-2">{performer.entity}</CardTitle>
              <CardDescription className="capitalize">
                {performer.entityType}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">
                    {formatNumber(performer.leads)}
                  </div>
                  <div className="text-xs text-muted-foreground">Leads</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatNumber(performer.converted)}
                  </div>
                  <div className="text-xs text-muted-foreground">Converted</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formatPercent(performer.conversionRate)}
                  </div>
                  <div className="text-xs text-muted-foreground">Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Entities</CardDescription>
            <CardTitle className="text-3xl">{data.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground capitalize">
              {groupBy}s ranked
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-3xl">{formatNumber(totalLeads)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Across all {groupBy}s
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Conversion</CardDescription>
            <CardTitle className="text-3xl">{formatPercent(avgConversion)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Across all {groupBy}s
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Performer Gap</CardDescription>
            <CardTitle className="text-3xl">
              {formatPercent(topPerformers[0].conversionRate - avgConversion)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              vs average rate
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Full Rankings</CardTitle>
          <CardDescription>
            Click column headers to sort. Rankings based on conversion rate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="rank">Rank</SortHeader>
                <TableHead>
                  {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                </TableHead>
                <SortHeader field="leads" className="text-right">
                  Leads
                </SortHeader>
                <SortHeader field="converted" className="text-right">
                  Converted
                </SortHeader>
                <SortHeader field="conversionRate" className="text-right">
                  Conversion Rate
                </SortHeader>
                <SortHeader field="change" className="text-right">
                  Change
                </SortHeader>
                <TableHead className="text-right">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row) => (
                <TableRow
                  key={row.entity}
                  className={row.rank <= 3 ? 'bg-muted/30' : ''}
                >
                  <TableCell>{getRankBadge(row.rank)}</TableCell>
                  <TableCell className="font-medium">{row.entity}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.leads)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">
                      {formatNumber(row.converted)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        row.conversionRate > avgConversion * 1.1
                          ? 'default'
                          : row.conversionRate > avgConversion * 0.9
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {formatPercent(row.conversionRate)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.change >= 0 ? (
                      <span className="text-green-600">
                        +{row.change.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-red-600">
                        {row.change.toFixed(1)}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.trend === 'up' && (
                      <TrendingUp className="h-4 w-4 text-green-600 inline" />
                    )}
                    {row.trend === 'down' && (
                      <TrendingDown className="h-4 w-4 text-red-600 inline" />
                    )}
                    {row.trend === 'flat' && (
                      <Minus className="h-4 w-4 text-muted-foreground inline" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
