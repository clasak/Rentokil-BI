'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/components/providers/AuthProvider'
import { isAdminEmail } from '@/lib/admin'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Clock,
  CheckCircle,
  Truck,
  Calendar,
  DollarSign,
  Building2,
  RefreshCw,
  Package,
  Search,
  AlertTriangle,
  ExternalLink,
  Mail,
  FileText,
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { NewStartRecord, NewStartsSummary } from '@/lib/bigquery/queries/new-starts'

type NewStartStatus = 'pending_ops' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'on_hold'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function getStatusBadge(status: NewStartStatus) {
  const config: Record<NewStartStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
    pending_ops: { label: 'Pending Ops', variant: 'secondary', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    scheduled: { label: 'Scheduled', variant: 'outline', className: 'border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300' },
    confirmed: { label: 'Confirmed', variant: 'default', className: 'bg-blue-600 text-white' },
    in_progress: { label: 'In Progress', variant: 'default', className: 'bg-purple-600 text-white' },
    completed: { label: 'Completed', variant: 'default', className: 'bg-green-600 text-white' },
    on_hold: { label: 'On Hold', variant: 'destructive' },
  }
  const { label, variant, className } = config[status]
  return <Badge variant={variant} className={className}>{label}</Badge>
}

// Empty defaults for BigQuery data
const EMPTY_ENTRIES: NewStartRecord[] = []
const EMPTY_SUMMARY: NewStartsSummary = {
  total: 0,
  pendingOps: 0,
  scheduled: 0,
  confirmed: 0,
  inProgress: 0,
  completed: 0,
  onHold: 0,
  totalInitialValue: 0,
  totalContractValue: 0,
}

// Helper component for expandable text
function ExpandableText({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  // Estimate if text will be more than 4 lines (rough: ~50 chars per line at text-xs in 300px)
  const isLongText = text.length > 200

  return (
    <div className="text-xs whitespace-normal max-w-[300px] leading-relaxed">
      <div className={isExpanded ? '' : 'line-clamp-4'}>
        {text}
      </div>
      {isLongText && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 dark:text-blue-400 hover:underline mt-1 text-xs font-medium"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

// Helper component for truncated text with instant tooltip
function TruncatedText({ text, className }: { text: string; className?: string }) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <p className={className}>{text}</p>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{text}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export default function NewStartsPage() {
  const { user, profile } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString()) // Default to current year (2026)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine if user is admin
  const isAdmin = mounted && user?.email ? isAdminEmail(user.email) : false

  // Everyone sees their own data by default (including admins)
  const salesPersonFilter = mounted && profile?.name ? profile.name : undefined

  // Calculate daysBack based on selected month and year
  const daysBack = useMemo(() => {
    if (selectedMonth === 'all') return 365 // Show all for current year
    const now = new Date()
    const selectedDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1)
    const diffTime = Math.abs(now.getTime() - selectedDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.min(diffDays + 60, 365) // Add 60 days buffer, max 365
  }, [selectedMonth, selectedYear])

  // Fetch new starts from BigQuery (PestPac - W3_Contract_Checker.T0_unf_Contract_All)
  // Uses ae-new-start-entries which has LIKE matching for salesPerson
  const {
    data: entries,
    isLoading: entriesLoading,
    dataSource,
    responseTime,
    error: entriesError,
    refetch: refetchEntries,
  } = useBigQueryData<NewStartRecord[], NewStartRecord[]>({
    queryName: 'ae-new-start-entries',
    filters: {
      salesPerson: salesPersonFilter, // Everyone sees their own data
      daysBack,
      limit: 500
    },
    defaultData: EMPTY_ENTRIES,
    transformBigQueryData: (data) => data,
  })

  // Fetch summary from BigQuery
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useBigQueryData<NewStartsSummary, NewStartsSummary>({
    queryName: 'ae-new-start-summary',
    filters: {
      salesPerson: salesPersonFilter, // Everyone sees their own data
      daysBack
    },
    defaultData: EMPTY_SUMMARY,
    transformBigQueryData: (data) => data,
  })

  const isLoading = entriesLoading || summaryLoading
  const hasError = entriesError || summaryError

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  // Error state
  if (hasError) {
    const errorMsg = entriesError || summaryError || 'Unknown error'
    const errorSource = entriesError ? 'New Start Entries' : 'Summary'

    return (
      <TooltipProvider delayDuration={0}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Start Log</h1>
            <p className="text-gray-500 dark:text-gray-400">Track handoffs from Sales to Operations</p>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold">Failed to Load New Starts Data</span>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
                {errorMsg}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{errorSource}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Sales Person:</span>
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{salesPersonFilter || 'All'}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
                <Button variant="outline" size="sm" onClick={() => { refetchEntries(); refetchSummary(); }}>
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  Retry
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://console.cloud.google.com/bigquery', '_blank')}
                >
                  <FileText className="h-3 w-3 mr-1.5" />
                  View Logs
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const subject = encodeURIComponent('New Starts Error')
                    const body = encodeURIComponent(`Error: ${errorMsg}\n\nSource: ${errorSource}\n\nPlease investigate.`)
                    window.location.href = `mailto:support@rentokil.com?subject=${subject}&body=${body}`
                  }}
                >
                  <Mail className="h-3 w-3 mr-1.5" />
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    )
  }

  // Filter entries by tab, month/year, and search
  const filteredEntries = entries.filter(e => {
    // Filter by tab
    if (activeTab === 'pending' && e.status !== 'pending_ops') return false
    if (activeTab === 'active' && !['scheduled', 'confirmed', 'in_progress'].includes(e.status)) return false
    if (activeTab === 'completed' && e.status !== 'completed') return false

    // Filter by month/year
    if (selectedMonth !== 'all') {
      const soldDate = new Date(e.soldDate)
      const entryMonth = (soldDate.getMonth() + 1).toString()
      const entryYear = soldDate.getFullYear().toString()
      if (entryMonth !== selectedMonth || entryYear !== selectedYear) return false
    } else if (selectedYear !== 'all') {
      const soldDate = new Date(e.soldDate)
      const entryYear = soldDate.getFullYear().toString()
      if (entryYear !== selectedYear) return false
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      return (
        e.accountName.toLowerCase().includes(search) ||
        e.serviceAddress.toLowerCase().includes(search) ||
        e.pestPacId?.toLowerCase().includes(search) ||
        e.salesPerson?.toLowerCase().includes(search)
      )
    }

    return true
  })

  // Calculate totals from filtered entries (what's actually visible in the table)
  const filteredTotals = {
    totalInitialValue: filteredEntries.reduce((sum, entry) => {
      const value = Number(entry.initialJobPrice) || 0
      return sum + value
    }, 0),
    totalContractValue: filteredEntries.reduce((sum, entry) => {
      const value = Number(entry.contractValue) || 0
      return sum + value
    }, 0),
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Start Log</h1>
          <p className="text-gray-500 dark:text-gray-400">Track handoffs from Sales to Operations (PestPac + Salesforce)</p>
        </div>
        <div className="flex gap-2 items-center">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={() => { refetchEntries(); refetchSummary(); }} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild>
            <Link href="/ae/new-starts/new">
              <Plus className="h-4 w-4 mr-2" />
              New Start Entry
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[250px] max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by account name, address, PestPac ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Year Filter */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>

            {/* Month Filter */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                <SelectItem value="1">January</SelectItem>
                <SelectItem value="2">February</SelectItem>
                <SelectItem value="3">March</SelectItem>
                <SelectItem value="4">April</SelectItem>
                <SelectItem value="5">May</SelectItem>
                <SelectItem value="6">June</SelectItem>
                <SelectItem value="7">July</SelectItem>
                <SelectItem value="8">August</SelectItem>
                <SelectItem value="9">September</SelectItem>
                <SelectItem value="10">October</SelectItem>
                <SelectItem value="11">November</SelectItem>
                <SelectItem value="12">December</SelectItem>
              </SelectContent>
            </Select>

            {/* Results count */}
            <div className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
              Showing {filteredEntries.length} of {entries.length} entries
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Pending Ops</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.pendingOps}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Scheduled</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.scheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Confirmed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">In Progress</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Initial Value</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(filteredTotals.totalInitialValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Contract Value</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(filteredTotals.totalContractValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({entries.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({summary.pendingOps})</TabsTrigger>
              <TabsTrigger value="active">Active ({summary.scheduled + summary.confirmed + summary.inProgress})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({summary.completed})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {/* Column Group Headers */}
                <TableRow className="border-b-0">
                  <TableHead
                    colSpan={11}
                    className="bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 text-center font-semibold border-r-2 border-red-300 dark:border-red-700"
                  >
                    AE Section (Sales)
                  </TableHead>
                  <TableHead
                    colSpan={7}
                    className="bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 text-center font-semibold"
                  >
                    OM Section (Operations)
                  </TableHead>
                </TableRow>
                {/* Column Headers */}
                <TableRow>
                  {/* RED - AE Columns */}
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Sold Date</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Account Name</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 min-w-[200px]">Service Address</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Sales Rep</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-right">Initial Price</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-right">
                    <div>Annual Contract Value</div>
                    <div className="text-xs font-normal">(Monthly value)</div>
                  </TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Service Type</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Type Code</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Pest Types</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Customer Start</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-r-2 border-red-300 dark:border-red-700">PestPac</TableHead>
                  {/* YELLOW - OPS Columns */}
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Ops Manager</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Specialist</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Materials</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Confirmed Start</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Install Started</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 min-w-[300px]">
                    SPECIAL NOTES / Equipment Overview
                  </TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={18} className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry, idx) => (
                    <TableRow
                      key={`${entry.id}-${idx}`}
                      className={`hover:bg-muted/50 ${entry.status === 'completed' ? 'bg-green-50/50 dark:bg-green-950/20' : ''}`}
                    >
                      {/* RED - AE Columns (from PestPac - W3_Contract_Checker) */}
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20 font-medium">
                        {formatDate(entry.soldDate)}
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        <TruncatedText
                          text={entry.accountName}
                          className="font-medium truncate max-w-[140px]"
                        />
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        <p className="text-sm whitespace-normal max-w-[200px] leading-tight">{entry.serviceAddress}</p>
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        {entry.salesPerson}
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20 text-right font-medium">
                        {formatCurrency(entry.initialJobPrice)}
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20 text-right">
                        {entry.contractValue > 0 ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{formatCurrency(entry.contractValue)}</span>
                            <span className="text-xs text-muted-foreground">({formatCurrency(entry.contractValue / 12)})</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        <Badge variant="outline" className="text-xs">{entry.serviceTypeName}</Badge>
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        <span className="text-xs">{entry.serviceType || '-'}</span>
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        {entry.pestTypes && entry.pestTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {entry.pestTypes.slice(0, 2).map((pest, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {pest}
                              </Badge>
                            ))}
                            {entry.pestTypes.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{entry.pestTypes.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        {entry.startDate ? (
                          <span className="text-sm font-medium">{formatDate(entry.startDate)}</span>
                        ) : (
                          <span className="text-amber-600 text-sm">TBD</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20 border-r-2 border-red-200 dark:border-red-800">
                        {entry.pestPacId && entry.pestPacId !== 'null' && entry.pestPacId !== '' ? (
                          <a
                            href={`https://app.rentokil.pestpac.com/location/edit.asp?Mode=Detail&LocationID=${entry.pestPacId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                          >
                            {entry.pestPacId}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      {/* YELLOW - OPS Columns (from DR_WorkOrders) */}
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        {entry.opsManager ? (
                          <span className="text-sm">{entry.opsManager}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        {entry.assignedSpecialist ? (
                          <span className="text-sm">{entry.assignedSpecialist}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20 text-center">
                        {entry.materialsOrdered ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                            {entry.materialsOrdered}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        {entry.confirmedStartDate ? (
                          formatDate(entry.confirmedStartDate)
                        ) : (
                          <span className="text-amber-600 text-sm">TBD</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        {entry.installStarted ? (
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {formatDate(entry.installStarted)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not Started</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        {entry.equipmentDetails && entry.equipmentDetails.trim() !== '' ? (
                          <ExpandableText text={entry.equipmentDetails} />
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        {getStatusBadge(entry.status as NewStartStatus)}
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
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 dark:bg-red-950 border-2 border-red-400 dark:border-red-700 rounded" />
                <span className="font-medium text-red-700 dark:text-red-400">Sales Data (PestPac/Salesforce)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-950 border-2 border-yellow-400 dark:border-yellow-700 rounded" />
                <span className="font-medium text-yellow-700 dark:text-yellow-400">Operations Data (BigQuery DR_WorkOrders)</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Data from BigQuery • Currency displayed as $0.00 | Dates displayed as MM/DD/YYYY
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  )
}
