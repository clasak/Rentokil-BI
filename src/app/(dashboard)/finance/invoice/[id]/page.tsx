"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { ARDetailRecord } from '@/lib/bigquery/queries/finance'
import type { AccountDetails } from '@/lib/bigquery/queries/accounts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, Building, Calendar, Clock, AlertTriangle,
  CheckCircle, DollarSign, FileText, Phone, Mail, RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { DataSourceBadge } from '@/components/ui/data-source-badge'

export default function InvoiceDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch invoice details from BigQuery AR data
  // Uses new invoice-by-id query with proper org/role filtering
  const {
    data: invoice,
    isLoading: invoiceLoading,
    dataSource: invoiceDataSource,
    error: invoiceError,
    errorType: invoiceErrorType,
    refetch: refetchInvoice,
  } = useBigQueryData<ARDetailRecord | null, ARDetailRecord | null>({
    queryName: 'invoice-by-id',
    filters: { invoiceNumber: id },
    defaultData: null,
    transformBigQueryData: (data) => data,
    includeOrgFilters: true,  // Enable org filtering for security
    includeRoleFilters: true, // Enable role filtering for security
  })

  // Fetch account details if we have an invoice
  const { data: account } = useBigQueryData<AccountDetails | null, AccountDetails | null>({
    queryName: 'account-details',
    filters: { accountId: invoice?.customer_number || '' },
    defaultData: null,
    transformBigQueryData: (data) => data,
    includeOrgFilters: false,
    includeRoleFilters: false,
  })

  if (!mounted || invoiceLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">Loading invoice...</div>
      </div>
    )
  }

  // Error state
  if (invoiceError) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Finance', href: '/finance' },
            { label: 'Invoice Details' }
          ]}
        />

        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Error Loading Invoice</span>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {invoiceError}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Invoice Number:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{id}</p>
              </div>
              <div>
                <span className="text-gray-500">Error Type:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{invoiceErrorType || 'Unknown'}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={refetchInvoice}>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/finance">
                  <ArrowLeft className="h-3 w-3 mr-1.5" />
                  Back to Finance
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const subject = encodeURIComponent(`Invoice Error - ${id}`)
                  const body = encodeURIComponent(`Error loading invoice ${id}:\n\n${invoiceError}\n\nError Type: ${invoiceErrorType || 'Unknown'}`)
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

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Invoice Not Found</h2>
          <p className="text-sm text-gray-500 mt-2">
            Invoice {id} does not exist or you don&apos;t have access to it.
          </p>
          <Button asChild className="mt-4">
            <Link href="/finance">Back to Finance</Link>
          </Button>
        </div>
      </div>
    )
  }

  const daysPastDue = invoice.days_outstanding
  const invoiceStatus = invoice.outstanding_amount === 0 ? 'paid' :
                        invoice.days_outstanding > 30 ? 'overdue' : 'open'

  // Calculate due date (invoice_date + 30 days standard payment terms)
  const invoiceDate = new Date(invoice.invoice_date)
  const dueDate = new Date(invoiceDate)
  dueDate.setDate(dueDate.getDate() + 30)

  // Show paid date estimate if invoice is paid (we don't have exact paid date)
  const isPaid = invoice.outstanding_amount === 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success'
      case 'open': return 'secondary'
      case 'overdue': return 'danger'
      case 'disputed': return 'warning'
      case 'void': return 'outline'
      default: return 'outline'
    }
  }

  const suggestedActions = []
  if (invoiceStatus === 'overdue') {
    if (daysPastDue > 90) {
      suggestedActions.push({ action: 'Escalate to collections', priority: 'critical' })
      suggestedActions.push({ action: 'Review for write-off', priority: 'high' })
    } else if (daysPastDue > 60) {
      suggestedActions.push({ action: 'Final notice call', priority: 'high' })
      suggestedActions.push({ action: 'Offer payment plan', priority: 'medium' })
    } else {
      suggestedActions.push({ action: 'Follow-up call', priority: 'medium' })
      suggestedActions.push({ action: 'Send payment reminder', priority: 'low' })
    }
  }
  // Note: 'disputed' status would require additional data field not currently available

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Finance', href: '/finance' },
          { label: invoice.invoice_number }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/finance">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{invoice.invoice_number}</h1>
              <Badge variant={getStatusColor(invoiceStatus)} className="capitalize">
                {invoiceStatus}
              </Badge>
              {invoiceStatus !== 'paid' && (
                <Badge variant={
                  invoice.aging_bucket === '90+' ? 'danger' :
                  invoice.aging_bucket === '61-90' || invoice.aging_bucket === '31-60' ? 'warning' : 'secondary'
                }>
                  {invoice.aging_bucket}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{account?.name || invoice.branch_name}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <DataSourceBadge status={invoiceDataSource} />
          <div className="text-right">
            <div className="text-3xl font-bold">{formatCurrency(invoice.outstanding_amount)}</div>
            {daysPastDue > 0 && invoiceStatus !== 'paid' && (
              <div className="text-sm text-red-600">{daysPastDue} days past due</div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {invoiceStatus === 'overdue' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Payment Overdue</h3>
                <p className="text-sm text-red-700 mt-1">
                  This invoice is {daysPastDue} days past due. Immediate action recommended.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-500">Invoice Number</div>
                  <div className="font-mono font-medium">{invoice.invoice_number}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Outstanding Amount</div>
                  <div className="text-xl font-bold">{formatCurrency(invoice.outstanding_amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Invoice Date</div>
                  <div className="font-medium">{invoice.invoice_date}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Days Outstanding</div>
                  <div className={`font-medium ${daysPastDue > 0 ? 'text-red-600' : ''}`}>
                    {invoice.days_outstanding} days
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <Badge variant={getStatusColor(invoiceStatus)} className="capitalize">
                    {invoiceStatus}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Aging Bucket</div>
                  <div className="font-medium">{invoice.aging_bucket}</div>
                </div>
                {isPaid && (
                  <>
                    <div className="col-span-2">
                      <Separator />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Status</div>
                      <div className="font-medium text-green-600">
                        Paid in Full
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Suggested Actions */}
          {suggestedActions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Suggested Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suggestedActions.map((action, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="font-medium">{action.action}</span>
                      <Badge variant={
                        action.priority === 'critical' ? 'danger' :
                        action.priority === 'high' ? 'warning' : 'secondary'
                      }>
                        {action.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Log Call
                </Button>
                <Button variant="outline" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Send Reminder
                </Button>
                <Button variant="outline" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Record Payment
                </Button>
                <Button variant="outline" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Mark Disputed
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          {account && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Link href={`/account/${account.id}`} className="font-medium hover:underline">
                    {account.name}
                  </Link>
                  <div className="text-sm text-gray-500">{account.vertical}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-sm text-gray-500">Contract Value</div>
                  <div className="font-medium">{formatCurrency(account.contractValue)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">AR Balance</div>
                  <div className="font-medium">{formatCurrency(account.arBalance)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    account.retentionRisk === 'high' ? 'danger' :
                    account.retentionRisk === 'medium' ? 'warning' : 'success'
                  }>
                    {account.retentionRisk} risk
                  </Badge>
                </div>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href={`/account/${account.id}`}>View Account</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Invoice Created</div>
                    <div className="text-xs text-muted-foreground">
                      {invoice.invoice_date}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    daysPastDue > 0 ? 'bg-red-100 dark:bg-red-950' : 'bg-muted'
                  }`}>
                    <Calendar className={`h-4 w-4 ${daysPastDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Due Date</div>
                    <div className="text-xs text-muted-foreground">
                      {format(dueDate, 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
                {isPaid && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Paid in Full</div>
                      <div className="text-xs text-muted-foreground">
                        Outstanding: {formatCurrency(0)}
                      </div>
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
