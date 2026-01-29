/**
 * Sales Tracker - Consolidated Dashboard
 *
 * ROUTE: /ae/tracker
 *
 * MIGRATION NOTE (Jan 2026):
 * This page consolidates three previously separate routes into tabs:
 * - /ae/tracker/proposals → Proposals tab
 * - /ae/tracker/sales → Sales tab
 * - /ae/tracker/totals → Totals tab
 *
 * Redirects are configured in next.config.js to handle old bookmarks.
 * DO NOT create separate pages for these routes again.
 */
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { useOrganizationData } from '@/hooks/useOrganizationData'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  FileText,
  CheckCircle,
  Edit2,
  Check,
  X,
  RefreshCw,
  Download,
  DollarSign,
  Clock,
  Target,
  Play,
  Banknote,
  CheckCircle2,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import {
  getMonthlyOverrides,
  updateMonthlyOverride,
  type MonthlyOverrides,
} from '@/lib/utils/monthly-tracker-storage'
import { getBusinessDaysInMonth } from '@/lib/utils/business-days'
import { YTDSummaryCard } from '@/components/sales-tracker/YTDSummaryCard'
import { TransactionList } from '@/components/sales-tracker/TransactionList'
import { TransactionForm } from '@/components/sales-tracker/TransactionForm'
import { DataFreshnessIndicator } from '@/components/sales-tracker/DataFreshnessIndicator'
import { calculateYTD, getEmptyYTD } from '@/lib/sales-tracker/calculate-ytd'
import type { Transaction, TransactionFormData } from '@/types/sales-tracker'
import type { MonthlyTotalsDetail, SalesforceQuote, AESalesDetail } from '@/lib/bigquery/queries/ae'
import { toastSuccess, toastError } from '@/hooks/use-toast'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrency2(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

// Empty default data
const EMPTY_TOTALS_DATA: MonthlyTotalsDetail = {
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  proposalTermite: 0,
  proposalContract: 0,
  proposalJobWork: 0,
  proposalGrandTotal: 0,
  totalProposalsCount: 0,
  proposalsPerDay: 0,
  salesTermite: 0,
  salesContract: 0,
  salesJobWork: 0,
  salesGrandTotal: 0,
  totalSalesCount: 0,
  totalStartedSalesCount: 0,
  isq: 0,
  personalGoal: 0,
}

type TrackerView = 'totals' | 'proposals' | 'sales'

export default function AETrackerPage() {
  const [mounted, setMounted] = useState(false)
  const [activeView, setActiveView] = useState<TrackerView>('totals')

  // Shared state across all tabs
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1) // 1-12
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())

  const { currentUser } = useAppStore()
  const role = useEffectiveRole(mounted)
  const { markets, regions, branches } = useOrganizationData()

  // For development: override sales person name
  const effectiveSalesPerson = 'Cody Lytle'

  // Check if user is manager or above (not a rep)
  const isManagerOrAbove = useMemo(() => {
    if (!role) return false
    return !['rep', 'technician'].includes(role)
  }, [role])

  // Manager+ filters
  const [selectedPerson, setSelectedPerson] = useState<string>('')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedRegion, setSelectedRegion] = useState<string>('all')

  // Export loading state
  const [isExporting, setIsExporting] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState<string>('all')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get the user's name for filtering
  const userFilters = useMemo(() => {
    const filters: Record<string, any> = {
      year: selectedYear,
      month: selectedMonth,
    }

    if (isManagerOrAbove) {
      // Manager+: apply selected filters (only if not "all")
      if (selectedPerson) filters.salesPerson = selectedPerson
      if (selectedBranch && selectedBranch !== 'all') filters.branch = selectedBranch
      if (selectedRegion && selectedRegion !== 'all') filters.region = selectedRegion
      if (selectedMarket && selectedMarket !== 'all') filters.market = selectedMarket
    } else {
      // Rep: only show their own data
      filters.salesPerson = effectiveSalesPerson
    }

    return filters
  }, [selectedYear, selectedMonth, isManagerOrAbove, selectedPerson, selectedBranch, selectedRegion, selectedMarket, effectiveSalesPerson])

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'My Dashboard', href: '/ae' },
          { label: 'Sales Tracker' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sales Tracker
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track your monthly sales performance, proposals, and revenue
            {!isManagerOrAbove && ` for ${effectiveSalesPerson}`}
            {isManagerOrAbove && (selectedPerson || (selectedBranch !== 'all') || (selectedRegion !== 'all') || (selectedMarket !== 'all'))
              ? ` (filtered)`
              : isManagerOrAbove ? ` (all reps)` : ''}
          </p>
        </div>
      </div>

      {/* Data Freshness Indicator */}
      <DataFreshnessIndicator />

      {/* Shared Filters Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            {/* Year/Month Selectors */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Year</label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Month</label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={month} value={String(idx + 1)}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Manager+ Organization Filters */}
          {isManagerOrAbove && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Manager Filters</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Market Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Market
                  </label>
                  <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Markets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Markets</SelectItem>
                      {markets.map((market) => (
                        <SelectItem key={market.market_code} value={market.market_code}>
                          {market.market_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Region Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Region
                  </label>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {regions
                        .filter(r => selectedMarket === 'all' || r.market_code === selectedMarket)
                        .map((region) => (
                          <SelectItem key={region.region_code} value={region.region_code}>
                            {region.region_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Branch Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Branch
                  </label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches
                        .filter(b =>
                          (selectedMarket === 'all' || b.market_code === selectedMarket) &&
                          (selectedRegion === 'all' || b.region_code === selectedRegion)
                        )
                        .map((branch) => (
                          <SelectItem key={branch.branch_code} value={branch.branch_code}>
                            {branch.branch_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sales Person Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Sales Person
                  </label>
                  <Input
                    type="text"
                    value={selectedPerson}
                    onChange={(e) => setSelectedPerson(e.target.value)}
                    placeholder="Enter name..."
                    className="h-10"
                  />
                </div>
              </div>
              {(selectedPerson || selectedBranch !== 'all' || selectedRegion !== 'all' || selectedMarket !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setSelectedPerson('')
                    setSelectedBranch('all')
                    setSelectedRegion('all')
                    setSelectedMarket('all')
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Views */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as TrackerView)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="totals">Monthly Totals</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="totals" className="space-y-4">
          <TotalsView
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            userFilters={userFilters}
            effectiveSalesPerson={effectiveSalesPerson}
            isManagerOrAbove={isManagerOrAbove}
          />
        </TabsContent>

        <TabsContent value="proposals" className="space-y-4">
          <ProposalsView
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            effectiveSalesPerson={effectiveSalesPerson}
          />
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <SalesView
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            effectiveSalesPerson={effectiveSalesPerson}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// TOTALS VIEW (from ae/tracker/totals/page.tsx)
// ============================================================================
function TotalsView({
  selectedYear,
  selectedMonth,
  userFilters,
  effectiveSalesPerson,
  isManagerOrAbove,
}: {
  selectedYear: number
  selectedMonth: number
  userFilters: Record<string, any>
  effectiveSalesPerson: string
  isManagerOrAbove: boolean
}) {
  const [localOverrides, setLocalOverrides] = useState<MonthlyOverrides>({})
  const [allMonthsData, setAllMonthsData] = useState<MonthlyTotalsDetail[]>([])
  const [loadingYTD, setLoadingYTD] = useState(false)

  // Editing states
  const [editingISQ, setEditingISQ] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [newISQ, setNewISQ] = useState('')
  const [newGoal, setNewGoal] = useState('')

  // Transaction form modal state
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  // Load overrides from localStorage
  useEffect(() => {
    const overrides = getMonthlyOverrides(selectedYear, selectedMonth)
    setLocalOverrides(overrides)
  }, [selectedYear, selectedMonth])

  // Fetch all months data for YTD calculation
  useEffect(() => {
    const fetchAllMonths = async () => {
      setLoadingYTD(true)
      const currentMonth = new Date().getMonth() + 1
      const monthsToFetch = Math.min(selectedMonth, currentMonth)
      const promises: Promise<MonthlyTotalsDetail | null>[] = []

      for (let month = 1; month <= monthsToFetch; month++) {
        const monthFilters = { ...userFilters, month }
        promises.push(
          fetch('/api/bigquery/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'ae-monthly-totals-detail',
              filters: monthFilters,
            }),
          })
            .then(res => res.json())
            .then(data => data.data as MonthlyTotalsDetail | null)
            .catch(() => null)
        )
      }

      const results = await Promise.all(promises)
      const validResults = results.filter((r): r is MonthlyTotalsDetail => r !== null)

      // Apply localStorage overrides
      const withOverrides = validResults.map(monthData => {
        const overrides = getMonthlyOverrides(selectedYear, monthData.month)
        return {
          ...monthData,
          isq: overrides.isq ?? monthData.isq,
          personalGoal: overrides.personalGoal ?? monthData.personalGoal,
        }
      })

      setAllMonthsData(withOverrides)
      setLoadingYTD(false)
    }

    fetchAllMonths()
  }, [selectedYear, selectedMonth, userFilters])

  // Fetch transactions
  const {
    data: transactions,
    isLoading: transactionsLoading,
  } = useBigQueryData<Transaction[], Transaction[]>({
    queryName: 'sales-tracker-transactions',
    filters: {
      ...userFilters,
      month: selectedMonth,
      year: selectedYear,
    },
    defaultData: [],
    transformBigQueryData: (data) => data,
  })

  // Fetch monthly totals
  const {
    data: monthlyData,
    isLoading,
    dataSource,
    responseTime,
    refetch,
  } = useBigQueryData<MonthlyTotalsDetail | null, MonthlyTotalsDetail>({
    queryName: 'ae-monthly-totals-detail',
    filters: userFilters,
    defaultData: EMPTY_TOTALS_DATA,
    transformBigQueryData: (raw) => raw || EMPTY_TOTALS_DATA,
  })

  // Calculate business days
  const businessDays = useMemo(() => {
    return getBusinessDaysInMonth(selectedYear, selectedMonth - 1)
  }, [selectedYear, selectedMonth])

  // Merge BigQuery data with localStorage overrides
  const displayData = useMemo(() => {
    if (!monthlyData) return EMPTY_TOTALS_DATA

    return {
      ...monthlyData,
      proposalTermite: localOverrides.proposalTermite ?? monthlyData.proposalTermite,
      proposalContract: localOverrides.proposalContract ?? monthlyData.proposalContract,
      proposalJobWork: localOverrides.proposalJobWork ?? monthlyData.proposalJobWork,
      salesTermite: localOverrides.salesTermite ?? monthlyData.salesTermite,
      salesContract: localOverrides.salesContract ?? monthlyData.salesContract,
      salesJobWork: localOverrides.salesJobWork ?? monthlyData.salesJobWork,
      isq: localOverrides.isq ?? monthlyData.isq,
      personalGoal: localOverrides.personalGoal ?? monthlyData.personalGoal,
      proposalGrandTotal:
        (localOverrides.proposalTermite ?? monthlyData.proposalTermite) +
        (localOverrides.proposalContract ?? monthlyData.proposalContract) +
        (localOverrides.proposalJobWork ?? monthlyData.proposalJobWork),
      salesGrandTotal:
        (localOverrides.salesTermite ?? monthlyData.salesTermite) +
        (localOverrides.salesContract ?? monthlyData.salesContract) +
        (localOverrides.salesJobWork ?? monthlyData.salesJobWork),
      proposalsPerDay: monthlyData.totalProposalsCount / businessDays,
    }
  }, [monthlyData, localOverrides, businessDays])

  // Calculate YTD summary
  const ytdSummary = useMemo(() => {
    if (allMonthsData.length === 0) {
      return getEmptyYTD(selectedYear, selectedMonth)
    }
    return calculateYTD(selectedYear, selectedMonth, allMonthsData)
  }, [selectedYear, selectedMonth, allMonthsData])

  // Transaction handlers
  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setIsTransactionFormOpen(true)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsTransactionFormOpen(true)
  }

  const handleSaveTransaction = async (formData: TransactionFormData) => {
    const transaction: Transaction = {
      ...formData,
      id: editingTransaction?.id || `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: 'manual' as const,
    }

    try {
      await fetch('/api/sheets/write-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction }),
      })
      toastSuccess(
        editingTransaction ? 'Transaction Updated' : 'Transaction Saved',
        'Changes have been synced to Google Sheets'
      )
    } catch (error) {
      console.warn('[Sales Tracker] Failed to backup to Google Sheets:', error)
      toastError(
        'Sync Failed',
        'Transaction saved locally but could not sync to Google Sheets'
      )
    }

    setIsTransactionFormOpen(false)
    setEditingTransaction(null)
  }

  const handleSaveISQ = () => {
    const value = parseFloat(newISQ)
    if (!isNaN(value)) {
      updateMonthlyOverride(selectedYear, selectedMonth, 'isq', value)
      setLocalOverrides({ ...localOverrides, isq: value })
    }
    setEditingISQ(false)
  }

  const handleSaveGoal = () => {
    const value = parseFloat(newGoal)
    if (!isNaN(value)) {
      updateMonthlyOverride(selectedYear, selectedMonth, 'personalGoal', value)
      setLocalOverrides({ ...localOverrides, personalGoal: value })
    }
    setEditingGoal(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-200 animate-pulse rounded-lg" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with data source badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {MONTHS[selectedMonth - 1]} {selectedYear} Totals
        </h2>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* YTD Summary Card */}
      <YTDSummaryCard ytd={ytdSummary} isLoading={loadingYTD} />

      {/* Main Totals Table */}
      <Card>
        <CardHeader>
          <CardTitle>{MONTHS[selectedMonth - 1]} {selectedYear} Summary</CardTitle>
          <CardDescription>Proposals and sales by service category</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800">
                <TableHead className="w-[200px]"></TableHead>
                <TableHead className="text-right">Termite</TableHead>
                <TableHead className="text-right">Contract</TableHead>
                <TableHead className="text-right">Job Work</TableHead>
                <TableHead className="text-right font-bold bg-gray-100 dark:bg-gray-700">Grand Total</TableHead>
                <TableHead className="text-center">Total Count</TableHead>
                <TableHead className="text-center">Per Day</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* PROPOSALS SECTION */}
              <TableRow className="bg-blue-50/50 dark:bg-blue-900/20">
                <TableCell className="font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Proposals
                </TableCell>
                <TableCell className="text-right font-mono text-blue-700 dark:text-blue-300">
                  {formatCurrency(displayData.proposalTermite)}
                </TableCell>
                <TableCell className="text-right font-mono text-blue-700 dark:text-blue-300">
                  {formatCurrency(displayData.proposalContract)}
                </TableCell>
                <TableCell className="text-right font-mono text-blue-700 dark:text-blue-300">
                  {formatCurrency(displayData.proposalJobWork)}
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/40">
                  {formatCurrency(displayData.proposalGrandTotal)}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {displayData.totalProposalsCount}
                </TableCell>
                <TableCell className="text-center font-mono">
                  {displayData.proposalsPerDay.toFixed(1)}
                </TableCell>
              </TableRow>

              {/* SALES SECTION */}
              <TableRow className="bg-green-50/50 dark:bg-green-900/20">
                <TableCell className="font-bold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Sales
                </TableCell>
                <TableCell className="text-right font-mono text-green-700 dark:text-green-300">
                  {formatCurrency(displayData.salesTermite)}
                </TableCell>
                <TableCell className="text-right font-mono text-green-700 dark:text-green-300">
                  {formatCurrency(displayData.salesContract)}
                </TableCell>
                <TableCell className="text-right font-mono text-green-700 dark:text-green-300">
                  {formatCurrency(displayData.salesJobWork)}
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900/40">
                  {formatCurrency(displayData.salesGrandTotal)}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {displayData.totalSalesCount}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {displayData.totalStartedSalesCount}
                </TableCell>
              </TableRow>

              {/* ISQ ROW */}
              <TableRow className="bg-purple-50/50 dark:bg-purple-900/20">
                <TableCell className="font-bold text-purple-700 dark:text-purple-300">
                  ISQ (Individual Sales Quota)
                </TableCell>
                <TableCell colSpan={6}>
                  {editingISQ ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={newISQ}
                        onChange={(e) => setNewISQ(e.target.value)}
                        className="h-9 w-40 font-mono"
                        placeholder="Enter ISQ"
                        autoFocus
                      />
                      <Button size="sm" variant="default" onClick={handleSaveISQ}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingISQ(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-purple-700 dark:text-purple-300 font-bold text-lg">
                        {formatCurrency(displayData.isq)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-purple-600 hover:text-purple-700"
                        onClick={() => {
                          setNewISQ(String(displayData.isq))
                          setEditingISQ(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>

              {/* PERSONAL GOAL ROW */}
              <TableRow className="bg-amber-50/50 dark:bg-amber-900/20">
                <TableCell className="font-bold text-amber-700 dark:text-amber-300">
                  Personal Goal
                </TableCell>
                <TableCell colSpan={6}>
                  {editingGoal ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        className="h-9 w-40 font-mono"
                        placeholder="Enter goal"
                        autoFocus
                      />
                      <Button size="sm" variant="default" onClick={handleSaveGoal}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingGoal(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-amber-700 dark:text-amber-300 font-bold text-lg">
                        {displayData.personalGoal > 0 ? formatCurrency(displayData.personalGoal) : '(Not set)'}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-amber-600 hover:text-amber-700"
                        onClick={() => {
                          setNewGoal(String(displayData.personalGoal))
                          setEditingGoal(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction Details */}
      <TransactionList
        transactions={transactions}
        isLoading={transactionsLoading}
        onAddTransaction={handleAddTransaction}
        onEditTransaction={handleEditTransaction}
        monthName={MONTH_NAMES[selectedMonth - 1]}
      />

      {/* Transaction Form Modal */}
      <TransactionForm
        open={isTransactionFormOpen}
        onClose={() => {
          setIsTransactionFormOpen(false)
          setEditingTransaction(null)
        }}
        onSave={handleSaveTransaction}
        transaction={editingTransaction}
      />

      {/* Info Card */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-700 dark:text-gray-300">
                <strong>Proposals:</strong> All contracts created in {MONTHS[selectedMonth - 1]} ({displayData.totalProposalsCount} total)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-700 dark:text-gray-300">
                <strong>Sales:</strong> Contracts that have been started ({displayData.totalStartedSalesCount} started)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-gray-700 dark:text-gray-300">
                <strong>ISQ:</strong> Individual Sales Quota - manually set monthly target
              </span>
            </div>
            <div className="mt-3 pt-3 border-t text-gray-500 dark:text-gray-400">
              <strong>Business Days:</strong> {businessDays} workdays in {MONTHS[selectedMonth - 1]} {selectedYear} (Mon-Fri only)
            </div>
            <div className="text-gray-400 dark:text-gray-500">
              Data from PestPac via BigQuery (BCG_RTD_DB.DR_ContractSales) • Started = shown in Xactly
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// PROPOSALS VIEW (from ae/tracker/proposals/page.tsx)
// ============================================================================
function ProposalsView({
  selectedYear,
  selectedMonth,
  effectiveSalesPerson,
}: {
  selectedYear: number
  selectedMonth: number
  effectiveSalesPerson: string
}) {
  const [isExporting, setIsExporting] = useState(false)

  // Fetch proposals from BigQuery (Salesforce quotes)
  const {
    data: quotesData,
    isLoading,
    dataSource,
    responseTime,
    refetch,
  } = useBigQueryData<SalesforceQuote[], SalesforceQuote[]>({
    queryName: 'salesforce-quotes',
    filters: { salesPerson: effectiveSalesPerson, daysBack: 365, limit: 500 },
    defaultData: [],
    transformBigQueryData: (data) => data,
  })

  // Filter by selected month/year
  const filteredQuotes = quotesData.filter(quote => {
    const dateStr = quote.proposalDeliveredDate || quote.dateOfSale
    if (!dateStr) return false
    const date = new Date(dateStr)
    return date.getMonth() === selectedMonth - 1 && date.getFullYear() === selectedYear
  })

  // Calculate summary stats
  const summary = {
    totalProposals: filteredQuotes.length,
    proposalsDelivered: filteredQuotes.filter(q => q.proposalDeliveredDate).length,
    proposalsPending: filteredQuotes.filter(q => !q.proposalDeliveredDate && !q.dateOfSale).length,
    proposalsSold: filteredQuotes.filter(q => q.dateOfSale).length,
    totalValue: filteredQuotes.reduce((sum, q) => sum + (Number(q.totalAmount) || 0), 0),
    deliveredValue: filteredQuotes.filter(q => q.proposalDeliveredDate).reduce((sum, q) => sum + (Number(q.totalAmount) || 0), 0),
    soldValue: filteredQuotes.filter(q => q.dateOfSale).reduce((sum, q) => sum + (Number(q.totalAmount) || 0), 0),
  }

  const handleExportCSV = () => {
    setIsExporting(true)
    try {
      const headers = ['Quote Name', 'Account', 'Status', 'Total Amount', 'Proposal Delivered', 'Date of Sale', 'Branch']
      const rows = filteredQuotes.map(q => [
        q.quoteName,
        q.accountName || '',
        q.status || '',
        q.totalAmount,
        q.proposalDeliveredDate || '',
        q.dateOfSale || '',
        q.servicingBranch || ''
      ])
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proposals-${MONTHS[selectedMonth - 1]}-${selectedYear}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess('Export Complete', `Exported ${filteredQuotes.length} proposals to CSV`)
    } catch (error) {
      toastError('Export Failed', 'Could not generate CSV file')
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-200 animate-pulse rounded-lg" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with data source badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {MONTHS[selectedMonth - 1]} {selectedYear} Proposals
        </h2>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting || isLoading}>
            <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Quotes</p>
                <p className="text-xl font-bold">{summary.totalProposals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Delivered</p>
                <p className="text-xl font-bold">{summary.proposalsDelivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sold</p>
                <p className="text-xl font-bold">{summary.proposalsSold}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sold Value</p>
                <p className="text-xl font-bold">{formatCurrency2(summary.soldValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardContent className="pt-4 pb-4">
            <div>
              <p className="text-xs text-blue-100">Total Pipeline</p>
              <p className="text-2xl font-bold">{formatCurrency2(summary.totalValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proposals Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Salesforce Quotes &amp; Proposals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="min-w-[180px]">Quote Name</TableHead>
                  <TableHead className="min-w-[150px]">Account</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="text-right w-[120px]">Amount</TableHead>
                  <TableHead className="w-[110px]">Delivered</TableHead>
                  <TableHead className="w-[110px]">Sold Date</TableHead>
                  <TableHead className="w-[100px]">Branch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No proposals for {MONTHS[selectedMonth - 1]} {selectedYear} from Salesforce
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotes.map((quote, idx) => (
                    <TableRow
                      key={`${quote.quoteId}-${idx}`}
                      className={quote.dateOfSale ? 'bg-green-50 dark:bg-green-900/20' : ''}
                    >
                      <TableCell>
                        <Link
                          href={`/ae/quote/${quote.quoteId}`}
                          className="text-sm font-medium block max-w-[200px] truncate text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                          title={quote.quoteName}
                        >
                          {quote.quoteName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm block max-w-[150px] truncate" title={quote.accountName || ''}>
                          {quote.accountName || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={quote.dateOfSale ? 'default' : quote.status === 'Draft' ? 'secondary' : 'outline'}
                          className={`text-xs ${quote.dateOfSale ? 'bg-green-600' : ''}`}
                        >
                          {quote.dateOfSale ? 'Sold' : quote.status || 'Open'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono font-medium">
                        {formatCurrency2(Number(quote.totalAmount) || 0)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {quote.proposalDeliveredDate ? (
                          <span className="text-green-600">{formatDateDisplay(quote.proposalDeliveredDate)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {quote.dateOfSale ? (
                          <span className="text-green-600 font-medium">{formatDateDisplay(quote.dateOfSale)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {quote.servicingBranch || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-50 dark:bg-green-900/20 border border-green-300" />
              <span className="text-gray-600 dark:text-gray-400">Sold (Date of Sale set)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white dark:bg-gray-900 border" />
              <span className="text-gray-600 dark:text-gray-400">Open (in pipeline)</span>
            </div>
            <div className="text-gray-400 dark:text-gray-500">
              Data from Salesforce via BigQuery (Raw_RTXSF_Quote_Daily)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// SALES VIEW (from ae/tracker/sales/page.tsx)
// ============================================================================
function SalesView({
  selectedYear,
  selectedMonth,
  effectiveSalesPerson,
}: {
  selectedYear: number
  selectedMonth: number
  effectiveSalesPerson: string
}) {
  const [isExporting, setIsExporting] = useState(false)

  // Fetch sales from BigQuery
  const {
    data: salesData,
    isLoading,
    dataSource,
    responseTime,
    refetch,
  } = useBigQueryData<AESalesDetail[], AESalesDetail[]>({
    queryName: 'ae-sales-details',
    filters: { salesPerson: effectiveSalesPerson, daysBack: 365, limit: 500 },
    defaultData: [],
    transformBigQueryData: (data) => data,
  })

  // Filter by selected month/year
  const filteredSales = salesData.filter(sale => {
    if (!sale.sellDate) return false
    const saleDate = new Date(sale.sellDate)
    return saleDate.getMonth() === selectedMonth - 1 && saleDate.getFullYear() === selectedYear
  })

  // Calculate summary stats
  const summary = {
    totalSales: filteredSales.length,
    initialTotal: filteredSales.reduce((sum, s) => sum + (Number(s.initialValue) || 0), 0),
    contractTotal: filteredSales.reduce((sum, s) => sum + (Number(s.contractValue) || 0), 0),
    grandTotal: filteredSales.reduce((sum, s) => sum + (Number(s.totalValue) || 0), 0),
    termiteTotal: filteredSales.filter(s => s.productGroup?.toLowerCase().includes('termite') || s.productGroup === 'T' || s.productGroup === 'TERM' || s.productGroup === 'WD').reduce((sum, s) => sum + (Number(s.totalValue) || 0), 0),
    totalStartedSales: filteredSales.filter(s => s.startedInd === 'Y').length,
    startedValue: filteredSales.filter(s => s.startedInd === 'Y').reduce((sum, s) => sum + (Number(s.totalValue) || 0), 0),
  }

  const handleExportCSV = () => {
    setIsExporting(true)
    try {
      const headers = ['Date', 'Customer', 'Product', 'Type', 'Initial Price', 'Contract Price', 'Started', 'PestPac ID']
      const rows = filteredSales.map(s => [
        s.sellDate,
        `"${(s.customerName || '').replace(/"/g, '""')}"`,
        s.productGroup || '',
        s.serviceTypeName || s.serviceType || '',
        s.initialValue || 0,
        s.contractValue || 0,
        s.startedInd === 'Y' ? 'Yes' : 'No',
        s.salesId || ''
      ])
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sales-${MONTHS[selectedMonth - 1]}-${selectedYear}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess('Export Complete', `Exported ${filteredSales.length} sales to CSV`)
    } catch (error) {
      toastError('Export Failed', 'Could not generate CSV file')
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-200 animate-pulse rounded-lg" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with data source badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {MONTHS[selectedMonth - 1]} {selectedYear} Sales
        </h2>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting || isLoading}>
            <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-200">{MONTHS[selectedMonth - 1]} ISQ (Started)</p>
                <p className="text-2xl font-bold">{formatCurrency2(summary.startedValue)}</p>
                <p className="text-xs text-indigo-200 mt-1">{summary.totalStartedSales} started</p>
              </div>
              <Target className="h-8 w-8 text-indigo-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Initial (I/J)</p>
                <p className="text-xl font-bold">{formatCurrency2(summary.initialTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Contract (C)</p>
                <p className="text-xl font-bold">{formatCurrency2(summary.contractTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Termite Sales</p>
                <p className="text-xl font-bold">{formatCurrency2(summary.termiteTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Sold</p>
                <p className="text-xl font-bold">{formatCurrency2(summary.grandTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-100"># Sales</p>
                <p className="text-2xl font-bold">{summary.totalSales}</p>
              </div>
              <Play className="h-8 w-8 text-green-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sold contracts from PestPac</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="w-[100px]">Sold Date</TableHead>
                  <TableHead className="min-w-[150px]">Customer</TableHead>
                  <TableHead className="w-[100px]">Product</TableHead>
                  <TableHead className="w-[80px]">Type</TableHead>
                  <TableHead className="text-right w-[110px] bg-blue-50 dark:bg-blue-900/20">Job Work ($)</TableHead>
                  <TableHead className="text-right w-[110px] bg-purple-50 dark:bg-purple-900/20">Contract ($)</TableHead>
                  <TableHead className="text-center w-[70px]">Started</TableHead>
                  <TableHead className="w-[100px]">PestPac ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No sales for {MONTHS[selectedMonth - 1]} {selectedYear} from BigQuery
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale, idx) => (
                    <TableRow key={`${sale.salesId}-${idx}`}>
                      <TableCell className="text-sm">
                        {formatDateDisplay(sale.sellDate)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium block max-w-[150px] truncate" title={sale.customerName}>
                          {sale.customerName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {sale.productGroup || 'Other'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {sale.serviceTypeName || (sale.serviceType === 'C' ? 'Contract' : sale.serviceType === 'I' ? 'Initial' : 'Job')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono font-medium bg-blue-50/50 dark:bg-blue-900/10">
                        {Number(sale.initialValue) > 0 ? formatCurrency2(Number(sale.initialValue)) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono font-medium bg-purple-50/50 dark:bg-purple-900/10">
                        {Number(sale.contractValue) > 0 ? formatCurrency2(Number(sale.contractValue)) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {sale.startedInd === 'Y' ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 text-xs">
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-gray-500">
                        {sale.salesId || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-gray-600 dark:text-gray-400">Started = Service has begun (ISQ eligible)</span>
            </div>
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-blue-600" />
              <span className="text-gray-600 dark:text-gray-400">ISQ = In-System Quota (Xactly compensation)</span>
            </div>
            <div className="text-gray-400 dark:text-gray-500">
              Data from PestPac via BigQuery (DR_ContractSales)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
