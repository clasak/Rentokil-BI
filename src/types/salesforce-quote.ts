/**
 * Salesforce Quote Parser Types
 *
 * Types for parsing Salesforce quote PDFs and generating Start Packets
 */

// Equipment parsed from Salesforce quote
export interface ParsedEquipment {
  rbsQty: number          // Rodent Bait Stations
  multCatchQty: number    // Multi-Catch Traps (MRT)
  iltQty: number          // Insect Light Traps
  otherEquipment: Array<{
    name: string
    quantity: number
  }>
  summary: string         // e.g., "22 MRT, 14 RBS, 4 ILT"
}

// Service parsed from Salesforce quote
export interface ParsedService {
  serviceName: string
  serviceCode: string     // 'GPC' | 'MRT' | 'RBS' | 'ILT' | 'RODENT'
  category: string
  programType: string
  descriptionText: string
  frequencyLabel: string  // 'Monthly' | 'Semi-Monthly' | 'Quarterly' etc
  servicesPerYear: number
  afterHours: boolean | null
  initialAmount: number | null
  pricePerService: number | null
}

// SRA (Safety Risk Assessment) hazard entry
export interface SRAHazard {
  hazard: string
  control: string
  safeToProceed: boolean
}

// Main parser output - complete draft from Salesforce quote
export interface SalesforceQuoteDraft {
  // Account & Contact
  accountName: string | null
  contactName: string | null
  contactEmail: string | null

  // Service Address
  serviceAddressLine1: string | null
  serviceCity: string | null
  serviceState: string | null
  serviceZip: string | null
  serviceAddress: string | null  // Combined full address

  // AE Information
  aeName: string | null
  aeEmail: string | null
  branchId: string

  // Job Classification
  jobType: 'Contract' | null
  leadType: string | null
  serviceType: string | null

  // Services & Equipment
  services: ParsedService[]
  equipment: ParsedEquipment

  // Pricing
  equipmentOneTimeTotal: number | null
  servicesInitialTotal: number | null
  combinedInitialTotal: number | null
  servicesMonthlyTotal: number | null
  combinedMonthlyTotal: number | null
  servicesAnnualTotal: number | null
  combinedAnnualTotal: number | null
  monthlyCost: number | null
  annualCost: number | null

  // Schedule
  requestedStartDate: string | null  // ISO date
  startMonth: string | null          // Month name

  // Pests
  coveredPests: string[]

  // Auto-Generated Descriptions
  initialServiceDescription: string | null
  maintenanceScopeDescription: string | null

  // Additional Fields
  logBookNeeded: boolean
  pnolRequired: boolean

  // Billing
  billingEmail: string | null
  billingAddress: string | null
  billingAddressDifferent: boolean

  // SRA (Safety Risk Assessment)
  sraCompletedBy: string | null
  sraDate: string | null
  sraTime: string | null
  sraCompletedAt: string | null
  sraAdditionalHazards: string | null
  sraHazards: SRAHazard[]
}

// Validation result for parsed data
export interface ParseValidationResult {
  isValid: boolean
  errors: Array<{
    field: string
    message: string
  }>
  warnings: Array<{
    field: string
    message: string
  }>
}

// Parse status for UI
export type ParseStatus = 'idle' | 'loading' | 'success' | 'error'

// Start Packet data structure (extends draft with additional metadata)
export interface StartPacket extends SalesforceQuoteDraft {
  id: string
  createdAt: string
  updatedAt: string
  status: StartPacketStatus
  pdfStorageKey: string | null  // Reference to stored PDF
  emailSent: boolean
  emailSentAt: string | null
}

export type StartPacketStatus =
  | 'draft'           // Created but not submitted
  | 'pending_ops'     // Submitted, waiting for Ops
  | 'ops_reviewing'   // Ops has started review
  | 'approved'        // Approved by Ops
  | 'rejected'        // Rejected, needs revision
  | 'completed'       // Fully processed

// Email notification data
export interface OpsEmailNotification {
  to: string[]
  subject: string
  body: string
  startPacketId: string
  accountName: string
  contactName: string
  serviceAddress: string
  initialPrice: number
  monthlyPrice: number
  coveredPests: string[]
  maintenanceScope: string
  frequency: string
  specialNotes: string
}

// API Response types
export interface StartPacketCreateResponse {
  success: boolean
  startPacket: StartPacket
  message: string
}

export interface OpsEmailResponse {
  success: boolean
  emailPreview: {
    to: string
    subject: string
    body: string
  }
  message: string
  actualEmailSent: boolean  // true if real email was sent (live mode)
}

// PDF Storage metadata
export interface PDFStorageMetadata {
  key: string
  filename: string
  size: number
  uploadedAt: string
  startPacketId: string | null
}

// Service signals from parser
export interface ServiceSignals {
  hasGpc: boolean
  hasRodent: boolean
  hasIlt: boolean
}

// Frequency mapping
export const FREQUENCY_MAP: Record<number, string> = {
  1: '1',    // Annual
  2: '2',    // Semi-annual
  4: '4',    // Quarterly
  6: '6',    // Bi-monthly
  12: '12',  // Monthly
  24: '24',  // Semi-monthly
  52: '52',  // Weekly
}

// Month names for parsing
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const

export type MonthName = typeof MONTH_NAMES[number]

// Default SRA hazards
export const DEFAULT_SRA_HAZARDS: SRAHazard[] = [
  { hazard: 'Slippery or uneven surfaces', control: 'Wear appropriate footwear', safeToProceed: true },
  { hazard: 'Overhead hazards (pipes, low ceilings)', control: 'Watch for head clearance', safeToProceed: true },
  { hazard: 'Working at heights (ladders, platforms)', control: 'Use proper ladder safety', safeToProceed: true },
  { hazard: 'Chemicals or hazardous materials present', control: 'Follow safety data sheets', safeToProceed: true },
  { hazard: 'Electrical hazards', control: 'Avoid contact with electrical equipment', safeToProceed: true },
  { hazard: 'Poor lighting in service areas', control: 'Use flashlight/headlamp', safeToProceed: true }
]
