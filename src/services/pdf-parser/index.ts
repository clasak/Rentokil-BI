/**
 * PDF Parser Service
 *
 * Parses Start Packet PDFs to extract customer information, equipment details,
 * service frequency, and pricing. Maps to SalesTrackerEntry and NewStartLogEntry types.
 */

import {
  ParsedStartPacket,
  ExtractedField,
  ExtractionConfidence,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SalesTrackerMapping,
  NewStartMapping,
  PDFUploadResult,
  ParserOptions,
} from './types'

import {
  CUSTOMER_NAME_PATTERNS,
  ADDRESS_PATTERNS,
  EQUIPMENT_PATTERNS,
  SERVICE_TYPE_PATTERNS,
  FREQUENCY_PATTERNS,
  PRICING_PATTERNS,
  CONTACT_PATTERNS,
  DATE_PATTERNS,
  SALES_REP_PATTERNS,
  VERTICAL_PATTERNS,
  findFirstMatch,
  extractNumber,
  findCategory,
} from './patterns'

import type { Sale, ServiceType as SalesServiceType, LeadType, JobType } from '@/types/sales-tracker'
import type { NewStartEntry, ServiceType as NewStartServiceType, FrequencyType, YesNo, MonthName } from '@/types/new-start-log'

// Service type mapping from parsed to Sales Tracker
const SERVICE_TYPE_TO_SALES: Record<string, SalesServiceType> = {
  general: 'Pest Control',
  termite: 'Termite',
  rodent: 'Rodent Control',
  mosquito: 'Mosquito',
  bed_bug: 'Bed Bug',
  wildlife: 'Wildlife',
  fumigation: 'Commercial',
}

// Frequency to annual visits mapping
const FREQUENCY_TO_VISITS: Record<string, FrequencyType> = {
  weekly: '24',      // ~24 visits/year (every other week average)
  'bi-weekly': '24', // 26 visits/year rounded
  monthly: '12',
  quarterly: '4',
  'on-demand': '',
}

/**
 * Parse text extracted from PDF and return structured data
 */
export function parseStartPacketText(
  text: string,
  fileName: string,
  pageCount: number = 1,
  options: ParserOptions = {}
): ParsedStartPacket {
  const { debug = false } = options
  const fieldConfidences: Record<string, ExtractionConfidence> = {}
  const warnings: string[] = []

  if (debug) {
    console.log('[PDF Parser] Starting extraction from:', fileName)
    console.log('[PDF Parser] Text length:', text.length)
  }

  // Extract customer name
  const customerName = extractWithConfidence(text, CUSTOMER_NAME_PATTERNS, 'customer.name', fieldConfidences)

  // Extract address components
  const street = extractWithConfidence(text, ADDRESS_PATTERNS.street, 'customer.address.street', fieldConfidences)
  const city = extractWithConfidence(text, ADDRESS_PATTERNS.city, 'customer.address.city', fieldConfidences)
  const state = extractWithConfidence(text, ADDRESS_PATTERNS.state, 'customer.address.state', fieldConfidences)
  const zip = extractWithConfidence(text, ADDRESS_PATTERNS.zip, 'customer.address.zip', fieldConfidences)

  // Extract contact info
  const contactName = extractWithConfidence(text, CONTACT_PATTERNS.contactName, 'customer.contactName', fieldConfidences)
  const contactPhone = extractWithConfidence(text, CONTACT_PATTERNS.phone, 'customer.contactPhone', fieldConfidences)
  const contactEmail = extractWithConfidence(text, CONTACT_PATTERNS.email, 'customer.contactEmail', fieldConfidences)

  // Extract vertical/industry
  const vertical = findCategory(text, VERTICAL_PATTERNS)
  if (vertical) {
    fieldConfidences['customer.vertical'] = 'medium'
  }

  // Extract equipment counts
  const roadStations = extractNumberWithConfidence(text, EQUIPMENT_PATTERNS.roadStations, 'equipment.roadStations', fieldConfidences)
  const bayStations = extractNumberWithConfidence(text, EQUIPMENT_PATTERNS.bayStations, 'equipment.bayStations', fieldConfidences)
  const flyLights = extractNumberWithConfidence(text, EQUIPMENT_PATTERNS.flyLights, 'equipment.flyLights', fieldConfidences)
  const baitBoxes = extractNumberWithConfidence(text, EQUIPMENT_PATTERNS.baitBoxes, 'equipment.baitBoxes', fieldConfidences)
  const glueBoards = extractNumberWithConfidence(text, EQUIPMENT_PATTERNS.glueBoards, 'equipment.glueBoards', fieldConfidences)

  // Extract service type
  const serviceType = findCategory(text, SERVICE_TYPE_PATTERNS) || 'general'
  fieldConfidences['service.type'] = findCategory(text, SERVICE_TYPE_PATTERNS) ? 'high' : 'low'

  // Extract frequency
  const frequency = findCategory(text, FREQUENCY_PATTERNS) || 'monthly'
  fieldConfidences['service.frequency'] = findCategory(text, FREQUENCY_PATTERNS) ? 'high' : 'low'

  // Extract pricing
  const monthlyContract = extractNumberWithConfidence(text, PRICING_PATTERNS.monthlyContract, 'pricing.monthlyContract', fieldConfidences)
  const setupFee = extractNumberWithConfidence(text, PRICING_PATTERNS.setupFee, 'pricing.setupFee', fieldConfidences)
  const initialTreatment = extractNumberWithConfidence(text, PRICING_PATTERNS.initialTreatment, 'pricing.initialTreatment', fieldConfidences)
  const termiteInspection = extractNumberWithConfidence(text, PRICING_PATTERNS.termiteInspection, 'pricing.termiteInspection', fieldConfidences)
  const annualRenewal = extractNumberWithConfidence(text, PRICING_PATTERNS.annualRenewal, 'pricing.annualRenewal', fieldConfidences)

  // Extract sales info
  const salesRepName = extractWithConfidence(text, SALES_REP_PATTERNS, 'sales.salesRepName', fieldConfidences)
  const proposalDate = findFirstMatch(text, DATE_PATTERNS)
  if (proposalDate) {
    fieldConfidences['sales.proposalDate'] = 'medium'
  }

  // Calculate overall confidence
  const confidenceValues = Object.values(fieldConfidences)
  const highCount = confidenceValues.filter(c => c === 'high').length
  const mediumCount = confidenceValues.filter(c => c === 'medium').length
  const totalFields = confidenceValues.length

  let overallConfidence: ExtractionConfidence = 'low'
  if (totalFields > 0) {
    const score = (highCount * 1 + mediumCount * 0.5) / totalFields
    if (score >= 0.7) overallConfidence = 'high'
    else if (score >= 0.4) overallConfidence = 'medium'
  }

  // Add warnings for missing critical fields
  if (!customerName) warnings.push('Customer name could not be extracted')
  if (!street) warnings.push('Street address could not be extracted')
  if (monthlyContract === 0 && initialTreatment === 0) warnings.push('No pricing information found')

  const result: ParsedStartPacket = {
    customer: {
      name: customerName || 'Unknown Customer',
      address: {
        street: street || '',
        city: city || '',
        state: state || '',
        zip: zip || '',
      },
      contactName: contactName || undefined,
      contactPhone: contactPhone || undefined,
      contactEmail: contactEmail || undefined,
      vertical: vertical as ParsedStartPacket['customer']['vertical'] || undefined,
    },
    equipment: {
      roadStations,
      bayStations,
      flyLights,
      baitBoxes,
      glueBoards,
    },
    service: {
      type: serviceType as ParsedStartPacket['service']['type'],
      frequency: frequency as ParsedStartPacket['service']['frequency'],
      startDate: proposalDate || undefined,
    },
    pricing: {
      monthlyContract,
      setupFee,
      initialTreatment,
      termiteInspection: termiteInspection || undefined,
      annualRenewal: annualRenewal || undefined,
    },
    sales: {
      salesRepName: salesRepName || undefined,
      proposalDate: proposalDate || undefined,
    },
    meta: {
      extractedAt: new Date().toISOString(),
      pdfFileName: fileName,
      pdfPageCount: pageCount,
      overallConfidence,
      fieldConfidences,
      warnings,
    },
  }

  if (debug) {
    console.log('[PDF Parser] Extraction complete:', {
      customerName: result.customer.name,
      overallConfidence,
      fieldsExtracted: Object.keys(fieldConfidences).length,
      warnings: warnings.length,
    })
  }

  return result
}

/**
 * Extract field with confidence tracking
 */
function extractWithConfidence(
  text: string,
  patterns: RegExp[],
  fieldPath: string,
  confidences: Record<string, ExtractionConfidence>
): string {
  const value = findFirstMatch(text, patterns)
  if (value) {
    // First pattern match = high confidence, later = medium
    const matchIndex = patterns.findIndex(p => p.test(text))
    confidences[fieldPath] = matchIndex <= 1 ? 'high' : 'medium'
  }
  return value || ''
}

/**
 * Extract number with confidence tracking
 */
function extractNumberWithConfidence(
  text: string,
  patterns: RegExp[],
  fieldPath: string,
  confidences: Record<string, ExtractionConfidence>
): number {
  const value = extractNumber(text, patterns)
  if (value !== null) {
    const matchIndex = patterns.findIndex(p => p.test(text))
    confidences[fieldPath] = matchIndex <= 1 ? 'high' : 'medium'
    return value
  }
  return 0
}

/**
 * Validate parsed start packet
 */
export function validateParsedData(data: ParsedStartPacket): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Required field validation
  if (!data.customer.name || data.customer.name === 'Unknown Customer') {
    errors.push({
      field: 'customer.name',
      message: 'Customer name is required',
      severity: 'error',
    })
  }

  if (!data.customer.address.street) {
    errors.push({
      field: 'customer.address.street',
      message: 'Street address is required',
      severity: 'error',
    })
  }

  // Pricing validation
  if (data.pricing.monthlyContract === 0 && data.pricing.initialTreatment === 0) {
    warnings.push({
      field: 'pricing',
      message: 'No pricing detected - manual entry may be required',
      severity: 'warning',
    })
  }

  // Equipment validation for commercial accounts
  if (data.customer.vertical === 'Commercial' || data.customer.vertical === 'Food Service') {
    if (data.equipment.roadStations === 0 && data.equipment.bayStations === 0) {
      warnings.push({
        field: 'equipment',
        message: 'Commercial account with no stations detected - verify equipment list',
        severity: 'warning',
      })
    }
  }

  // Contact validation
  if (!data.customer.contactPhone && !data.customer.contactEmail) {
    warnings.push({
      field: 'customer.contact',
      message: 'No contact information found',
      severity: 'warning',
    })
  }

  // State validation
  if (data.customer.address.state && !/^[A-Z]{2}$/.test(data.customer.address.state)) {
    warnings.push({
      field: 'customer.address.state',
      message: `State "${data.customer.address.state}" may be invalid`,
      severity: 'warning',
      suggestedValue: data.customer.address.state.toUpperCase().slice(0, 2),
    })
  }

  // ZIP validation
  if (data.customer.address.zip && !/^\d{5}(-\d{4})?$/.test(data.customer.address.zip)) {
    warnings.push({
      field: 'customer.address.zip',
      message: `ZIP code "${data.customer.address.zip}" format may be invalid`,
      severity: 'warning',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Map parsed data to Sales Tracker entry
 */
export function mapToSalesTracker(data: ParsedStartPacket): SalesTrackerMapping {
  const errors: string[] = []
  const warnings: string[] = []

  // Determine service type
  const service: SalesServiceType = SERVICE_TYPE_TO_SALES[data.service.type] || 'Pest Control'

  // Determine job type
  let jobType: JobType = 'Contract'
  if (data.service.frequency === 'on-demand' || data.pricing.monthlyContract === 0) {
    jobType = 'One-Time'
  }

  // Calculate pricing
  let jobWorkPrice = data.pricing.initialTreatment + data.pricing.setupFee
  let termitePrice = 0
  let contractPrice = data.pricing.monthlyContract

  if (data.service.type === 'termite') {
    termitePrice = data.pricing.initialTreatment + (data.pricing.termiteInspection || 0)
    jobWorkPrice = data.pricing.setupFee
  }

  // Determine lead type based on sales rep info
  const leadType: LeadType = data.sales.salesRepName ? 'Self-Gen' : ''

  // Parse date
  const saleDate = data.sales.proposalDate || new Date().toISOString().split('T')[0]

  if (!data.customer.name || data.customer.name === 'Unknown Customer') {
    errors.push('Customer name is required for Sales Tracker')
  }

  const entry: Partial<Sale> = {
    id: `pdf-${Date.now()}`,
    date: saleDate,
    companyName: data.customer.name,
    leadType,
    service,
    jobType,
    jobWorkPrice,
    termitePrice,
    contractPrice,
    started: false,
    paid: false,
    pestPacId: '',
  }

  if (data.meta.overallConfidence === 'low') {
    warnings.push('Low confidence extraction - verify all fields')
  }

  return {
    success: errors.length === 0,
    entry,
    errors,
    warnings,
  }
}

/**
 * Map parsed data to New Start Log entry
 */
export function mapToNewStart(data: ParsedStartPacket): NewStartMapping {
  const errors: string[] = []
  const warnings: string[] = []

  // Determine service type
  let serviceType: NewStartServiceType = 'Contract'
  if (data.service.frequency === 'on-demand' || data.pricing.monthlyContract === 0) {
    serviceType = 'Job 1x'
  }

  // Map frequency
  const frequency: FrequencyType = FREQUENCY_TO_VISITS[data.service.frequency] || '12'

  // Determine log book needed
  let logBookNeeded: YesNo = 'N'
  if (data.customer.vertical === 'Food Service' || data.customer.vertical === 'Healthcare') {
    logBookNeeded = 'Y'
  }

  // Format address
  const fullAddress = [
    data.customer.address.street,
    data.customer.address.city,
    data.customer.address.state,
    data.customer.address.zip,
  ].filter(Boolean).join(', ')

  // Determine customer requested start month
  let customerRequestedStartMonth: MonthName = ''
  if (data.service.startDate) {
    const date = new Date(data.service.startDate)
    const months: MonthName[] = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    customerRequestedStartMonth = months[date.getMonth()]
  }

  if (!data.customer.name || data.customer.name === 'Unknown Customer') {
    errors.push('Customer name is required for New Start Log')
  }

  if (!fullAddress) {
    errors.push('Service address is required for New Start Log')
  }

  const entry: Partial<NewStartEntry> = {
    id: `pdf-${Date.now()}`,
    soldDate: data.sales.proposalDate || new Date().toISOString().split('T')[0],
    accountName: data.customer.name,
    serviceAddress: fullAddress,
    salesRepsInvolved: data.sales.salesRepName || '',
    initialJobPrice: data.pricing.initialTreatment + data.pricing.setupFee,
    maintenancePrice: data.pricing.monthlyContract,
    serviceType,
    frequency,
    logBookNeeded,
    tapLeadOrSpecialist: '',
    pestPacLocNumber: '',
    customerRequestedStartMonth,
    // Ops fields (empty - to be filled by Ops Manager)
    operationsManager: '',
    assignedSpecialist: '',
    materialsOrdered: '',
    installationStarted: '',
    pocNamePhone: data.customer.contactName && data.customer.contactPhone
      ? `${data.customer.contactName} / ${data.customer.contactPhone}`
      : '',
    confirmedStartDate: '',
    specialNotes: buildSpecialNotes(data),
    status: 'pending_ops',
    branchId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (data.meta.overallConfidence === 'low') {
    warnings.push('Low confidence extraction - verify all fields before submission')
  }

  return {
    success: errors.length === 0,
    entry,
    errors,
    warnings,
  }
}

/**
 * Build special notes from equipment data
 */
function buildSpecialNotes(data: ParsedStartPacket): string {
  const parts: string[] = []

  if (data.equipment.roadStations > 0) {
    parts.push(`Road Stations: ${data.equipment.roadStations}`)
  }
  if (data.equipment.bayStations > 0) {
    parts.push(`Bay Stations: ${data.equipment.bayStations}`)
  }
  if (data.equipment.flyLights > 0) {
    parts.push(`Fly Lights: ${data.equipment.flyLights}`)
  }
  if (data.equipment.baitBoxes > 0) {
    parts.push(`Bait Boxes: ${data.equipment.baitBoxes}`)
  }
  if (data.equipment.glueBoards > 0) {
    parts.push(`Glue Boards: ${data.equipment.glueBoards}`)
  }

  if (data.equipment.otherEquipment) {
    parts.push(`Other: ${data.equipment.otherEquipment}`)
  }

  return parts.join(' | ')
}

/**
 * Full PDF processing pipeline
 */
export async function processStartPacketPDF(
  text: string,
  fileName: string,
  pageCount: number = 1,
  options: ParserOptions = {}
): Promise<PDFUploadResult> {
  try {
    // Parse the PDF text
    const parsedData = parseStartPacketText(text, fileName, pageCount, options)

    // Validate unless skipped
    let validation: ValidationResult | undefined
    if (!options.skipValidation) {
      validation = validateParsedData(parsedData)
    }

    // Map to target types
    const salesTrackerMapping = mapToSalesTracker(parsedData)
    const newStartMapping = mapToNewStart(parsedData)

    return {
      success: true,
      parsedData,
      validation,
      salesTrackerMapping,
      newStartMapping,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during PDF processing',
    }
  }
}

/**
 * Demo/mock PDF parsing for testing
 */
export function parseMockStartPacket(scenario: 'commercial' | 'residential' | 'termite' = 'commercial'): ParsedStartPacket {
  const scenarios: Record<string, ParsedStartPacket> = {
    commercial: {
      customer: {
        name: 'ABC Distribution Center',
        address: {
          street: '1234 Industrial Pkwy',
          city: 'Houston',
          state: 'TX',
          zip: '77001',
        },
        contactName: 'John Smith',
        contactPhone: '713-555-0123',
        contactEmail: 'jsmith@abcdist.com',
        vertical: 'Commercial',
      },
      equipment: {
        roadStations: 24,
        bayStations: 8,
        flyLights: 6,
        baitBoxes: 12,
        glueBoards: 20,
      },
      service: {
        type: 'general',
        frequency: 'monthly',
        preferredDay: 'Tuesday',
        preferredTime: 'Morning',
        startDate: '2025-02-01',
      },
      pricing: {
        monthlyContract: 450,
        setupFee: 350,
        initialTreatment: 850,
      },
      sales: {
        salesRepName: 'Sarah Johnson',
        proposalDate: '2025-01-15',
      },
      meta: {
        extractedAt: new Date().toISOString(),
        pdfFileName: 'ABC_Distribution_Start_Packet.pdf',
        pdfPageCount: 3,
        overallConfidence: 'high',
        fieldConfidences: {
          'customer.name': 'high',
          'customer.address.street': 'high',
          'pricing.monthlyContract': 'high',
        },
        warnings: [],
      },
    },
    residential: {
      customer: {
        name: 'Johnson Residence',
        address: {
          street: '567 Oak Lane',
          city: 'Katy',
          state: 'TX',
          zip: '77494',
        },
        contactName: 'Michael Johnson',
        contactPhone: '281-555-0456',
        vertical: 'Residential',
      },
      equipment: {
        roadStations: 0,
        bayStations: 0,
        flyLights: 0,
        baitBoxes: 4,
        glueBoards: 0,
      },
      service: {
        type: 'general',
        frequency: 'quarterly',
        preferredDay: 'Saturday',
        startDate: '2025-02-15',
      },
      pricing: {
        monthlyContract: 0,
        setupFee: 0,
        initialTreatment: 175,
        annualRenewal: 400,
      },
      sales: {
        salesRepName: 'Mike Davis',
        proposalDate: '2025-01-20',
      },
      meta: {
        extractedAt: new Date().toISOString(),
        pdfFileName: 'Johnson_Residential_Quote.pdf',
        pdfPageCount: 2,
        overallConfidence: 'high',
        fieldConfidences: {
          'customer.name': 'high',
          'customer.address.street': 'high',
          'pricing.initialTreatment': 'high',
        },
        warnings: [],
      },
    },
    termite: {
      customer: {
        name: 'Heritage Home Builders',
        address: {
          street: '890 Construction Way',
          city: 'Sugar Land',
          state: 'TX',
          zip: '77478',
        },
        contactName: 'Robert Chen',
        contactPhone: '832-555-0789',
        contactEmail: 'rchen@heritagehomes.com',
        vertical: 'Commercial',
      },
      equipment: {
        roadStations: 0,
        bayStations: 0,
        flyLights: 0,
        baitBoxes: 0,
        glueBoards: 0,
      },
      service: {
        type: 'termite',
        frequency: 'quarterly',
        specialInstructions: 'Pre-construction treatment for new build',
        startDate: '2025-03-01',
      },
      pricing: {
        monthlyContract: 0,
        setupFee: 0,
        initialTreatment: 2500,
        termiteInspection: 150,
        annualRenewal: 350,
      },
      sales: {
        salesRepName: 'Lisa Wong',
        proposalDate: '2025-01-22',
      },
      meta: {
        extractedAt: new Date().toISOString(),
        pdfFileName: 'Heritage_Termite_Treatment.pdf',
        pdfPageCount: 4,
        overallConfidence: 'high',
        fieldConfidences: {
          'customer.name': 'high',
          'customer.address.street': 'high',
          'service.type': 'high',
          'pricing.initialTreatment': 'high',
        },
        warnings: [],
      },
    },
  }

  return scenarios[scenario]
}

// Export all functions
export * from './types'
export * from './patterns'
