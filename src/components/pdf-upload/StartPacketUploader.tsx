"use client"

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Building2,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Wrench,
  Calendar,
  User,
  ClipboardList,
  Loader2,
  RefreshCw,
  ChevronRight,
  Info,
} from 'lucide-react'
import type { PDFUploadResult, ParsedStartPacket, ExtractionConfidence } from '@/services/pdf-parser/types'

interface StartPacketUploaderProps {
  onComplete?: (result: PDFUploadResult) => void
  onCreateNewStart?: (data: ParsedStartPacket) => void
  onCreateSale?: (data: ParsedStartPacket) => void
}

export function StartPacketUploader({
  onComplete,
  onCreateNewStart,
  onCreateSale,
}: StartPacketUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<PDFUploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setSelectedFile(file)
    setError(null)
    setResult(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('autoCorrect', 'true')

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      })

      const data: PDFUploadResult = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to parse PDF')
      } else {
        setResult(data)
        onComplete?.(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }, [onComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  })

  const handleReset = () => {
    setSelectedFile(null)
    setResult(null)
    setError(null)
  }

  const handleDemoUpload = async (scenario: 'commercial' | 'residential' | 'termite') => {
    setError(null)
    setResult(null)
    setUploading(true)

    try {
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useMock: true, mockScenario: scenario }),
      })

      const data: PDFUploadResult = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to parse PDF')
      } else {
        setResult(data)
        onComplete?.(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo data')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      {!result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Start Packet PDF
            </CardTitle>
            <CardDescription>
              Drop a Start Packet PDF to automatically extract customer information, equipment details, and pricing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
                ${uploading ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">Processing PDF...</p>
                </div>
              ) : isDragActive ? (
                <div className="flex flex-col items-center gap-3">
                  <FileText className="h-12 w-12 text-primary" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">Drop the PDF here...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-12 w-12 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Drag and drop a PDF, or click to browse
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Maximum file size: 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Upload Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Separator className="my-6" />

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                Or try a demo scenario:
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoUpload('commercial')}
                  disabled={uploading}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Commercial Account
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoUpload('residential')}
                  disabled={uploading}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Residential
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoUpload('termite')}
                  disabled={uploading}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Termite Treatment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && result.parsedData && (
        <>
          {/* Confidence Banner */}
          <Card className={
            result.parsedData.meta.overallConfidence === 'high' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
            result.parsedData.meta.overallConfidence === 'medium' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' :
            'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          }>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {result.parsedData.meta.overallConfidence === 'high' ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : result.parsedData.meta.overallConfidence === 'medium' ? (
                    <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-500" />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg dark:text-gray-100">
                      {result.parsedData.meta.overallConfidence === 'high' ? 'Extraction Successful' :
                       result.parsedData.meta.overallConfidence === 'medium' ? 'Extraction Complete - Review Recommended' :
                       'Low Confidence Extraction'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {result.parsedData.meta.pdfFileName} • {result.parsedData.meta.pdfPageCount} page(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ConfidenceBadge confidence={result.parsedData.meta.overallConfidence} />
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Upload Another
                  </Button>
                </div>
              </div>

              {result.parsedData.meta.warnings.length > 0 && (
                <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border dark:border-gray-700">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1">Warnings:</p>
                  <ul className="text-sm text-yellow-600 dark:text-yellow-500 space-y-1">
                    {result.parsedData.meta.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extracted Data Tabs */}
          <Card>
            <Tabs defaultValue="customer" className="w-full">
              <CardHeader className="pb-0">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="customer">Customer</TabsTrigger>
                  <TabsTrigger value="equipment">Equipment</TabsTrigger>
                  <TabsTrigger value="service">Service</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="pt-6">
                <TabsContent value="customer" className="mt-0">
                  <CustomerSection data={result.parsedData} />
                </TabsContent>

                <TabsContent value="equipment" className="mt-0">
                  <EquipmentSection data={result.parsedData} />
                </TabsContent>

                <TabsContent value="service" className="mt-0">
                  <ServiceSection data={result.parsedData} />
                </TabsContent>

                <TabsContent value="pricing" className="mt-0">
                  <PricingSection data={result.parsedData} />
                </TabsContent>

                <TabsContent value="actions" className="mt-0">
                  <ActionsSection
                    result={result}
                    onCreateNewStart={onCreateNewStart}
                    onCreateSale={onCreateSale}
                  />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </>
      )}
    </div>
  )
}

// Confidence Badge Component
function ConfidenceBadge({ confidence }: { confidence: ExtractionConfidence }) {
  return (
    <Badge
      variant={confidence === 'high' ? 'default' : confidence === 'medium' ? 'secondary' : 'destructive'}
      className={
        confidence === 'high' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
        confidence === 'medium' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' :
        'bg-red-100 text-red-700 hover:bg-red-100'
      }
    >
      {confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence
    </Badge>
  )
}

// Customer Section
function CustomerSection({ data }: { data: ParsedStartPacket }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Customer Name</span>
          </div>
          <p className="font-medium dark:text-gray-100">{data.customer.name}</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Vertical</span>
          </div>
          <p className="font-medium dark:text-gray-100">{data.customer.vertical || 'Not specified'}</p>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Service Address</span>
        </div>
        <p className="font-medium dark:text-gray-100">
          {data.customer.address.street}<br />
          {data.customer.address.city}, {data.customer.address.state} {data.customer.address.zip}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Contact Name</span>
          </div>
          <p className="font-medium dark:text-gray-100">{data.customer.contactName || '—'}</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Phone</span>
          </div>
          <p className="font-medium dark:text-gray-100">{data.customer.contactPhone || '—'}</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
          </div>
          <p className="font-medium dark:text-gray-100 break-all">{data.customer.contactEmail || '—'}</p>
        </div>
      </div>
    </div>
  )
}

// Equipment Section
function EquipmentSection({ data }: { data: ParsedStartPacket }) {
  const equipment = [
    { label: 'Road Stations', value: data.equipment.roadStations, icon: '🚧' },
    { label: 'Bay Stations', value: data.equipment.bayStations, icon: '🏭' },
    { label: 'Fly Lights', value: data.equipment.flyLights, icon: '💡' },
    { label: 'Bait Boxes', value: data.equipment.baitBoxes, icon: '📦' },
    { label: 'Glue Boards', value: data.equipment.glueBoards, icon: '📋' },
  ]

  const totalEquipment = equipment.reduce((sum, e) => sum + e.value, 0)

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{totalEquipment}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Equipment Items</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {equipment.map((item) => (
          <div key={item.label} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <span className="text-2xl">{item.icon}</span>
            <p className="text-2xl font-bold mt-2 dark:text-gray-100">{item.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
          </div>
        ))}
      </div>

      {data.equipment.otherEquipment && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Other Equipment</p>
          <p className="dark:text-gray-100">{data.equipment.otherEquipment}</p>
        </div>
      )}
    </div>
  )
}

// Service Section
function ServiceSection({ data }: { data: ParsedStartPacket }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Service Type</span>
          </div>
          <p className="font-medium capitalize dark:text-gray-100">{data.service.type.replace('_', ' ')}</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Service Frequency</span>
          </div>
          <p className="font-medium capitalize dark:text-gray-100">{data.service.frequency}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Preferred Day</p>
          <p className="font-medium dark:text-gray-100">{data.service.preferredDay || '—'}</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Preferred Time</p>
          <p className="font-medium dark:text-gray-100">{data.service.preferredTime || '—'}</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Start Date</p>
          <p className="font-medium dark:text-gray-100">{data.service.startDate || '—'}</p>
        </div>
      </div>

      {data.service.specialInstructions && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1">Special Instructions</p>
          <p className="text-yellow-600 dark:text-yellow-500">{data.service.specialInstructions}</p>
        </div>
      )}

      {data.sales.salesRepName && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Sales Representative</span>
          </div>
          <p className="font-medium dark:text-gray-100">{data.sales.salesRepName}</p>
          {data.sales.proposalDate && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Proposal Date: {data.sales.proposalDate}</p>
          )}
        </div>
      )}
    </div>
  )
}

// Pricing Section
function PricingSection({ data }: { data: ParsedStartPacket }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const totalInitial = data.pricing.initialTreatment + data.pricing.setupFee + (data.pricing.termiteInspection || 0)
  const annualValue = data.pricing.monthlyContract * 12

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">Initial Revenue</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(totalInitial)}</p>
        </div>

        {data.pricing.monthlyContract > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Annual Contract Value</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(annualValue)}</p>
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Pricing Breakdown</p>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Initial Treatment</span>
            <span className="font-medium dark:text-gray-100">{formatCurrency(data.pricing.initialTreatment)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Setup Fee</span>
            <span className="font-medium dark:text-gray-100">{formatCurrency(data.pricing.setupFee)}</span>
          </div>
          {data.pricing.termiteInspection && data.pricing.termiteInspection > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Termite Inspection</span>
              <span className="font-medium dark:text-gray-100">{formatCurrency(data.pricing.termiteInspection)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Monthly Contract</span>
            <span className="font-medium dark:text-gray-100">{formatCurrency(data.pricing.monthlyContract)}/mo</span>
          </div>
          {data.pricing.annualRenewal && data.pricing.annualRenewal > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Annual Renewal</span>
              <span className="font-medium dark:text-gray-100">{formatCurrency(data.pricing.annualRenewal)}/yr</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Actions Section
function ActionsSection({
  result,
  onCreateNewStart,
  onCreateSale,
}: {
  result: PDFUploadResult
  onCreateNewStart?: (data: ParsedStartPacket) => void
  onCreateSale?: (data: ParsedStartPacket) => void
}) {
  const mapping = result.newStartMapping
  const salesMapping = result.salesTrackerMapping

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Ready to Create Records</AlertTitle>
        <AlertDescription>
          Review the extracted data above, then choose how to proceed. Data will be pre-filled in the target forms.
        </AlertDescription>
      </Alert>

      {/* New Start Log Action */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium dark:text-gray-100">Create New Start Entry</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add to New Start Log for Operations handoff
              </p>
              {mapping && mapping.warnings.length > 0 && (
                <div className="mt-2">
                  {mapping.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-yellow-600 dark:text-yellow-500">⚠️ {w}</p>
                  ))}
                </div>
              )}
            </div>
            <Button
              onClick={() => result.parsedData && onCreateNewStart?.(result.parsedData)}
              disabled={!mapping?.success}
              className="gap-2"
            >
              Create New Start
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales Tracker Action */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium dark:text-gray-100">Log in Sales Tracker</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Record as a sale in your personal tracker
              </p>
              {salesMapping && salesMapping.warnings.length > 0 && (
                <div className="mt-2">
                  {salesMapping.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-yellow-600 dark:text-yellow-500">⚠️ {w}</p>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => result.parsedData && onCreateSale?.(result.parsedData)}
              disabled={!salesMapping?.success}
              className="gap-2"
            >
              Log Sale
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Summary */}
      {result.validation && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Validation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {result.validation.isValid ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-700 dark:text-green-400">All required fields validated</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700 dark:text-red-400">{result.validation.errors.length} validation error(s)</span>
                </>
              )}
            </div>
            {result.validation.errors.length > 0 && (
              <ul className="mt-2 text-sm text-red-600 dark:text-red-400 space-y-1">
                {result.validation.errors.map((e, i) => (
                  <li key={i}>• {e.field}: {e.message}</li>
                ))}
              </ul>
            )}
            {result.validation.warnings.length > 0 && (
              <ul className="mt-2 text-sm text-yellow-600 dark:text-yellow-500 space-y-1">
                {result.validation.warnings.map((w, i) => (
                  <li key={i}>• {w.field}: {w.message}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
