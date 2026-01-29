/**
 * Salesforce Quote Parser
 *
 * Client-side parser for extracting data from Salesforce quote PDFs.
 * Uses PDF.js for text extraction with Y-coordinate sorting for correct reading order.
 */

import type {
  SalesforceQuoteDraft,
  ParsedEquipment,
  ParsedService,
  SRAHazard,
  ServiceSignals,
  ParseValidationResult,
} from '@/types/salesforce-quote'
import type { NewStartAEInput, MonthName } from '@/types/new-start-log'
import type { Proposal, Sale, LeadType, ServiceType, JobType } from '@/types/sales-tracker'

// PDF.js is loaded dynamically to avoid server-side issues
// since it requires DOM APIs like DOMMatrix
let pdfjsLib: typeof import('pdfjs-dist') | null = null

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib
  if (typeof window === 'undefined') {
    throw new Error('PDF parsing is only available in the browser')
  }

  pdfjsLib = await import('pdfjs-dist')
  // Use local worker file to avoid CDN/cache issues
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
  return pdfjsLib
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MONTH_NAMES_ARRAY = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DEFAULT_SRA_HAZARDS_ARRAY: SRAHazard[] = [
  { hazard: 'Slippery or uneven surfaces', control: 'Wear appropriate footwear', safeToProceed: true },
  { hazard: 'Overhead hazards (pipes, low ceilings)', control: 'Watch for head clearance', safeToProceed: true },
  { hazard: 'Working at heights (ladders, platforms)', control: 'Use proper ladder safety', safeToProceed: true },
  { hazard: 'Chemicals or hazardous materials present', control: 'Follow safety data sheets', safeToProceed: true },
  { hazard: 'Electrical hazards', control: 'Avoid contact with electrical equipment', safeToProceed: true },
  { hazard: 'Poor lighting in service areas', control: 'Use flashlight/headlamp', safeToProceed: true }
]

// Section terminators
const HEADER_BLOCK_TERMINATORS = [
  'prepared by',
  'equipment',
  'total cost of equipment',
  'investment summary',
  'covered pests',
  'scope of service',
  'service specifications',
  'service frequency',
  'plan limitations',
  'documentation',
  'terms & conditions',
  'about presto-x',
  'table of contents'
]

const ROUTINE_SECTION_TERMINATORS = [
  'investment summary',
  'plan limitations',
  'scope of service',
  'equipment summary',
  'covered pests',
  'timeline',
  'requested start date',
  'about presto-x',
  'innovation & technology'
]

// Regex patterns
const ADDRESS_LINE_REGEX = /^[0-9].*(?:\b(?:st|street|rd|road|dr|drive|ln|lane|blvd|boulevard|ave|avenue|hwy|highway|way|trail|trl|terrace|ter|pkwy|parkway|court|ct|cir|circle|loop|suite|ste|unit)\b)/i
const CITY_STATE_ZIP_REGEX = /^(.+?),\s*([A-Z]{2})[,\s]*([0-9]{5})(?:-?[0-9]{4})?/
const EMAIL_REGEX = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i

// ============================================================================
// PDF TEXT EXTRACTION
// ============================================================================

/**
 * Extract text from PDF file with correct visual reading order.
 * CRITICAL: Sorts by Y-coordinate first to prevent column headers
 * from merging into body text in multi-column layouts.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await getPdfjs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  let text = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    if (content.items.length === 0) continue

    // Sort by Y (vertical) then X (horizontal) for visual reading order
    // PDF coordinates start at bottom-left, so higher Y = earlier in document
    const items = content.items
      .filter((item): item is typeof item & { str: string; transform: number[]; height?: number } => 'str' in item)
      .map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        h: item.height || item.transform[3]
      }))
      .sort((a, b) => {
        // If Y difference > 5, consider it a new line
        if (Math.abs(a.y - b.y) > 5) return b.y - a.y // Higher Y first (top to bottom)
        return a.x - b.x // Left to right within same line
      })

    let pageText = ''
    let lastY = items[0]?.y ?? 0

    for (let j = 0; j < items.length; j++) {
      const item = items[j]

      // Insert newline if Y changes significantly
      if (Math.abs(item.y - lastY) > 5) {
        pageText += '\n'
      } else if (j > 0) {
        pageText += ' ' // Space between words on same line
      }

      pageText += item.str
      lastY = item.y
    }

    text += pageText + '\n\n' // Double newline between pages
  }

  return text
}

// ============================================================================
// MAIN PARSER FUNCTION
// ============================================================================

/**
 * Main entry point - parses Salesforce quote text into SalesforceQuoteDraft
 */
export function parseSalesforceQuote(text: string): SalesforceQuoteDraft {
  if (!text) {
    throw new Error('No PDF text provided for parsing.')
  }

  // 1. NORMALIZE TEXT
  const normalized = text.replace(/\r\n/g, '\n')
  const rawLines = normalized.split('\n')
  const trimmedLines = rawLines
    .map(line => (line || '').trim())
    .filter(line => line.length > 0)

  // 2. EXPAND MERGED LINES (handles PDF column merging issues)
  const lines = expandLines(trimmedLines)

  if (!lines.length) {
    throw new Error('Unable to parse PDF text (no content).')
  }

  // 3. EXTRACT ALL SECTIONS
  const header = extractPreparedForFields(lines)
  const preparedBy = extractPreparedBySection(lines)
  const equipmentInfo = extractEquipmentSection(lines)
  const pricing = extractPricing(lines)
  const schedule = extractRequestedStart(lines)
  const routine = extractRoutineServices(lines, equipmentInfo.equipment)
  const explicitPests = extractCoveredPestsSection(lines)
  const derivedPests = deriveCoveredPests(explicitPests, routine.signals, equipmentInfo.equipment)

  // 4. CALCULATE FINANCIALS
  const oneTimeCost = pricing.oneTimeCost !== null ? pricing.oneTimeCost : equipmentInfo.totalCost
  const initialSvcCost = pricing.initialSvcCost
  const monthlyCost = pricing.avgMonthlyCost
  const annualCost = monthlyCost !== null ? roundCurrency(monthlyCost * 12) : null

  // Combined Initial = Equipment One-Time + Initial Service Cost
  let combinedInitial: number | null = null
  if (oneTimeCost !== null || initialSvcCost !== null) {
    const oneTime = oneTimeCost !== null ? oneTimeCost : 0
    const initial = initialSvcCost !== null ? initialSvcCost : 0
    combinedInitial = roundCurrency(oneTime + initial)
  }

  // 5. BUILD EQUIPMENT SUMMARY STRING
  const equipmentSummary = buildEquipmentSignature(equipmentInfo.equipment)
  equipmentInfo.equipment.summary = equipmentSummary

  // 6. DETERMINE JOB TYPE
  const jobType = monthlyCost !== null && monthlyCost > 0 ? 'Contract' : null

  // 7. GENERATE AUTO-DESCRIPTIONS
  const autoInitialDesc = buildInitialDescription(equipmentInfo.equipment, initialSvcCost)
  const autoMaintenanceDesc = buildMaintenanceDescription(routine.services)

  // 8. GENERATE SRA TIMESTAMP
  const now = new Date()
  const sraDate = now.toISOString().split('T')[0]
  const sraTime = now.toTimeString().split(' ')[0].substring(0, 5)

  // 9. BUILD FULL SERVICE ADDRESS
  let fullServiceAddress = header.serviceAddressLine1 || ''
  if (header.serviceCity || header.serviceState || header.serviceZip) {
    const cityStateZip = [header.serviceCity, header.serviceState, header.serviceZip]
      .filter(Boolean)
      .join(', ')
    if (cityStateZip) {
      fullServiceAddress += (fullServiceAddress ? ', ' : '') + cityStateZip
    }
  }

  // Build billing address if different
  let fullBillingAddress = ''
  let billingAddressDifferent = false
  if (header.billingAddressLine1) {
    fullBillingAddress = header.billingAddressLine1
    if (header.billingCity || header.billingState || header.billingZip) {
      const billingCityStateZip = [header.billingCity, header.billingState, header.billingZip]
        .filter(Boolean)
        .join(', ')
      if (billingCityStateZip) {
        fullBillingAddress += (fullBillingAddress ? ', ' : '') + billingCityStateZip
      }
    }
    billingAddressDifferent = true
  }

  // 10. ASSEMBLE FINAL DRAFT OBJECT
  const draft: SalesforceQuoteDraft = {
    // Account & Contact
    accountName: header.accountName,
    contactName: header.contactName,
    contactEmail: header.contactEmail,

    // Service Address
    serviceAddressLine1: header.serviceAddressLine1,
    serviceCity: header.serviceCity,
    serviceState: header.serviceState,
    serviceZip: header.serviceZip,
    serviceAddress: fullServiceAddress,

    // AE Information
    aeName: preparedBy.aeName,
    aeEmail: preparedBy.aeEmail,
    branchId: 'BRN-001',

    // Job Classification
    jobType: jobType,
    leadType: 'Inbound',
    serviceType: null,

    // Services & Equipment
    services: routine.services,
    equipment: equipmentInfo.equipment,

    // Pricing
    equipmentOneTimeTotal: oneTimeCost,
    servicesInitialTotal: initialSvcCost,
    combinedInitialTotal: combinedInitial,
    servicesMonthlyTotal: monthlyCost,
    combinedMonthlyTotal: monthlyCost,
    servicesAnnualTotal: annualCost,
    combinedAnnualTotal: annualCost,
    monthlyCost: monthlyCost,
    annualCost: annualCost,

    // Schedule
    requestedStartDate: schedule.requestedStartDate,
    startMonth: schedule.startMonth,

    // Pests
    coveredPests: derivedPests,

    // Auto-Generated Descriptions
    initialServiceDescription: autoInitialDesc,
    maintenanceScopeDescription: autoMaintenanceDesc,

    // Additional Fields
    logBookNeeded: true,
    pnolRequired: false,

    // Billing
    billingEmail: header.billingEmail || header.contactEmail || null,
    billingAddress: fullBillingAddress || null,
    billingAddressDifferent: billingAddressDifferent,

    // SRA (Safety Risk Assessment)
    sraCompletedBy: preparedBy.aeName || null,
    sraDate: sraDate,
    sraTime: sraTime,
    sraCompletedAt: now.toISOString(),
    sraAdditionalHazards: 'None',
    sraHazards: DEFAULT_SRA_HAZARDS_ARRAY
  }

  return draft
}

// ============================================================================
// LINE EXPANSION
// ============================================================================

/**
 * Expand lines that have multiple logical lines merged together.
 * Handles PDF column merging issues.
 */
function expandLines(inputLines: string[]): string[] {
  const result: string[] = []

  inputLines.forEach(line => {
    if (!line) return

    // Split on PREPARED BY: and TAILORED FOR: patterns
    const splitPattern = /(PREPARED\s+BY:|TAILORED\s+FOR:)/i
    if (splitPattern.test(line)) {
      const parts = line.split(splitPattern)
      let current = ''
      for (let i = 0; i < parts.length; i++) {
        if (splitPattern.test(parts[i])) {
          if (current.trim()) {
            result.push(current.trim())
          }
          current = parts[i]
        } else {
          current += parts[i]
        }
      }
      if (current.trim()) {
        result.push(current.trim())
      }
    }
    // Split very long lines with multiple spaces (columns merged)
    else if (line.length > 200 && /\s{2,}/.test(line)) {
      line.split(/\s{2,}/).forEach(part => {
        const trimmed = part.trim()
        if (trimmed.length) result.push(trimmed)
      })
    }
    else if (line.length > 140 && /\s{2,}/.test(line)) {
      line.split(/\s{2,}/).forEach(part => {
        const trimmed = part.trim()
        if (trimmed.length) result.push(trimmed)
      })
    }
    else {
      result.push(line)
    }
  })

  return result
}

// ============================================================================
// HEADER EXTRACTION
// ============================================================================

interface HeaderFields {
  accountName: string | null
  contactName: string | null
  contactEmail: string | null
  billingEmail: string | null
  serviceAddressLine1: string | null
  serviceCity: string | null
  serviceState: string | null
  serviceZip: string | null
  billingAddressLine1: string | null
  billingCity: string | null
  billingState: string | null
  billingZip: string | null
}

/**
 * Extract service address from "Service Details" or location lines.
 * These appear like: "Arlington Location - L671, 1061 Duncan Perry Road, Arlington, TX, 76011, US"
 */
function extractServiceLocationAddress(lines: string[]): {
  serviceAddressLine1: string | null
  serviceCity: string | null
  serviceState: string | null
  serviceZip: string | null
} {
  const result = {
    serviceAddressLine1: null as string | null,
    serviceCity: null as string | null,
    serviceState: null as string | null,
    serviceZip: null as string | null
  }

  // Look for "Service Details" section or location lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Match patterns like "Location - L671, 1061 Duncan Perry Road, Arlington, TX, 76011"
    // or "Arlington Location - L671, 1061 Duncan Perry Road, Arlington, TX, 76011, US"
    if (/location\s*-?\s*L?\d*/i.test(line) && /,\s*[A-Z]{2}[,\s]*\d{5}/i.test(line)) {
      // Extract the address portion after the location identifier
      // Pattern: "Name Location - L###, ADDRESS, CITY, STATE, ZIP, COUNTRY"
      const addressMatch = line.match(/,\s*(\d+[^,]+),\s*([^,]+),\s*([A-Z]{2})[,\s]*(\d{5})(?:-?\d{4})?/i)
      if (addressMatch) {
        result.serviceAddressLine1 = addressMatch[1].trim()
        result.serviceCity = addressMatch[2].trim()
        result.serviceState = addressMatch[3].toUpperCase()
        result.serviceZip = addressMatch[4]
        return result
      }
    }

    // Also check for "Service Details" header followed by address
    if (/service\s+details/i.test(line)) {
      // Look at the next few lines for address
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j]
        if (!nextLine) continue

        // Check if this line has location info
        if (/location/i.test(nextLine) && /,\s*[A-Z]{2}[,\s]*\d{5}/i.test(nextLine)) {
          const addressMatch = nextLine.match(/,\s*(\d+[^,]+),\s*([^,]+),\s*([A-Z]{2})[,\s]*(\d{5})(?:-?\d{4})?/i)
          if (addressMatch) {
            result.serviceAddressLine1 = addressMatch[1].trim()
            result.serviceCity = addressMatch[2].trim()
            result.serviceState = addressMatch[3].toUpperCase()
            result.serviceZip = addressMatch[4]
            return result
          }
        }
      }
    }
  }

  return result
}

/**
 * Extract account name, contact info, and billing address from header.
 * NOTE: Service address is extracted separately from location lines.
 */
function extractPreparedForFields(lines: string[]): HeaderFields {
  const data: HeaderFields = {
    accountName: null,
    contactName: null,
    contactEmail: null,
    billingEmail: null,
    serviceAddressLine1: null,
    serviceCity: null,
    serviceState: null,
    serviceZip: null,
    billingAddressLine1: null,
    billingCity: null,
    billingState: null,
    billingZip: null
  }

  // First, try to extract service address from location lines
  const serviceLocation = extractServiceLocationAddress(lines)
  if (serviceLocation.serviceAddressLine1) {
    data.serviceAddressLine1 = serviceLocation.serviceAddressLine1
    data.serviceCity = serviceLocation.serviceCity
    data.serviceState = serviceLocation.serviceState
    data.serviceZip = serviceLocation.serviceZip
  }

  // Find anchor line for account/contact info
  const idx = findFirstIndex(lines, line =>
    isTailoredPreparedAnchor(line) ||
    /account\s+name/i.test(line) ||
    /customer\s+name/i.test(line)
  )

  if (idx === -1) return data

  // Gather block (next 15 lines or until terminator)
  const block = gatherBlock(lines, idx, isHeaderBlockStop, 15)
  if (!block.length) return data

  // Sanitize block
  let sanitized = sanitizeHeaderBlock(block)
  if (!sanitized.length) return data

  // Extract all emails (first = contact, second = billing)
  const emails = findAllEmails(sanitized)
  if (emails.length > 0) {
    data.contactEmail = emails[0]
    data.billingEmail = emails.length > 1 ? emails[1] : emails[0]
  }

  // Remove emails from lines for cleaner parsing
  sanitized = sanitized
    .map(line => line.replace(EMAIL_REGEX, '').trim())
    .filter(line => line.length > 0)

  // Expand merged lines
  sanitized = expandMergedHeaderLines(sanitized)

  // Extract account name (first non-email, non-address line)
  let cursor = 0
  while (cursor < sanitized.length && !data.accountName) {
    const candidate = sanitized[cursor]
    if (looksLikeAccountName(candidate)) {
      data.accountName = candidate
    }
    cursor++
  }

  // Extract contact name (looks like "First Last")
  while (cursor < sanitized.length && !data.contactName) {
    const contactCandidate = sanitized[cursor]
    if (looksLikeContactName(contactCandidate)) {
      data.contactName = contactCandidate
      break
    }
    cursor++
  }

  // Extract billing address (address in header section, NOT the service location)
  // Only do this if we already have a service address from location extraction
  if (data.serviceAddressLine1) {
    for (let i = 0; i < sanitized.length; i++) {
      const line = sanitized[i]
      if (ADDRESS_LINE_REGEX.test(line)) {
        const components = extractInlineAddress(line)
        if (components) {
          // This is the billing address (from header), not service address
          data.billingAddressLine1 = components.street || components.raw
          data.billingCity = components.city
          data.billingState = components.state
          data.billingZip = components.zip
        }
        break
      }
    }
  } else {
    // Fallback: if no service location found, use header address as service address
    for (let i = 0; i < sanitized.length; i++) {
      const line = sanitized[i]
      if (ADDRESS_LINE_REGEX.test(line)) {
        const components = extractInlineAddress(line)
        if (components) {
          data.serviceAddressLine1 = components.street || components.raw
          data.serviceCity = components.city || data.serviceCity
          data.serviceState = components.state || data.serviceState
          data.serviceZip = components.zip || data.serviceZip
        } else {
          data.serviceAddressLine1 = line
          // Check next line for city/state/zip
          if (i + 1 < sanitized.length) {
            const cityMatch = sanitized[i + 1].match(CITY_STATE_ZIP_REGEX)
            if (cityMatch) {
              data.serviceCity = cityMatch[1].trim()
              data.serviceState = cityMatch[2]
              data.serviceZip = cityMatch[3]
            }
          }
        }
        break
      }
    }
  }

  return data
}

// ============================================================================
// PREPARED BY EXTRACTION
// ============================================================================

interface PreparedByFields {
  aeName: string | null
  aeEmail: string | null
}

function extractPreparedBySection(lines: string[]): PreparedByFields {
  const result: PreparedByFields = { aeName: null, aeEmail: null }

  const idx = findFirstIndex(lines, line => /prepared\s+by\b/i.test(line))
  if (idx === -1) return result

  const block = gatherBlock(lines, idx, line => {
    if (!line) return false
    const lower = line.toLowerCase()
    if (/(tailored|prepared)\s+for/.test(lower)) return true
    return isHeaderBlockStop(line)
  }, 8)

  if (!block.length) return result

  const inline = block[0].replace(/^prepared\s+by[:\s-]*/i, '').trim()
  if (inline) {
    const inlineEmail = inline.match(EMAIL_REGEX)
    if (inlineEmail) {
      result.aeEmail = inlineEmail[1]
      const cleanedInline = inline.replace(EMAIL_REGEX, '').trim()
      if (cleanedInline && !cleanedInline.includes('@')) {
        result.aeName = cleanedInline
      }
    } else if (!inline.includes('@')) {
      result.aeName = inline
    }
  }

  for (let i = 1; i < block.length; i++) {
    let line = block[i]
    if (!line) continue

    if (!result.aeEmail) {
      const email = line.match(EMAIL_REGEX)
      if (email) {
        result.aeEmail = email[1]
        line = line.replace(EMAIL_REGEX, '').trim()
      }
    }

    if (!result.aeName) {
      const nameCandidate = !line.includes('@') ? line : line.replace(EMAIL_REGEX, '').trim()
      if (nameCandidate && !nameCandidate.includes('@')) {
        result.aeName = nameCandidate.trim()
      }
    }
  }

  return result
}

// ============================================================================
// EQUIPMENT EXTRACTION
// ============================================================================

interface EquipmentResult {
  equipment: ParsedEquipment
  totalCost: number | null
}

function extractEquipmentSection(lines: string[]): EquipmentResult {
  const equipment: ParsedEquipment = {
    rbsQty: 0,
    multCatchQty: 0,
    iltQty: 0,
    otherEquipment: [],
    summary: ''
  }
  let totalCost: number | null = null

  // Find "Total Cost of Equipment" line
  const totalIdx = findFirstIndex(lines, line =>
    /^total\s+cost\s+of\s+equipment/i.test(line)
  )

  if (totalIdx === -1) {
    return { equipment, totalCost }
  }

  // Search backward for equipment table start
  let startIdx = -1
  for (let back = totalIdx - 1; back >= Math.max(0, totalIdx - 30); back--) {
    const line = lines[back] || ''
    if (/equipment\s+summary/i.test(line)) continue
    if (/^equipment\b/i.test(line) || /equipment\s+quantity/i.test(line)) {
      startIdx = back
      break
    }
  }

  if (startIdx === -1) {
    return { equipment, totalCost }
  }

  const endIdx = totalIdx

  // Parse equipment lines
  for (let i = startIdx + 1; i < endIdx; i++) {
    const row = lines[i]
    if (!row || isHeaderBlockStop(row)) continue
    if (/routine\s+management\s+services/i.test(row)) break
    if (/service\s+frequency/i.test(row)) continue

    // Strategy 1: Quantity at END of line (most common)
    let qtyMatch = row.match(/([0-9]+(?:\.[0-9]+)?)\s*$/)

    // Strategy 2: Quantity at START of line (fallback)
    if (!qtyMatch) {
      const startMatch = row.match(/^\s*([0-9]+)\s+(.*)/)
      if (startMatch) {
        const qty = parseFloat(startMatch[1])
        const name = startMatch[2].trim()
        categorizeEquipment(equipment, name, qty)
        continue
      }
    }

    if (!qtyMatch) continue

    const qty = parseFloat(qtyMatch[1])
    if (isNaN(qty)) continue

    const name = row.slice(0, row.length - qtyMatch[0].length).trim()
    if (!name) continue

    categorizeEquipment(equipment, name, qty)
  }

  // Extract total cost
  const totalLine = lines[endIdx]
  const parsedTotal = parseFirstCurrency(totalLine)
  if (parsedTotal !== null) {
    totalCost = parsedTotal
  }

  equipment.summary = buildEquipmentSignature(equipment)
  return { equipment, totalCost }
}

/**
 * Categorize equipment by name keywords
 */
function categorizeEquipment(equipment: ParsedEquipment, name: string, qty: number): void {
  const lower = name.toLowerCase()

  // Rodent Bait Stations
  if (/bait\s+station|rodent\s+bait|\brbs\b|rodent\s+station/.test(lower) ||
      lower.includes('eradico')) {
    equipment.rbsQty += qty
    return
  }

  // Multi-Catch Traps (MRT)
  if (/multicatch|multi-catch|\bmrt\b|mouse\s+trap/.test(lower)) {
    equipment.multCatchQty += qty
    return
  }

  // Insect Light Traps (ILT)
  if (/lumnia|insect\s+light\s+trap|\bilt\b|fly\s+light/.test(lower)) {
    equipment.iltQty += qty
    return
  }

  // Other equipment
  equipment.otherEquipment.push({ name, quantity: qty })
}

// ============================================================================
// PRICING EXTRACTION
// ============================================================================

interface PricingResult {
  oneTimeCost: number | null
  initialSvcCost: number | null
  avgMonthlyCost: number | null
}

function extractPricing(lines: string[]): PricingResult {
  let oneTimeCost: number | null = null
  let initialSvcCost: number | null = null
  let avgMonthlyCost: number | null = null

  // Strategy 1: Find "Total Investment" line with all 3 currency values
  // This handles: "Total Investment for all locations $875.00 $567.96 $283.98"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    if (/total\s+investment/i.test(line)) {
      const allCurrencies: number[] = []
      const currencyRegex = /\$([0-9][0-9,]*(?:\.[0-9]{2})?)/g
      let match
      while ((match = currencyRegex.exec(line)) !== null) {
        allCurrencies.push(parseFloat(match[1].replace(/,/g, '')))
      }

      // If we found 3 values on this line, we're done
      if (allCurrencies.length >= 3) {
        return {
          oneTimeCost: allCurrencies[0],
          initialSvcCost: allCurrencies[1],
          avgMonthlyCost: allCurrencies[2]
        }
      }

      // If values might be on separate lines, look at next few lines
      if (allCurrencies.length < 3) {
        for (let j = i + 1; j <= i + 5 && j < lines.length; j++) {
          const nextLine = lines[j]
          if (!nextLine) continue
          // Stop if we hit a new section
          if (/^(scope|equipment|routine|covered|timeline|requested|about|table|page)/i.test(nextLine.toLowerCase())) {
            break
          }
          let nextMatch
          while ((nextMatch = currencyRegex.exec(nextLine)) !== null) {
            allCurrencies.push(parseFloat(nextMatch[1].replace(/,/g, '')))
          }
          if (allCurrencies.length >= 3) {
            return {
              oneTimeCost: allCurrencies[0],
              initialSvcCost: allCurrencies[1],
              avgMonthlyCost: allCurrencies[2]
            }
          }
        }
      }
    }
  }

  // Strategy 2: Look for Investment Summary section with location line
  // This handles multi-line format where location has the prices
  const summaryIdx = findFirstIndex(lines, line => {
    if (!line) return false
    return /investment\s+summary/i.test(line) && !/^\d+\s+investment/i.test(line)
  })

  if (summaryIdx !== -1) {
    // Look for location lines with currency values after Investment Summary
    for (let i = summaryIdx + 1; i < Math.min(summaryIdx + 20, lines.length); i++) {
      const line = lines[i]
      if (!line) continue

      // Stop at next section
      if (/^(scope|equipment|routine|covered|timeline|requested|about|table|page)/i.test(line.toLowerCase())) {
        break
      }

      // Look for lines with multiple currency values (location rows)
      const allCurrencies: number[] = []
      const currencyRegex = /\$([0-9][0-9,]*(?:\.[0-9]{2})?)/g
      let match
      while ((match = currencyRegex.exec(line)) !== null) {
        allCurrencies.push(parseFloat(match[1].replace(/,/g, '')))
      }

      if (allCurrencies.length >= 3) {
        oneTimeCost = allCurrencies[0]
        initialSvcCost = allCurrencies[1]
        avgMonthlyCost = allCurrencies[2]
        break
      }
    }
  }

  // Strategy 3: Look for "Total Cost of Setup & Routine Management Services" line
  // This handles: "Total Cost of Setup & Routine Management Services $567.96 $283.98"
  if (initialSvcCost === null || avgMonthlyCost === null) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue

      if (/total\s+cost\s+of\s+setup/i.test(line) || /routine\s+management\s+services.*\$/i.test(line)) {
        const allCurrencies: number[] = []
        const currencyRegex = /\$([0-9][0-9,]*(?:\.[0-9]{2})?)/g
        let match
        while ((match = currencyRegex.exec(line)) !== null) {
          allCurrencies.push(parseFloat(match[1].replace(/,/g, '')))
        }

        if (allCurrencies.length >= 2) {
          if (initialSvcCost === null) initialSvcCost = allCurrencies[0]
          if (avgMonthlyCost === null) avgMonthlyCost = allCurrencies[1]
        }
      }
    }
  }

  // Strategy 4: Get equipment one-time cost if we don't have it
  if (oneTimeCost === null) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue

      if (/total\s+cost\s+of\s+equipment/i.test(line)) {
        const match = line.match(/\$([0-9][0-9,]*(?:\.[0-9]{2})?)/)
        if (match) {
          oneTimeCost = parseFloat(match[1].replace(/,/g, ''))
        }
        break
      }
    }
  }

  // Strategy 5: Fallback to labeled fields
  if (oneTimeCost === null) {
    oneTimeCost = findCurrencyAfterLabel(lines, /one[-\s]?time\s+cost/i)
  }
  if (initialSvcCost === null) {
    initialSvcCost = findCurrencyAfterLabel(lines, /initial\s+(?:svc|service)\s+cost/i)
  }
  if (avgMonthlyCost === null) {
    avgMonthlyCost = findCurrencyAfterLabel(lines, /(?:avg|average)\s+monthly\s+cost/i)
  }

  return { oneTimeCost, initialSvcCost, avgMonthlyCost }
}

// ============================================================================
// SERVICES EXTRACTION
// ============================================================================

interface RoutineResult {
  services: ParsedService[]
  signals: ServiceSignals
}

function extractRoutineServices(lines: string[], equipment: ParsedEquipment): RoutineResult {
  const idx = findFirstIndex(lines, line =>
    /routine\s+management\s+services/i.test(line)
  )

  if (idx === -1) {
    return buildFallbackServicesFromEquipment(equipment)
  }

  const endIdx = findFirstIndexFrom(lines, idx + 1, line => {
    if (!line) return false
    const lower = line.toLowerCase()
    for (const terminator of ROUTINE_SECTION_TERMINATORS) {
      if (lower.startsWith(terminator)) {
        return true
      }
    }
    return false
  })

  const block = lines.slice(idx + 1, endIdx === -1 ? lines.length : endIdx)
  const signals: ServiceSignals = { hasGpc: false, hasRodent: false, hasIlt: false }

  const serviceTemplates = [
    { code: 'GPC', keywords: ['general pest'], serviceName: 'General Pest Control', category: 'GPC', programType: 'General Pest Control', defaultFreq: 'Monthly', defaultPerYear: 12, signal: 'hasGpc' as const },
    { code: 'MRT', keywords: ['interior monitoring'], serviceName: 'Interior Rodent Monitoring', category: 'Rodent Monitoring', programType: 'Interior Monitoring', defaultFreq: 'Semi-Monthly', defaultPerYear: 24, signal: 'hasRodent' as const },
    { code: 'RBS', keywords: ['exterior monitoring'], serviceName: 'Exterior Rodent Monitoring', category: 'Rodent Monitoring', programType: 'Exterior Monitoring', defaultFreq: 'Monthly', defaultPerYear: 12, signal: 'hasRodent' as const },
    { code: 'ILT', keywords: ['insect light trap', 'ilt maintenance', 'light trap maintenance'], serviceName: 'Insect Light Trap Maintenance', category: 'Fly / ILT', programType: 'Insect Light Trap Maintenance', defaultFreq: 'Semi-Monthly', defaultPerYear: 24, signal: 'hasIlt' as const }
  ]

  const servicesByCode: Record<string, ParsedService> = {}
  let currentCode: string | null = null

  function ensureService(template: typeof serviceTemplates[0]) {
    if (!servicesByCode[template.code]) {
      servicesByCode[template.code] = createService(
        template.serviceName, template.code, template.category,
        template.programType, template.defaultFreq, template.defaultPerYear
      )
    }
    signals[template.signal] = true
  }

  let iltSemi = false

  block.forEach(line => {
    if (!line) return
    const lower = line.toLowerCase()
    if (/insect\s+light|ilt/.test(lower) && /semi/.test(lower)) iltSemi = true

    for (const template of serviceTemplates) {
      const matched = template.keywords.some(keyword => lower.includes(keyword))
      if (matched) {
        ensureService(template)
        currentCode = template.code
        return
      }
    }

    if (/service\s+frequency/i.test(lower) && currentCode && servicesByCode[currentCode]) {
      const freqLabel = extractFrequencyLabel(line)
      const perYear = extractServicesPerYear(line, freqLabel)
      if (freqLabel) servicesByCode[currentCode].frequencyLabel = freqLabel
      if (perYear) servicesByCode[currentCode].servicesPerYear = perYear
    }
  })

  let services = Object.values(servicesByCode)

  if (iltSemi) {
    services.forEach(svc => {
      if (svc.serviceCode === 'ILT') {
        svc.frequencyLabel = 'Semi-Monthly'
        svc.servicesPerYear = 24
      }
    })
  }

  if (!services.length) {
    return buildFallbackServicesFromEquipment(equipment)
  }

  // Ensure GPC is always included
  if (!services.some(service => service.serviceCode === 'GPC')) {
    const gpcTemplate = serviceTemplates[0]
    ensureService(gpcTemplate)
    services.push(servicesByCode[gpcTemplate.code])
  }

  services.sort((a, b) => serviceOrder(a.serviceCode) - serviceOrder(b.serviceCode))

  return { services, signals }
}

function buildFallbackServicesFromEquipment(equipment: ParsedEquipment): RoutineResult {
  const signals: ServiceSignals = { hasGpc: false, hasRodent: false, hasIlt: false }
  const services: ParsedService[] = []

  services.push(createService('General Pest Control', 'GPC', 'GPC', 'General Pest Control', 'Monthly', 12))
  signals.hasGpc = true

  if (equipment && (equipment.multCatchQty > 0 || equipment.rbsQty > 0)) {
    services.push(createService('Interior/Exterior Rodent Monitoring', 'RODENT', 'Rodent Monitoring', 'Rodent Monitoring', 'Monthly', 12))
    signals.hasRodent = true
  }

  if (equipment && equipment.iltQty > 0) {
    services.push(createService('Insect Light Trap Maintenance', 'ILT', 'Fly / ILT', 'Insect Light Trap Maintenance', 'Semi-Monthly', 24))
    signals.hasIlt = true
  }

  return { services, signals }
}

function createService(
  name: string,
  code: string,
  category: string,
  programType: string,
  freqLabel: string,
  perYear: number
): ParsedService {
  return {
    serviceName: name,
    serviceCode: code,
    category: category,
    programType: programType,
    descriptionText: 'Imported from Routine Management Services',
    frequencyLabel: freqLabel,
    servicesPerYear: perYear,
    afterHours: null,
    initialAmount: null,
    pricePerService: null
  }
}

// ============================================================================
// PESTS EXTRACTION
// ============================================================================

function extractCoveredPestsSection(lines: string[]): string[] {
  const idx = findFirstIndex(lines, line => /^covered\s+pests/i.test(line))
  if (idx === -1) return []

  const pests: string[] = []
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) break
    if (/^service\s+\d+/i.test(line)) break
    if (isHeaderBlockStop(line)) break

    const normalized = line.replace(/^[•\-\*\u2022]+\s*/g, '').trim()
    if (!normalized) continue

    const parts = splitCommaSafe(normalized)
    parts.forEach(part => {
      const cleaned = part.replace(/\s+/g, ' ').trim()
      if (cleaned) pests.push(cleaned)
    })
  }

  return dedupeList(pests)
}

function deriveCoveredPests(
  explicitList: string[],
  signals: ServiceSignals,
  equipment: ParsedEquipment
): string[] {
  const seen: Record<string, boolean> = {}
  const result: string[] = []

  explicitList.forEach(item => {
    const key = (item || '').toLowerCase()
    if (item && !seen[key]) {
      seen[key] = true
      result.push(item)
    }
  })

  function add(value: string) {
    if (!value) return
    const key = value.toLowerCase()
    if (seen[key]) return
    seen[key] = true
    result.push(value)
  }

  const hasRodentSignal = signals.hasRodent || (equipment && (equipment.rbsQty > 0 || equipment.multCatchQty > 0))
  const hasIltSignal = signals.hasIlt || (equipment && equipment.iltQty > 0)

  if (signals.hasGpc) {
    add('Pavement Ants')
  }
  if (hasRodentSignal) {
    add('Common Rodents')
  }
  if (signals.hasGpc) {
    add('Common Roaches')
  }
  if (hasIltSignal) {
    add('Common House Fly')
  }

  return result
}

// ============================================================================
// DATE EXTRACTION
// ============================================================================

interface ScheduleResult {
  requestedStartDate: string | null
  startMonth: string | null
}

function extractRequestedStart(lines: string[]): ScheduleResult {
  const result: ScheduleResult = { requestedStartDate: null, startMonth: null }

  const idx = findFirstIndex(lines, line =>
    /requested\s+start\s+date/i.test(line)
  )
  if (idx === -1) return result

  for (let i = idx; i <= idx + 3 && i < lines.length; i++) {
    const parsed = parseDateLine(lines[i])
    if (parsed) {
      result.requestedStartDate = parsed
      break
    }
  }

  if (result.requestedStartDate) {
    result.startMonth = monthNameFromIso(result.requestedStartDate)
  }

  return result
}

function parseDateLine(line: string): string | null {
  if (!line) return null

  // MM/DD/YYYY or MM-DD-YYYY
  const slashMatch = line.match(/([0-9]{1,2})[\/\-]([0-9]{1,2})[\/\-]([0-9]{4})/)
  if (slashMatch) {
    const month = slashMatch[1]
    const day = slashMatch[2]
    const year = slashMatch[3]
    return `${year}-${pad2(month)}-${pad2(day)}`
  }

  // Month DD, YYYY
  const textMatch = line.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-9]{1,2})(?:,?\s+([0-9]{4}))?/i)
  if (textMatch) {
    const monthName = textMatch[1].charAt(0).toUpperCase() + textMatch[1].slice(1).toLowerCase()
    const monthIndex = MONTH_NAMES_ARRAY.indexOf(monthName)
    if (monthIndex !== -1) {
      const dayText = textMatch[2]
      const yearText = textMatch[3] || new Date().getFullYear().toString()
      return `${yearText}-${pad2(monthIndex + 1)}-${pad2(dayText)}`
    }
  }

  return null
}

function monthNameFromIso(iso: string): string | null {
  if (!iso) return null
  const parts = iso.split('-')
  if (parts.length !== 3) return null
  const monthIndex = parseInt(parts[1], 10) - 1
  if (monthIndex >= 0 && monthIndex < MONTH_NAMES_ARRAY.length) {
    return MONTH_NAMES_ARRAY[monthIndex]
  }
  return null
}

// ============================================================================
// DESCRIPTION BUILDERS
// ============================================================================

function buildEquipmentSignature(equipment: ParsedEquipment): string {
  if (!equipment) return ''
  const parts: string[] = []
  if (equipment.multCatchQty) parts.push(`${formatQuantity(equipment.multCatchQty)} MRT`)
  if (equipment.rbsQty) parts.push(`${formatQuantity(equipment.rbsQty)} RBS`)
  if (equipment.iltQty) parts.push(`${formatQuantity(equipment.iltQty)} ILT`)
  equipment.otherEquipment.forEach(item => {
    if (!item || !item.name) return
    const qty = item.quantity ? `${formatQuantity(item.quantity)} ` : ''
    parts.push(qty + item.name)
  })
  return parts.join(', ')
}

function buildInitialDescription(equipment: ParsedEquipment, initialCost: number | null): string {
  const parts: string[] = []
  if (equipment.multCatchQty > 0) parts.push(`${equipment.multCatchQty} MRT`)
  if (equipment.rbsQty > 0) parts.push(`${equipment.rbsQty} RBS`)
  if (equipment.iltQty > 0) parts.push(`${equipment.iltQty} ILT`)
  if (!parts.length && initialCost && initialCost > 0) return 'Initial service'
  if (!parts.length) return 'Standard Initial Setup'
  const equipmentList = parts.length > 1
    ? parts.slice(0, -1).join(', ') + ', & ' + parts.slice(-1)
    : parts[0]
  return `Initial service and install ${equipmentList}`
}

function buildMaintenanceDescription(services: ParsedService[]): string {
  if (!services || services.length === 0) return 'Monthly GPC'

  let hasAfterHours = false
  const normalized = services.map(svc => {
    const rawName = (svc.serviceName || svc.programType || '').toLowerCase()
    if (/after\s+hours.*yes/i.test(rawName) || svc.afterHours) hasAfterHours = true

    const code = (svc.serviceCode || '').toUpperCase()
    const label = (() => {
      if (code === 'GPC') return 'GPC'
      if (code === 'RBS') return 'Exterior Rodent Monitoring'
      if (code === 'MRT') return 'Interior Rodent Monitoring'
      if (code === 'ILT') return 'ILT Maintenance'
      const name = svc.serviceName || svc.programType || 'Service'
      return name.replace(/maintenance/i, '').trim() || 'Service'
    })()

    let freq = svc.frequencyLabel || null
    if (!freq && svc.servicesPerYear) {
      freq = svc.servicesPerYear >= 24 ? 'Semi-Monthly' : svc.servicesPerYear >= 12 ? 'Monthly' : null
    }
    if (code === 'ILT' && svc.servicesPerYear >= 24) freq = 'Semi-Monthly'
    if (!freq) freq = 'Monthly'

    return { code, label, text: `${freq} ${label}` }
  }).filter(entry => ['GPC', 'RBS', 'MRT', 'ILT'].includes(entry.code))

  const order: Record<string, number> = { 'GPC': 0, 'RBS': 1, 'MRT': 2, 'ILT': 3 }
  normalized.sort((a, b) => {
    const ao = order[a.code] ?? 9
    const bo = order[b.code] ?? 9
    if (ao === bo) return a.text.localeCompare(b.text)
    return ao - bo
  })

  const dedup: typeof normalized = []
  normalized.forEach(entry => {
    if (!dedup.some(d => d.code === entry.code && d.label === entry.label)) {
      dedup.push(entry)
    }
  })

  let joined = dedup.length > 1
    ? dedup.slice(0, -1).map(e => e.text).join(', ') + ' & ' + dedup.slice(-1)[0].text
    : dedup[0]?.text || 'Monthly GPC'

  if (hasAfterHours) joined += ' (Includes After Hours Service)'
  return joined
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function roundCurrency(value: number | null): number | null {
  if (value === null || value === undefined) return null
  return Math.round(value * 100) / 100
}

function formatQuantity(value: number): string {
  if (value === null || value === undefined) return ''
  if (Math.abs(value - Math.round(value)) < 0.00001) {
    return String(Math.round(value))
  }
  return String(value)
}

function pad2(value: string | number): string {
  const str = String(value)
  return str.length === 1 ? '0' + str : str
}

function toTitleCase(value: string): string {
  if (!value) return ''
  return value.split(/\s+/).map(part => {
    if (!part.length) return part
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  }).join(' ')
}

function findFirstIndex(lines: string[], predicate: (line: string, index: number) => boolean): number {
  return findFirstIndexFrom(lines, 0, predicate)
}

function findFirstIndexFrom(
  lines: string[],
  start: number,
  predicate: (line: string, index: number) => boolean
): number {
  for (let i = start; i < lines.length; i++) {
    if (predicate(lines[i], i)) return i
  }
  return -1
}

function gatherBlock(
  lines: string[],
  startIdx: number,
  stopCheck: (line: string) => boolean,
  limit: number
): string[] {
  const block: string[] = []
  for (let i = startIdx; i < lines.length; i++) {
    if (limit && block.length >= limit) break
    const line = lines[i]
    if (!line) continue
    if (i !== startIdx && stopCheck(line)) break
    block.push(line)
  }
  return block
}

function isHeaderBlockStop(line: string): boolean {
  if (!line) return false
  const lower = line.toLowerCase()
  for (const terminator of HEADER_BLOCK_TERMINATORS) {
    if (lower.startsWith(terminator)) return true
  }
  return false
}

function isTailoredPreparedAnchor(line: string): boolean {
  if (!line) return false
  const normalized = normalizeLabelText(line)
  return normalized.startsWith('tailoredfor') ||
    normalized.startsWith('tailorfor') ||
    normalized.startsWith('taylorfor') ||
    normalized.startsWith('preparedfor')
}

function normalizeLabelText(line: string): string {
  if (!line) return ''
  return line.toLowerCase()
    .replace(/4/g, 'for')
    .replace(/[^a-z]/g, '')
}

function looksLikeAccountName(value: string): boolean {
  if (!value) return false
  if (value.includes('@')) return false
  if (/^[0-9]/.test(value)) return false
  if (value.length > 80) return false
  return true
}

function looksLikeContactName(value: string): boolean {
  if (!value) return false
  if (value.includes('@')) return false
  const parts = value.trim().split(/\s+/)
  if (parts.length < 2 || parts.length > 5) return false
  return /^[A-Za-z]/.test(parts[0])
}

function findAllEmails(lines: string[]): string[] {
  const emails: string[] = []
  for (const line of lines) {
    const regex = new RegExp(EMAIL_REGEX.source, EMAIL_REGEX.flags + 'g')
    let match
    while ((match = regex.exec(line)) !== null) {
      if (!emails.includes(match[1])) {
        emails.push(match[1])
      }
    }
  }
  return emails
}

function parseFirstCurrency(value: string): number | null {
  if (!value) return null
  const match = value.match(/\$([0-9][0-9,]*(?:\.[0-9]{2})?)/)
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''))
  }
  return null
}

function findCurrencyAfterLabel(lines: string[], labelRegex: RegExp): number | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const match = line.match(labelRegex)
    if (!match) continue
    const remainder = line.slice(match.index! + match[0].length).trim()
    const cleaned = remainder.replace(/^[:\s-]+/, '').trim()
    const value = parseFirstCurrency(cleaned)
    if (value !== null) return value

    // Try next 5 lines
    for (let look = 1; look <= 5; look++) {
      const nextIdx = i + look
      if (nextIdx >= lines.length) break
      const candidate = lines[nextIdx]
      if (!candidate) continue
      if (/^[a-z]+\s+(?:cost|price|total|investment)/i.test(candidate) && !candidate.includes('$')) break
      const fallback = parseFirstCurrency(candidate)
      if (fallback !== null) return fallback
    }
  }
  return null
}

function serviceOrder(code: string): number {
  const order: Record<string, number> = { 'GPC': 0, 'MRT': 1, 'RBS': 2, 'RODENT': 3, 'ILT': 4 }
  return order[code] ?? 10
}

function extractFrequencyLabel(text: string): string | null {
  if (!text) return null
  const value = text.split('(')[0].replace(/[-–]+/g, ' ').trim()
  if (!value) return null
  return toTitleCase(value)
}

function extractServicesPerYear(text: string, freqLabel: string | null): number | null {
  if (!text) return null
  const perYearMatch = text.match(/\((\d+)\s*x\)/i)
  if (perYearMatch) {
    return parseInt(perYearMatch[1], 10)
  }
  return inferServicesPerYear(freqLabel)
}

function inferServicesPerYear(label: string | null): number | null {
  if (!label) return null
  const lower = label.toLowerCase()
  if (lower.includes('weekly')) return 52
  if (lower.includes('bi-weekly')) return 26
  if (lower.includes('semi-monthly')) return 24
  if (lower.includes('monthly')) return 12
  if (lower.includes('quarter')) return 4
  if (lower.includes('semi-annual')) return 2
  if (lower.includes('annual') || lower.includes('yearly')) return 1
  return null
}

function splitCommaSafe(value: string): string[] {
  const result: string[] = []
  let current = ''
  let depth = 0
  for (const char of value) {
    if (char === '(') depth++
    if (char === ')' && depth > 0) depth--
    if (char === ',' && depth === 0) {
      if (current.trim()) result.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (current.trim()) result.push(current.trim())
  return result
}

function dedupeList(list: string[]): string[] {
  const result: string[] = []
  const seen: Record<string, boolean> = {}
  list.forEach(item => {
    if (!item) return
    const key = item.toLowerCase()
    if (seen[key]) return
    seen[key] = true
    result.push(item)
  })
  return result
}

function sanitizeHeaderBlock(block: string[]): string[] {
  const sanitized: string[] = []
  block.forEach(line => {
    if (!line) return
    const cleaned = stripHeaderLabelPrefixes(line)
    if (!cleaned) return
    if (isHeaderBlockStop(cleaned)) return
    if (/^page\s+\d+/i.test(cleaned)) return
    if (/https?:\/\//i.test(cleaned)) return
    if (/^[0-9]+$/.test(cleaned)) return
    sanitized.push(cleaned)
  })
  return sanitized
}

function stripHeaderLabelPrefixes(line: string): string {
  if (!line) return ''
  let result = line.trim()
  const patterns = [
    /^(tailor(?:ed)?|taylor)\s*(?:for|4)\b/i,
    /^prepared\s+for\b/i,
    /^account\s+name\b/i,
    /^customer\s+name\b/i
  ]
  for (const pattern of patterns) {
    if (pattern.test(result)) {
      result = result.replace(pattern, '').trim()
      break
    }
  }
  return result.replace(/^[:\s,-]+/, '')
}

function expandMergedHeaderLines(lines: string[]): string[] {
  const expanded: string[] = []
  lines.forEach(line => {
    if (!line) return
    const parts = splitMergedHeaderLine(line)
    parts.forEach(part => {
      if (part && part.trim().length) {
        expanded.push(part.trim())
      }
    })
  })
  return expanded
}

function splitMergedHeaderLine(line: string): string[] {
  if (!line) return []
  const trimmed = line.trim()
  if (!trimmed) return []
  if (ADDRESS_LINE_REGEX.test(trimmed) || CITY_STATE_ZIP_REGEX.test(trimmed)) {
    return [trimmed]
  }
  const results: string[] = []
  const firstDigit = trimmed.search(/\d/)
  if (firstDigit > 0) {
    const before = trimmed.slice(0, firstDigit).trim()
    const after = trimmed.slice(firstDigit).trim()
    if (before) {
      splitAccountAndContact(before).forEach(part => {
        if (part) results.push(part)
      })
    }
    if (after) {
      results.push(after)
    }
    return results
  }
  const splitParts = splitAccountAndContact(trimmed)
  if (splitParts.length > 1) {
    return splitParts
  }
  return [trimmed]
}

function splitAccountAndContact(text: string): string[] {
  if (!text) return []
  const tokens = text.trim().split(/\s+/)
  if ((/^\d/.test(text) && ADDRESS_LINE_REGEX.test(text)) || CITY_STATE_ZIP_REGEX.test(text)) {
    return [text]
  }
  if (tokens.length < 3) return [text]
  for (let split = 1; split <= tokens.length - 2; split++) {
    const accountCandidate = tokens.slice(0, split).join(' ')
    const contactCandidate = tokens.slice(split).join(' ')
    if (looksLikeContactName(contactCandidate)) {
      return [accountCandidate, contactCandidate]
    }
  }
  return [text]
}

interface AddressComponents {
  raw: string
  street: string | null
  city: string | null
  state: string
  zip: string
}

function extractInlineAddress(line: string): AddressComponents | null {
  if (!line) return null
  const cleaned = line.replace(/\s+\d{1,2}\s*$/, '').trim()
  const stateZipMatch = cleaned.match(/([A-Z]{2})[,\s]*([0-9]{5}(?:-?[0-9]{4})?)\s*$/)
  if (!stateZipMatch) return null

  const beforeState = cleaned.slice(0, stateZipMatch.index).trim().replace(/[,\s]+$/, '')
  let street: string | null = beforeState
  let city: string | null = null

  const streetSuffixPattern = /\b(Road|Rd|Street|St|Drive|Dr|Lane|Ln|Boulevard|Blvd|Avenue|Ave|Way|Court|Ct|Trail|Trl|Parkway|Pkwy|Circle|Cir)\b/gi
  let suffixMatch = null
  let match
  while ((match = streetSuffixPattern.exec(beforeState)) !== null) {
    suffixMatch = match
  }

  if (suffixMatch) {
    const suffixEnd = suffixMatch.index + suffixMatch[0].length
    const potentialCity = beforeState.slice(suffixEnd).trim().replace(/^,/, '').trim()
    if (potentialCity) {
      city = potentialCity
      street = beforeState.slice(0, suffixEnd).trim()
    }
  }

  if (!city) {
    const lastComma = beforeState.lastIndexOf(',')
    if (lastComma !== -1) {
      city = beforeState.slice(lastComma + 1).trim()
      street = beforeState.slice(0, lastComma).trim()
    }
  }

  return {
    raw: cleaned,
    street: street || beforeState,
    city: city,
    state: stateZipMatch[1],
    zip: stateZipMatch[2]
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate parsed draft for completeness
 */
export function validateParsedDraft(draft: SalesforceQuoteDraft): ParseValidationResult {
  const errors: Array<{ field: string; message: string }> = []
  const warnings: Array<{ field: string; message: string }> = []

  // Required fields
  if (!draft.accountName) {
    errors.push({ field: 'accountName', message: 'Account name is required' })
  }
  if (!draft.serviceAddressLine1) {
    errors.push({ field: 'serviceAddress', message: 'Service address is required' })
  }

  // Pricing validation
  if (draft.combinedInitialTotal === null && draft.servicesMonthlyTotal === null) {
    warnings.push({ field: 'pricing', message: 'No pricing information found' })
  }

  // Equipment validation
  const totalEquipment = (draft.equipment.multCatchQty || 0) +
                         (draft.equipment.rbsQty || 0) +
                         (draft.equipment.iltQty || 0)
  if (totalEquipment === 0) {
    warnings.push({ field: 'equipment', message: 'No equipment quantities found' })
  }

  // Services validation
  if (draft.services.length === 0) {
    warnings.push({ field: 'services', message: 'No services found - using defaults' })
  }

  // Contact validation
  if (!draft.contactEmail) {
    warnings.push({ field: 'contactEmail', message: 'Contact email not found' })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// ============================================================================
// FIELD MAPPING TO NEW START FORM
// ============================================================================

/**
 * Map parsed Salesforce draft to NewStartAEInput for form auto-fill
 */
export function mapToNewStartInput(draft: SalesforceQuoteDraft): Partial<NewStartAEInput> {
  // Determine frequency from services
  let maxServicesPerYear = 12 // Default monthly
  draft.services.forEach(svc => {
    if (svc.servicesPerYear > maxServicesPerYear) {
      maxServicesPerYear = svc.servicesPerYear
    }
  })

  // Map servicesPerYear to frequency code
  const frequencyMap: Record<number, string> = {
    1: '1',    // Annual
    2: '2',    // Semi-annual
    4: '4',    // Quarterly
    6: '6',    // Bi-monthly
    12: '12',  // Monthly
    24: '24',  // Semi-monthly
    52: '52',  // Weekly
  }
  const frequency = frequencyMap[maxServicesPerYear] || '12'

  return {
    accountName: draft.accountName || '',
    serviceAddress: draft.serviceAddress || '',
    salesRepsInvolved: draft.aeName || '',
    initialJobPrice: String(draft.combinedInitialTotal || 0),
    maintenancePrice: String(draft.servicesMonthlyTotal || 0),
    serviceType: draft.jobType === 'Contract' ? 'Contract' : 'Job 1x',
    frequency: frequency as '1' | '2' | '4' | '6' | '12' | '24',
    logBookNeeded: draft.logBookNeeded ? 'Y' : 'N',
    customerRequestedStartMonth: (draft.startMonth || '') as MonthName,
  }
}

/**
 * Helper to build full address from draft components
 */
export function buildFullAddress(draft: SalesforceQuoteDraft): string {
  const parts = [
    draft.serviceAddressLine1,
    draft.serviceCity,
    draft.serviceState,
    draft.serviceZip
  ].filter(Boolean)
  return parts.join(', ')
}

// ============================================================================
// PROPOSAL/SALE MAPPING (for Sales Tracker)
// ============================================================================

/**
 * Determine the primary service type from parsed services
 */
function inferServiceType(draft: SalesforceQuoteDraft): ServiceType {
  if (!draft.services || draft.services.length === 0) {
    return 'Pest Control'
  }

  // Check for specific service types in the parsed services
  const serviceNames = draft.services.map(s => s.serviceName.toLowerCase())
  const coveredPests = (draft.coveredPests || []).map(p => p.toLowerCase())

  // Check for termite
  if (serviceNames.some(s => s.includes('termite')) ||
      coveredPests.some(p => p.includes('termite'))) {
    return 'Termite'
  }

  // Check for rodent
  if (serviceNames.some(s => s.includes('rodent') || s.includes('mouse') || s.includes('rat')) ||
      coveredPests.some(p => p.includes('rodent') || p.includes('mouse') || p.includes('rat'))) {
    return 'Rodent Control'
  }

  // Check for bed bug
  if (serviceNames.some(s => s.includes('bed bug')) ||
      coveredPests.some(p => p.includes('bed bug'))) {
    return 'Bed Bug'
  }

  // Check for mosquito
  if (serviceNames.some(s => s.includes('mosquito')) ||
      coveredPests.some(p => p.includes('mosquito'))) {
    return 'Mosquito'
  }

  // Check for wildlife
  if (serviceNames.some(s => s.includes('wildlife')) ||
      coveredPests.some(p => p.includes('wildlife'))) {
    return 'Wildlife'
  }

  // Default to general pest control
  if (serviceNames.some(s => s.includes('general pest') || s.includes('gpc'))) {
    return 'Gen Pest'
  }

  return 'Pest Control'
}

/**
 * Determine lead type from draft (defaults to Inbound)
 */
function inferLeadType(draft: SalesforceQuoteDraft): LeadType {
  // If we have leadType in the draft, use it
  if (draft.leadType) {
    const lt = draft.leadType.toLowerCase()
    if (lt.includes('inbound') || lt.includes('in bound')) return 'Inbound'
    if (lt.includes('tap')) return 'TAP'
    if (lt.includes('creative') || lt.includes('outbound') || lt.includes('canvass')) return 'Creative'
  }
  // Default to Inbound for Salesforce quotes
  return 'Inbound'
}

/**
 * Determine job type from draft
 */
function inferJobType(draft: SalesforceQuoteDraft): JobType {
  if (draft.jobType === 'Contract') return 'Contract'
  if (draft.servicesMonthlyTotal && draft.servicesMonthlyTotal > 0) return 'Contract'
  return 'One-Time'
}

/**
 * Map SalesforceQuoteDraft to Proposal (without id - will be assigned on save)
 */
export function mapToProposal(draft: SalesforceQuoteDraft): Omit<Proposal, 'id'> {
  const today = new Date().toISOString().split('T')[0]
  const serviceType = inferServiceType(draft)
  const isTermite = serviceType === 'Termite' || serviceType === 'Termite (Res)'

  // Determine pricing split
  // If termite service, put initial in termitePrice, else in jobWorkPrice
  let jobWorkPrice = 0
  let termitePrice = 0
  const contractPrice = draft.servicesMonthlyTotal || 0

  if (isTermite) {
    termitePrice = draft.combinedInitialTotal || 0
  } else {
    jobWorkPrice = draft.combinedInitialTotal || 0
  }

  return {
    date: draft.requestedStartDate || today,
    companyName: draft.accountName || '',
    leadType: inferLeadType(draft),
    service: serviceType,
    jobType: inferJobType(draft),
    jobWorkPrice,
    termitePrice,
    contractPrice,
    sold: false,
    dead: false,
  }
}

/**
 * Map SalesforceQuoteDraft to Sale (without id - will be assigned on save)
 */
export function mapToSale(draft: SalesforceQuoteDraft): Omit<Sale, 'id'> {
  const today = new Date().toISOString().split('T')[0]
  const serviceType = inferServiceType(draft)
  const isTermite = serviceType === 'Termite' || serviceType === 'Termite (Res)'

  // Determine pricing split
  let jobWorkPrice = 0
  let termitePrice = 0
  const contractPrice = draft.servicesMonthlyTotal || 0

  if (isTermite) {
    termitePrice = draft.combinedInitialTotal || 0
  } else {
    jobWorkPrice = draft.combinedInitialTotal || 0
  }

  return {
    date: draft.requestedStartDate || today,
    companyName: draft.accountName || '',
    leadType: inferLeadType(draft),
    service: serviceType,
    jobType: inferJobType(draft),
    jobWorkPrice,
    termitePrice,
    contractPrice,
    started: false,
    paid: false,
    pestPacId: '',
  }
}
