'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  FileText,
  Save,
  X,
  AlertCircle,
  Upload,
  Package,
  Wrench,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { addNewStart } from '@/lib/new-start-data'
import {
  NewStartAEInput,
  ServiceType,
  FrequencyType,
  YesNo,
  MonthName,
} from '@/types/new-start-log'
import { FileUploadZone } from '@/components/features/FileUploadZone'
import { ParsedDataPreview } from '@/components/features/ParsedDataPreview'
import { StartPacketPreview } from '@/components/features/StartPacketPreview'
import {
  extractTextFromPdf,
  parseSalesforceQuote,
  validateParsedDraft,
  mapToNewStartInput,
} from '@/lib/salesforce-parser'
import type {
  SalesforceQuoteDraft,
  ParseStatus,
  ParseValidationResult,
  ParsedEquipment,
  ParsedService,
  StartPacket,
  OpsEmailResponse,
} from '@/types/salesforce-quote'
import { toastSuccess, toastError } from '@/hooks/use-toast'

const MONTHS: MonthName[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const FREQUENCIES: { value: FrequencyType; label: string }[] = [
  { value: '1', label: '1x (One-Time)' },
  { value: '2', label: '2x per year' },
  { value: '4', label: '4x per year (Quarterly)' },
  { value: '6', label: '6x per year (Bi-Monthly)' },
  { value: '12', label: '12x per year (Monthly)' },
  { value: '24', label: '24x per year (Bi-Weekly)' },
]

export default function NewStartEntryPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Salesforce parser state
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle')
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsedDraft, setParsedDraft] = useState<SalesforceQuoteDraft | null>(null)
  const [validation, setValidation] = useState<ParseValidationResult | null>(null)
  const [showImportSection, setShowImportSection] = useState(true)
  const [showParsedPreview, setShowParsedPreview] = useState(false)

  // Equipment and services from parsed data (for display)
  const [equipment, setEquipment] = useState<ParsedEquipment | null>(null)
  const [services, setServices] = useState<ParsedService[]>([])
  const [showEquipmentDetails, setShowEquipmentDetails] = useState(false)

  // Start Packet preview modal state
  const [showStartPacketPreview, setShowStartPacketPreview] = useState(false)

  const [formData, setFormData] = useState<NewStartAEInput>({
    soldDate: new Date().toISOString().split('T')[0],
    accountName: '',
    serviceAddress: '',
    salesRepsInvolved: '',
    initialJobPrice: '',
    maintenancePrice: '',
    serviceType: '',
    frequency: '',
    logBookNeeded: '',
    tapLeadOrSpecialist: '',
    pestPacLocNumber: '',
    customerRequestedStartMonth: '',
  })

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
      setShowImportSection(false)

      toastSuccess('Quote Parsed', 'Review the extracted data below')
    } catch (err) {
      console.error('[Salesforce Parser] Error:', err)
      setParseStatus('error')
      setParseError(err instanceof Error ? err.message : 'Failed to parse PDF')
      toastError('Parse Failed', err instanceof Error ? err.message : 'Unable to extract data from PDF')
    }
  }, [])

  // Apply parsed data to form
  const applyDraftToForm = useCallback(() => {
    if (!parsedDraft) return

    const mappedFields = mapToNewStartInput(parsedDraft)

    setFormData(prev => ({
      ...prev,
      accountName: mappedFields.accountName || prev.accountName,
      serviceAddress: mappedFields.serviceAddress || prev.serviceAddress,
      salesRepsInvolved: mappedFields.salesRepsInvolved || prev.salesRepsInvolved,
      initialJobPrice: mappedFields.initialJobPrice || prev.initialJobPrice,
      maintenancePrice: mappedFields.maintenancePrice || prev.maintenancePrice,
      serviceType: (mappedFields.serviceType || prev.serviceType) as ServiceType | '',
      frequency: (mappedFields.frequency || prev.frequency) as FrequencyType | '',
      logBookNeeded: (mappedFields.logBookNeeded || prev.logBookNeeded) as YesNo | '',
      customerRequestedStartMonth: (mappedFields.customerRequestedStartMonth || prev.customerRequestedStartMonth) as MonthName | '',
    }))

    // Store equipment and services for display
    setEquipment(parsedDraft.equipment)
    setServices(parsedDraft.services)
    setShowEquipmentDetails(true)

    setShowParsedPreview(false)
    toastSuccess('Form Updated', 'Data applied to form fields')
  }, [parsedDraft])

  // Discard parsed data and start over
  const discardParsedData = useCallback(() => {
    setParsedDraft(null)
    setValidation(null)
    setParseStatus('idle')
    setParseError(null)
    setShowParsedPreview(false)
    setShowImportSection(true)
    setEquipment(null)
    setServices([])
  }, [])

  // Validate form data
  const validateForm = useCallback((): string | null => {
    if (!formData.accountName.trim()) {
      return 'Account name is required'
    }
    if (!formData.serviceAddress.trim()) {
      return 'Service address is required'
    }
    if (!formData.serviceType) {
      return 'Service type is required'
    }
    if (!formData.pestPacLocNumber.trim()) {
      return 'PestPac Location # is required'
    }

    const initialPrice = parseFloat(formData.initialJobPrice) || 0
    const maintenancePrice = parseFloat(formData.maintenancePrice) || 0

    if (initialPrice === 0 && maintenancePrice === 0) {
      return 'At least one price is required'
    }

    return null
  }, [formData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    // If we have parsed data from Salesforce, show the Start Packet preview
    if (parsedDraft) {
      setShowStartPacketPreview(true)
      return
    }

    // Otherwise, do the simple submission (no Start Packet)
    setIsSubmitting(true)

    try {
      const initialPrice = parseFloat(formData.initialJobPrice) || 0
      const maintenancePrice = parseFloat(formData.maintenancePrice) || 0

      // Add the new start
      addNewStart({
        soldDate: formData.soldDate,
        accountName: formData.accountName.trim(),
        serviceAddress: formData.serviceAddress.trim(),
        salesRepsInvolved: formData.salesRepsInvolved.trim() || 'Cody',
        initialJobPrice: initialPrice,
        maintenancePrice: maintenancePrice,
        serviceType: formData.serviceType as ServiceType,
        frequency: formData.frequency || '1',
        logBookNeeded: formData.logBookNeeded || 'N',
        tapLeadOrSpecialist: formData.tapLeadOrSpecialist.trim(),
        pestPacLocNumber: formData.pestPacLocNumber.trim(),
        customerRequestedStartMonth: formData.customerRequestedStartMonth || '',
      })

      toastSuccess('Sale Submitted', 'New start entry created successfully')
      router.push('/ae/new-starts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle successful Start Packet submission
  const handleStartPacketSubmit = useCallback((packet: StartPacket, emailResult: OpsEmailResponse) => {
    const initialPrice = parseFloat(formData.initialJobPrice) || 0
    const maintenancePrice = parseFloat(formData.maintenancePrice) || 0

    // Also add to the local new-start log
    addNewStart({
      soldDate: formData.soldDate,
      accountName: formData.accountName.trim(),
      serviceAddress: formData.serviceAddress.trim(),
      salesRepsInvolved: formData.salesRepsInvolved.trim() || 'Cody',
      initialJobPrice: initialPrice,
      maintenancePrice: maintenancePrice,
      serviceType: formData.serviceType as ServiceType,
      frequency: formData.frequency || '1',
      logBookNeeded: formData.logBookNeeded || 'N',
      tapLeadOrSpecialist: formData.tapLeadOrSpecialist.trim(),
      pestPacLocNumber: formData.pestPacLocNumber.trim(),
      customerRequestedStartMonth: formData.customerRequestedStartMonth || '',
    })

    toastSuccess(
      'Start Packet Submitted',
      emailResult.actualEmailSent
        ? 'Operations has been notified via email'
        : 'Operations notification simulated (demo mode)'
    )
  }, [formData])

  // Close preview and navigate back
  const handlePreviewClose = useCallback(() => {
    setShowStartPacketPreview(false)
    // If submission was successful (packet exists), navigate away
    router.push('/ae/new-starts')
  }, [router])

  const totalValue =
    (parseFloat(formData.initialJobPrice) || 0) +
    (parseFloat(formData.maintenancePrice) || 0) * 12

  const hasEquipment = equipment && (
    equipment.multCatchQty > 0 ||
    equipment.rbsQty > 0 ||
    equipment.iltQty > 0
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/ae/new-starts">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Start Entry</h1>
          <p className="text-gray-500 dark:text-gray-400">Log a new sale for Operations handoff</p>
        </div>
      </div>

      {/* Salesforce Import Section */}
      {showImportSection && !showParsedPreview && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-blue-900 dark:text-blue-100">Import from Salesforce</CardTitle>
                  <CardDescription className="text-blue-700 dark:text-blue-300">
                    Upload a Salesforce quote PDF to auto-fill the form
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImportSection(false)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Skip
              </Button>
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
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Parsed Quote Data
            </CardTitle>
            <CardDescription>
              Review the extracted data before applying to the form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ParsedDataPreview
              draft={parsedDraft}
              validation={validation || undefined}
              onApply={applyDraftToForm}
              onDiscard={discardParsedData}
            />
          </CardContent>
        </Card>
      )}

      {/* Show import again button if hidden */}
      {!showImportSection && !showParsedPreview && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowImportSection(true)}
          className="w-full border-dashed"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import from Salesforce Quote PDF
        </Button>
      )}

      {/* Info Banner */}
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">Sales (RED) Fields</p>
            <p className="text-sm text-red-700 dark:text-red-300">
              Fill in all fields below. Operations will complete their section after you submit.
            </p>
          </div>
        </div>
      </div>

      {/* Equipment & Services Display (from parsed data) */}
      {hasEquipment && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <button
              type="button"
              onClick={() => setShowEquipmentDetails(!showEquipmentDetails)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-purple-900 dark:text-purple-100">Equipment & Services</CardTitle>
                  <CardDescription className="text-purple-700 dark:text-purple-300">
                    {equipment?.summary || 'Imported from Salesforce quote'}
                  </CardDescription>
                </div>
              </div>
              {showEquipmentDetails ? (
                <ChevronUp className="h-5 w-5 text-purple-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-purple-500" />
              )}
            </button>
          </CardHeader>
          {showEquipmentDetails && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4">
                {/* Equipment */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Equipment
                  </h4>
                  <div className="space-y-1">
                    {equipment && equipment.multCatchQty > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Multi-Catch Traps (MRT)</span>
                        <Badge variant="outline">{equipment.multCatchQty}</Badge>
                      </div>
                    )}
                    {equipment && equipment.rbsQty > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Rodent Bait Stations (RBS)</span>
                        <Badge variant="outline">{equipment.rbsQty}</Badge>
                      </div>
                    )}
                    {equipment && equipment.iltQty > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Insect Light Traps (ILT)</span>
                        <Badge variant="outline">{equipment.iltQty}</Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Services
                  </h4>
                  <div className="space-y-1">
                    {services.map((svc, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{svc.serviceName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {svc.frequencyLabel}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle>Sale Details</CardTitle>
                  <CardDescription>Account Executive section</CardDescription>
                </div>
              </div>
              {totalValue > 0 && (
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  Total: ${totalValue.toLocaleString()}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center justify-between">
                <span>{error}</span>
                <button type="button" onClick={() => setError(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Date & Account */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sold Date *</label>
                <Input
                  type="date"
                  value={formData.soldDate}
                  onChange={(e) => setFormData({ ...formData, soldDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Name *</label>
                <Input
                  placeholder="Company or customer name"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Service Address *</label>
              <Input
                placeholder="Full address including city and zip"
                value={formData.serviceAddress}
                onChange={(e) => setFormData({ ...formData, serviceAddress: e.target.value })}
                required
              />
            </div>

            {/* Sales Rep */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sales Rep(s) Involved</label>
              <Input
                placeholder="Your name or multiple reps"
                value={formData.salesRepsInvolved}
                onChange={(e) => setFormData({ ...formData, salesRepsInvolved: e.target.value })}
              />
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 border-b dark:border-gray-700 pb-2">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Initial / Job 1X Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-7"
                      value={formData.initialJobPrice}
                      onChange={(e) => setFormData({ ...formData, initialJobPrice: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Including merchandise</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Maintenance (Contract) Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-7"
                      value={formData.maintenancePrice}
                      onChange={(e) => setFormData({ ...formData, maintenancePrice: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monthly contract rate</p>
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 border-b dark:border-gray-700 pb-2">Service Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type *</label>
                  <Select
                    value={formData.serviceType}
                    onValueChange={(value) => setFormData({ ...formData, serviceType: value as ServiceType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Contract or Job 1x" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Job 1x">Job 1x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Frequency</label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value as FrequencyType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="# of annual visits" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Log Book Needed</label>
                  <Select
                    value={formData.logBookNeeded}
                    onValueChange={(value) => setFormData({ ...formData, logBookNeeded: value as YesNo })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Yes or No" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Y">Yes</SelectItem>
                      <SelectItem value="N">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">TAP Lead / Specialist Name</label>
                  <Input
                    placeholder="If applicable"
                    value={formData.tapLeadOrSpecialist}
                    onChange={(e) => setFormData({ ...formData, tapLeadOrSpecialist: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* PestPac & Scheduling */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 border-b dark:border-gray-700 pb-2">System & Scheduling</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">PestPac Location # *</label>
                  <Input
                    placeholder="Copy from PestPac"
                    value={formData.pestPacLocNumber}
                    onChange={(e) => setFormData({ ...formData, pestPacLocNumber: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Blue number from PestPac</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Requested Start Month</label>
                  <Select
                    value={formData.customerRequestedStartMonth}
                    onValueChange={(value) => setFormData({ ...formData, customerRequestedStartMonth: value as MonthName })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
              <Button type="button" variant="outline" asChild>
                <Link href="/ae/new-starts">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
                {isSubmitting ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Submit to Operations
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Info */}
      <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
        <CardContent className="pt-6">
          <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">What happens next?</h4>
          <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
            <li>1. Your entry appears in the New Start Log with status &quot;Pending Ops&quot;</li>
            <li>2. Operations Manager assigns a specialist and schedules the start date</li>
            <li>3. You can track progress from your New Starts page</li>
          </ul>
        </CardContent>
      </Card>

      {/* Start Packet Preview Modal */}
      {parsedDraft && (
        <StartPacketPreview
          draft={parsedDraft}
          formData={{
            accountName: formData.accountName,
            serviceAddress: formData.serviceAddress,
            salesRepsInvolved: formData.salesRepsInvolved,
            initialJobPrice: formData.initialJobPrice,
            maintenancePrice: formData.maintenancePrice,
            serviceType: formData.serviceType,
            frequency: formData.frequency,
          }}
          onSubmit={handleStartPacketSubmit}
          onCancel={handlePreviewClose}
          isOpen={showStartPacketPreview}
        />
      )}
    </div>
  )
}
