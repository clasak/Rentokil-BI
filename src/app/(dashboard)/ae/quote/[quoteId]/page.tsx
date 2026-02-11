'use client'

/**
 * Quote Detail Page
 *
 * Detailed view of a Salesforce quote including line items.
 * Uses Raw_RTXSF_Quote_Daily and Raw_RTXSF_QuoteLineItem_Daily tables.
 *
 * Features:
 * - Quote header information (account, status, dates)
 * - Line items table with pricing
 * - Approval status
 * - Quote-to-opportunity link
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { useRecentPages } from '@/hooks/useRecentPages'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { useAppStore } from '@/store'
import type { SalesforceQuoteDetail } from '@/lib/bigquery/queries/salesforce'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  User,
  MapPin,
  AlertCircle,
  Mail,
  Phone,
  Home,
} from 'lucide-react'

const EMPTY_QUOTE: SalesforceQuoteDetail | null = null

export default function QuoteDetailPage() {
  useRecentPages()
  const params = useParams()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const role = useEffectiveRole(mounted)
  const { settings } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle params.quoteId which can be string, string[], or undefined
  let quoteId: string | undefined
  if (Array.isArray(params.quoteId)) {
    quoteId = params.quoteId[0]
  } else if (typeof params.quoteId === 'string') {
    quoteId = params.quoteId
  } else {
    quoteId = undefined
  }

  // Fetch quote detail (only if quoteId is valid)
  const {
    data: quote,
    isLoading,
    dataSource,
    responseTime,
    error,
    refetch,
  } = useBigQueryData<SalesforceQuoteDetail | null, SalesforceQuoteDetail | null>({
    queryName: 'salesforce-quote-detail',
    filters: quoteId && quoteId.length > 0 ? { quoteId } : {},
    defaultData: EMPTY_QUOTE,
    transformBigQueryData: (data) => data,
    includeRoleFilters: false, // TODO: Enable when Salesforce field mapping is ready
    enabled: !!quoteId && quoteId.length > 0,
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('won') || statusLower.includes('approved')) {
      return <Badge className="bg-green-500">{status}</Badge>
    }
    if (statusLower.includes('lost') || statusLower.includes('rejected')) {
      return <Badge variant="destructive">{status}</Badge>
    }
    if (statusLower.includes('pending')) {
      return <Badge className="bg-yellow-500">{status}</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
  }

  // Loading skeleton during hydration (prevents flicker)
  if (!mounted) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        {/* Main content skeleton */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
          </CardContent>
        </Card>
        {/* Address cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Line items skeleton */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!quoteId) {
    return (
      <div className="space-y-6">
        <Card className="border-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              <p>Invalid quote ID</p>
            </div>
            <Button onClick={() => router.push('/ae/sales?tab=quotes')} className="mt-4">
              Back to Sales Hub
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="space-y-6">
        <Button onClick={() => router.push('/ae/sales?tab=quotes')} variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sales Hub
        </Button>
        <Card className="border-red-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle className="h-5 w-5" />
              <p>{error || 'Quote not found'}</p>
            </div>
            <Button onClick={refetch} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate grand total from line items if quote total_price is 0
  const grandTotal = quote.total_price > 0
    ? quote.total_price
    : quote.line_items.reduce((sum, item) => sum + (item.total_cost || item.subtotal || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push('/ae/sales?tab=quotes')} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sales Hub
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{quote.quote_name}</h1>
            <p className="text-muted-foreground mt-1">{quote.account_name}</p>
          </div>
        </div>
        <DataSourceBadge status={dataSource} responseTime={responseTime} />
      </div>

      {/* Quote Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getStatusBadge(quote.status)}
            {quote.is_approved && (
              <div className="flex items-center gap-1 text-green-600 text-sm mt-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Manager Approved</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(grandTotal)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Line Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quote.line_items.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quote Details */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Account</div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{quote.account_name}</span>
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">Owner</div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{quote.owner_name}</span>
              </div>
            </div>

            {quote.servicing_branch && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Servicing Branch</div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{quote.servicing_branch}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {quote.proposal_delivered_date && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Proposal Delivered</div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{quote.proposal_delivered_date}</span>
                </div>
              </div>
            )}

            {quote.date_of_sale && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Date of Sale</div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>{quote.date_of_sale}</span>
                </div>
              </div>
            )}

            <div>
              <div className="text-sm text-muted-foreground mb-1">Created Date</div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{quote.created_date}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* POC, Service Address, and Billing Address in Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Point of Contact */}
        {(quote.contact_name || quote.contact_email || quote.contact_phone) && (
          <Card>
            <CardHeader>
              <CardTitle>Point of Contact</CardTitle>
              <CardDescription>Primary contact for this quote</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quote.contact_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{quote.contact_name}</span>
                </div>
              )}
              {quote.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${quote.contact_email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {quote.contact_email}
                  </a>
                </div>
              )}
              {quote.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${quote.contact_phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {quote.contact_phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Service Address (ShippingAddress with BillingAddress fallback) */}
        {(quote.service_street || quote.service_city || quote.service_state ||
          quote.billing_street || quote.billing_city || quote.billing_state) && (
          <Card>
            <CardHeader>
              <CardTitle>Service Address</CardTitle>
              <CardDescription>Where service will be performed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2">
                <Home className="h-4 w-4 text-muted-foreground mt-1" />
                <div className="space-y-1">
                  {/* Use service address if available, otherwise fallback to billing */}
                  {(quote.service_street || quote.billing_street) && (
                    <div>{quote.service_street || quote.billing_street}</div>
                  )}
                  <div>
                    {[
                      quote.service_city || quote.billing_city,
                      quote.service_state || quote.billing_state,
                      quote.service_postal_code || quote.billing_postal_code
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {(quote.service_country || quote.billing_country) && (
                    <div className="text-sm text-muted-foreground">
                      {quote.service_country || quote.billing_country}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing Address */}
        {(quote.billing_street || quote.billing_city || quote.billing_state) && (
          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
              <CardDescription>Invoice mailing address</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground mt-1" />
                <div className="space-y-1">
                  {quote.billing_street && <div>{quote.billing_street}</div>}
                  <div>
                    {[quote.billing_city, quote.billing_state, quote.billing_postal_code]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {quote.billing_country && (
                    <div className="text-sm text-muted-foreground">{quote.billing_country}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Line Items with Detailed Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Line Items</CardTitle>
          <CardDescription>
            Detailed pricing breakdown for products and services. Service codes are internal billing identifiers used by operations teams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quote.line_items.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No line items found
            </div>
          ) : (
            <div className="space-y-6">
              {quote.line_items.map((item) => (
                <div key={item.line_item_id} className="border rounded-lg p-4 space-y-4">
                  {/* Product Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Product Name with Code */}
                      <div className="font-semibold text-lg">
                        {item.product_display_name || item.product_name}
                        {item.product_code && (
                          <span className="ml-2 text-sm font-mono text-muted-foreground">
                            ({item.product_code})
                          </span>
                        )}
                      </div>

                      {/* Product Description */}
                      {item.product_description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.product_description}
                        </div>
                      )}

                      {/* Servicing Branch */}
                      {item.servicing_branch_name && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Serviced by: {item.servicing_branch_name} ({item.servicing_branch})
                        </div>
                      )}
                    </div>
                    <Badge variant="outline">Qty: {item.quantity}</Badge>
                  </div>

                  {/* Pricing Breakdown Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t">
                    {/* Initial Service */}
                    {item.has_initial && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">
                          Initial Service (One-Time)
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Service Code:</span>
                            <span className="font-mono text-xs">{item.initial_service_code}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Gross Price:</span>
                            <span>{formatCurrency(item.initial_maint_gross)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold">
                            <span>Net Price:</span>
                            <span className="text-green-600">{formatCurrency(item.initial_maint_net)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Maintenance/Recurring */}
                    {item.has_maintenance && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">
                          Maintenance - {item.maintenance_frequency}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Service Code:</span>
                            <span className="font-mono text-xs">{item.maintenance_service_code}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Gross Price:</span>
                            <span>{formatCurrency(item.maintenance_gross)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold">
                            <span>Net Price:</span>
                            <span className="text-green-600">{formatCurrency(item.maintenance_net)}</span>
                          </div>
                          {item.total_annual_cost > 0 && (
                            <div className="flex justify-between text-sm text-blue-600 font-medium mt-2 pt-2 border-t">
                              <span>Annual Recurring:</span>
                              <span>{formatCurrency(item.total_annual_cost)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Merchandise (Equipment) */}
                    {item.has_merchandise && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">
                          Merchandise (Equipment)
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Service Code:</span>
                            <span className="font-mono text-xs">{item.merchandise_service_code}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Quantity:</span>
                            <span>{item.merchandise_quantity}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Gross Price:</span>
                            <span>{formatCurrency(item.merchandise_gross)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold">
                            <span>Net Price:</span>
                            <span className="text-green-600">{formatCurrency(item.merchandise_net)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Corrective Service */}
                    {item.has_corrective && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">
                          Corrective Service
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Service Code:</span>
                            <span className="font-mono text-xs">{item.corrective_service_code}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Frequency:</span>
                            <span className="text-xs">{item.corrective_frequency}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Gross Price:</span>
                            <span>{formatCurrency(item.corrective_gross)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold">
                            <span>Net Price:</span>
                            <span className="text-green-600">{formatCurrency(item.corrective_net)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="space-y-2 md:border-l md:pl-4">
                      <div className="text-sm font-medium text-muted-foreground">Line Total</div>
                      <div className="space-y-1">
                        {item.list_price > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>List Price:</span>
                            <span className="line-through text-muted-foreground">
                              {formatCurrency(item.list_price)}
                            </span>
                          </div>
                        )}
                        {item.discount > 0 && (
                          <div className="flex justify-between text-sm text-orange-600">
                            <span>Discount:</span>
                            <span>{item.discount}%</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                          <span>Total:</span>
                          <span>{formatCurrency(item.total_cost || item.subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Grand Total */}
              <div className="border-t-2 pt-4 mt-6">
                <div className="flex justify-between items-center">
                  <div className="text-lg font-semibold">Quote Grand Total</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(grandTotal)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {quote.opportunity_id && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Related Opportunity</div>
                <div className="text-xs text-muted-foreground mt-1">
                  View the opportunity linked to this quote
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link href={`/ae/pipeline`}>
                  View Opportunity
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
