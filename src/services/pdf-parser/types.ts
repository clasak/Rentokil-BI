/**
 * PDF Parser Types
 *
 * Types for parsing Start Packet PDFs and mapping to internal types.
 */

// Confidence scoring for extraction quality
export type ExtractionConfidence = 'high' | 'medium' | 'low'

// Parsed Start Packet data structure
export interface ParsedStartPacket {
  // Customer Information
  customer: {
    name: string
    address: {
      street: string
      city: string
      state: string
      zip: string
    }
    contactName?: string
    contactPhone?: string
    contactEmail?: string
    vertical?: 'Commercial' | 'Residential' | 'Government' | 'Healthcare' | 'Food Service'
  }

  // Equipment Details
  equipment: {
    exteriorRBS: number
    interiorRBS: number
    flyLights: number
    baitBoxes: number
    glueBoards: number
    otherEquipment?: string
  }

  // Service Details
  service: {
    type: 'general' | 'termite' | 'rodent' | 'mosquito' | 'bed_bug' | 'wildlife' | 'fumigation'
    frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'on-demand'
    preferredDay?: string
    preferredTime?: string
    specialInstructions?: string
    startDate?: string
  }

  // Pricing
  pricing: {
    monthlyContract: number
    setupFee: number
    initialTreatment: number
    termiteInspection?: number
    annualRenewal?: number
  }

  // Sales Information
  sales: {
    salesRepName?: string
    salesRepId?: string
    proposalDate?: string
    saleDate?: string
    branchId?: string
    leadSource?: string
  }

  // Metadata
  meta: {
    extractedAt: string
    pdfFileName: string
    pdfPageCount: number
    overallConfidence: ExtractionConfidence
    fieldConfidences: Record<string, ExtractionConfidence>
    warnings: string[]
  }
}

// Field extraction result with confidence
export interface ExtractedField<T> {
  value: T
  confidence: ExtractionConfidence
  rawText?: string
  matchedPattern?: string
}

// Validation result for a parsed start packet
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  severity: 'error'
}

export interface ValidationWarning {
  field: string
  message: string
  severity: 'warning'
  suggestedValue?: string
}

// Mapping result to Sales Tracker entry
export interface SalesTrackerMapping {
  success: boolean
  entry?: Partial<import('@/types/sales-tracker').Sale>
  errors: string[]
  warnings: string[]
}

// Mapping result to New Start Log entry
export interface NewStartMapping {
  success: boolean
  entry?: Partial<import('@/types/new-start-log').NewStartEntry>
  errors: string[]
  warnings: string[]
}

// PDF upload result
export interface PDFUploadResult {
  success: boolean
  parsedData?: ParsedStartPacket
  validation?: ValidationResult
  salesTrackerMapping?: SalesTrackerMapping
  newStartMapping?: NewStartMapping
  error?: string
}

// Parser options
export interface ParserOptions {
  // Skip validation
  skipValidation?: boolean
  // Minimum confidence threshold (0-1)
  minConfidence?: number
  // Enable debug logging
  debug?: boolean
  // Auto-correct common issues
  autoCorrect?: boolean
}
