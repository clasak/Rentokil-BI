'use client'

/**
 * Service Selection Step (Step 2) - SIMPLIFIED
 *
 * Simple searchable list of services with quick-add templates
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { useAuth } from '@/components/providers/AuthProvider'
import type { SalesforceProduct } from '@/lib/bigquery/queries/salesforce'
import type { QuoteData, QuoteLineItem } from '../page'
import { Search, ArrowLeft, ArrowRight, CheckCircle, Plus, X, Zap, Settings } from 'lucide-react'

interface ServiceSelectionStepProps {
  quoteData: QuoteData
  updateQuoteData: (updates: Partial<QuoteData>) => void
  onNext: () => void
  onBack: () => void
}

// Top common service codes from actual quote data (not NATL versions)
// Note: Most users will see their personalized most-used services instead
const STANDARD_SERVICE_CODES = [
  'CP637',  // GENERAL PEST CONTROL MAINTENANCE (26,932 uses)
  'CP896',  // GENERAL PEST CONTROL CORRECTIVE (14,998 uses)
  'CP631',  // EXTERIOR INSECT PERIMETER TREATMENT MAINTENANCE (5,073 uses)
  'CP632',  // EXTERIOR RODENT MONITORING MAINTENANCE (4,755 uses)
  'CP636',  // INSECT LIGHT TRAP MAINTENANCE (2,658 uses)
  'CP892',  // PEST - CLEANOUT CORRECTIVE (2,141 uses)
  'CP640',  // INTERIOR RODENT MONITORING MAINTENANCE (2,066 uses)
]

interface TemplateService {
  product: SalesforceProduct
  selected: boolean
  quantity: number
  frequency: QuoteLineItem['frequency']
}

// Services that have configuration options (sub-services)
const CONFIGURABLE_SERVICES: Record<string, string[]> = {
  'CP637': ['CP632', 'CP640', 'CP636'], // GPC Maintenance → Exterior Rodent, Interior Rodent, Insect Traps
}

interface ServiceConfiguration {
  mainService: SalesforceProduct
  subServices: {
    product: SalesforceProduct
    availableVariants: SalesforceProduct[] // All product variants (e.g., different MRT/RBS types)
    selected: boolean
    quantity: number
    hasInitial: boolean
    initialMultiplier: number
  }[]
}

export default function ServiceSelectionStep({
  quoteData,
  updateQuoteData,
  onNext,
  onBack,
}: ServiceSelectionStepProps) {
  const { profile } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [templateServices, setTemplateServices] = useState<TemplateService[]>([])
  const [showConfigurator, setShowConfigurator] = useState(false)
  const [serviceConfig, setServiceConfig] = useState<ServiceConfiguration | null>(null)

  // Fetch all products from BigQuery (no search filter - load all)
  const {
    data: products,
    isLoading: isLoadingProducts,
  } = useBigQueryData<SalesforceProduct[], SalesforceProduct[]>({
    queryName: 'product-catalog',
    filters: { limit: 500 },
    defaultData: [],
    transformBigQueryData: (data) => data,
    includeRoleFilters: false,
    enabled: true,
  })

  // Fetch user's most-used services for personalized Quick Add
  const {
    data: userMostUsedServices,
    isLoading: isLoadingUserServices,
  } = useBigQueryData<{ product_code: string; usage_count: number }[], { product_code: string; usage_count: number }[]>({
    queryName: 'user-most-used-services',
    filters: { limit: 8 },
    defaultData: [],
    transformBigQueryData: (data) => data,
    includeRoleFilters: true, // Automatically inject salesPerson filter from role
    enabled: true,
  })

  // Client-side search filter
  const filteredProducts = searchTerm.length > 0
    ? products.filter((p) =>
        p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products

  const handleAddService = (
    product: SalesforceProduct,
    quantity: number = 1,
    frequency: QuoteLineItem['frequency'] = 'MONTHLY'
  ) => {
    // Check if this is a configurable service
    if (CONFIGURABLE_SERVICES[product.product_code]) {
      handleOpenConfigurator(product)
      return
    }

    // Check if already added
    if (quoteData.line_items.some((item) => item.product_id === product.product_id)) {
      return
    }

    const frequencyMultiplier = getFrequencyMultiplier(frequency)

    const newLineItem: QuoteLineItem = {
      product_id: product.product_id,
      product_name: product.product_name,
      product_code: product.product_code,
      description: product.description,
      quantity: quantity,
      frequency: frequency,
      list_price: product.list_price,
      discount_percent: 0,
      net_price: product.list_price,
      total: product.list_price * quantity * frequencyMultiplier,
    }

    updateQuoteData({
      line_items: [...quoteData.line_items, newLineItem],
    })
  }

  const handleOpenConfigurator = (mainService: SalesforceProduct) => {
    const subServiceCodes = CONFIGURABLE_SERVICES[mainService.product_code]

    // Find all matching sub-services
    const subServices = subServiceCodes.map((code) => {
      const matchingProducts = products.filter((p) => p.product_code === code)
      // Default to first match (we'll provide dropdown to change variants)
      const defaultProduct = matchingProducts[0]

      return {
        product: defaultProduct,
        availableVariants: matchingProducts, // All variants for this service type
        selected: true, // All selected by default
        quantity: 1,
        hasInitial: false, // Initial install not selected by default
        initialMultiplier: 1,
      }
    }).filter((s) => s.product) // Only include if product found

    setServiceConfig({
      mainService,
      subServices,
    })
    setShowConfigurator(true)
  }

  const handleCloseConfigurator = () => {
    setShowConfigurator(false)
    setServiceConfig(null)
  }

  const handleAddConfiguredServices = () => {
    if (!serviceConfig) return

    const itemsToAdd: QuoteLineItem[] = []

    // First, add the main service (e.g., General Pest Control Maintenance)
    const frequencyMultiplier = getFrequencyMultiplier('MONTHLY')
    itemsToAdd.push({
      product_id: serviceConfig.mainService.product_id,
      product_name: serviceConfig.mainService.product_name,
      product_code: serviceConfig.mainService.product_code,
      description: serviceConfig.mainService.description,
      quantity: 1,
      frequency: 'MONTHLY',
      list_price: serviceConfig.mainService.list_price,
      discount_percent: 0,
      net_price: serviceConfig.mainService.list_price,
      total: serviceConfig.mainService.list_price * frequencyMultiplier,
    })

    // Then add selected sub-services
    serviceConfig.subServices.forEach((subService) => {
      if (!subService.selected) return

      const monthlyPrice = subService.product.list_price * subService.quantity
      const annualPrice = monthlyPrice * frequencyMultiplier

      // Add maintenance service
      itemsToAdd.push({
        product_id: subService.product.product_id,
        product_name: subService.product.product_name,
        product_code: subService.product.product_code,
        description: subService.product.description,
        quantity: subService.quantity,
        frequency: 'MONTHLY',
        list_price: subService.product.list_price,
        discount_percent: 0,
        net_price: subService.product.list_price,
        total: annualPrice,
      })

      // Add initial install if selected
      if (subService.hasInitial && subService.initialMultiplier > 0) {
        const initialPrice = subService.product.list_price * subService.quantity * subService.initialMultiplier
        itemsToAdd.push({
          product_id: `${subService.product.product_id}-initial`,
          product_name: `${subService.product.product_name} - Initial Install`,
          product_code: `${subService.product.product_code}-INIT`,
          description: `Initial installation (${subService.initialMultiplier}x multiplier)`,
          quantity: subService.quantity,
          frequency: 'ONETIME',
          list_price: subService.product.list_price * subService.initialMultiplier,
          discount_percent: 0,
          net_price: subService.product.list_price * subService.initialMultiplier,
          total: initialPrice,
        })
      }
    })

    // Filter out already added items and add new ones
    const currentIds = quoteData.line_items.map((item) => item.product_id)
    const newItems = itemsToAdd.filter((item) => !currentIds.includes(item.product_id))

    updateQuoteData({
      line_items: [...quoteData.line_items, ...newItems],
    })

    handleCloseConfigurator()
  }

  const getFrequencyMultiplier = (frequency: QuoteLineItem['frequency']) => {
    const map: Record<string, number> = {
      'MONTHLY': 12, 'Monthly': 12, 'BILL PER SERVICE': 1, 'QUARTERLY': 4, 'Quarterly': 4,
      'ANNUALLY': 1, 'Annually': 1, 'Semi-Annually (2x)': 2, 'Tri-Annually (3x)': 3,
      'Every Other Month (6x)': 6, 'Semi-Monthly (24x)': 24, 'Weekly': 52, 'ONETIME': 1,
      'Every Other Week (26x)': 26, '4 Weeks Per Month (48x)': 48,
    }
    return map[frequency] || 1
  }

  const handleRemoveService = (productId: string) => {
    updateQuoteData({
      line_items: quoteData.line_items.filter((item) => item.product_id !== productId),
    })
  }

  const handleShowQuickAdd = () => {
    // Use personalized services if available, otherwise fall back to standard codes
    const serviceCodes = userMostUsedServices.length > 0
      ? userMostUsedServices.map((s) => s.product_code)
      : STANDARD_SERVICE_CODES

    // Find services matching the codes
    const matchedServices = products.filter((p) =>
      serviceCodes.includes(p.product_code)
    )

    // Initialize template with services unselected, quantity 1, monthly frequency
    const template: TemplateService[] = matchedServices.map((product) => ({
      product,
      selected: false,
      quantity: 1,
      frequency: 'MONTHLY' as const,
    }))

    setTemplateServices(template)
    setShowQuickAdd(true)
  }

  const handleAddFromTemplate = () => {
    // Add all selected services from template with their configured quantity and frequency
    const selectedServices = templateServices.filter((t) => t.selected)
    selectedServices.forEach((templateService) => {
      handleAddService(
        templateService.product,
        templateService.quantity,
        templateService.frequency
      )
    })

    setShowQuickAdd(false)
    setTemplateServices([])
  }

  const handleContinue = () => {
    if (quoteData.line_items.length === 0) {
      alert('Please add at least one service to continue')
      return
    }
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Quick Add Standard Package */}
      {quoteData.line_items.length === 0 && !showQuickAdd && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  {userMostUsedServices.length > 0
                    ? 'Start with Your Most-Used Services'
                    : 'Start with Standard Services'}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {userMostUsedServices.length > 0
                    ? `Your top ${userMostUsedServices.length} most frequently used services - customize as needed`
                    : 'Top 8 most common services - customize equipment count and frequency'}
                </p>
              </div>
              <Button
                onClick={handleShowQuickAdd}
                disabled={isLoadingProducts || isLoadingUserServices}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Zap className="h-5 w-5 mr-2" />
                {userMostUsedServices.length > 0
                  ? 'Quick Add My Services'
                  : 'Quick Add Standard Services'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editable Quick Add Template */}
      {showQuickAdd && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-blue-900 dark:text-blue-100">Quick Add Template</CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                  Select services and adjust equipment count and frequency
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allSelected = templateServices.every((t) => t.selected)
                    setTemplateServices(templateServices.map((t) => ({ ...t, selected: !allSelected })))
                  }}
                  className="text-xs text-blue-900 dark:text-blue-100"
                >
                  {templateServices.every((t) => t.selected) ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowQuickAdd(false)
                    setTemplateServices([])
                  }}
                  className="text-blue-900 dark:text-blue-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {templateServices.map((templateService, index) => (
              <div
                key={templateService.product.product_id}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={templateService.selected}
                  onChange={(e) => {
                    const updated = [...templateServices]
                    updated[index].selected = e.target.checked
                    setTemplateServices(updated)
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />

                {/* Service Name */}
                <div className="flex-1">
                  <div className="font-medium text-sm">{templateService.product.product_name}</div>
                  <div className="text-xs text-muted-foreground">{templateService.product.product_code}</div>
                </div>

                {/* Quantity Input */}
                <div className="flex items-center gap-1">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Qty:</label>
                  <Input
                    type="number"
                    min="0.01"
                    max="99"
                    step="0.01"
                    value={templateService.quantity}
                    onChange={(e) => {
                      const updated = [...templateServices]
                      updated[index].quantity = Math.max(0.01, Math.min(99, parseFloat(e.target.value) || 0.01))
                      setTemplateServices(updated)
                    }}
                    className="w-16 h-8 text-sm"
                    disabled={!templateService.selected}
                  />
                </div>

                {/* Frequency Select */}
                <select
                  value={templateService.frequency}
                  onChange={(e) => {
                    const updated = [...templateServices]
                    updated[index].frequency = e.target.value as QuoteLineItem['frequency']
                    setTemplateServices(updated)
                  }}
                  disabled={!templateService.selected}
                  className="h-8 text-sm border rounded px-2 bg-white dark:bg-gray-800"
                >
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="Monthly">Monthly</option>
                  <option value="BILL PER SERVICE">Bill Per Service</option>
                  <option value="QUARTERLY">QUARTERLY</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="ANNUALLY">ANNUALLY</option>
                  <option value="Annually">Annually</option>
                  <option value="Semi-Annually (2x)">Semi-Annually (2x)</option>
                  <option value="Tri-Annually (3x)">Tri-Annually (3x)</option>
                  <option value="Every Other Month (6x)">Every Other Month (6x)</option>
                  <option value="Semi-Monthly (24x)">Semi-Monthly (24x)</option>
                  <option value="Weekly">Weekly</option>
                  <option value="ONETIME">One-Time</option>
                  <option value="Every Other Week (26x)">Every Other Week (26x)</option>
                  <option value="4 Weeks Per Month (48x)">4 Weeks Per Month (48x)</option>
                </select>
              </div>
            ))}

            {/* Add Selected Button */}
            <div className="flex justify-end gap-2 pt-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowQuickAdd(false)
                  setTemplateServices([])
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddFromTemplate}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!templateServices.some((t) => t.selected)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Selected Services ({templateServices.filter((t) => t.selected).length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Configurator Modal */}
      {showConfigurator && serviceConfig && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="border-b bg-gradient-to-r from-purple-600 to-blue-600">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configure Service Bundle
                  </CardTitle>
                  <CardDescription className="text-purple-100">
                    {serviceConfig.mainService.product_name} ({serviceConfig.mainService.product_code})
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseConfigurator}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Select and configure the sub-services to include with this package. Adjust equipment counts, choose product variants, and add initial installation if needed.
              </p>

              {serviceConfig.subServices.map((subService, index) => (
                <Card key={index} className={`border-2 ${subService.selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-800'}`}>
                  <CardContent className="p-4 space-y-4">
                    {/* Service Selection Header */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={subService.selected}
                        onChange={(e) => {
                          const updated = { ...serviceConfig }
                          updated.subServices[index].selected = e.target.checked
                          setServiceConfig(updated)
                        }}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-semibold">{subService.product.product_name}</div>
                        <div className="text-sm text-muted-foreground">{subService.product.product_code}</div>
                        <div className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">
                          ${subService.product.list_price.toFixed(2)}/month
                        </div>
                      </div>
                    </div>

                    {subService.selected && (
                      <div className="pl-8 space-y-4 border-l-2 border-blue-300 dark:border-blue-700">
                        {/* Product Variant Selector */}
                        {subService.availableVariants.length > 1 && (
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">Product Variant</Label>
                            <select
                              value={subService.product.product_id}
                              onChange={(e) => {
                                const selectedVariant = subService.availableVariants.find(
                                  (v) => v.product_id === e.target.value
                                )
                                if (selectedVariant) {
                                  const updated = { ...serviceConfig }
                                  updated.subServices[index].product = selectedVariant
                                  setServiceConfig(updated)
                                }
                              }}
                              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            >
                              {subService.availableVariants.map((variant) => (
                                <option key={variant.product_id} value={variant.product_id}>
                                  {variant.product_name} - ${variant.list_price.toFixed(2)}/mo
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-muted-foreground">
                              Choose from {subService.availableVariants.length} available variants
                            </p>
                          </div>
                        )}

                        {/* Quantity Input */}
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Equipment Count</Label>
                          <Input
                            type="number"
                            min="1"
                            max="99"
                            value={subService.quantity}
                            onChange={(e) => {
                              const updated = { ...serviceConfig }
                              updated.subServices[index].quantity = Math.max(1, Math.min(99, parseInt(e.target.value) || 1))
                              setServiceConfig(updated)
                            }}
                            className="w-24"
                          />
                        </div>

                        {/* Initial Install Options */}
                        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={subService.hasInitial}
                              onChange={(e) => {
                                const updated = { ...serviceConfig }
                                updated.subServices[index].hasInitial = e.target.checked
                                setServiceConfig(updated)
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <Label className="text-sm font-semibold cursor-pointer">
                              Include Initial Installation
                            </Label>
                          </div>

                          {subService.hasInitial && (
                            <div className="space-y-2 pl-6">
                              <Label className="text-xs font-semibold">Initial Install Multiplier</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  max="10"
                                  step="0.5"
                                  value={subService.initialMultiplier}
                                  onChange={(e) => {
                                    const updated = { ...serviceConfig }
                                    updated.subServices[index].initialMultiplier = Math.max(1, parseFloat(e.target.value) || 1)
                                    setServiceConfig(updated)
                                  }}
                                  className="w-20"
                                />
                                <span className="text-xs text-muted-foreground">
                                  × base price (${(subService.product.list_price * subService.quantity * subService.initialMultiplier).toFixed(2)} one-time)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Pricing Summary for this sub-service */}
                        <div className="grid grid-cols-2 gap-2 text-xs p-2 bg-white dark:bg-gray-800 rounded border">
                          <div>
                            <div className="text-muted-foreground">Monthly Cost:</div>
                            <div className="font-semibold">${(subService.product.list_price * subService.quantity).toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Annual Cost:</div>
                            <div className="font-semibold">${(subService.product.list_price * subService.quantity * 12).toFixed(2)}</div>
                          </div>
                          {subService.hasInitial && (
                            <>
                              <div className="col-span-2 border-t pt-2 mt-2">
                                <div className="text-muted-foreground">Initial Install:</div>
                                <div className="font-semibold text-orange-600 dark:text-orange-400">
                                  ${(subService.product.list_price * subService.quantity * subService.initialMultiplier).toFixed(2)} (one-time)
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Total Package Pricing */}
              <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {/* Main Service Cost */}
                    <div className="pb-2 border-b">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">Main Service</div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{serviceConfig.mainService.product_name}</span>
                        <span className="font-semibold">${serviceConfig.mainService.list_price.toFixed(2)}/mo</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-muted-foreground">Annual:</span>
                        <span className="font-medium">${(serviceConfig.mainService.list_price * 12).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Sub-Services Cost */}
                    <div className="pb-2">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">Additional Services ({serviceConfig.subServices.filter((s) => s.selected).length} selected)</div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly:</span>
                        <span className="font-semibold">
                          ${serviceConfig.subServices
                            .filter((s) => s.selected)
                            .reduce((sum, s) => sum + s.product.list_price * s.quantity, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-muted-foreground">Annual:</span>
                        <span className="font-medium">
                          ${serviceConfig.subServices
                            .filter((s) => s.selected)
                            .reduce((sum, s) => sum + s.product.list_price * s.quantity * 12, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Grand Total */}
                    <div className="h-px bg-gray-300 dark:bg-gray-700" />
                    <div className="flex justify-between">
                      <span className="font-bold">Total Monthly Cost:</span>
                      <span className="font-bold text-lg">
                        ${(
                          serviceConfig.mainService.list_price +
                          serviceConfig.subServices
                            .filter((s) => s.selected)
                            .reduce((sum, s) => sum + s.product.list_price * s.quantity, 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Total Annual Cost:</span>
                      <span className="font-bold text-green-600 dark:text-green-400 text-xl">
                        ${(
                          (serviceConfig.mainService.list_price +
                            serviceConfig.subServices
                              .filter((s) => s.selected)
                              .reduce((sum, s) => sum + s.product.list_price * s.quantity, 0)) *
                          12
                        ).toFixed(2)}
                      </span>
                    </div>

                    {/* Initial Install */}
                    {serviceConfig.subServices.some((s) => s.selected && s.hasInitial) && (
                      <>
                        <div className="h-px bg-gray-300 dark:bg-gray-700" />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Initial Install:</span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400">
                            ${serviceConfig.subServices
                              .filter((s) => s.selected && s.hasInitial)
                              .reduce((sum, s) => sum + s.product.list_price * s.quantity * s.initialMultiplier, 0)
                              .toFixed(2)} (one-time)
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
            <div className="border-t p-4 bg-gray-50 dark:bg-gray-900 flex justify-between">
              <Button variant="outline" onClick={handleCloseConfigurator}>
                Cancel
              </Button>
              <Button
                onClick={handleAddConfiguredServices}
                disabled={!serviceConfig.subServices.some((s) => s.selected)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Configured Services ({serviceConfig.subServices.filter((s) => s.selected).length})
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Selected Services Summary */}
      {quoteData.line_items.length > 0 && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="font-semibold text-green-900 dark:text-green-100">
                  {quoteData.line_items.length} Service{quoteData.line_items.length !== 1 ? 's' : ''} Added
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {quoteData.line_items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border border-green-200 dark:border-green-800"
                >
                  <div className="flex-1">
                    <span className="font-medium text-sm">{item.product_name}</span>
                    {item.product_code && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({item.product_code})
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveService(item.product_id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Catalog */}
      <Card>
        <CardHeader>
          <CardTitle>Add Services</CardTitle>
          <CardDescription>
            Search and click to add services to your quote
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Products List */}
          {isLoadingProducts && (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                />
              ))}
            </div>
          )}

          {!isLoadingProducts && filteredProducts.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                {filteredProducts.map((product) => {
                  const isAdded = quoteData.line_items.some((item) => item.product_id === product.product_id)
                  const quantity = quantities[product.product_id] || 1

                  return (
                    <div
                      key={product.product_id}
                      className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{product.product_name}</span>
                          {product.product_code && (
                            <Badge variant="outline" className="text-xs">
                              {product.product_code}
                            </Badge>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {product.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            ${product.list_price.toFixed(2)}/month
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (${(product.list_price * 12).toFixed(2)}/year)
                          </span>
                        </div>
                      </div>
                      {!isAdded && (
                        <div className="flex items-center gap-2 ml-4">
                          <div className="flex items-center gap-1">
                            <label className="text-xs text-muted-foreground whitespace-nowrap">Qty:</label>
                            <Input
                              type="number"
                              min="0.01"
                              max="99"
                              step="0.01"
                              value={quantity}
                              onChange={(e) => {
                                const newQty = Math.max(0.01, Math.min(99, parseFloat(e.target.value) || 0.01))
                                setQuantities({ ...quantities, [product.product_id]: newQty })
                              }}
                              className="w-16 h-8 text-sm"
                            />
                          </div>
                        </div>
                      )}
                      {isAdded ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveService(product.product_id)}
                          className="ml-4"
                        >
                          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                          Added
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleAddService(product, quantity)}
                          className="ml-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!isLoadingProducts && filteredProducts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No services found</p>
              {searchTerm.length > 0 && (
                <p className="text-sm mt-1">Try a different search term</p>
              )}
              {products.length === 0 && searchTerm.length === 0 && (
                <p className="text-sm mt-1">No products available in catalog</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" size="lg">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={quoteData.line_items.length === 0}
          size="lg"
          className="bg-primary"
        >
          Continue to Pricing ({quoteData.line_items.length} service{quoteData.line_items.length !== 1 ? 's' : ''})
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
