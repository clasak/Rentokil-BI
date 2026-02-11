'use client'

/**
 * Quote Builder Page
 *
 * Multi-step form for creating new quotes from product catalog.
 * Uses Raw_RTXSF_Product2_Daily for service catalog.
 *
 * Steps:
 * 1. Account/Opportunity Selection
 * 2. Service Selection
 * 3. Pricing & Configuration
 * 4. Quote Preview & Email
 * 5. Send for Signature (mock)
 */

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { useRecentPages } from '@/hooks/useRecentPages'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { useAppStore } from '@/store'
import type { SalesforceAccount, SalesforceProduct, SalesforceOpportunity } from '@/lib/bigquery/queries/salesforce'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Building2,
  ShoppingCart,
  DollarSign,
  FileText,
  Send,
} from 'lucide-react'

// Step components (inline for now, can be extracted later)
import AccountSelectionStep from './components/AccountSelectionStep'
import ServiceSelectionStep from './components/ServiceSelectionStep'
import PricingConfigurationStep from './components/PricingConfigurationStep'
import QuotePreviewStep from './components/QuotePreviewStep'

// Quote builder state types
export interface QuoteLineItem {
  product_id: string
  product_name: string
  product_code: string
  description: string
  quantity: number
  frequency: 'MONTHLY' | 'Monthly' | 'BILL PER SERVICE' | 'QUARTERLY' | 'Quarterly' | 'ANNUALLY' | 'Annually' | 'Semi-Annually (2x)' | 'Tri-Annually (3x)' | 'Every Other Month (6x)' | 'Semi-Monthly (24x)' | 'Weekly' | 'ONETIME' | 'Every Other Week (26x)' | '4 Weeks Per Month (48x)'
  list_price: number
  discount_percent: number
  net_price: number
  total: number
}

export interface QuoteData {
  // Step 1: Account info
  account_id: string
  account_name: string
  opportunity_id?: string
  opportunity_name?: string
  contact_name: string
  contact_email: string
  contact_phone: string
  service_street: string
  service_city: string
  service_state: string
  service_postal_code: string
  // Step 2-3: Line items
  line_items: QuoteLineItem[]
  // Step 4: Metadata
  quote_name: string
  valid_until_date: string
  notes: string
}

export type CustomerSource = 'new-customer' | 'lead' | 'account'

const STEPS = [
  { number: 1, title: 'Account', icon: Building2 },
  { number: 2, title: 'Services', icon: ShoppingCart },
  { number: 3, title: 'Pricing', icon: DollarSign },
  { number: 4, title: 'Preview', icon: FileText },
  { number: 5, title: 'Send', icon: Send },
]

function QuoteBuilderContent() {
  useRecentPages()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const role = useEffectiveRole(mounted)
  const { settings } = useAppStore()

  // Current step (1-5)
  const [currentStep, setCurrentStep] = useState(1)

  // Customer source tracking (for payload generation)
  const [customerSource, setCustomerSource] = useState<CustomerSource>('account')

  // Quote data state
  const [quoteData, setQuoteData] = useState<QuoteData>({
    account_id: '',
    account_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    service_street: '',
    service_city: '',
    service_state: '',
    service_postal_code: '',
    line_items: [],
    quote_name: '',
    valid_until_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    notes: '',
  })

  // Selected account (for pre-filling)
  const [selectedAccount, setSelectedAccount] = useState<SalesforceAccount | null>(null)

  // Selected opportunity (if starting from opportunity)
  const [selectedOpportunity, setSelectedOpportunity] = useState<SalesforceOpportunity | null>(null)

  useEffect(() => {
    setMounted(true)
    // Check if starting from an opportunity
    const oppId = searchParams?.get('opportunityId')
    if (oppId) {
      // Will be fetched in AccountSelectionStep
    }
  }, [searchParams])

  // Hydration loading skeleton
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const progress = (currentStep / STEPS.length) * 100

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const updateQuoteData = (updates: Partial<QuoteData>) => {
    setQuoteData((prev) => ({ ...prev, ...updates }))
  }

  const handleSubmit = () => {
    const timestamp = new Date().toISOString()
    const userId = settings.userId || 'mock-user-id'
    const totalAmount = quoteData.line_items.reduce((sum, item) => sum + item.total, 0)

    // Generate mock IDs
    const leadId = `LEAD-${Date.now()}`
    const accountId = quoteData.account_id || `ACC-${Date.now()}`
    const opportunityId = quoteData.opportunity_id || `OPP-${Date.now()}`
    const quoteId = `QUOTE-${Date.now()}`

    if (customerSource === 'new-customer') {
      // New Customer flow: Create Lead → Account → Opportunity → Quote

      // 1. Lead object (would be created first)
      const leadPayload = {
        Id: leadId,
        FirstName: quoteData.contact_name.split(' ')[0] || '',
        LastName: quoteData.contact_name.split(' ').slice(1).join(' ') || 'Unknown',
        Company: quoteData.account_name,
        Email: quoteData.contact_email,
        Phone: quoteData.contact_phone,
        Street: quoteData.service_street,
        City: quoteData.service_city,
        State: quoteData.service_state,
        PostalCode: quoteData.service_postal_code,
        Status: 'Open - Not Contacted',
        LeadSource: 'Cold Call',
        OwnerId: userId,
        CreatedDate: timestamp,
      }

      // 2. Account object (converted from Lead)
      const accountPayload = {
        Id: accountId,
        Name: quoteData.account_name,
        BillingStreet: quoteData.service_street,
        BillingCity: quoteData.service_city,
        BillingState: quoteData.service_state,
        BillingPostalCode: quoteData.service_postal_code,
        Phone: quoteData.contact_phone,
        OwnerId: userId,
        CreatedDate: timestamp,
        ConvertedFromLeadId: leadId,
      }

      // 3. Opportunity object (created with Account)
      const opportunityPayload = {
        Id: opportunityId,
        Name: `${quoteData.account_name} - Opportunity`,
        AccountId: accountId,
        StageName: 'Qualification',
        Amount: totalAmount,
        Probability: 10,
        CloseDate: quoteData.valid_until_date,
        OwnerId: userId,
        CreatedDate: timestamp,
        ConvertedFromLeadId: leadId,
      }

      // 4. Quote object
      const quotePayload = {
        Id: quoteId,
        Name: quoteData.quote_name,
        OpportunityId: opportunityId,
        AccountId: accountId,
        ContactId: `CONTACT-${Date.now()}`, // Would be created from Lead contact info
        Status: 'Draft',
        ExpirationDate: quoteData.valid_until_date,
        GrandTotal: totalAmount,
        LineItemCount: quoteData.line_items.length,
        LineItems: quoteData.line_items,
        Notes: quoteData.notes,
        OwnerId: userId,
        CreatedDate: timestamp,
      }
    } else if (customerSource === 'lead') {
      // Existing Lead flow: Convert Lead → Account + Opportunity, Create Quote

      // 1. Account object (converted from existing Lead)
      const accountPayload = {
        Id: accountId,
        Name: quoteData.account_name,
        BillingStreet: quoteData.service_street,
        BillingCity: quoteData.service_city,
        BillingState: quoteData.service_state,
        BillingPostalCode: quoteData.service_postal_code,
        Phone: quoteData.contact_phone,
        OwnerId: userId,
        CreatedDate: timestamp,
        ConvertedFromLeadId: selectedAccount?.account_id || leadId,
      }

      // 2. Opportunity object (created with Account)
      const opportunityPayload = {
        Id: opportunityId,
        Name: `${quoteData.account_name} - Opportunity`,
        AccountId: accountId,
        StageName: 'Qualification',
        Amount: totalAmount,
        Probability: 20,
        CloseDate: quoteData.valid_until_date,
        OwnerId: userId,
        CreatedDate: timestamp,
      }

      // 3. Quote object
      const quotePayload = {
        Id: quoteId,
        Name: quoteData.quote_name,
        OpportunityId: opportunityId,
        AccountId: accountId,
        Status: 'Draft',
        ExpirationDate: quoteData.valid_until_date,
        GrandTotal: totalAmount,
        LineItemCount: quoteData.line_items.length,
        LineItems: quoteData.line_items,
        Notes: quoteData.notes,
        OwnerId: userId,
        CreatedDate: timestamp,
      }
    } else {
      // Existing Account flow: Just create Quote (Opportunity already exists)

      const quotePayload = {
        Id: quoteId,
        Name: quoteData.quote_name,
        OpportunityId: opportunityId,
        AccountId: quoteData.account_id,
        Status: 'Draft',
        ExpirationDate: quoteData.valid_until_date,
        GrandTotal: totalAmount,
        LineItemCount: quoteData.line_items.length,
        LineItems: quoteData.line_items,
        Notes: quoteData.notes,
        OwnerId: userId,
        CreatedDate: timestamp,
      }
    }

    // Show success message and redirect
    alert(`Quote created successfully! Check console for ${customerSource === 'new-customer' ? '4-object' : customerSource === 'lead' ? '3-object' : '1-object'} payload.`)
    router.push('/ae/sales?tab=quotes')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/ae/sales?tab=quotes')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quotes
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Create New Quote</h1>
          <p className="text-muted-foreground">
            Build a professional quote from our service catalog
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                Step {currentStep} of {STEPS.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />

            {/* Step indicators */}
            <div className="flex justify-between">
              {STEPS.map((step) => {
                const Icon = step.icon
                const isComplete = step.number < currentStep
                const isCurrent = step.number === currentStep
                return (
                  <div key={step.number} className="flex flex-col items-center gap-2">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        isComplete
                          ? 'bg-green-500 border-green-500 text-white'
                          : isCurrent
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isCurrent ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="min-h-[500px]">
        {currentStep === 1 && (
          <AccountSelectionStep
            quoteData={quoteData}
            updateQuoteData={updateQuoteData}
            setCustomerSource={setCustomerSource}
            onNext={handleNext}
          />
        )}

        {currentStep === 2 && (
          <ServiceSelectionStep
            quoteData={quoteData}
            updateQuoteData={updateQuoteData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <PricingConfigurationStep
            quoteData={quoteData}
            updateQuoteData={updateQuoteData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 4 && (
          <QuotePreviewStep
            quoteData={quoteData}
            updateQuoteData={updateQuoteData}
            onBack={handleBack}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}

// Wrap in Suspense for useSearchParams
export default function QuoteBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <QuoteBuilderContent />
    </Suspense>
  )
}
