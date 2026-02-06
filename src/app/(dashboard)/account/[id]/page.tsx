"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type {
  AccountDetails,
  AccountOpportunity,
  ServiceEvent,
  AccountComplaint,
  AccountInvoice,
  AccountOwner,
} from '@/lib/bigquery/queries/accounts'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, Building, User as UserIcon,
  AlertTriangle, CheckCircle, DollarSign, Wrench,
  TrendingUp, Shield, Phone, RefreshCw, ExternalLink, Mail
} from 'lucide-react'
import { format } from 'date-fns'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { DataSourceBadge } from '@/components/ui/data-source-badge'

export default function AccountDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch account details from BigQuery
  const {
    data: account,
    isLoading: accountLoading,
    dataSource: accountDataSource,
    error: accountError,
    errorType: accountErrorType,
    refetch: refetchAccount,
  } = useBigQueryData<AccountDetails | null, AccountDetails | null>({
    queryName: 'account-details',
    filters: { accountId: id },
    defaultData: null,
    transformBigQueryData: (data) => data,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  // Fetch opportunities
  const { data: opportunities } = useBigQueryData<AccountOpportunity[], AccountOpportunity[]>({
    queryName: 'account-opportunities',
    filters: { accountId: id },
    defaultData: [],
    transformBigQueryData: (data) => data,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  // Fetch service history
  const { data: serviceEvents } = useBigQueryData<ServiceEvent[], ServiceEvent[]>({
    queryName: 'account-service-history',
    filters: { accountId: id },
    defaultData: [],
    transformBigQueryData: (data) => data,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  // Fetch complaints
  const { data: complaints } = useBigQueryData<AccountComplaint[], AccountComplaint[]>({
    queryName: 'account-complaints',
    filters: { accountId: id },
    defaultData: [],
    transformBigQueryData: (data) => data,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  // Fetch invoices
  const { data: invoices } = useBigQueryData<AccountInvoice[], AccountInvoice[]>({
    queryName: 'account-invoices',
    filters: { accountId: id },
    defaultData: [],
    transformBigQueryData: (data) => data,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  // Fetch owner details
  const { data: owner } = useBigQueryData<AccountOwner | null, AccountOwner | null>({
    queryName: 'account-owner',
    filters: { ownerId: account?.ownerId || '' },
    defaultData: null,
    transformBigQueryData: (data) => data,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  if (!mounted || accountLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">Loading account...</div>
      </div>
    )
  }

  // Error state
  if (accountError) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Operations', href: '/ops' },
            { label: 'Account Details' }
          ]}
        />

        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Error Loading Account</span>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {accountError}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Account ID:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{id}</p>
              </div>
              <div>
                <span className="text-gray-500">Error Type:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{accountErrorType || 'Unknown'}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={refetchAccount}>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/ops">
                  <ArrowLeft className="h-3 w-3 mr-1.5" />
                  Back to Operations
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const subject = encodeURIComponent(`Account Error - ${id}`)
                  const body = encodeURIComponent(`Error loading account ${id}:\n\n${accountError}\n\nError Type: ${accountErrorType || 'Unknown'}`)
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
    )
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Account Not Found</h2>
          <Button asChild className="mt-4">
            <Link href="/ops">Back to Operations</Link>
          </Button>
        </div>
      </div>
    )
  }

  const openOpportunities = opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage))
  const completedServices = serviceEvents.filter(s => s.status === 'completed')
  const callbacks = serviceEvents.filter(s => s.status === 'callback')
  const openComplaints = complaints.filter(c => c.status !== 'resolved')
  const overdueInvoices = invoices.filter(i => i.status === 'overdue')

  const getRiskFactors = (): string[] => {
    const factors: string[] = []
    if (openComplaints.length > 0) factors.push(`${openComplaints.length} open complaint(s)`)
    if (callbacks.length > 2) factors.push(`${callbacks.length} service callbacks`)
    if (overdueInvoices.length > 0) factors.push(`${overdueInvoices.length} overdue invoice(s) - ${formatCurrency(overdueInvoices.reduce((s, i) => s + i.amount, 0))}`)
    if (account.openIssues > 2) factors.push(`${account.openIssues} unresolved issues`)
    return factors
  }

  const riskFactors = getRiskFactors()

  const getMitigationPlan = (): string[] => {
    const plan: string[] = []
    if (openComplaints.length > 0) plan.push('Schedule service recovery call within 24 hours')
    if (callbacks.length > 2) plan.push('Review service quality and assign senior technician')
    if (overdueInvoices.length > 0) plan.push('Coordinate with AR team for collections')
    if (account.retentionRisk === 'high') plan.push('Escalate to Customer Success Manager')
    if (plan.length === 0) plan.push('Continue regular service cadence and check-ins')
    return plan
  }

  // Service timeline chart
  const serviceTimeline = serviceEvents
    .filter(s => s.scheduledDate <= new Date())
    .slice(-12)
    .map(s => ({
      date: format(s.scheduledDate, 'MMM d'),
      completed: s.status === 'completed' ? 1 : 0,
      callback: s.status === 'callback' ? 1 : 0,
      missed: s.status === 'missed' ? 1 : 0,
    }))

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Operations', href: '/ops' },
          { label: account.name }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/ops">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{account.name}</h1>
              <Badge variant={
                account.retentionRisk === 'high' ? 'danger' :
                account.retentionRisk === 'medium' ? 'warning' : 'success'
              }>
                {account.retentionRisk} risk
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <span>{account.vertical}</span>
              <span>•</span>
              <span>{account.serviceFrequency} service</span>
              <span>•</span>
              <span>{account.id}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <DataSourceBadge status={accountDataSource} />
          <div className="text-right">
            <div className="text-sm text-gray-500">Contract Value</div>
            <div className="text-3xl font-bold">{formatCurrency(account.contractValue)}</div>
          </div>
        </div>
      </div>

      {/* Risk Alert */}
      {account.retentionRisk !== 'low' && (
        <Card className={`border-${account.retentionRisk === 'high' ? 'red' : 'yellow'}-200 bg-${account.retentionRisk === 'high' ? 'red' : 'yellow'}-50`}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 ${account.retentionRisk === 'high' ? 'text-red-600' : 'text-yellow-600'} mt-0.5`} />
              <div className="flex-1">
                <h3 className={`font-semibold ${account.retentionRisk === 'high' ? 'text-red-800' : 'text-yellow-800'}`}>
                  {account.retentionRisk === 'high' ? 'High' : 'Medium'} Retention Risk
                </h3>
                <ul className={`text-sm ${account.retentionRisk === 'high' ? 'text-red-700' : 'text-yellow-700'} mt-1 space-y-1`}>
                  {riskFactors.map((factor, i) => (
                    <li key={i}>• {factor}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mitigation Plan */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Mitigation Plan</h3>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                {getMitigationPlan().map((step, i) => (
                  <li key={i}>• {step}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Wrench className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Services</div>
                <div className="text-xl font-bold">{completedServices.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Phone className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Callbacks</div>
                <div className="text-xl font-bold">{callbacks.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Open Complaints</div>
                <div className="text-xl font-bold">{openComplaints.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">AR Balance</div>
                <div className="text-xl font-bold">{formatCurrency(account.arBalance)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="services" className="space-y-4">
            <TabsList>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="complaints">Complaints</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            </TabsList>

            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle>Service History</CardTitle>
                  <CardDescription>Last {serviceEvents.length} service events</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Time on Site</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceEvents.slice(0, 10).map(event => (
                        <TableRow key={event.id}>
                          <TableCell>{format(event.scheduledDate, 'MMM d, yyyy')}</TableCell>
                          <TableCell>{event.serviceType}</TableCell>
                          <TableCell>
                            <Badge variant={
                              event.status === 'completed' ? 'success' :
                              event.status === 'callback' ? 'warning' :
                              event.status === 'missed' ? 'danger' : 'secondary'
                            } className="capitalize">
                              {event.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {event.timeOnSite > 0 ? `${event.timeOnSite} min` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="complaints">
              <Card>
                <CardHeader>
                  <CardTitle>Complaints</CardTitle>
                </CardHeader>
                <CardContent>
                  {complaints.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" />
                      <p>No complaints on record</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {complaints.map(complaint => (
                          <TableRow key={complaint.id}>
                            <TableCell>{format(complaint.createdAt, 'MMM d, yyyy')}</TableCell>
                            <TableCell className="capitalize">{complaint.type.replace('_', ' ')}</TableCell>
                            <TableCell>
                              <Badge variant={
                                complaint.severity === 'critical' ? 'danger' :
                                complaint.severity === 'high' ? 'warning' : 'secondary'
                              } className="capitalize">
                                {complaint.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={complaint.status === 'resolved' ? 'success' : 'outline'} className="capitalize">
                                {complaint.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.slice(0, 10).map(invoice => (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <Link href={`/finance/invoice/${invoice.id}`} className="font-mono text-sm hover:underline">
                              {invoice.id}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(invoice.amount)}
                          </TableCell>
                          <TableCell>{format(invoice.dueDate, 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={
                              invoice.status === 'paid' ? 'success' :
                              invoice.status === 'overdue' ? 'danger' : 'secondary'
                            } className="capitalize">
                              {invoice.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="opportunities">
              <Card>
                <CardHeader>
                  <CardTitle>Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  {opportunities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No opportunities on record</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Opportunity</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Close Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {opportunities.map(opp => (
                          <TableRow key={opp.id}>
                            <TableCell>
                              <Link href={`/sales/opportunity/${opp.id}`} className="font-medium hover:underline">
                                {opp.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(opp.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{opp.stage.replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell>{format(opp.closeDate, 'MMM d, yyyy')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Account ID</div>
                <div className="font-mono text-sm">{account.id}</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-gray-500">Vertical</div>
                <Badge variant="outline">{account.vertical}</Badge>
              </div>
              <div>
                <div className="text-sm text-gray-500">Service Frequency</div>
                <div className="font-medium capitalize">{account.serviceFrequency}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Contract Value</div>
                <div className="text-xl font-bold">{formatCurrency(account.contractValue)}</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-gray-500">Last Service</div>
                <div className="font-medium">{format(account.lastServiceDate, 'MMM d, yyyy')}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Created</div>
                <div className="font-medium">{format(account.createdAt, 'MMM d, yyyy')}</div>
              </div>
            </CardContent>
          </Card>

          {/* Owner Info */}
          {owner && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Account Owner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-medium">{owner.name}</div>
                <div className="text-sm text-gray-500">{owner.title}</div>
                <div className="text-sm text-gray-500">{owner.email}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
