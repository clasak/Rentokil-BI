"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getInvoiceById, getAccountById } from '@/lib/data'
import { Invoice, Account } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, Building, Calendar, Clock, AlertTriangle,
  CheckCircle, DollarSign, FileText, Phone, Mail
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default function InvoiceDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [account, setAccount] = useState<Account | null>(null)

  useEffect(() => {
    const inv = getInvoiceById(id)
    setInvoice(inv || null)

    if (inv) {
      setAccount(getAccountById(inv.accountId) || null)
    }
  }, [id])

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Invoice Not Found</h2>
          <Button asChild className="mt-4">
            <Link href="/finance">Back to Finance</Link>
          </Button>
        </div>
      </div>
    )
  }

  const daysPastDue = invoice.dueDate < new Date()
    ? differenceInDays(new Date(), invoice.dueDate)
    : 0

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
  if (invoice.status === 'overdue') {
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
  } else if (invoice.status === 'disputed') {
    suggestedActions.push({ action: 'Review dispute reason', priority: 'high' })
    suggestedActions.push({ action: 'Schedule resolution call', priority: 'medium' })
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Finance', href: '/finance' },
          { label: invoice.id }
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
              <h1 className="text-2xl font-bold font-mono">{invoice.id}</h1>
              <Badge variant={getStatusColor(invoice.status)} className="capitalize">
                {invoice.status}
              </Badge>
              {invoice.status !== 'paid' && invoice.status !== 'void' && (
                <Badge variant={
                  invoice.agingBucket === '90+' ? 'danger' :
                  invoice.agingBucket === '61-90' ? 'warning' : 'secondary'
                }>
                  {invoice.agingBucket} days
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{invoice.accountName}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{formatCurrency(invoice.amount)}</div>
          {daysPastDue > 0 && invoice.status !== 'paid' && (
            <div className="text-sm text-red-600">{daysPastDue} days past due</div>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {invoice.status === 'overdue' && (
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
                  <div className="font-mono font-medium">{invoice.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Amount</div>
                  <div className="text-xl font-bold">{formatCurrency(invoice.amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Invoice Date</div>
                  <div className="font-medium">{format(invoice.invoiceDate, 'MMMM d, yyyy')}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Due Date</div>
                  <div className={`font-medium ${daysPastDue > 0 ? 'text-red-600' : ''}`}>
                    {format(invoice.dueDate, 'MMMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <Badge variant={getStatusColor(invoice.status)} className="capitalize">
                    {invoice.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Aging Bucket</div>
                  <div className="font-medium">{invoice.agingBucket} days</div>
                </div>
                {invoice.paidDate && (
                  <>
                    <div className="col-span-2">
                      <Separator />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Paid Date</div>
                      <div className="font-medium text-green-600">
                        {format(invoice.paidDate, 'MMMM d, yyyy')}
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
                      {format(invoice.invoiceDate, 'MMM d, yyyy')}
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
                      {format(invoice.dueDate, 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
                {invoice.paidDate && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Payment Received</div>
                      <div className="text-xs text-gray-500">
                        {format(invoice.paidDate, 'MMM d, yyyy')}
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
