'use client'

// React hooks not needed - all data from useBigQueryData hook
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  TrendingUp,
  FileText,
  CheckCircle,
  Plus,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  History,
  Clock,
} from 'lucide-react'
// BigQuery-only - no mock data fallback
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { AETracker, AEPipeline, AECompensationSummary, AESalesDetail, AEIntegratedDashboard } from '@/lib/bigquery/queries/ae'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { useState, useEffect } from 'react'
import { useRecentPages } from '@/hooks/useRecentPages'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

/**
 * Convert BigQuery numeric value to JavaScript number
 * BigQuery returns NUMERIC/BIGNUMERIC as objects with {value: number}
 */
function toBigQueryNumber(val: unknown): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return val
  if (typeof val === 'object' && val !== null && 'value' in val) {
    return Number((val as { value: unknown }).value) || 0
  }
  return Number(val) || 0
}

// Stats display interface - unified for both data sources
interface AEStats {
  mtdProposals: number
  mtdSales: number
  avgDealSize: number
  pipelineValue: number
  mtdRevenue: number
  monthlyGoal: number
  goalProgress: number
  proposalToSaleRate: number
}

// Pipeline display item
interface PipelineItem {
  id: string
  companyName: string
  service: string
  leadType: string
  amount: number
  date: string
  stage: string
  sold: boolean
  dead: boolean
}

// Transform pipeline data from BigQuery
function transformPipelineData(bqData: AEPipeline[]): PipelineItem[] {
  return bqData.map(p => ({
    id: p.opportunity_id,
    companyName: p.account_name || `Lead ${p.opportunity_id}`,
    service: 'Pest Control', // Default - BigQuery doesn't have service type yet
    leadType: p.stage,
    amount: toBigQueryNumber(p.amount),
    date: p.expected_close_date,
    stage: p.stage,
    sold: p.stage === 'Closed Won',
    dead: p.stage === 'Closed Lost',
  }))
}

const EMPTY_PIPELINE: PipelineItem[] = []

// Transform BigQuery data to display stats
function transformBigQueryData(bqData: AETracker[]): AEStats {
  // Sum up all AE data (or filter for specific AE)
  const totals = bqData.reduce(
    (acc, ae) => ({
      opportunities: acc.opportunities + toBigQueryNumber(ae.opportunities_created),
      won: acc.won + toBigQueryNumber(ae.opportunities_won),
      lost: acc.lost + toBigQueryNumber(ae.opportunities_lost),
      pipeline: acc.pipeline + toBigQueryNumber(ae.pipeline_value),
      revenue: acc.revenue + toBigQueryNumber(ae.revenue_closed),
      avgDealSize: toBigQueryNumber(ae.avg_deal_size), // Use last one or calculate weighted avg
      winRate: toBigQueryNumber(ae.win_rate),
    }),
    { opportunities: 0, won: 0, lost: 0, pipeline: 0, revenue: 0, avgDealSize: 0, winRate: 0 }
  )

  const monthlyGoal = 50000 // Could come from user settings
  return {
    mtdProposals: totals.opportunities,
    mtdSales: totals.won,
    avgDealSize: totals.avgDealSize || (totals.won > 0 ? totals.revenue / totals.won : 0),
    pipelineValue: totals.pipeline,
    mtdRevenue: totals.revenue,
    monthlyGoal,
    goalProgress: monthlyGoal > 0 ? (totals.revenue / monthlyGoal) * 100 : 0,
    proposalToSaleRate: totals.opportunities > 0 ? (totals.won / totals.opportunities) * 100 : 0,
  }
}

// Empty default data
const EMPTY_AE_STATS: AEStats = {
  mtdProposals: 0,
  mtdSales: 0,
  avgDealSize: 0,
  pipelineValue: 0,
  mtdRevenue: 0,
  monthlyGoal: 50000,
  goalProgress: 0,
  proposalToSaleRate: 0,
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Limit data to top N items, combining remainder into "Other"
 */
function limitToTopN<T extends { name: string; value?: number; count?: number }>(
  data: T[],
  n: number = 5,
  valueKey: 'value' | 'count' = 'value'
): T[] {
  if (data.length <= n) return data

  const sorted = [...data].sort((a, b) =>
    (b[valueKey] || 0) - (a[valueKey] || 0)
  )

  const top = sorted.slice(0, n)
  const rest = sorted.slice(n)

  const otherValue = rest.reduce((sum, item) => sum + (item[valueKey] || 0), 0)

  if (otherValue > 0) {
    top.push({
      name: 'Other',
      [valueKey]: otherValue
    } as T)
  }

  return top
}

export default function AccountExecutiveDashboard() {
  // Hydration fix for Zustand persisted state
  const [mounted, setMounted] = useState(false)
  const { profile } = useAuth()
  const effectiveRole = useEffectiveRole(mounted)
  const { recentPages, mounted: recentMounted } = useRecentPages()

  // BigQuery integration - returns live data when connected
  // NOTE: All hooks must be called BEFORE any conditional returns (React rules of hooks)
  const {
    data: bqStats,
    isLoading: isBQLoading,
    dataSource,
    responseTime,
    refetch: refetchBQ,
  } = useBigQueryData<AETracker[], AEStats>({
    queryName: 'ae-tracker',
    filters: { daysBack: 90 },
    defaultData: EMPTY_AE_STATS,
    transformBigQueryData,
    includeRoleFilters: true,
  })

  // BigQuery pipeline data - for Open Pipeline and Recent Activity
  const {
    data: bqPipeline,
    isLoading: isPipelineLoading,
    refetch: refetchPipeline,
  } = useBigQueryData<AEPipeline[], PipelineItem[]>({
    queryName: 'ae-pipeline',
    filters: { daysBack: 90, limit: 100 },
    defaultData: EMPTY_PIPELINE,
    transformBigQueryData: transformPipelineData,
    includeRoleFilters: true,
  })

  // Xactly-linked compensation data from DR_ContractSales (real sales data!)
  const {
    data: compensationData,
    isLoading: isCompLoading,
    refetch: refetchComp,
  } = useBigQueryData<AECompensationSummary | null, AECompensationSummary | null>({
    queryName: 'ae-compensation-summary',
    filters: { year: new Date().getFullYear() },
    defaultData: null,
    transformBigQueryData: (data) => data ? {
      salesPersonName: data.salesPersonName,
      employeeNum: data.employeeNum,
      totalSold: toBigQueryNumber(data.totalSold),
      totalStarted: toBigQueryNumber(data.totalStarted),
      totalValue: toBigQueryNumber(data.totalValue),
      startedValue: toBigQueryNumber(data.startedValue),
      startRate: toBigQueryNumber(data.startRate),
      avgDealSize: toBigQueryNumber(data.avgDealSize),
      productMix: data.productMix || [],
    } : null,
    includeRoleFilters: true,
  })

  // Xactly-linked sales details for pipeline/activity
  const {
    data: salesDetails,
    isLoading: isSalesLoading,
    refetch: refetchSales,
  } = useBigQueryData<AESalesDetail[], AESalesDetail[]>({
    queryName: 'ae-sales-details',
    filters: { daysBack: 90, limit: 50 },
    defaultData: [],
    transformBigQueryData: (data) => data.map(s => ({
      salesId: s.salesId,
      customerName: s.customerName,
      productGroup: s.productGroup,
      serviceType: s.serviceType,
      serviceTypeName: s.serviceTypeName,
      sellDate: s.sellDate,
      startDate: s.startDate,
      initialValue: toBigQueryNumber(s.initialValue),
      contractValue: toBigQueryNumber(s.contractValue),
      totalValue: toBigQueryNumber(s.totalValue),
      startedInd: s.startedInd,
      branch: s.branch,
      region: s.region,
      market: s.market,
    })),
    includeRoleFilters: true,
  })

  // Integrated dashboard from ALL sources (Salesforce + PestPac + Xactly + IRIS)
  const EMPTY_INTEGRATED: AEIntegratedDashboard = {
    openOpportunities: 0,
    proposalsDelivered: 0,
    pipelineValue: 0,
    contractsSold: 0,
    contractsStarted: 0,
    pendingStarts: 0,
    isqValue: 0,
    startRate: 0,
    avgDealSize: 0,
  }

  const {
    data: integratedData,
    isLoading: isIntegratedLoading,
    refetch: refetchIntegrated,
  } = useBigQueryData<AEIntegratedDashboard, AEIntegratedDashboard>({
    queryName: 'ae-integrated-dashboard',
    filters: { daysBack: 90 },
    defaultData: EMPTY_INTEGRATED,
    transformBigQueryData: (data) => ({
      openOpportunities: toBigQueryNumber(data.openOpportunities),
      proposalsDelivered: toBigQueryNumber(data.proposalsDelivered),
      pipelineValue: toBigQueryNumber(data.pipelineValue),
      contractsSold: toBigQueryNumber(data.contractsSold),
      contractsStarted: toBigQueryNumber(data.contractsStarted),
      pendingStarts: toBigQueryNumber(data.pendingStarts),
      isqValue: toBigQueryNumber(data.isqValue),
      startRate: toBigQueryNumber(data.startRate),
      avgDealSize: toBigQueryNumber(data.avgDealSize),
    }),
    includeRoleFilters: true,
  })

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // Show loading state while BigQuery data is being fetched
  const isLoading = isBQLoading && isIntegratedLoading && isCompLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // Build stats from integrated dashboard (Salesforce + PestPac + Xactly)
  // MTD Sales = contracts SOLD (from PestPac), NOT started
  // MTD Revenue = ISQ value (started contracts - what you get paid on from Xactly)
  const integratedStats: AEStats = {
    mtdProposals: integratedData.proposalsDelivered,
    mtdSales: integratedData.contractsSold,  // SOLD contracts from PestPac
    avgDealSize: integratedData.avgDealSize,
    pipelineValue: integratedData.pipelineValue,
    mtdRevenue: integratedData.isqValue,  // STARTED contracts (Xactly compensation)
    monthlyGoal: 50000,
    goalProgress: 50000 > 0 ? (integratedData.isqValue / 50000) * 100 : 0,
    proposalToSaleRate: integratedData.contractsSold > 0
      ? (integratedData.contractsStarted / integratedData.contractsSold) * 100
      : 0,  // Start rate = started / sold
  }

  // Fallback stats from Xactly compensation only
  const compensationStats: AEStats = compensationData ? {
    mtdProposals: compensationData.totalSold,  // Proposals = sold in this context
    mtdSales: compensationData.totalSold,  // SOLD contracts
    avgDealSize: compensationData.avgDealSize,
    pipelineValue: compensationData.totalValue - compensationData.startedValue,
    mtdRevenue: compensationData.startedValue,  // ISQ value (started)
    monthlyGoal: 50000,
    goalProgress: 50000 > 0 ? (compensationData.startedValue / 50000) * 100 : 0,
    proposalToSaleRate: compensationData.startRate * 100,
  } : EMPTY_AE_STATS

  // Priority: Integrated (SF+PP+X) > Xactly compensation > ae-tracker
  // Use integrated stats if we have real data from any source
  const hasIntegratedData = integratedData.contractsSold > 0 || integratedData.openOpportunities > 0
  const stats = hasIntegratedData ? integratedStats : (compensationData ? compensationStats : bqStats)
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  // Calculate MTD (Month-To-Date) values from salesDetails
  const mtdSalesDetails = salesDetails.filter(s => {
    if (!s.sellDate) return false
    const d = new Date(s.sellDate)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  // MTD Sold = total value of contracts sold this month (regardless of start status)
  const mtdSoldValue = mtdSalesDetails.reduce((sum, s) => sum + toBigQueryNumber(s.totalValue), 0)
  const mtdSoldCount = mtdSalesDetails.length

  // MTD Started = total value of contracts that started this month (what you get paid on)
  const mtdStartedValue = mtdSalesDetails
    .filter(s => s.startedInd === 'Y')
    .reduce((sum, s) => sum + toBigQueryNumber(s.totalValue), 0)
  const mtdStartedCount = mtdSalesDetails.filter(s => s.startedInd === 'Y').length

  // Chart data from BigQuery sales details (group by month)
  const monthlyTrendData = salesDetails.length > 0
    ? Array.from({ length: currentMonth + 1 }, (_, i) => {
        const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]
        const monthSales = salesDetails.filter(s => {
          if (!s.sellDate) return false
          const d = new Date(s.sellDate)
          return d.getMonth() === i && d.getFullYear() === new Date().getFullYear()
        })
        return {
          month: monthName,
          proposals: monthSales.length,
          sales: monthSales.filter(s => s.startedInd === 'Y').reduce((sum, s) => sum + toBigQueryNumber(s.totalValue), 0),
        }
      })
    : []

  // Service breakdown from BigQuery sales details (Xactly-linked)
  const serviceBreakdown = salesDetails.reduce((acc, s) => {
    const service = s.productGroup || 'Other'
    const existing = acc.find(a => a.name === service)
    if (existing) {
      existing.value += toBigQueryNumber(s.totalValue)
    } else {
      acc.push({
        name: service,
        value: toBigQueryNumber(s.totalValue),
      })
    }
    return acc
  }, [] as { name: string; value: number }[])

  // Clean up lead source data - parse concatenated service types into primary categories
  const cleanLeadSource = (rawSource: string | undefined): string => {
    if (!rawSource) return 'Other'

    const source = rawSource.toLowerCase()

    // Priority-based categorization (Contract > Job > Product > Other)
    if (source.includes('contract') || source.includes('recurring')) {
      return 'Contract (Recurring)'
    } else if (source.includes('job - ini') || source.includes('initial')) {
      return 'Job - Initial'
    } else if (source.includes('job')) {
      return 'Job'
    } else if (source.includes('product')) {
      return 'Product'
    }

    return 'Other'
  }

  // Service type breakdown from BigQuery sales details - cleaned
  const leadSourceData = salesDetails.reduce((acc, s) => {
    const source = cleanLeadSource(s.serviceTypeName || s.serviceType)
    const existing = acc.find(a => a.name === source)
    if (existing) {
      existing.count++
    } else {
      acc.push({ name: source, count: 1 })
    }
    return acc
  }, [] as { name: string; count: number }[])

  // Transform sales details to pipeline items for display
  const salesDetailsPipeline: PipelineItem[] = salesDetails.map(s => ({
    id: s.salesId || `${s.customerName}-${s.sellDate}`,
    companyName: s.customerName,
    service: s.productGroup,
    leadType: s.serviceType,
    amount: toBigQueryNumber(s.totalValue),
    date: s.sellDate,
    stage: s.startedInd === 'Y' ? 'Started' : 'Pending',
    sold: s.startedInd === 'Y',
    dead: false,
  }))

  // Use BigQuery sales details - pending starts
  const openPipeline = salesDetails.length > 0
    ? salesDetailsPipeline.filter(p => !p.sold)
    : bqPipeline.filter(p => !p.sold && !p.dead)

  // Recent activity from BigQuery
  const recentProposals = salesDetails.length > 0
    ? salesDetailsPipeline.slice(0, 5)
    : bqPipeline.slice(0, 5)

  const recentSales = salesDetails.length > 0
    ? salesDetailsPipeline.filter(p => p.sold).slice(0, 5)
    : bqPipeline.filter(p => p.sold).slice(0, 5)

  // For backwards compatibility, alias pipeline
  const pipeline = openPipeline

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Welcome back, {profile?.name || 'Account Executive'} • Account Executive
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <DataSourceBadge status={hasIntegratedData ? 'bigquery' : (compensationData ? 'bigquery' : dataSource)} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={() => { refetchBQ(); refetchPipeline(); refetchComp(); refetchSales(); refetchIntegrated(); }} disabled={isBQLoading || isPipelineLoading || isCompLoading || isSalesLoading || isIntegratedLoading}>
            <RefreshCw className={`h-4 w-4 ${(isBQLoading || isPipelineLoading || isCompLoading || isSalesLoading || isIntegratedLoading) ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild className="bg-primary">
            <Link href="/ae/quote/new">
              <FileText className="h-4 w-4 mr-2" />
              Create Quote
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/ae/tracker">
              <Plus className="h-4 w-4 mr-2" />
              Add Proposal
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/ae/tracker">
              <CheckCircle className="h-4 w-4 mr-2" />
              Log Sale
            </Link>
          </Button>
        </div>
      </div>

      {/* Goal Progress Banner - MTD Started (what you get paid on) */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Monthly Goal Progress (MTD Started)</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(mtdStartedValue)} / {formatCurrency(stats.monthlyGoal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{((mtdStartedValue / stats.monthlyGoal) * 100).toFixed(0)}%</p>
              <p className="text-blue-100 text-sm">of target</p>
            </div>
          </div>
          <Progress
            value={Math.min((mtdStartedValue / stats.monthlyGoal) * 100, 100)}
            className="mt-4 h-3 bg-blue-500"
          />
          <div className="flex justify-between mt-2 text-sm text-blue-100">
            <span>{formatCurrency(stats.monthlyGoal - mtdStartedValue)} to go</span>
            <span>
              {(mtdStartedValue / stats.monthlyGoal) * 100 >= 100 ? '🎉 Goal Achieved!' : `${(100 - (mtdStartedValue / stats.monthlyGoal) * 100).toFixed(0)}% remaining`}
            </span>
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t border-blue-500 text-xs text-blue-100">
            <span>MTD Sold: {formatCurrency(mtdSoldValue)} ({mtdSoldCount} contracts)</span>
            <span>Start Rate: {mtdSoldCount > 0 ? ((mtdStartedCount / mtdSoldCount) * 100).toFixed(0) : 0}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Create Quote CTA - Prominent placement visible even with role preview banner */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 border-none hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Create New Quote</h3>
                  <p className="text-purple-100 text-sm">Build professional quotes from our service catalog</p>
                </div>
              </div>
              <p className="text-white/90 text-sm mt-2">
                Multi-step wizard with account selection, service catalog, pricing configuration, and email preview
              </p>
            </div>
            <Button asChild size="lg" className="bg-white text-purple-600 hover:bg-white/90 font-semibold ml-4">
              <Link href="/ae/quote/new">
                Start Quote Builder
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">MTD Sold</p>
                <p className="text-2xl font-bold">{mtdSoldCount} contracts</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-600 dark:text-gray-300">{formatCurrency(mtdSoldValue)} value</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">MTD Started</p>
                <p className="text-2xl font-bold">{mtdStartedCount} contracts</p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-green-600 dark:text-green-400">{formatCurrency(mtdStartedValue)} earned</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Deal Size</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgDealSize)}</p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+12% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pipeline Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.pipelineValue)}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-500">{pipeline.length} open proposals</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
              <CardDescription>Proposals vs Sales revenue by month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendData}>
                    <defs>
                      <filter id="glow-ae" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge>
                          <feMergeNode in="blur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: '#374151' }}
                      cursor={false}
                    />
                    <Bar dataKey="proposals" name="Proposals" fill="#93c5fd" radius={[4, 4, 0, 0]} activeBar={{ filter: 'url(#glow-ae)' }} />
                    <Bar dataKey="sales" name="Sales" fill="#22c55e" radius={[4, 4, 0, 0]} activeBar={{ filter: 'url(#glow-ae)' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Service Mix */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Mix</CardTitle>
                <CardDescription>Revenue by service category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter id="glow-ae-pie2" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="3" result="blur"/>
                          <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <Pie
                        data={limitToTopN(serviceBreakdown, 5, 'value')}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={90}
                        activeShape={{ filter: 'url(#glow-ae-pie2)' }}
                      >
                        {limitToTopN(serviceBreakdown, 5, 'value').map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} cursor={false} />
                      <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Lead Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
                <CardDescription>Breakdown by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter id="glow-ae-pie3" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="3" result="blur"/>
                          <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <Pie
                        data={leadSourceData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={90}
                        activeShape={{ filter: 'url(#glow-ae-pie3)' }}
                      >
                        {leadSourceData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [value, 'Count']}
                        cursor={false}
                      />
                      <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Activity & Pipeline */}
        <div className="space-y-6">
          {/* Recently Viewed Pages */}
          {recentMounted && recentPages.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Quick Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentPages.slice(0, 5).map((page) => (
                    <Link
                      key={page.path}
                      href={page.path}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors group"
                    >
                      <Clock className="h-3.5 w-3.5 text-gray-400 group-hover:text-primary" />
                      <span className="truncate group-hover:underline">{page.title}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pipeline */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Open Pipeline</CardTitle>
                <Badge variant="secondary">{pipeline.length} proposals</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pipeline.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No open proposals</p>
                ) : (
                  pipeline.slice(0, 5).map((p: PipelineItem | { id: string; companyName: string; service?: string; leadType?: string; date: string; jobWorkPrice?: number; termitePrice?: number; contractPrice?: number; amount?: number }, idx: number) => (
                    <div
                      key={`pipeline-${p.id}-${idx}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer"
                    >
                      <div>
                        <p className="font-medium text-sm truncate max-w-[150px]" title={p.companyName}>{p.companyName}</p>
                        <p className="text-xs text-muted-foreground">{('service' in p ? p.service : 'Service')} • {('leadType' in p ? p.leadType : 'stage' in p ? (p as PipelineItem).stage : 'Lead')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency('amount' in p && p.amount ? toBigQueryNumber(p.amount) : (toBigQueryNumber(('jobWorkPrice' in p ? (p.jobWorkPrice || 0) : 0)) + toBigQueryNumber(('termitePrice' in p ? (p.termitePrice || 0) : 0)) + toBigQueryNumber(('contractPrice' in p ? ((p.contractPrice || 0) * 12) : 0))))}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {pipeline.length > 5 && (
                <Button variant="ghost" className="w-full mt-2" size="sm">
                  View all {pipeline.length} proposals
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="proposals">
                <TabsList className="w-full">
                  <TabsTrigger value="proposals" className="flex-1">Proposals</TabsTrigger>
                  <TabsTrigger value="sales" className="flex-1">Sales</TabsTrigger>
                </TabsList>
                <TabsContent value="proposals" className="mt-3">
                  <div className="space-y-2">
                    {recentProposals.map((p, idx) => (
                      <div
                        key={`proposal-${p.id}-${idx}`}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            p.sold ? 'bg-green-500' : p.dead ? 'bg-red-500' : 'bg-amber-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium truncate max-w-[120px]" title={p.companyName}>{p.companyName}</p>
                            <p className="text-xs text-gray-500">{formatDate(p.date)}</p>
                          </div>
                        </div>
                        <Badge variant={p.sold ? 'default' : p.dead ? 'destructive' : 'secondary'}>
                          {p.sold ? 'Won' : p.dead ? 'Lost' : 'Open'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="sales" className="mt-3">
                  <div className="space-y-2">
                    {recentSales.map((s: PipelineItem | { id: string; companyName: string; date: string; service?: string; jobWorkPrice?: number; termitePrice?: number; contractPrice?: number; amount?: number; started?: boolean; paid?: boolean }, idx: number) => (
                      <div
                        key={`sale-${s.id}-${idx}`}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div>
                          <p className="text-sm font-medium truncate max-w-[120px]" title={s.companyName}>{s.companyName}</p>
                          <p className="text-xs text-gray-500">{formatDate(s.date)} • {('service' in s ? s.service : 'Sale')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-green-600">
                            {formatCurrency('amount' in s && s.amount ? toBigQueryNumber(s.amount) : (toBigQueryNumber(('jobWorkPrice' in s ? (s.jobWorkPrice || 0) : 0)) + toBigQueryNumber(('termitePrice' in s ? (s.termitePrice || 0) : 0)) + toBigQueryNumber(('contractPrice' in s ? ((s.contractPrice || 0) * 12) : 0))))}
                          </p>
                          <div className="flex gap-1">
                            {'started' in s && s.started && <Badge variant="outline" className="text-xs">Started</Badge>}
                            {'paid' in s && s.paid && <Badge variant="outline" className="text-xs">Paid</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* YTD Summary - uses Xactly-linked data from BigQuery */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">2026 YTD {compensationData ? '(Xactly)' : ''}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Sold</span>
                  <span className="font-semibold">{formatCurrency(compensationData ? compensationData.totalValue : 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Started (ISQ)</span>
                  <span className="font-semibold text-green-600">{formatCurrency(compensationData ? compensationData.startedValue : 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Annual Goal</span>
                  <span className="font-semibold">{formatCurrency(300000)}</span>
                </div>
                <Progress
                  value={compensationData ? (compensationData.startedValue / 300000) * 100 : 0}
                  className="h-2"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {compensationData ? ((compensationData.startedValue / 300000) * 100).toFixed(1) : '0.0'}% to goal
                  </span>
                  <span className="text-gray-500">
                    {formatCurrency(300000 - (compensationData ? compensationData.startedValue : 0))} remaining
                  </span>
                </div>
                {compensationData && (
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Contracts Sold</span>
                      <span>{toBigQueryNumber(compensationData.totalSold)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Started</span>
                      <span>{toBigQueryNumber(compensationData.totalStarted)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Start Rate</span>
                      <span>{(toBigQueryNumber(compensationData.startRate) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
