'use client'

/**
 * Quote Preview Step (Step 4)
 *
 * Preview quote with line items, totals, and auto-generated email body
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { QuoteData } from '../page'
import { ArrowLeft, Send, Mail, FileText, DollarSign, Calendar, User, Building2, MapPin } from 'lucide-react'

interface QuotePreviewStepProps {
  quoteData: QuoteData
  updateQuoteData: (updates: Partial<QuoteData>) => void
  onBack: () => void
  onSubmit: () => void
}

const FREQUENCY_LABELS: Record<string, string> = {
  'MONTHLY': 'MONTHLY',
  'Monthly': 'Monthly',
  'BILL PER SERVICE': 'Bill Per Service',
  'QUARTERLY': 'QUARTERLY',
  'Quarterly': 'Quarterly',
  'ANNUALLY': 'ANNUALLY',
  'Annually': 'Annually',
  'Semi-Annually (2x)': 'Semi-Annually (2x)',
  'Tri-Annually (3x)': 'Tri-Annually (3x)',
  'Every Other Month (6x)': 'Every Other Month (6x)',
  'Semi-Monthly (24x)': 'Semi-Monthly (24x)',
  'Weekly': 'Weekly',
  'ONETIME': 'One-Time',
  'Every Other Week (26x)': 'Every Other Week (26x)',
  '4 Weeks Per Month (48x)': '4 Weeks Per Month (48x)',
}

export default function QuotePreviewStep({
  quoteData,
  updateQuoteData,
  onBack,
  onSubmit,
}: QuotePreviewStepProps) {
  const [emailBody, setEmailBody] = useState(() => generateEmailBody(quoteData))

  const calculateSubtotal = () => {
    return quoteData.line_items.reduce((sum, item) => sum + item.total, 0)
  }

  const calculateTotalDiscount = () => {
    return quoteData.line_items.reduce((sum, item) => {
      const discount = item.list_price * item.quantity * (item.discount_percent / 100)
      const frequencyMultiplier = getFrequencyMultiplier(item.frequency)
      return sum + discount * frequencyMultiplier
    }, 0)
  }

  const getFrequencyMultiplier = (frequency: string) => {
    const map: Record<string, number> = {
      'MONTHLY': 12,
      'Monthly': 12,
      'BILL PER SERVICE': 1,
      'QUARTERLY': 4,
      'Quarterly': 4,
      'ANNUALLY': 1,
      'Annually': 1,
      'Semi-Annually (2x)': 2,
      'Tri-Annually (3x)': 3,
      'Every Other Month (6x)': 6,
      'Semi-Monthly (24x)': 24,
      'Weekly': 52,
      'ONETIME': 1,
      'Every Other Week (26x)': 26,
      '4 Weeks Per Month (48x)': 48,
    }
    return map[frequency] || 1
  }

  return (
    <div className="space-y-6">
      {/* Customer & Quote Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Company</div>
              <div className="font-semibold">{quoteData.account_name || 'N/A'}</div>
            </div>
            {quoteData.contact_name && (
              <div>
                <div className="text-xs text-muted-foreground">Contact</div>
                <div>{quoteData.contact_name}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Service Location
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="text-xs">
              {quoteData.service_street && <div>{quoteData.service_street}</div>}
              <div>
                {quoteData.service_city}
                {quoteData.service_state && `, ${quoteData.service_state}`}
                {quoteData.service_postal_code && ` ${quoteData.service_postal_code}`}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Quote Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Valid Until</div>
              <div className="font-semibold">
                {new Date(quoteData.valid_until_date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Services</div>
              <div className="font-semibold">{quoteData.line_items.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Line Items
          </CardTitle>
          <CardDescription>Review all services and pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm">
                  <th className="pb-3 font-semibold">Service</th>
                  <th className="pb-3 font-semibold text-center">Qty</th>
                  <th className="pb-3 font-semibold text-center">Frequency</th>
                  <th className="pb-3 font-semibold text-right">List Price</th>
                  <th className="pb-3 font-semibold text-right">Discount</th>
                  <th className="pb-3 font-semibold text-right">Net Price</th>
                  <th className="pb-3 font-semibold text-right">Annual Total</th>
                </tr>
              </thead>
              <tbody>
                {quoteData.line_items.map((item, index) => (
                  <tr key={item.product_id} className="border-b last:border-0">
                    <td className="py-4">
                      <div>
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground">{item.product_code}</div>
                      </div>
                    </td>
                    <td className="py-4 text-center">{item.quantity}</td>
                    <td className="py-4 text-center">
                      <Badge variant="outline" className="text-xs">
                        {FREQUENCY_LABELS[item.frequency]}
                      </Badge>
                    </td>
                    <td className="py-4 text-right">${item.list_price.toFixed(2)}</td>
                    <td className="py-4 text-right text-orange-600 dark:text-orange-400">
                      {item.discount_percent > 0 ? `${item.discount_percent}%` : '-'}
                    </td>
                    <td className="py-4 text-right font-semibold">
                      ${item.net_price.toFixed(2)}
                    </td>
                    <td className="py-4 text-right font-bold">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal (before discounts)</span>
              <span className="font-medium">
                ${(calculateSubtotal() + calculateTotalDiscount()).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Discounts</span>
              <span className="font-medium text-orange-600 dark:text-orange-400">
                -${calculateTotalDiscount().toFixed(2)}
              </span>
            </div>
            <div className="h-px bg-gray-300 dark:bg-gray-700 my-2" />
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Annual Grand Total</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ${calculateSubtotal().toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Body Preview */}
      <Card className="border-2 border-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Preview
          </CardTitle>
          <CardDescription>Auto-generated email body based on selected services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-body">Email Body</Label>
            <Textarea
              id="email-body"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              You can edit this email before sending the quote for signature
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any additional notes or terms for this quote..."
            value={quoteData.notes}
            onChange={(e) => updateQuoteData({ notes: e.target.value })}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" size="lg">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pricing
        </Button>
        <Button onClick={onSubmit} size="lg" className="bg-green-600 hover:bg-green-700">
          <Send className="h-4 w-4 mr-2" />
          Send for Signature
        </Button>
      </div>
    </div>
  )
}

/**
 * Generate email body based on quote data
 * Modeled after Presto-X professional proposal format
 */
function generateEmailBody(quoteData: QuoteData): string {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const total = quoteData.line_items.reduce((sum, item) => sum + item.total, 0)
  const servicesText = quoteData.line_items
    .map(
      (item) =>
        `  • ${item.product_name} (${FREQUENCY_LABELS[item.frequency] || item.frequency}) - $${item.total.toFixed(2)}/year`
    )
    .join('\n')

  return `${today}

${quoteData.contact_name || 'Valued Customer'}
${quoteData.account_name}
${quoteData.service_street ? quoteData.service_street + '\n' : ''}${quoteData.service_city}${quoteData.service_state ? ', ' + quoteData.service_state : ''}${quoteData.service_postal_code ? ', ' + quoteData.service_postal_code : ''}
${quoteData.contact_email || ''}

Dear ${quoteData.contact_name || 'Valued Customer'},

Thank you for the opportunity to share our recommendations in the following service proposal for ${quoteData.account_name}. As the industry leader in commercial pest control, Presto-X will partner with you to protect your brand and the health of your employees, customers, and visitors with a solution designed with your needs in mind.

We pride ourselves in our ability to accomplish this effectively with minimal disruption to your operation, enabling you to focus on your business operations and customers. Our team brings the local and national expertise and resources to begin work immediately with ${quoteData.account_name}.

SERVICES INCLUDED:
${servicesText}

TOTAL ANNUAL INVESTMENT: $${total.toFixed(2)}

This quote is valid until ${new Date(quoteData.valid_until_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.

Our services include:
• Professional service by certified technicians
• Environmentally responsible pest control methods
• Integrated Pest Management (IPM) approach
• Comprehensive documentation and reporting
• 24/7 emergency response available
• Satisfaction guaranteed

To proceed with this quote, please review and electronically sign the agreement.

If you have any questions or require further information, don't hesitate to contact me.

Sincerely,
[Your Name]
Presto-X
[Your Phone]
[Your Email]

---
This quote was generated through Rentokil BI Quote Builder`
}
