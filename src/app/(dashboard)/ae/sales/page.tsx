'use client'

/**
 * AE Sales Hub - Unified Sales Interface
 *
 * Consolidates Accounts, Pipeline, and Quotes into one tabbed interface.
 * Replaces separate /ae/accounts, /ae/pipeline pages.
 *
 * Features:
 * - Accounts tab: Search and manage customer accounts
 * - Pipeline tab: Kanban view of opportunities by stage
 * - Quotes tab: View and manage quotes/proposals
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { useRecentPages } from '@/hooks/useRecentPages'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { useAppStore } from '@/store'
import type { SalesforceAccount } from '@/lib/bigquery/queries/salesforce'
import type { SalesforceOpportunity, SalesforceQuote } from '@/lib/bigquery/queries/ae'
import {
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  TrendingUp,
  User,
  Search,
  Plus,
  Filter,
  Layers,
  FileText,
  AlertTriangle,
  ExternalLink,
  Mail,
  RefreshCw,
} from 'lucide-react'

const EMPTY_ACCOUNTS: SalesforceAccount[] = []
const EMPTY_OPPORTUNITIES: SalesforceOpportunity[] = []
const EMPTY_QUOTES: SalesforceQuote[] = []

// Opportunity stages for kanban
const STAGES = [
  { id: 'Prospect', name: 'Prospect', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { id: 'Qualified', name: 'Qualified', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { id: 'Proposal', name: 'Proposal', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  { id: 'Negotiation', name: 'Negotiation', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { id: 'Closed Won', name: 'Closed Won', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { id: 'Closed Lost', name: 'Closed Lost', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
]

function SalesHubContent() {
  useRecentPages()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const role = useEffectiveRole(mounted)
  const { settings } = useAppStore()

  // Get tab from URL or default to pipeline
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'pipeline')
  const [accountSearch, setAccountSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showAccountResults, setShowAccountResults] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Debounce account search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(accountSearch)
      if (accountSearch.length > 0) {
        setShowAccountResults(true)
      } else {
        setShowAccountResults(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [accountSearch])

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.push(`/ae/sales?tab=${tab}`, { scroll: false })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Show loading skeleton during hydration instead of blank screen
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="h-9 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-5 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
          </div>
          <div className="w-96 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Account Search */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales Hub</h1>
          <p className="text-muted-foreground mt-1">
            Track opportunities, manage quotes, and search accounts
          </p>
        </div>
        {/* Account Search */}
        <div className="w-96 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Account Search Results Dropdown */}
          {showAccountResults && (
            <div className="absolute top-full mt-2 w-full z-50">
              <AccountSearchResults
                searchTerm={debouncedSearch}
                onClose={() => setShowAccountResults(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quotes
          </TabsTrigger>
        </TabsList>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-4">
          <PipelineView />
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="space-y-4">
          <QuotesView />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =============================================================================
// Account Search Results Dropdown
// =============================================================================

function AccountSearchResults({
  searchTerm,
  onClose,
}: {
  searchTerm: string
  onClose: () => void
}) {
  const {
    data: accounts,
    isLoading,
  } = useBigQueryData<SalesforceAccount[], SalesforceAccount[]>({
    queryName: 'salesforce-accounts',
    filters: {
      searchTerm: searchTerm || undefined,
      limit: 10,
    },
    defaultData: EMPTY_ACCOUNTS,
    transformBigQueryData: (data) => data,
    includeRoleFilters: false,
  })

  if (!searchTerm) return null

  return (
    <Card className="shadow-lg border-2">
      <CardContent className="p-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No accounts found for &quot;{searchTerm}&quot;
          </div>
        ) : (
          <div className="space-y-1">
            {accounts.map((account) => (
              <Link
                key={account.account_id}
                href={`/ae/accounts/${account.account_id}`}
                onClick={onClose}
              >
                <div className="p-3 rounded hover:bg-accent cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{account.account_name}</div>
                      {(account.billing_city || account.billing_state || account.industry) && (
                        <div className="text-xs text-muted-foreground truncate">
                          {[account.industry, account.billing_city, account.billing_state]
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                      )}
                    </div>
                    {account.strategic_account && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Strategic
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Pipeline View (Kanban)
// =============================================================================

function PipelineView() {
  const {
    data: opportunities,
    isLoading,
    dataSource,
    responseTime,
    error,
    refetch,
  } = useBigQueryData<SalesforceOpportunity[], SalesforceOpportunity[]>({
    queryName: 'salesforce-opportunities',
    filters: {
      daysBack: 90,
      limit: 200,
    },
    defaultData: EMPTY_OPPORTUNITIES,
    transformBigQueryData: (data) => data,
    includeRoleFilters: true,
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Group by stage
  const opportunitiesByStage = STAGES.map(stage => {
    const stageOpps = opportunities.filter(opp => {
      const oppStage = opp.stageName.trim()
      if (stage.id === 'Closed Won') {
        return opp.isWon || oppStage.toLowerCase().includes('won')
      }
      if (stage.id === 'Closed Lost') {
        return (opp.isClosed && !opp.isWon) || oppStage.toLowerCase().includes('lost')
      }
      return oppStage.toLowerCase() === stage.id.toLowerCase() ||
             oppStage.toLowerCase().includes(stage.id.toLowerCase())
    })

    return {
      stage,
      opportunities: stageOpps,
      count: stageOpps.length,
      value: stageOpps.reduce((sum, opp) => sum + opp.amount, 0),
    }
  })

  const totalValue = opportunities.reduce((sum, opp) => sum + opp.amount, 0)
  const totalWeighted = opportunities.reduce((sum, opp) => sum + (opp.amount * opp.probability / 100), 0)

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-semibold">Failed to Load Pipeline Data</span>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
            {error}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
              <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">Salesforce Opportunities</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Query:</span>
              <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">salesforce-opportunities</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
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
                const subject = encodeURIComponent('Sales Hub Error - Pipeline')
                const body = encodeURIComponent(`Error: ${error}\n\nPlease investigate.`)
                window.location.href = `mailto:support@rentokil.com?subject=${subject}&body=${body}`
              }}
            >
              <Mail className="h-3 w-3 mr-1.5" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4 flex-1">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Total Opportunities</div>
              <div className="text-2xl font-bold">{opportunities.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Pipeline Value</div>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Weighted Value</div>
              <div className="text-2xl font-bold">{formatCurrency(totalWeighted)}</div>
            </CardContent>
          </Card>
        </div>
        <DataSourceBadge status={dataSource} responseTime={responseTime} className="ml-4" />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {opportunitiesByStage.map(({ stage, opportunities: stageOpps, count, value }) => (
          <div key={stage.id} className="space-y-2">
            <Card className={stage.color}>
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{stage.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">{count}</Badge>
                </div>
                {value > 0 && (
                  <CardDescription className="text-xs font-medium mt-1">
                    {formatCurrency(value)}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>

            <div className="space-y-2 min-h-[200px]">
              {isLoading ? (
                <Card className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  </CardContent>
                </Card>
              ) : stageOpps.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    No opportunities
                  </CardContent>
                </Card>
              ) : (
                stageOpps.map(opp => (
                  <Card key={opp.opportunityId} className="hover:border-blue-500 transition-colors cursor-pointer">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-medium line-clamp-2">
                          {opp.opportunityName}
                        </CardTitle>
                        {opp.probability > 0 && (
                          <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                            {opp.probability}%
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs mt-1">{opp.accountName}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-2">
                      {opp.amount > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span className="font-semibold text-green-600">{formatCurrency(opp.amount)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Close: {opp.closeDate}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// =============================================================================
// Quotes View
// =============================================================================

function QuotesView() {
  const {
    data: quotes,
    isLoading,
    dataSource,
    responseTime,
    error,
    refetch,
  } = useBigQueryData<SalesforceQuote[], SalesforceQuote[]>({
    queryName: 'salesforce-quotes',
    filters: {
      daysBack: 365,
      limit: 100,
    },
    defaultData: EMPTY_QUOTES,
    transformBigQueryData: (data) => data,
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const totalValue = quotes.reduce((sum, q) => sum + (Number(q.totalAmount) || 0), 0)
  const soldQuotes = quotes.filter(q => q.dateOfSale)

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-semibold">Failed to Load Quotes Data</span>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
            {error}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
              <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">Salesforce Quotes</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Query:</span>
              <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">salesforce-quotes</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
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
                const subject = encodeURIComponent('Sales Hub Error - Quotes')
                const body = encodeURIComponent(`Error: ${error}\n\nPlease investigate.`)
                window.location.href = `mailto:support@rentokil.com?subject=${subject}&body=${body}`
              }}
            >
              <Mail className="h-3 w-3 mr-1.5" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4 flex-1">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Total Quotes</div>
              <div className="text-2xl font-bold">{quotes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Quotes Sold</div>
              <div className="text-2xl font-bold text-green-600">{soldQuotes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            </CardContent>
          </Card>
        </div>
        <DataSourceBadge status={dataSource} responseTime={responseTime} className="ml-4" />
      </div>

      {/* Quotes List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No quotes found in the last year
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {quotes.map(quote => (
            <Link key={quote.quoteId} href={`/ae/quote/${quote.quoteId}`}>
              <Card className="hover:border-blue-500 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{quote.quoteName}</h3>
                        <Badge
                          variant={quote.dateOfSale ? 'default' : 'outline'}
                          className={quote.dateOfSale ? 'bg-green-600' : ''}
                        >
                          {quote.dateOfSale ? 'Sold' : quote.status || 'Open'}
                        </Badge>
                        {quote.isApproved && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Approved
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{quote.accountName}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {quote.servicingBranch && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {quote.servicingBranch}
                          </div>
                        )}
                        {quote.proposalDeliveredDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Delivered: {quote.proposalDeliveredDate}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        {formatCurrency(Number(quote.totalAmount) || 0)}
                      </div>
                      {quote.dateOfSale && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Sold: {quote.dateOfSale}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

// =============================================================================
// Default Export with Suspense Boundary
// =============================================================================

export default function SalesHubPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="h-9 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-5 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
          </div>
          <div className="w-96 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <SalesHubContent />
    </Suspense>
  )
}
