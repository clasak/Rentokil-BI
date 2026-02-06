'use client'

import { useMemo, useState, useEffect } from 'react'
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
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { PageHeader } from '@/components/layout/PageHeader'
import type { LeadRanking as BQLeadRanking } from '@/lib/bigquery/queries/leads'
import type { LeadRanking } from '@/types/leads'

type SortField = 'rank' | 'leads' | 'converted' | 'conversionRate' | 'change'
type SortDirection = 'asc' | 'desc'
type GroupBy = 'market' | 'region' | 'branch'

const EMPTY_LEAD_RANKINGS: LeadRanking[] = []

function transformBigQueryRankings(bqData: BQLeadRanking[]): LeadRanking[] {
  const safeData = bqData || []
  // Sort by leads (highest first) then by conversion rate
  const sorted = [...safeData].sort((a, b) => {
    if (b.leads !== a.leads) return b.leads - a.leads
    return b.conversion_rate - a.conversion_rate
  })

  // Compute group average conversion rate for deviation calculation
  const avgConversionRate = safeData.length > 0
    ? safeData.reduce((sum, r) => sum + r.conversion_rate, 0) / safeData.length
    : 0

  return sorted.map((d, index) => {
    // Determine entity name and type based on what data is present
    let entity: string
    let entityType: 'market' | 'region' | 'branch'

    if (d.branch && d.branch !== '') {
      entity = d.branch
      entityType = 'branch'
    } else if (d.region && d.region !== '') {
      entity = d.region
      entityType = 'region'
    } else {
      entity = d.market || 'Unknown'
      entityType = 'market'
    }

    // Change = deviation from group average conversion rate (meaningful, not hash-based)
    const change = (d.conversion_rate - avgConversionRate) * 100

    return {
      rank: index + 1,
      entity,
      entityType,
      leads: d.leads,
      converted: d.converted,
      conversionRate: d.conversion_rate * 100,
      change: Math.round(change * 10) / 10,
      trend: change > 2 ? 'up' : change < -2 ? 'down' : 'flat',
    }
  })
}

export default function LeadRankingsPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>('market')
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Build filters for query - only groupBy needed, global filter handles market/region/branch
  const queryFilters = useMemo(() => {
    const filters: Record<string, unknown> = {
      daysBack: 30,
      limit: groupBy === 'branch' ? 50 : 25,
      groupBy,
    }

    return filters
  }, [groupBy])

  const {
    data,
    isLoading,
    dataSource,
    responseTime,
    error,
    errorType,
    refetch,
  } = useBigQueryData<BQLeadRanking[], LeadRanking[]>({
    queryName: 'lead-rankings',
    filters: queryFilters,
    defaultData: EMPTY_LEAD_RANKINGS,
    transformBigQueryData: transformBigQueryRankings,
    includeOrgFilters: true, // Filter rankings by user's market/region/branch scope
    includeRoleFilters: false, // Rankings are org-wide, not user-specific
  })

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
      data.length > 0 ? data.reduce((sum, d) => sum + d.conversionRate, 0) / data.length : 0,
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
      {/* Header with Breadcrumbs */}
      <PageHeader
        title="Lead Rankings"
        breadcrumbs={[
          { label: 'Leads', href: '/leads' },
          { label: 'Rankings' },
        ]}
        dataSource={dataSource}
        responseTime={responseTime}
        error={error}
        onRefresh={refetch}
        isLoading={isLoading}
      >
        {/* Group By Filter - only page-specific control, global filter handles market/region/branch */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">By Market</SelectItem>
              <SelectItem value="region">By Region</SelectItem>
              <SelectItem value="branch">By Branch</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Error Loading Lead Rankings</span>
          </div>

          <div className="space-y-3">
            {/* Error message */}
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {error}
            </div>

            {/* Context */}
            {errorType && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Error Type:</span>
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{errorType}</p>
                </div>
                <div>
                  <span className="text-gray-500">Query:</span>
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">lead-rankings</p>
                </div>
              </div>
            )}

            {/* Recovery actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Performers */}
      <div id="lead-top-performers" className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {topPerformers[0] ? formatPercent(topPerformers[0].conversionRate - avgConversion) : '0%'}
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
      <Card id="lead-rankings-table">
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
