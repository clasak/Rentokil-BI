'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Users,
  ChevronDown,
  ChevronRight,
  Filter,
  RefreshCw,
  Briefcase,
  Wrench,
  UserCog,
  Headphones,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Types
interface WorkforceData {
  market_code?: string
  market_name?: string
  region_code?: string
  region_name?: string
  branch_code?: string
  branch_name?: string
  region_count?: number
  branch_count?: number
  branch_managers: number
  ops_managers: number
  sales_managers: number
  ae_sales: number
  technicians: number
  csr_office: number
  other: number
  total: number
}

interface Filters {
  markets: string[]
  regions: string[]
  branches: string[]
}

type ViewLevel = 'market' | 'region' | 'branch'

const ROLE_COLORS = {
  branch_managers: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  ops_managers: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  sales_managers: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ae_sales: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  technicians: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  csr_office: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
}

const ROLE_ICONS = {
  branch_managers: UserCog,
  ops_managers: Briefcase,
  sales_managers: Users,
  ae_sales: Users,
  technicians: Wrench,
  csr_office: Headphones,
}

export default function OrganizationHierarchyPage() {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('market')
  const [selectedMarket, setSelectedMarket] = useState<string>('')
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [filters, setFilters] = useState<Filters>({ markets: [], regions: [], branches: [] })
  const [data, setData] = useState<WorkforceData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Fetch filter options
  const fetchFilters = useCallback(async () => {
    try {
      const params = new URLSearchParams({ action: 'filters' })
      if (selectedMarket) params.set('market', selectedMarket)
      if (selectedRegion) params.set('region', selectedRegion)

      const res = await fetch(`/api/organization/workforce?${params}`)
      const filterData = await res.json()
      setFilters(filterData)
    } catch (error) {
      console.error('Failed to fetch filters:', error)
    }
  }, [selectedMarket, selectedRegion])

  // Fetch workforce data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        level: viewLevel,
        limit: '100',
      })
      if (selectedMarket) params.set('market', selectedMarket)
      if (selectedRegion) params.set('region', selectedRegion)

      const res = await fetch(`/api/organization/workforce?${params}`)
      const result = await res.json()
      setData(result.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [viewLevel, selectedMarket, selectedRegion])

  useEffect(() => {
    fetchFilters()
  }, [fetchFilters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle market selection
  const handleMarketChange = (value: string) => {
    setSelectedMarket(value === 'all' ? '' : value)
    setSelectedRegion('')
    if (value !== 'all') {
      setViewLevel('region')
    }
  }

  // Handle region selection
  const handleRegionChange = (value: string) => {
    setSelectedRegion(value === 'all' ? '' : value)
    if (value !== 'all') {
      setViewLevel('branch')
    }
  }

  // Reset filters
  const handleReset = () => {
    setSelectedMarket('')
    setSelectedRegion('')
    setViewLevel('market')
  }

  // Toggle row expansion
  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  // Drill down to next level
  const handleDrillDown = (item: WorkforceData) => {
    if (viewLevel === 'market' && item.market_name) {
      setSelectedMarket(item.market_name)
      setViewLevel('region')
    } else if (viewLevel === 'region' && item.region_name) {
      setSelectedRegion(item.region_name)
      setViewLevel('branch')
    }
  }

  // Calculate totals
  const totals = data.reduce(
    (acc, item) => ({
      branch_managers: acc.branch_managers + item.branch_managers,
      ops_managers: acc.ops_managers + item.ops_managers,
      sales_managers: acc.sales_managers + item.sales_managers,
      ae_sales: acc.ae_sales + item.ae_sales,
      technicians: acc.technicians + item.technicians,
      csr_office: acc.csr_office + item.csr_office,
      other: acc.other + item.other,
      total: acc.total + item.total,
    }),
    {
      branch_managers: 0,
      ops_managers: 0,
      sales_managers: 0,
      ae_sales: 0,
      technicians: 0,
      csr_office: 0,
      other: 0,
      total: 0,
    }
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Organization Hierarchy
          </h1>
          <p className="text-muted-foreground">
            Market → Region → Branch breakdown with workforce by role
          </p>
        </div>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* View Level */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">View Level</label>
              <Select value={viewLevel} onValueChange={(v) => setViewLevel(v as ViewLevel)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Markets</SelectItem>
                  <SelectItem value="region">Regions</SelectItem>
                  <SelectItem value="branch">Branches</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Market Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Market</label>
              <Select value={selectedMarket || 'all'} onValueChange={handleMarketChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Markets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Markets</SelectItem>
                  {filters.markets.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Region Filter */}
            {selectedMarket && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Region</label>
                <Select value={selectedRegion || 'all'} onValueChange={handleRegionChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {filters.regions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Current Selection Breadcrumb */}
            <div className="flex items-end">
              <div className="flex items-center gap-1 text-sm">
                <Badge variant="outline">
                  {selectedMarket || 'All Markets'}
                  {selectedRegion && ` → ${selectedRegion}`}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Branch Mgrs</span>
            </div>
            <div className="text-2xl font-bold">{totals.branch_managers.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Ops Mgrs</span>
            </div>
            <div className="text-2xl font-bold">{totals.ops_managers.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Sales Mgrs</span>
            </div>
            <div className="text-2xl font-bold">{totals.sales_managers.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">AE/Sales</span>
            </div>
            <div className="text-2xl font-bold">{totals.ae_sales.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">Technicians</span>
            </div>
            <div className="text-2xl font-bold">{totals.technicians.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-cyan-600" />
              <span className="text-xs text-muted-foreground">CSR/Office</span>
            </div>
            <div className="text-2xl font-bold">{totals.csr_office.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <div className="text-2xl font-bold">{totals.total.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {viewLevel === 'market' && 'Markets'}
            {viewLevel === 'region' && `Regions${selectedMarket ? ` in ${selectedMarket}` : ''}`}
            {viewLevel === 'branch' && `Branches${selectedRegion ? ` in ${selectedRegion}` : ''}`}
            <span className="ml-2 text-muted-foreground font-normal">({data.length} items)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>
                      {viewLevel === 'market' && 'Market'}
                      {viewLevel === 'region' && 'Region'}
                      {viewLevel === 'branch' && 'Branch'}
                    </TableHead>
                    {viewLevel !== 'branch' && <TableHead className="text-right">Units</TableHead>}
                    <TableHead className="text-right">
                      <span className="text-purple-600">BM</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-blue-600">OM</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-green-600">SM</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-emerald-600">AE</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-orange-600">Tech</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-cyan-600">CSR</span>
                    </TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, idx) => {
                    const rowId =
                      item.branch_code || item.region_code || item.market_code || String(idx)
                    const name = item.branch_name || item.region_name || item.market_name || '-'
                    const canDrillDown = viewLevel !== 'branch'

                    return (
                      <TableRow
                        key={rowId}
                        className={canDrillDown ? 'cursor-pointer hover:bg-muted/50' : ''}
                        onClick={() => canDrillDown && handleDrillDown(item)}
                      >
                        <TableCell>
                          {canDrillDown && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-medium">{name}</TableCell>
                        {viewLevel !== 'branch' && (
                          <TableCell className="text-right text-muted-foreground">
                            {viewLevel === 'market'
                              ? `${item.region_count} reg / ${item.branch_count} br`
                              : `${item.branch_count} branches`}
                          </TableCell>
                        )}
                        <TableCell className="text-right">{item.branch_managers.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.ops_managers.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.sales_managers.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.ae_sales.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.technicians.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.csr_office.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{item.total.toLocaleString()}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Badge className={ROLE_COLORS.branch_managers}>BM</Badge>
              <span>Branch Manager</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className={ROLE_COLORS.ops_managers}>OM</Badge>
              <span>Ops Manager (Service Mgr, TMT Mgr)</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className={ROLE_COLORS.sales_managers}>SM</Badge>
              <span>Sales Manager</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className={ROLE_COLORS.ae_sales}>AE</Badge>
              <span>Account Executive / Sales Rep</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className={ROLE_COLORS.technicians}>Tech</Badge>
              <span>Technician (Pest, TC, Commercial)</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className={ROLE_COLORS.csr_office}>CSR</Badge>
              <span>CSR / Office Staff</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
