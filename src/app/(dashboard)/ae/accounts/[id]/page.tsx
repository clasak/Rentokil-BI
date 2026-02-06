'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  Mail,
  TrendingUp,
  Users,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type {
  SalesforceAccountDetail,
  SalesforceContact,
} from '@/lib/bigquery/queries/salesforce'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import Link from 'next/link'
import { useRecentPages } from '@/hooks/useRecentPages'

const EMPTY_ACCOUNT: SalesforceAccountDetail | null = null
const EMPTY_CONTACTS: SalesforceContact[] = []

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()

  // Handle params.id which can be string, string[], or undefined
  let accountId: string | undefined
  if (Array.isArray(params.id)) {
    accountId = params.id[0]
  } else if (typeof params.id === 'string') {
    accountId = params.id
  } else {
    accountId = undefined
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch account detail (only if accountId is valid)
  const {
    data: account,
    isLoading: accountLoading,
    dataSource,
    responseTime,
    error: accountError,
    refetch: refetchAccount,
  } = useBigQueryData<SalesforceAccountDetail | null, SalesforceAccountDetail | null>({
    queryName: 'salesforce-account-detail',
    filters: accountId && accountId.length > 0 ? { accountId } : {},
    defaultData: EMPTY_ACCOUNT,
    transformBigQueryData: (data) => data,
    includeRoleFilters: false, // TODO: Salesforce tables need field mapping for role filters
    enabled: !!accountId && accountId.length > 0,
  })

  // Fetch contacts (only if accountId is valid)
  const {
    data: contacts,
    isLoading: contactsLoading,
    error: contactsError,
    refetch: refetchContacts,
  } = useBigQueryData<SalesforceContact[], SalesforceContact[]>({
    queryName: 'salesforce-contacts',
    filters: accountId && accountId.length > 0 ? { accountId } : {},
    defaultData: EMPTY_CONTACTS,
    transformBigQueryData: (data) => data,
    includeRoleFilters: false, // TODO: Salesforce tables need field mapping for role filters
    enabled: !!accountId && accountId.length > 0,
  })

  useRecentPages()

  if (!mounted) return null

  const isLoading = accountLoading || contactsLoading
  const hasError = accountError || contactsError

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {account?.account_name || 'Loading...'}
            </h1>
            <p className="text-muted-foreground">Account Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dataSource && (
            <DataSourceBadge status={dataSource} responseTime={responseTime} />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchAccount()
              refetchContacts()
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {hasError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Failed to Load Account Details</span>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {accountError || contactsError}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">
                  {accountError ? 'Account Detail' : 'Contacts'}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Account ID:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{accountId || 'N/A'}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={() => {
                refetchAccount()
                refetchContacts()
              }}>
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
                  const subject = encodeURIComponent('Account Detail Error')
                  const body = encodeURIComponent(`Error: ${accountError || contactsError}\n\nAccount ID: ${accountId}\n\nPlease investigate.`)
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

      {/* Loading State */}
      {isLoading && !account && (
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-5/6" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Detail */}
      {account && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{account.opportunity_count}</div>
                <p className="text-xs text-muted-foreground">
                  {account.opportunity_won_count} won (
                  {account.opportunity_count > 0
                    ? Math.round(
                        (account.opportunity_won_count / account.opportunity_count) * 100
                      )
                    : 0}
                  %)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Won Value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${Math.round(account.opportunity_won_sum).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Lifetime revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{account.number_of_locations}</div>
                <p className="text-xs text-muted-foreground">Service locations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Contacts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contacts.length}</div>
                <p className="text-xs text-muted-foreground">Total contacts</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
              <TabsTrigger value="opportunities">
                Opportunities ({account.opportunity_count})
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Account Name
                      </label>
                      <p className="text-lg font-semibold">{account.account_name}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Account Type
                      </label>
                      <p className="text-lg">{account.account_type || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Industry
                      </label>
                      <p className="text-lg">{account.industry || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Sub-Industry
                      </label>
                      <p className="text-lg">{account.sub_industry || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Address */}
                  {account.billing_street && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Billing Address
                      </label>
                      <p className="text-lg">
                        {account.billing_street}
                        <br />
                        {account.billing_city}, {account.billing_state}{' '}
                        {account.billing_postal_code}
                      </p>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {account.phone && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          Phone
                        </label>
                        <p className="text-lg">{account.phone}</p>
                      </div>
                    )}

                    {account.website && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          Website
                        </label>
                        <a
                          href={account.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg text-blue-500 hover:underline flex items-center gap-1"
                        >
                          {account.website}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Tags
                    </label>
                    <div className="flex gap-2 flex-wrap mt-2">
                      {account.national_account && (
                        <Badge variant="default">National Account</Badge>
                      )}
                      {account.strategic_account && (
                        <Badge variant="default" className="bg-purple-500">
                          Strategic
                        </Badge>
                      )}
                      {account.brand && <Badge variant="outline">{account.brand}</Badge>}
                      {account.pestpac_id && (
                        <Badge variant="secondary">PestPac Linked</Badge>
                      )}
                      {account.iris_number && (
                        <Badge variant="secondary">IRIS: {account.iris_number}</Badge>
                      )}
                    </div>
                  </div>

                  {/* PestPac Link */}
                  {account.pestpac_account_url && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        PestPac Account
                      </label>
                      <a
                        href={account.pestpac_account_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center gap-1 mt-1"
                      >
                        View in PestPac
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}

                  {/* Description */}
                  {account.description && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Description
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {account.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Contacts
                  </CardTitle>
                  <CardDescription>
                    {contacts.length} contact{contacts.length !== 1 ? 's' : ''} for this
                    account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {contactsLoading && (
                    <div className="animate-pulse space-y-3">
                      <div className="h-12 bg-muted rounded" />
                      <div className="h-12 bg-muted rounded" />
                      <div className="h-12 bg-muted rounded" />
                    </div>
                  )}

                  {!contactsLoading && contacts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No contacts found for this account
                    </p>
                  )}

                  {!contactsLoading && contacts.length > 0 && (
                    <div className="space-y-4">
                      {contacts.map((contact) => (
                        <div
                          key={contact.contact_id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {contact.full_name}
                              </h3>
                              {contact.title && (
                                <p className="text-sm text-muted-foreground">
                                  {contact.title}
                                </p>
                              )}
                              <div className="flex flex-col gap-1 mt-2 text-sm">
                                {contact.email && (
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="text-blue-500 hover:underline flex items-center gap-1"
                                  >
                                    <Mail className="h-4 w-4" />
                                    {contact.email}
                                  </a>
                                )}
                                {contact.phone && (
                                  <a
                                    href={`tel:${contact.phone}`}
                                    className="text-blue-500 hover:underline flex items-center gap-1"
                                  >
                                    <Phone className="h-4 w-4" />
                                    {contact.phone}
                                  </a>
                                )}
                              </div>
                            </div>
                            {contact.is_primary && (
                              <Badge variant="default">Primary</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                            Last activity: {contact.last_activity_date}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Opportunities Tab */}
            <TabsContent value="opportunities" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Opportunities
                  </CardTitle>
                  <CardDescription>
                    View opportunities in the{' '}
                    <Link
                      href="/ae/pipeline"
                      className="text-blue-500 hover:underline"
                    >
                      Pipeline
                    </Link>{' '}
                    page
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      {account.opportunity_count} total opportunities
                    </p>
                    <Link href="/ae/pipeline">
                      <Button>
                        View Pipeline
                        <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
