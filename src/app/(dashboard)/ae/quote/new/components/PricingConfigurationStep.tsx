'use client'

/**
 * Pricing Configuration Step (Step 3)
 *
 * Configure frequency, discounts, and quantities for selected services
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { QuoteData, QuoteLineItem } from '../page'
import { ArrowLeft, ArrowRight, DollarSign, Percent, Package } from 'lucide-react'

interface PricingConfigurationStepProps {
  quoteData: QuoteData
  updateQuoteData: (updates: Partial<QuoteData>) => void
  onNext: () => void
  onBack: () => void
}

const FREQUENCY_OPTIONS = [
  { value: 'MONTHLY', label: 'MONTHLY', multiplier: 12 },
  { value: 'Monthly', label: 'Monthly', multiplier: 12 },
  { value: 'BILL PER SERVICE', label: 'Bill Per Service', multiplier: 1 },
  { value: 'QUARTERLY', label: 'QUARTERLY', multiplier: 4 },
  { value: 'Quarterly', label: 'Quarterly', multiplier: 4 },
  { value: 'ANNUALLY', label: 'ANNUALLY', multiplier: 1 },
  { value: 'Annually', label: 'Annually', multiplier: 1 },
  { value: 'Semi-Annually (2x)', label: 'Semi-Annually (2x)', multiplier: 2 },
  { value: 'Tri-Annually (3x)', label: 'Tri-Annually (3x)', multiplier: 3 },
  { value: 'Every Other Month (6x)', label: 'Every Other Month (6x)', multiplier: 6 },
  { value: 'Semi-Monthly (24x)', label: 'Semi-Monthly (24x)', multiplier: 24 },
  { value: 'Weekly', label: 'Weekly', multiplier: 52 },
  { value: 'ONETIME', label: 'One-Time', multiplier: 1 },
  { value: 'Every Other Week (26x)', label: 'Every Other Week (26x)', multiplier: 26 },
  { value: '4 Weeks Per Month (48x)', label: '4 Weeks Per Month (48x)', multiplier: 48 },
] as const

export default function PricingConfigurationStep({
  quoteData,
  updateQuoteData,
  onNext,
  onBack,
}: PricingConfigurationStepProps) {
  const handleUpdateLineItem = (index: number, updates: Partial<QuoteLineItem>) => {
    const updatedLineItems = [...quoteData.line_items]
    const item = updatedLineItems[index]

    // Update fields
    const updatedItem = { ...item, ...updates }

    // Recalculate net price if discount changed
    if (updates.discount_percent !== undefined) {
      updatedItem.net_price = updatedItem.list_price * (1 - updatedItem.discount_percent / 100)
    }

    // Recalculate total if quantity, frequency, or net price changed
    const frequencyMultiplier = FREQUENCY_OPTIONS.find(f => f.value === updatedItem.frequency)?.multiplier || 1
    updatedItem.total = updatedItem.net_price * updatedItem.quantity * frequencyMultiplier

    updatedLineItems[index] = updatedItem
    updateQuoteData({ line_items: updatedLineItems })
  }

  const calculateGrandTotal = () => {
    return quoteData.line_items.reduce((sum, item) => sum + item.total, 0)
  }

  const calculateTotalDiscount = () => {
    return quoteData.line_items.reduce((sum, item) => {
      const discount = item.list_price * item.quantity * (item.discount_percent / 100)
      const frequencyMultiplier = FREQUENCY_OPTIONS.find(f => f.value === item.frequency)?.multiplier || 1
      return sum + (discount * frequencyMultiplier)
    }, 0)
  }

  const handleContinue = () => {
    if (quoteData.line_items.length === 0) {
      alert('Please add at least one service before continuing')
      return
    }
    onNext()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configure Pricing</CardTitle>
          <CardDescription>
            Set frequency, quantity, and discounts for each service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {quoteData.line_items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No services selected</p>
              <p className="text-sm">Go back and select services first</p>
            </div>
          ) : (
            <div className="space-y-6">
              {quoteData.line_items.map((item, index) => (
                <Card key={item.product_id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{item.product_name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {item.product_code} • {item.description}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        ${item.list_price.toFixed(2)} base
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Frequency & Quantity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`frequency-${index}`}>Billing Frequency</Label>
                        <select
                          id={`frequency-${index}`}
                          value={item.frequency}
                          onChange={(e) =>
                            handleUpdateLineItem(index, {
                              frequency: e.target.value as QuoteLineItem['frequency'],
                            })
                          }
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {FREQUENCY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                        <Input
                          id={`quantity-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateLineItem(index, {
                              quantity: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Discount */}
                    <div className="space-y-2">
                      <Label htmlFor={`discount-${index}`}>
                        Discount Percentage
                        <span className="text-xs text-muted-foreground ml-2">
                          (0-100%)
                        </span>
                      </Label>
                      <div className="relative">
                        <Input
                          id={`discount-${index}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={item.discount_percent}
                          onChange={(e) =>
                            handleUpdateLineItem(index, {
                              discount_percent: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="pr-10"
                        />
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Pricing Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">List Price</div>
                        <div className="font-semibold">${item.list_price.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Net Price</div>
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          ${item.net_price.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Frequency</div>
                        <div className="font-semibold">
                          {FREQUENCY_OPTIONS.find((f) => f.value === item.frequency)?.label}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Annual Total</div>
                        <div className="font-bold text-lg">${item.total.toFixed(2)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Grand Total Summary */}
          {quoteData.line_items.length > 0 && (
            <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Quote Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Services</span>
                  <span className="font-semibold">{quoteData.line_items.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Discount</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    -${calculateTotalDiscount().toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-gray-300 dark:bg-gray-700" />
                <div className="flex justify-between items-center">
                  <span className="font-bold">Annual Grand Total</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ${calculateGrandTotal().toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" size="lg">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Services
        </Button>
        <Button
          onClick={handleContinue}
          disabled={quoteData.line_items.length === 0}
          size="lg"
        >
          Continue to Preview
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
