'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, RefreshCw, AlertTriangle, ExternalLink, Mail, FileText } from 'lucide-react'
import { AccountCard } from '@/components/ae/AccountCard'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { SalesforceAccount } from '@/lib/bigquery/queries/salesforce'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import { useRecentPages } from '@/hooks/useRecentPages'

const EMPTY_ACCOUNTS: SalesforceAccount[] = []

export default function AccountsPage() {
  useRecentPages()

  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const {
    data: accounts,
    isLoading,
    dataSource,
    responseTime,
    error,
    refetch,
  } = useBigQueryData<SalesforceAccount[], SalesforceAccount[]>({
    queryName: 'salesforce-accounts',
    filters: {
      searchTerm: debouncedSearchTerm || undefined,
      limit: 100, // Increased from 50 to show more results
    },
    defaultData: EMPTY_ACCOUNTS,
    transformBigQueryData: (data) => data,
    includeRoleFilters: false, // TODO: Salesforce tables need field mapping for role filters
  })

  if (!mounted) return null

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Account Search</h1>
          <p className="text-muted-foreground">
            Search and manage customer accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dataSource && (
            <DataSourceBadge
              status={dataSource}
              responseTime={responseTime}
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Accounts
          </CardTitle>
          <CardDescription>
            Search by account name, account number, or PestPac ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {isLoading ? 'Searching...' : `${accounts.length} accounts found`}
          </h2>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold">Failed to Load Accounts</span>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
                {error}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">Salesforce Accounts</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Search Term:</span>
                  <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{debouncedSearchTerm || '(empty)'}</p>
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
                    const subject = encodeURIComponent('Accounts Error')
                    const body = encodeURIComponent(`Error: ${error}\n\nSearch: ${debouncedSearchTerm}\n\nPlease investigate.`)
                    window.location.href = `mailto:support@rentokil.com?subject=${subject}&body=${body}`
                  }}
                >
                  <Mail className="h-3 w-3 mr-1.5" />
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && accounts.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {searchTerm
                  ? 'No accounts found. Try a different search term.'
                  : 'Enter a search term to find accounts.'}
              </p>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && !error && accounts.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard key={account.account_id} account={account} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
