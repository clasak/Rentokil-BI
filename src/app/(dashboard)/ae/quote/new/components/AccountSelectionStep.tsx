'use client'

/**
 * Customer Selection Step (Step 1)
 *
 * Supports 3 entry paths:
 * 1. New Customer - Enter info from scratch (cold call)
 * 2. Existing Lead - Search and select a lead
 * 3. Existing Account - Search and select an account
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { SalesforceAccount, SalesforceLead } from '@/lib/bigquery/queries/salesforce'
import type { QuoteData } from '../page'
import { Search, Building2, MapPin, Phone, Mail, User, ArrowRight, UserPlus, Users, TrendingUp } from 'lucide-react'

interface AccountSelectionStepProps {
  quoteData: QuoteData
  updateQuoteData: (updates: Partial<QuoteData>) => void
  setCustomerSource: (source: 'new-customer' | 'lead' | 'account') => void
  onNext: () => void
}

type SelectionMode = 'new-customer' | 'lead' | 'account'

export default function AccountSelectionStep({
  quoteData,
  updateQuoteData,
  setCustomerSource,
  onNext,
}: AccountSelectionStepProps) {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('account')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAccountData, setSelectedAccountData] = useState<SalesforceAccount | null>(null)
  const [selectedLeadData, setSelectedLeadData] = useState<SalesforceLead | null>(null)
  const [isNewCustomer, setIsNewCustomer] = useState(false)

  // Fetch accounts based on search
  const {
    data: accounts,
    isLoading: isLoadingAccounts,
  } = useBigQueryData<SalesforceAccount[], SalesforceAccount[]>({
    queryName: 'salesforce-accounts',
    filters: { searchTerm, limit: 20 },
    defaultData: [],
    transformBigQueryData: (data) => data,
    includeRoleFilters: false,
    enabled: selectionMode === 'account' && searchTerm.length >= 2,
  })

  // Fetch leads based on search
  const {
    data: leads,
    isLoading: isLoadingLeads,
  } = useBigQueryData<SalesforceLead[], SalesforceLead[]>({
    queryName: 'salesforce-leads',
    filters: { searchTerm, limit: 20 },
    defaultData: [],
    transformBigQueryData: (data) => data,
    includeRoleFilters: false,
    enabled: selectionMode === 'lead' && searchTerm.length >= 2,
  })

  const handleSelectAccount = (account: SalesforceAccount) => {
    setSelectedAccountData(account)
    setSelectedLeadData(null)
    setIsNewCustomer(false)
    setCustomerSource('account')

    // Pre-fill quote data
    updateQuoteData({
      account_id: account.account_id,
      account_name: account.account_name,
      service_street: account.billing_street,
      service_city: account.billing_city,
      service_state: account.billing_state,
      service_postal_code: account.billing_postal_code,
      quote_name: `${account.account_name} - Quote - ${new Date().toLocaleDateString()}`,
    })
  }

  const handleSelectLead = (lead: SalesforceLead) => {
    setSelectedLeadData(lead)
    setSelectedAccountData(null)
    setIsNewCustomer(false)
    setCustomerSource('lead')

    // Pre-fill quote data from lead
    updateQuoteData({
      account_id: '', // Will be created
      account_name: lead.company,
      contact_name: lead.lead_name,
      contact_email: lead.email,
      contact_phone: lead.phone || lead.mobile_phone,
      service_street: lead.street,
      service_city: lead.city,
      service_state: lead.state,
      service_postal_code: lead.postal_code,
      quote_name: `${lead.company} - Quote - ${new Date().toLocaleDateString()}`,
    })
  }

  const handleNewCustomer = () => {
    setIsNewCustomer(true)
    setSelectedAccountData(null)
    setSelectedLeadData(null)
    setCustomerSource('new-customer')

    // Pre-fill with test data for faster testing
    updateQuoteData({
      account_id: '',
      account_name: 'Acme Corporation',
      contact_name: 'John Smith',
      contact_email: 'john.smith@acme.com',
      contact_phone: '555-123-4567',
      service_street: '123 Main Street',
      service_city: 'Charlotte',
      service_state: 'NC',
      service_postal_code: '28202',
      quote_name: `Acme Corporation - Quote - ${new Date().toLocaleDateString()}`,
    })
  }

  const handleContinue = () => {
    if (!selectedAccountData && !selectedLeadData && !isNewCustomer) {
      alert('Please select a customer or create a new one')
      return
    }

    if (isNewCustomer && (!quoteData.account_name || !quoteData.service_city)) {
      alert('Please enter company name and city before continuing')
      return
    }

    onNext()
  }

  const handleTabChange = (value: string) => {
    const newMode = value as SelectionMode
    setSelectionMode(newMode)

    // Auto-fill new customer form when switching to that tab
    if (newMode === 'new-customer') {
      handleNewCustomer()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select or Create Customer</CardTitle>
          <CardDescription>
            Search for an existing lead or account, or create a new customer record
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={selectionMode} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Existing Account
              </TabsTrigger>
              <TabsTrigger value="lead" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Existing Lead
              </TabsTrigger>
              <TabsTrigger value="new-customer" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                New Customer
              </TabsTrigger>
            </TabsList>

            {/* Existing Account Tab */}
            <TabsContent value="account" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="account-search">Search Accounts</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="account-search"
                    placeholder="Search by account name, city, or industry..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchTerm.length > 0 && searchTerm.length < 2 && (
                  <p className="text-sm text-muted-foreground">
                    Type at least 2 characters to search
                  </p>
                )}
              </div>

              {isLoadingAccounts && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                    />
                  ))}
                </div>
              )}

              {!isLoadingAccounts && accounts.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {accounts.map((account) => (
                    <button
                      key={account.account_id}
                      onClick={() => handleSelectAccount(account)}
                      className={`w-full text-left p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        selectedAccountData?.account_id === account.account_id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{account.account_name}</span>
                            {account.industry && (
                              <Badge variant="outline" className="text-xs">
                                {account.industry}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {account.billing_city && account.billing_state && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {account.billing_city}, {account.billing_state}
                                </span>
                              </div>
                            )}
                            {account.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{account.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {selectedAccountData?.account_id === account.account_id && (
                          <Badge className="bg-green-500">Selected</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!isLoadingAccounts && searchTerm.length >= 2 && accounts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No accounts found matching &quot;{searchTerm}&quot;</p>
                </div>
              )}
            </TabsContent>

            {/* Existing Lead Tab */}
            <TabsContent value="lead" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="lead-search">Search Leads</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lead-search"
                    placeholder="Search by name, company, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchTerm.length > 0 && searchTerm.length < 2 && (
                  <p className="text-sm text-muted-foreground">
                    Type at least 2 characters to search
                  </p>
                )}
              </div>

              {isLoadingLeads && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                    />
                  ))}
                </div>
              )}

              {!isLoadingLeads && leads.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {leads.map((lead) => (
                    <button
                      key={lead.lead_id}
                      onClick={() => handleSelectLead(lead)}
                      className={`w-full text-left p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        selectedLeadData?.lead_id === lead.lead_id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{lead.lead_name}</span>
                            <span className="text-sm text-muted-foreground">@ {lead.company}</span>
                            {lead.status && (
                              <Badge variant="outline" className="text-xs">
                                {lead.status}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {lead.city && lead.state && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {lead.city}, {lead.state}
                                </span>
                              </div>
                            )}
                            {lead.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span>{lead.email}</span>
                              </div>
                            )}
                            {(lead.phone || lead.mobile_phone) && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{lead.phone || lead.mobile_phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {selectedLeadData?.lead_id === lead.lead_id && (
                          <Badge className="bg-green-500">Selected</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!isLoadingLeads && searchTerm.length >= 2 && leads.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No leads found matching &quot;{searchTerm}&quot;</p>
                </div>
              )}
            </TabsContent>

            {/* New Customer Tab */}
            <TabsContent value="new-customer" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Creating new customer record (Lead → Account → Opportunity → Quote)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-company">
                      Company Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="new-company"
                      placeholder="ABC Pest Control"
                      value={quoteData.account_name}
                      onChange={(e) => {
                        updateQuoteData({ account_name: e.target.value })
                        setIsNewCustomer(true)
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-contact-name">Contact Name</Label>
                    <Input
                      id="new-contact-name"
                      placeholder="John Doe"
                      value={quoteData.contact_name}
                      onChange={(e) => {
                        updateQuoteData({ contact_name: e.target.value })
                        setIsNewCustomer(true)
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-email">Email</Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="john@example.com"
                      value={quoteData.contact_email}
                      onChange={(e) => {
                        updateQuoteData({ contact_email: e.target.value })
                        setIsNewCustomer(true)
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-phone">Phone</Label>
                    <Input
                      id="new-phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={quoteData.contact_phone}
                      onChange={(e) => {
                        updateQuoteData({ contact_phone: e.target.value })
                        setIsNewCustomer(true)
                      }}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="new-street">Street Address</Label>
                    <Input
                      id="new-street"
                      placeholder="123 Main Street"
                      value={quoteData.service_street}
                      onChange={(e) => {
                        updateQuoteData({ service_street: e.target.value })
                        setIsNewCustomer(true)
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-city">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="new-city"
                      placeholder="Chicago"
                      value={quoteData.service_city}
                      onChange={(e) => {
                        updateQuoteData({ service_city: e.target.value })
                        setIsNewCustomer(true)
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-state">State</Label>
                    <Input
                      id="new-state"
                      placeholder="IL"
                      value={quoteData.service_state}
                      onChange={(e) => {
                        updateQuoteData({ service_state: e.target.value })
                        setIsNewCustomer(true)
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-postal">Postal Code</Label>
                    <Input
                      id="new-postal"
                      placeholder="60601"
                      value={quoteData.service_postal_code}
                      onChange={(e) => {
                        updateQuoteData({ service_postal_code: e.target.value })
                        setIsNewCustomer(true)
                      }}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Selected Customer Summary */}
          {(selectedAccountData || selectedLeadData || isNewCustomer) && (
            <Card className="border-green-500 bg-green-50 dark:bg-green-950">
              <CardHeader>
                <CardTitle className="text-lg">Selected Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedAccountData && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Source</Label>
                      <p className="font-medium">Existing Account</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Account Name</Label>
                      <p className="font-medium">{selectedAccountData.account_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Billing Address</Label>
                      <p className="text-sm">
                        {selectedAccountData.billing_street}
                        <br />
                        {selectedAccountData.billing_city}, {selectedAccountData.billing_state}{' '}
                        {selectedAccountData.billing_postal_code}
                      </p>
                    </div>
                  </>
                )}
                {selectedLeadData && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Source</Label>
                      <p className="font-medium">Existing Lead (will convert to Account)</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Lead Name</Label>
                      <p className="font-medium">{selectedLeadData.lead_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Company</Label>
                      <p className="font-medium">{selectedLeadData.company}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Address</Label>
                      <p className="text-sm">
                        {selectedLeadData.street}
                        <br />
                        {selectedLeadData.city}, {selectedLeadData.state} {selectedLeadData.postal_code}
                      </p>
                    </div>
                  </>
                )}
                {isNewCustomer && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Source</Label>
                      <p className="font-medium">New Customer (will create all records)</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Company Name</Label>
                      <p className="font-medium">{quoteData.account_name || '(not entered)'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Location</Label>
                      <p className="text-sm">
                        {quoteData.service_city || '(not entered)'}, {quoteData.service_state}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contact Information (for existing account only) */}
          {selectedAccountData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                <span>Point of Contact</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Contact Name</Label>
                  <Input
                    id="contact-name"
                    placeholder="John Doe"
                    value={quoteData.contact_name}
                    onChange={(e) => updateQuoteData({ contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="john@example.com"
                    value={quoteData.contact_email}
                    onChange={(e) => updateQuoteData({ contact_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Contact Phone</Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={quoteData.contact_phone}
                    onChange={(e) => updateQuoteData({ contact_phone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={!selectedAccountData && !selectedLeadData && !isNewCustomer}
          size="lg"
        >
          Continue to Services
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
