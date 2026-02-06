'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2,
  Search,
  ChevronRight,
  MapPin,
  Users,
  RefreshCw,
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { BranchOverview } from '@/lib/bigquery/queries/branch'
import { formatCurrency } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface BranchListDisplay {
  branches: Array<{
    id: string
    name: string
    region: string
    market: string
    revenueMtd: number
    leadsMtd: number
    salesMtd: number
    closeRate: number
    rankInRegion: number
  }>
  totalBranches: number
  markets: string[]
  regions: string[]
}

// =============================================================================
// BigQuery Integration
// =============================================================================

const EMPTY_BRANCH_LIST: BranchListDisplay = {
  branches: [],
  totalBranches: 0,
  markets: [],
  regions: [],
}

function transformBigQueryData(bqData: BranchOverview[]): BranchListDisplay {
  const branches = (bqData || []).map(b => ({
    id: b.branch_id || 'unknown',
    name: b.branch_name || 'Unknown Branch',
    region: b.region || 'Unknown',
    market: b.market || 'Unknown',
    revenueMtd: b.revenue_mtd || 0,
    leadsMtd: b.leads_mtd || 0,
    salesMtd: b.sales_mtd || 0,
    closeRate: b.close_rate || 0,
    rankInRegion: b.rank_in_region || 0,
  }))

  const markets = [...new Set(branches.map(b => b.market))].filter(m => m !== 'Unknown').sort()
  const regions = [...new Set(branches.map(b => b.region))].filter(r => r !== 'Unknown').sort()

  return {
    branches,
    totalBranches: branches.length,
    markets,
    regions,
  }
}

export default function BranchListPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMarket, setSelectedMarket] = useState<string>('all')
  const [selectedRegion, setSelectedRegion] = useState<string>('all')

  // BigQuery integration
  const {
    data: branchData,
    isLoading: isBQLoading,
    dataSource,
    responseTime,
    refetch,
  } = useBigQueryData<BranchOverview[], BranchListDisplay>({
    queryName: 'branch-overview',
    filters: { daysBack: 30, limit: 200 },
    defaultData: EMPTY_BRANCH_LIST,
    transformBigQueryData,
    includeOrgFilters: true, // Branch overview - org-level view
    includeRoleFilters: false, // Not filtered to individual user
  })

  const branches = branchData?.branches || []
  const markets = branchData?.markets || []
  const regions = branchData?.regions || []

  // Filter branches based on search and filters
  const filteredBranches = useMemo(() => {
    return branches.filter(branch => {
      const matchesSearch = searchQuery === '' ||
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.id.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesMarket = selectedMarket === 'all' || branch.market === selectedMarket
      const matchesRegion = selectedRegion === 'all' || branch.region === selectedRegion

      return matchesSearch && matchesMarket && matchesRegion
    })
  }, [branches, searchQuery, selectedMarket, selectedRegion])

  // Reset region filter when market changes
  useEffect(() => {
    if (selectedMarket !== 'all') {
      setSelectedRegion('all')
    }
  }, [selectedMarket])

  // Get regions for selected market
  const filteredRegions = useMemo(() => {
    if (selectedMarket === 'all') return regions
    return [...new Set(branches.filter(b => b.market === selectedMarket).map(b => b.region))].sort()
  }, [branches, regions, selectedMarket])

  if (isBQLoading && !branchData) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Branch Directory' }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Branch Directory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Browse and search all branches across markets and regions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={refetch} disabled={isBQLoading}>
            <RefreshCw className={`h-4 w-4 ${isBQLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500">Total Branches</span>
            </div>
            <p className="text-2xl font-bold mt-1">{branchData?.totalBranches || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-500">Markets</span>
            </div>
            <p className="text-2xl font-bold mt-1">{markets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500">Regions</span>
            </div>
            <p className="text-2xl font-bold mt-1">{regions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-500">Showing</span>
            </div>
            <p className="text-2xl font-bold mt-1">{filteredBranches.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search &amp; Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by branch name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Markets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Markets</SelectItem>
                {markets.map(market => (
                  <SelectItem key={market} value={market}>{market}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {filteredRegions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Branch List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Branches
          </CardTitle>
          <CardDescription>
            Click on a branch to view detailed metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Branch Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Market</TableHead>
                <TableHead className="text-right">Revenue MTD</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Close Rate</TableHead>
                <TableHead className="text-center">Rank</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBranches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    No branches found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredBranches.map(branch => (
                  <TableRow key={branch.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">{branch.id}</TableCell>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{branch.region}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{branch.market}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(branch.revenueMtd)}
                    </TableCell>
                    <TableCell className="text-right">{branch.leadsMtd}</TableCell>
                    <TableCell className="text-right">{branch.salesMtd}</TableCell>
                    <TableCell className="text-right">
                      <span className={branch.closeRate >= 30 ? 'text-green-600' : 'text-amber-600'}>
                        {branch.closeRate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={branch.rankInRegion <= 3 ? 'default' : 'outline'}>
                        #{branch.rankInRegion}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/branch/${branch.id}`}>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/branch/daily">
              <Button variant="outline" className="gap-2">
                <Building2 className="h-4 w-4" />
                Branch Daily View
              </Button>
            </Link>
            <Link href="/region/daily">
              <Button variant="outline" className="gap-2">
                <MapPin className="h-4 w-4" />
                Region Daily View
              </Button>
            </Link>
            <Link href="/market/daily">
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                Market Daily View
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
