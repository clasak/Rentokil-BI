'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Upload,
  DollarSign,
  Package,
  Wrench,
  AlertCircle,
} from 'lucide-react'
import { FileUploadZone } from '@/components/features/FileUploadZone'
import { ParsedDataPreview } from '@/components/features/ParsedDataPreview'
import { StartPacketPreview } from '@/components/features/StartPacketPreview'
import {
  extractTextFromPdf,
  parseSalesforceQuote,
  validateParsedDraft,
  mapToProposal,
  mapToSale,
  mapToNewStartInput,
} from '@/lib/salesforce-parser'
import { addProposal, addSale } from '@/lib/sales-tracker-data'
import { addNewStart } from '@/lib/new-start-data'
import type {
  SalesforceQuoteDraft,
  ParseStatus,
  ParseValidationResult,
  StartPacket,
  OpsEmailResponse,
} from '@/types/salesforce-quote'
import type { ServiceType, FrequencyType } from '@/types/new-start-log'
import { toastSuccess, toastError } from '@/hooks/use-toast'

type ImportMode = 'proposal' | 'sale'

export default function ImportQuotePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ImportMode>('proposal')

  // Parser state
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle')
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsedDraft, setParsedDraft] = useState<SalesforceQuoteDraft | null>(null)
  const [validation, setValidation] = useState<ParseValidationResult | null>(null)
  const [showParsedPreview, setShowParsedPreview] = useState(false)

  // Start Packet modal state (for sales)
  const [showStartPacketPreview, setShowStartPacketPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle PDF file upload and parsing
  const handlePdfUpload = useCallback(async (file: File) => {
    setParseStatus('loading')
    setParseError(null)
    setParsedDraft(null)
    setValidation(null)

    try {
      // Extract text from PDF
      const text = await extractTextFromPdf(file)

      // Store for debugging
      if (typeof window !== 'undefined') {
        (window as unknown as Record<string, unknown>).__lastSalesforceQuoteText = text
      }

      // Parse the extracted text
      const draft = parseSalesforceQuote(text)
      const validationResult = validateParsedDraft(draft)

      setParsedDraft(draft)
      setValidation(validationResult)
      setParseStatus('success')
      setShowParsedPreview(true)

      toastSuccess('Quote Parsed', 'Review the extracted data below')
    } catch (err) {
      console.error('[Salesforce Parser] Error:', err)
      setParseStatus('error')
      setParseError(err instanceof Error ? err.message : 'Failed to parse PDF')
      toastError('Parse Failed', err instanceof Error ? err.message : 'Unable to extract data from PDF')
    }
  }, [])

  // Discard parsed data and start over
  const discardParsedData = useCallback(() => {
    setParsedDraft(null)
    setValidation(null)
    setParseStatus('idle')
    setParseError(null)
    setShowParsedPreview(false)
  }, [])

  // Handle adding as proposal
  const handleAddAsProposal = useCallback(() => {
    if (!parsedDraft) return

    setIsSubmitting(true)
    try {
      const currentMonth = new Date().getMonth()
      const proposalData = mapToProposal(parsedDraft)
      addProposal(currentMonth, proposalData)

      toastSuccess('Proposal Added', `${parsedDraft.accountName} added to proposals`)
      router.push('/ae/tracker/proposals')
    } catch (err) {
      toastError('Error', err instanceof Error ? err.message : 'Failed to add proposal')
    } finally {
      setIsSubmitting(false)
    }
  }, [parsedDraft, router])

  // Handle adding as sale - shows Start Packet preview
  const handleAddAsSale = useCallback(() => {
    if (!parsedDraft) return
    setShowStartPacketPreview(true)
  }, [parsedDraft])

  // Handle successful Start Packet submission
  const handleStartPacketSubmit = useCallback((packet: StartPacket, emailResult: OpsEmailResponse) => {
    if (!parsedDraft) return

    const currentMonth = new Date().getMonth()

    // Add to sales tracker
    const saleData = mapToSale(parsedDraft)
    addSale(currentMonth, saleData)

    // Add to new start log
    const newStartData = mapToNewStartInput(parsedDraft)
    addNewStart({
      soldDate: new Date().toISOString().split('T')[0],
      accountName: newStartData.accountName || '',
      serviceAddress: newStartData.serviceAddress || '',
      salesRepsInvolved: newStartData.salesRepsInvolved || '',
      initialJobPrice: parseFloat(newStartData.initialJobPrice || '0'),
      maintenancePrice: parseFloat(newStartData.maintenancePrice || '0'),
      serviceType: (newStartData.serviceType || 'Contract') as ServiceType,
      frequency: (newStartData.frequency || '12') as FrequencyType,
      logBookNeeded: newStartData.logBookNeeded || 'N',
      tapLeadOrSpecialist: '',
      pestPacLocNumber: '',
      customerRequestedStartMonth: newStartData.customerRequestedStartMonth || '',
    })

    toastSuccess(
      'Sale Logged & Start Packet Created',
      emailResult.actualEmailSent
        ? 'Operations has been notified via email'
        : 'Operations notification simulated (demo mode)'
    )

    setShowStartPacketPreview(false)
    router.push('/ae/new-starts')
  }, [parsedDraft, router])

  // Close Start Packet preview
  const handlePreviewClose = useCallback(() => {
    setShowStartPacketPreview(false)
  }, [])

  // Format currency for display
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/ae">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Import Salesforce Quote</h1>
          <p className="text-gray-500 dark:text-gray-400">Upload a PDF to create a proposal or log a sale</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ImportMode)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="proposal" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Proposal
          </TabsTrigger>
          <TabsTrigger value="sale" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Sale
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposal" className="space-y-4 mt-4">
          {/* Proposal Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">Track a Proposal</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Add this quote to your proposals tracker. Mark it as &quot;Sold&quot; later when the deal closes.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sale" className="space-y-4 mt-4">
          {/* Sale Info Banner */}
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Log a Sale</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  This deal is sold! It will be added to your sales tracker and a Start Packet will be created for Operations.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Section - Shows when no data parsed yet */}
      {!showParsedPreview && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Upload Quote PDF</CardTitle>
                <CardDescription>
                  Drop your Salesforce quote PDF or click to browse
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FileUploadZone
              onFileSelect={handlePdfUpload}
              accept=".pdf"
              maxSize={10}
              isLoading={parseStatus === 'loading'}
              error={parseError}
              success={parseStatus === 'success'}
              successMessage="Quote extracted successfully"
            />
          </CardContent>
        </Card>
      )}

      {/* Parsed Data Preview */}
      {showParsedPreview && parsedDraft && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle>Parsed Quote Data</CardTitle>
                  <CardDescription>
                    Review the extracted data before adding as {activeTab}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {formatCurrency(
                  (parsedDraft.combinedInitialTotal || 0) +
                  (parsedDraft.servicesMonthlyTotal || 0) * 12
                )} ACV
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Account</p>
                <p className="font-medium truncate">{parsedDraft.accountName || '—'}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Initial</p>
                <p className="font-medium">{formatCurrency(parsedDraft.combinedInitialTotal)}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Monthly</p>
                <p className="font-medium">{formatCurrency(parsedDraft.servicesMonthlyTotal)}/mo</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Equipment</p>
                <p className="font-medium truncate">{parsedDraft.equipment.summary || 'None'}</p>
              </div>
            </div>

            {/* Full Preview */}
            <ParsedDataPreview
              draft={parsedDraft}
              validation={validation || undefined}
              onApply={activeTab === 'proposal' ? handleAddAsProposal : handleAddAsSale}
              onDiscard={discardParsedData}
            />

            {/* Custom Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={discardParsedData}>
                Start Over
              </Button>
              {activeTab === 'proposal' ? (
                <Button
                  onClick={handleAddAsProposal}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Adding...' : 'Add as Proposal'}
                </Button>
              ) : (
                <Button
                  onClick={handleAddAsSale}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Processing...' : 'Log as Sale'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* What happens next info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-medium text-foreground mb-3">
            {activeTab === 'proposal' ? 'What happens when you add a Proposal?' : 'What happens when you log a Sale?'}
          </h4>
          {activeTab === 'proposal' ? (
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>1. Quote details are added to your Monthly Proposals tracker</li>
              <li>2. Track it in your pipeline until you close the deal</li>
              <li>3. Mark as &quot;Sold&quot; to convert it to a sale and trigger Ops handoff</li>
            </ul>
          ) : (
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>1. Sale is added to your Monthly Sales tracker</li>
              <li>2. A Start Packet is automatically created for Operations</li>
              <li>3. Operations receives notification to schedule the service start</li>
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Start Packet Preview Modal (for sales) */}
      {parsedDraft && (
        <StartPacketPreview
          draft={parsedDraft}
          formData={{
            accountName: parsedDraft.accountName || '',
            serviceAddress: parsedDraft.serviceAddress || '',
            salesRepsInvolved: parsedDraft.aeName || '',
            initialJobPrice: String(parsedDraft.combinedInitialTotal || 0),
            maintenancePrice: String(parsedDraft.servicesMonthlyTotal || 0),
            serviceType: parsedDraft.jobType === 'Contract' ? 'Contract' : 'Job 1x',
            frequency: '12',
          }}
          onSubmit={handleStartPacketSubmit}
          onCancel={handlePreviewClose}
          isOpen={showStartPacketPreview}
        />
      )}
    </div>
  )
}
