/**
 * Master Lead Service Engine - Data Layer
 *
 * Types, stage configurations, and demo data generation for the
 * end-to-end lead-to-service pipeline visualization.
 *
 * Strategic Initiative owned by BI Leadership
 */

import seedrandom from 'seedrandom'

// ============================================================================
// TYPES
// ============================================================================

export type LeadStage =
  | 'lead_intake'
  | 'sales_handoff'
  | 'sales_process'
  | 'start_packet'
  | 'ops_handoff'
  | 'service_delivery'

export type HealthStatus = 'healthy' | 'at_risk' | 'critical'

export type RiskReason =
  | 'exceeded_sla'
  | 'no_activity'
  | 'missing_data'
  | 'handoff_delayed'
  | 'reassignment_pending'

export type HandoffType = 'bd_to_sales' | 'sales_to_ops'

export interface StageDefinition {
  id: LeadStage
  name: string
  shortName: string
  description: string
  owner: string
  ownerRole: string
  entryCriteria: string[]
  exitCriteria: string[]
  targetHours: number
  atRiskThresholdHours: number
  criticalThresholdHours: number
  requiredFields: string[]
  automationOpportunities: string[]
  isHandoffStage: boolean
}

export interface StageHistoryEntry {
  stage: LeadStage
  enteredAt: Date
  exitedAt?: Date
  owner: string
}

export interface Lead {
  id: string
  companyName: string
  contactName: string
  contactEmail: string
  contactPhone: string
  propertyType: string
  propertyAddress: string
  pestType: string
  serviceUrgency: string
  estimatedValue: number
  currentStage: LeadStage
  stageEnteredAt: Date
  daysInStage: number
  hoursInStage: number
  healthStatus: HealthStatus
  riskReasons: RiskReason[]
  owner: string
  ownerRole: string
  assignedBD?: string
  assignedAE?: string
  assignedTech?: string
  createdAt: Date
  sourceChannel: string
  stageHistory: StageHistoryEntry[]
  handoffStatus?: 'pending' | 'completed' | 'delayed'
  startPacketComplete?: boolean
  missingFields?: string[]
  lastActivityAt: Date
  notes?: string
}

export interface HandoffMetrics {
  type: HandoffType
  displayName: string
  pending: number
  avgWaitHours: number
  delayedCount: number
  slaCompliance: number
  trend: { day: string; hours: number; count: number }[]
  leadsAtRisk: number
}

export interface StageMetrics {
  stage: LeadStage
  stageName: string
  leadCount: number
  avgDaysInStage: number
  avgHoursInStage: number
  healthyCount: number
  atRiskCount: number
  criticalCount: number
  slaCompliance: number
  healthStatus: HealthStatus
  // Value metrics (J2 - Leadership request)
  totalValue: number
  avgValue: number
  atRiskValue: number
}

export interface AutomationOpportunity {
  id: string
  name: string
  category: string
  currentProcess: string
  automatedProcess: string
  manualTimeMinutes: number
  automatedTimeMinutes: number
  implementationStatus: 'planned' | 'in_progress' | 'ready' | 'active'
}

export interface AutomationRule {
  id: string
  name: string
  trigger: string
  condition: string
  action: string
  status: 'planned' | 'active'
}

export interface IntegrationSource {
  id: string
  name: string
  system: string
  status: 'active' | 'pending_access' | 'access_requested' | 'ready' | 'planned'
  description: string
  fields: string[]
  lastSync?: Date
  recordCount?: number
}

export interface FieldMapping {
  id: string
  sourceSystem: string
  sourceField: string
  targetField: string
  transform?: string
  status: 'mapped' | 'pending' | 'tbd'
}

// ============================================================================
// STAGE CONFIGURATION (Easy to modify)
// ============================================================================

export const STAGE_CONFIG: Record<LeadStage, StageDefinition> = {
  lead_intake: {
    id: 'lead_intake',
    name: 'Lead Intake',
    shortName: 'Intake',
    description: 'Business Development enters new leads into the system after initial customer contact.',
    owner: 'Business Development',
    ownerRole: 'BD Rep',
    entryCriteria: [
      'Customer inquiry received (call, web form, field contact)',
      'Basic contact information collected',
      'Service interest confirmed'
    ],
    exitCriteria: [
      'All required lead fields populated',
      'Lead source documented',
      'Territory/region identified',
      'Lead assigned to appropriate AE'
    ],
    targetHours: 24,
    atRiskThresholdHours: 18,
    criticalThresholdHours: 24,
    requiredFields: [
      'Company/Customer Name',
      'Contact Name',
      'Phone Number',
      'Service Address',
      'Lead Source',
      'Pest Type/Service Need'
    ],
    automationOpportunities: [
      'Auto-populate fields from web forms',
      'Territory auto-assignment based on ZIP',
      'Duplicate lead detection'
    ],
    isHandoffStage: false
  },
  sales_handoff: {
    id: 'sales_handoff',
    name: 'Sales Handoff',
    shortName: 'BD→Sales',
    description: 'BD emails lead information to Sales Manager and assigned AE. This is a manual handoff point.',
    owner: 'Business Development → Sales',
    ownerRole: 'BD Rep / Sales Manager',
    entryCriteria: [
      'Lead intake complete',
      'All required fields populated',
      'AE assignment determined'
    ],
    exitCriteria: [
      'Email sent to Sales Manager and AE',
      'AE acknowledges receipt',
      'Lead ownership transferred in CRM'
    ],
    targetHours: 24,
    atRiskThresholdHours: 18,
    criticalThresholdHours: 24,
    requiredFields: [
      'Assigned AE',
      'Handoff email sent',
      'AE acknowledgment'
    ],
    automationOpportunities: [
      'Automated lead routing to AE',
      'CRM ownership auto-transfer',
      'Instant notification to AE (no email)',
      'SLA countdown alerts'
    ],
    isHandoffStage: true
  },
  sales_process: {
    id: 'sales_process',
    name: 'Sales Process',
    shortName: 'Sales',
    description: 'AE works the lead through qualification, site visit, proposal, and close.',
    owner: 'Account Executive',
    ownerRole: 'AE',
    entryCriteria: [
      'Lead received from BD',
      'AE has acknowledged ownership',
      'Customer contact information verified'
    ],
    exitCriteria: [
      'Deal closed won (or lost)',
      'Contract signed',
      'Service terms agreed',
      'Pricing finalized'
    ],
    targetHours: 336, // 14 days
    atRiskThresholdHours: 240, // 10 days
    criticalThresholdHours: 336, // 14 days
    requiredFields: [
      'Qualification status',
      'Site visit scheduled/completed',
      'Proposal sent',
      'Contract value',
      'Service frequency'
    ],
    automationOpportunities: [
      'Automated follow-up reminders',
      'Proposal template generation',
      'Activity tracking dashboard',
      'Stale lead alerts'
    ],
    isHandoffStage: false
  },
  start_packet: {
    id: 'start_packet',
    name: 'Start Packet',
    shortName: 'Packet',
    description: 'AE creates start packet documentation with all service details for operations.',
    owner: 'Account Executive',
    ownerRole: 'AE',
    entryCriteria: [
      'Deal closed won',
      'Contract signed',
      'Payment terms confirmed'
    ],
    exitCriteria: [
      'Start packet form completed',
      'Service schedule defined',
      'Special instructions documented',
      'Customer preferences recorded'
    ],
    targetHours: 48,
    atRiskThresholdHours: 36,
    criticalThresholdHours: 48,
    requiredFields: [
      'Service address (verified)',
      'Service frequency',
      'Preferred service day/time',
      'Access instructions',
      'Billing information',
      'Special instructions',
      'Primary contact for service'
    ],
    automationOpportunities: [
      'Digital start packet form',
      'Auto-populate from CRM',
      'Required field validation',
      'PDF generation for records'
    ],
    isHandoffStage: false
  },
  ops_handoff: {
    id: 'ops_handoff',
    name: 'Ops Handoff',
    shortName: 'Sales→Ops',
    description: 'AE emails start packet to Operations for service scheduling. This is a manual handoff point.',
    owner: 'Account Executive → Operations',
    ownerRole: 'AE / Ops Manager',
    entryCriteria: [
      'Start packet completed',
      'All required fields populated',
      'Service ready to schedule'
    ],
    exitCriteria: [
      'Email sent to Operations',
      'Ops acknowledges receipt',
      'Technician assigned',
      'Initial service scheduled'
    ],
    targetHours: 24,
    atRiskThresholdHours: 18,
    criticalThresholdHours: 24,
    requiredFields: [
      'Assigned Operations Manager',
      'Assigned Technician',
      'Handoff email sent',
      'Ops acknowledgment'
    ],
    automationOpportunities: [
      'Automated routing to Ops queue',
      'Auto-assignment based on territory/capacity',
      'Instant notification (no email)',
      'Start packet validation before handoff'
    ],
    isHandoffStage: true
  },
  service_delivery: {
    id: 'service_delivery',
    name: 'Service Delivery',
    shortName: 'Service',
    description: 'Operations executes initial service and ongoing maintenance.',
    owner: 'Operations',
    ownerRole: 'Technician',
    entryCriteria: [
      'Ops handoff complete',
      'Technician assigned',
      'Service scheduled',
      'Customer notified'
    ],
    exitCriteria: [
      'Initial service completed',
      'Service report filed',
      'Customer satisfaction confirmed',
      'Recurring schedule set (if applicable)'
    ],
    targetHours: 168, // 7 days
    atRiskThresholdHours: 120, // 5 days
    criticalThresholdHours: 168, // 7 days
    requiredFields: [
      'Service date/time',
      'Technician name',
      'Service completion status',
      'Customer signature',
      'Follow-up scheduled (if needed)'
    ],
    automationOpportunities: [
      'Route optimization',
      'Automated customer notifications',
      'Digital service reports',
      'Real-time status updates'
    ],
    isHandoffStage: false
  }
}

export const STAGE_ORDER: LeadStage[] = [
  'lead_intake',
  'sales_handoff',
  'sales_process',
  'start_packet',
  'ops_handoff',
  'service_delivery'
]

// ============================================================================
// AUTOMATION RULES (Placeholder for rules engine)
// ============================================================================

export const AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'RULE-001',
    name: 'Handoff SLA Alert',
    trigger: 'Lead in handoff stage',
    condition: 'Time in stage > 18 hours',
    action: 'Send alert to Sales Manager / Ops Manager',
    status: 'planned'
  },
  {
    id: 'RULE-002',
    name: 'Critical Escalation',
    trigger: 'Lead exceeds critical threshold',
    condition: 'Time in stage > critical threshold',
    action: 'Escalate to Director, flag in dashboard',
    status: 'planned'
  },
  {
    id: 'RULE-003',
    name: 'Stale Lead Alert',
    trigger: 'No activity on lead',
    condition: 'Last activity > 7 days',
    action: 'Send reminder to owner, add to at-risk list',
    status: 'planned'
  },
  {
    id: 'RULE-004',
    name: 'Start Packet Validation',
    trigger: 'Ops handoff initiated',
    condition: 'Required fields missing',
    action: 'Block handoff, notify AE of missing fields',
    status: 'planned'
  },
  {
    id: 'RULE-005',
    name: 'Auto-Assignment',
    trigger: 'New lead created',
    condition: 'Territory identified',
    action: 'Auto-assign to AE based on territory rules',
    status: 'planned'
  }
]

// ============================================================================
// AUTOMATION OPPORTUNITIES
// ============================================================================

export const AUTOMATION_OPPORTUNITIES: AutomationOpportunity[] = [
  {
    id: 'AUTO-001',
    name: 'BD→Sales Email Elimination',
    category: 'Handoff',
    currentProcess: 'BD manually emails lead details to Sales Manager and AE',
    automatedProcess: 'Lead auto-routes to AE with instant notification',
    manualTimeMinutes: 15,
    automatedTimeMinutes: 0,
    implementationStatus: 'planned'
  },
  {
    id: 'AUTO-002',
    name: 'Territory-Based Auto-Routing',
    category: 'Assignment',
    currentProcess: 'BD looks up territory manually, selects AE from list',
    automatedProcess: 'ZIP code triggers automatic AE assignment',
    manualTimeMinutes: 10,
    automatedTimeMinutes: 0,
    implementationStatus: 'planned'
  },
  {
    id: 'AUTO-003',
    name: 'Digital Start Packet',
    category: 'Documentation',
    currentProcess: 'AE fills paper form or Word doc, emails PDF',
    automatedProcess: 'Digital form auto-populates from CRM, validates fields',
    manualTimeMinutes: 25,
    automatedTimeMinutes: 5,
    implementationStatus: 'ready'
  },
  {
    id: 'AUTO-004',
    name: 'Sales→Ops Email Elimination',
    category: 'Handoff',
    currentProcess: 'AE manually emails start packet to Ops',
    automatedProcess: 'Completed packet auto-routes to Ops queue',
    manualTimeMinutes: 10,
    automatedTimeMinutes: 0,
    implementationStatus: 'planned'
  },
  {
    id: 'AUTO-005',
    name: 'SLA Monitoring & Alerts',
    category: 'Monitoring',
    currentProcess: 'Manual review of pipeline, no proactive alerts',
    automatedProcess: 'Real-time SLA tracking with automatic escalation',
    manualTimeMinutes: 30,
    automatedTimeMinutes: 0,
    implementationStatus: 'planned'
  },
  {
    id: 'AUTO-006',
    name: 'Lead Data Validation',
    category: 'Data Quality',
    currentProcess: 'Ops discovers missing info, calls AE to get details',
    automatedProcess: 'Required fields validated at entry, blocks progression if incomplete',
    manualTimeMinutes: 20,
    automatedTimeMinutes: 0,
    implementationStatus: 'planned'
  },
  {
    id: 'AUTO-007',
    name: 'Customer Notifications',
    category: 'Communication',
    currentProcess: 'Manual calls/emails at each stage',
    automatedProcess: 'Automated status updates via email/SMS',
    manualTimeMinutes: 15,
    automatedTimeMinutes: 2,
    implementationStatus: 'planned'
  }
]

// ============================================================================
// INTEGRATION SOURCES
// ============================================================================

export const INTEGRATION_SOURCES: IntegrationSource[] = [
  {
    id: 'INT-001',
    name: 'Salesforce',
    system: 'CRM',
    status: 'pending_access',
    description: 'Primary CRM containing leads, opportunities, accounts, and contacts.',
    fields: ['Lead', 'Opportunity', 'Account', 'Contact', 'Task', 'Activity']
  },
  {
    id: 'INT-002',
    name: 'RTX Data Hub',
    system: 'Data Warehouse',
    status: 'access_requested',
    description: 'Central data warehouse for cross-system analytics and reporting.',
    fields: ['Customer Master', 'Service History', 'Financial Data']
  },
  {
    id: 'INT-003',
    name: 'PDF Parser',
    system: 'Document Processing',
    status: 'ready',
    description: 'Extract structured data from start packet PDFs for digitization.',
    fields: ['Service Address', 'Contact Info', 'Service Requirements', 'Special Instructions']
  },
  {
    id: 'INT-004',
    name: 'New Start Log',
    system: 'Internal Spreadsheet',
    status: 'active',
    description: 'Existing Google Sheets tracking new customer starts.',
    fields: ['Customer Name', 'AE', 'Start Date', 'Service Type', 'Contract Value'],
    lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
    recordCount: 127
  }
]

// ============================================================================
// FIELD MAPPINGS
// ============================================================================

export const FIELD_MAPPINGS: FieldMapping[] = [
  { id: 'FM-001', sourceSystem: 'Salesforce', sourceField: 'Lead.Company', targetField: 'companyName', status: 'pending' },
  { id: 'FM-002', sourceSystem: 'Salesforce', sourceField: 'Lead.FirstName + LastName', targetField: 'contactName', transform: 'Concatenate', status: 'pending' },
  { id: 'FM-003', sourceSystem: 'Salesforce', sourceField: 'Lead.Email', targetField: 'contactEmail', status: 'pending' },
  { id: 'FM-004', sourceSystem: 'Salesforce', sourceField: 'Lead.Phone', targetField: 'contactPhone', status: 'pending' },
  { id: 'FM-005', sourceSystem: 'Salesforce', sourceField: 'Lead.Street + City + State + Zip', targetField: 'propertyAddress', transform: 'Concatenate', status: 'pending' },
  { id: 'FM-006', sourceSystem: 'Salesforce', sourceField: 'Lead.LeadSource', targetField: 'sourceChannel', status: 'pending' },
  { id: 'FM-007', sourceSystem: 'Salesforce', sourceField: 'Opportunity.Amount', targetField: 'estimatedValue', status: 'pending' },
  { id: 'FM-008', sourceSystem: 'Salesforce', sourceField: 'Opportunity.StageName', targetField: 'currentStage', transform: 'Stage mapping lookup', status: 'tbd' },
  { id: 'FM-009', sourceSystem: 'Salesforce', sourceField: 'Opportunity.OwnerId', targetField: 'assignedAE', transform: 'User lookup', status: 'pending' },
  { id: 'FM-010', sourceSystem: 'New Start Log', sourceField: 'Customer Name', targetField: 'companyName', status: 'mapped' },
  { id: 'FM-011', sourceSystem: 'New Start Log', sourceField: 'AE', targetField: 'assignedAE', status: 'mapped' },
  { id: 'FM-012', sourceSystem: 'New Start Log', sourceField: 'Contract Value', targetField: 'estimatedValue', status: 'mapped' },
]

// ============================================================================
// DEMO DATA GENERATION
// ============================================================================

let rng: () => number

function initSeed(seed: number = 54321) {
  rng = seedrandom(seed.toString())
}

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return rng() * (max - min) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + rng() * (end.getTime() - start.getTime()))
}

// Demo data constants
const COMPANY_PREFIXES = ['Acme', 'Metro', 'First', 'Premier', 'National', 'Elite', 'Pacific', 'Atlantic', 'Central', 'Golden', 'Silver', 'Diamond', 'Crown', 'Royal', 'Summit']
const COMPANY_SUFFIXES = ['Restaurant', 'Hotel', 'Medical Center', 'Office Park', 'Shopping Center', 'Apartments', 'Warehouse', 'Manufacturing', 'Distribution', 'Corporate Center', 'Plaza', 'Suites', 'Gardens', 'Towers', 'Commons']
const FIRST_NAMES = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Amanda', 'William', 'Jennifer', 'James', 'Lisa', 'Chris', 'Michelle', 'Daniel']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson']
const PROPERTY_TYPES = ['Commercial - Restaurant/Food Service', 'Commercial - Office', 'Commercial - Healthcare', 'Commercial - Retail', 'Commercial - Hospitality', 'Commercial - Industrial', 'Multi-Family Residential', 'Commercial - Property Management']
const PEST_TYPES = ['General Pest', 'Rodents', 'Cockroaches', 'Ants', 'Termites', 'Flies', 'Bed Bugs', 'Wildlife', 'Multiple/Unknown']
const URGENCY_LEVELS = ['Emergency (Same Day)', 'Urgent (Within 48 Hours)', 'Standard (Within Week)', 'Quote Only (No Rush)']
const SOURCE_CHANNELS = ['Inbound Call', 'Web Form', 'Field Generated', 'Referral - Customer', 'Referral - Partner', 'Marketing Campaign', 'Door Knock', 'Commercial Prospecting']
const BD_REPS = ['Tom Wilson', 'Maria Garcia', 'Kevin Chen', 'Lisa Park']
const AE_NAMES = ['Sarah Johnson', 'Mike Chen', 'Emily Davis', 'James Wilson', 'Amanda Martinez']
const OPS_MANAGERS = ['Robert Taylor', 'Jennifer Moore']
const TECHNICIANS = ['Chris Anderson', 'David Brown', 'Jessica Thomas', 'Michael Jackson']

const CITIES = [
  { city: 'Memphis', state: 'TN', zip: '38103' },
  { city: 'Nashville', state: 'TN', zip: '37201' },
  { city: 'Dallas', state: 'TX', zip: '75201' },
  { city: 'Houston', state: 'TX', zip: '77001' },
  { city: 'Atlanta', state: 'GA', zip: '30301' },
  { city: 'Charlotte', state: 'NC', zip: '28201' },
  { city: 'Phoenix', state: 'AZ', zip: '85001' },
  { city: 'Denver', state: 'CO', zip: '80201' },
]

// Generate a single lead
function generateLead(id: number, targetStage: LeadStage, healthBias: HealthStatus): Lead {
  const companyName = `${randomChoice(COMPANY_PREFIXES)} ${randomChoice(COMPANY_SUFFIXES)}`
  const firstName = randomChoice(FIRST_NAMES)
  const lastName = randomChoice(LAST_NAMES)
  const location = randomChoice(CITIES)
  const streetNum = randomInt(100, 9999)
  const streetName = randomChoice(['Main St', 'Oak Ave', 'Commerce Blvd', 'Industrial Dr', 'Park Way', 'Business Loop', 'Corporate Dr'])

  const stageConfig = STAGE_CONFIG[targetStage]
  const stageIndex = STAGE_ORDER.indexOf(targetStage)

  // Calculate time in stage based on health bias
  let hoursInStage: number
  if (healthBias === 'healthy') {
    hoursInStage = randomFloat(1, stageConfig.atRiskThresholdHours * 0.7)
  } else if (healthBias === 'at_risk') {
    hoursInStage = randomFloat(stageConfig.atRiskThresholdHours, stageConfig.criticalThresholdHours * 0.95)
  } else {
    hoursInStage = randomFloat(stageConfig.criticalThresholdHours, stageConfig.criticalThresholdHours * 2)
  }

  const daysInStage = hoursInStage / 24
  const stageEnteredAt = new Date(Date.now() - hoursInStage * 60 * 60 * 1000)

  // Determine actual health status
  let healthStatus: HealthStatus = 'healthy'
  const riskReasons: RiskReason[] = []

  if (hoursInStage >= stageConfig.criticalThresholdHours) {
    healthStatus = 'critical'
    riskReasons.push('exceeded_sla')
  } else if (hoursInStage >= stageConfig.atRiskThresholdHours) {
    healthStatus = 'at_risk'
    if (hoursInStage >= stageConfig.criticalThresholdHours * 0.9) {
      riskReasons.push('exceeded_sla')
    }
  }

  // Add additional risk reasons for variety
  if (healthStatus !== 'healthy' && rng() < 0.3) {
    riskReasons.push('no_activity')
  }
  if (stageConfig.isHandoffStage && healthStatus !== 'healthy') {
    riskReasons.push('handoff_delayed')
  }

  // Missing fields for some at-risk/critical leads
  const missingFields: string[] = []
  if (healthStatus !== 'healthy' && rng() < 0.4) {
    const possibleMissing = stageConfig.requiredFields.slice(0, 3)
    missingFields.push(randomChoice(possibleMissing))
    if (missingFields.length > 0) {
      riskReasons.push('missing_data')
    }
  }

  // Build stage history
  const stageHistory: StageHistoryEntry[] = []
  const leadCreatedAt = new Date(stageEnteredAt.getTime() - randomInt(1, 30) * 24 * 60 * 60 * 1000)
  let historyDate = new Date(leadCreatedAt)

  for (let i = 0; i <= stageIndex; i++) {
    const stage = STAGE_ORDER[i]
    const config = STAGE_CONFIG[stage]
    const owner = i <= 1 ? randomChoice(BD_REPS) :
                  i <= 3 ? randomChoice(AE_NAMES) :
                  randomChoice(OPS_MANAGERS)

    const entry: StageHistoryEntry = {
      stage,
      enteredAt: new Date(historyDate),
      owner
    }

    if (i < stageIndex) {
      const timeInStage = randomFloat(config.targetHours * 0.3, config.targetHours * 1.2) * 60 * 60 * 1000
      historyDate = new Date(historyDate.getTime() + timeInStage)
      entry.exitedAt = new Date(historyDate)
    }

    stageHistory.push(entry)
  }

  // Determine owners
  const assignedBD = randomChoice(BD_REPS)
  const assignedAE = stageIndex >= 1 ? randomChoice(AE_NAMES) : undefined
  const assignedTech = stageIndex >= 5 ? randomChoice(TECHNICIANS) : undefined

  let owner: string
  let ownerRole: string
  if (stageIndex <= 1) {
    owner = assignedBD
    ownerRole = 'BD Rep'
  } else if (stageIndex <= 3) {
    owner = assignedAE || randomChoice(AE_NAMES)
    ownerRole = 'Account Executive'
  } else if (stageIndex === 4) {
    owner = randomChoice(OPS_MANAGERS)
    ownerRole = 'Ops Manager'
  } else {
    owner = assignedTech || randomChoice(TECHNICIANS)
    ownerRole = 'Technician'
  }

  // Handoff status for handoff stages
  let handoffStatus: 'pending' | 'completed' | 'delayed' | undefined
  if (stageConfig.isHandoffStage) {
    if (healthStatus === 'critical') {
      handoffStatus = 'delayed'
    } else if (healthStatus === 'at_risk') {
      handoffStatus = rng() < 0.5 ? 'delayed' : 'pending'
    } else {
      handoffStatus = 'pending'
    }
  }

  // Start packet status
  const startPacketComplete = targetStage === 'start_packet' ? rng() < 0.7 :
                              stageIndex > 3 ? true : undefined

  return {
    id: `LEAD-${String(id).padStart(5, '0')}`,
    companyName,
    contactName: `${firstName} ${lastName}`,
    contactEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
    contactPhone: `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
    propertyType: randomChoice(PROPERTY_TYPES),
    propertyAddress: `${streetNum} ${streetName}, ${location.city}, ${location.state} ${location.zip}`,
    pestType: randomChoice(PEST_TYPES),
    serviceUrgency: randomChoice(URGENCY_LEVELS),
    estimatedValue: randomInt(500, 25000),
    currentStage: targetStage,
    stageEnteredAt,
    daysInStage: Math.round(daysInStage * 10) / 10,
    hoursInStage: Math.round(hoursInStage * 10) / 10,
    healthStatus,
    riskReasons,
    owner,
    ownerRole,
    assignedBD,
    assignedAE,
    assignedTech,
    createdAt: leadCreatedAt,
    sourceChannel: randomChoice(SOURCE_CHANNELS),
    stageHistory,
    handoffStatus,
    startPacketComplete,
    missingFields: missingFields.length > 0 ? missingFields : undefined,
    lastActivityAt: new Date(Date.now() - randomInt(0, healthStatus === 'critical' ? 168 : 48) * 60 * 60 * 1000),
    notes: healthStatus === 'critical' ? 'Requires immediate attention' : undefined
  }
}

// Generate all demo leads
let demoLeads: Lead[] = []

export function generateLeads(seed: number = 54321): Lead[] {
  initSeed(seed)

  const leads: Lead[] = []
  let leadId = 1

  // Distribution across stages (realistic funnel + bottleneck emphasis)
  // More leads pile up at handoff stages
  const stageDistribution: { stage: LeadStage; count: number; healthDist: { healthy: number; atRisk: number; critical: number } }[] = [
    { stage: 'lead_intake', count: 12, healthDist: { healthy: 8, atRisk: 3, critical: 1 } },
    { stage: 'sales_handoff', count: 14, healthDist: { healthy: 5, atRisk: 5, critical: 4 } }, // Bottleneck
    { stage: 'sales_process', count: 18, healthDist: { healthy: 12, atRisk: 4, critical: 2 } },
    { stage: 'start_packet', count: 8, healthDist: { healthy: 5, atRisk: 2, critical: 1 } },
    { stage: 'ops_handoff', count: 13, healthDist: { healthy: 4, atRisk: 5, critical: 4 } }, // Bottleneck
    { stage: 'service_delivery', count: 10, healthDist: { healthy: 7, atRisk: 2, critical: 1 } },
  ]

  for (const { stage, healthDist } of stageDistribution) {
    // Generate healthy leads
    for (let i = 0; i < healthDist.healthy; i++) {
      leads.push(generateLead(leadId++, stage, 'healthy'))
    }
    // Generate at-risk leads
    for (let i = 0; i < healthDist.atRisk; i++) {
      leads.push(generateLead(leadId++, stage, 'at_risk'))
    }
    // Generate critical leads
    for (let i = 0; i < healthDist.critical; i++) {
      leads.push(generateLead(leadId++, stage, 'critical'))
    }
  }

  demoLeads = leads
  return leads
}

// Initialize on module load
generateLeads()

// ============================================================================
// DATA ACCESS FUNCTIONS
// ============================================================================

export function getLeads(): Lead[] {
  return demoLeads
}

export function getLeadById(id: string): Lead | undefined {
  return demoLeads.find(l => l.id === id)
}

export function getLeadsByStage(stage: LeadStage): Lead[] {
  return demoLeads.filter(l => l.currentStage === stage)
}

export function getLeadsByHealth(status: HealthStatus): Lead[] {
  return demoLeads.filter(l => l.healthStatus === status)
}

export function getAtRiskLeads(): Lead[] {
  return demoLeads.filter(l => l.healthStatus === 'at_risk' || l.healthStatus === 'critical')
}

export function getHandoffLeads(type: HandoffType): Lead[] {
  const stage = type === 'bd_to_sales' ? 'sales_handoff' : 'ops_handoff'
  return demoLeads.filter(l => l.currentStage === stage)
}

// ============================================================================
// METRICS CALCULATIONS
// ============================================================================

export function getStageMetrics(): StageMetrics[] {
  return STAGE_ORDER.map(stage => {
    const stageLeads = getLeadsByStage(stage)
    const config = STAGE_CONFIG[stage]

    const healthyCount = stageLeads.filter(l => l.healthStatus === 'healthy').length
    const atRiskCount = stageLeads.filter(l => l.healthStatus === 'at_risk').length
    const criticalCount = stageLeads.filter(l => l.healthStatus === 'critical').length

    const avgHours = stageLeads.length > 0
      ? stageLeads.reduce((sum, l) => sum + l.hoursInStage, 0) / stageLeads.length
      : 0

    const withinSla = stageLeads.filter(l => l.hoursInStage <= config.targetHours).length
    const slaCompliance = stageLeads.length > 0 ? (withinSla / stageLeads.length) * 100 : 100

    // Determine overall stage health
    let healthStatus: HealthStatus = 'healthy'
    if (criticalCount > 0 || slaCompliance < 70) {
      healthStatus = 'critical'
    } else if (atRiskCount > 2 || slaCompliance < 85) {
      healthStatus = 'at_risk'
    }

    // Value metrics (J2 - Leadership request: "We need to see dollar values, not just counts")
    const totalValue = stageLeads.reduce((sum, l) => sum + l.estimatedValue, 0)
    const avgValue = stageLeads.length > 0 ? totalValue / stageLeads.length : 0
    const atRiskLeads = stageLeads.filter(l => l.healthStatus !== 'healthy')
    const atRiskValue = atRiskLeads.reduce((sum, l) => sum + l.estimatedValue, 0)

    return {
      stage,
      stageName: config.name,
      leadCount: stageLeads.length,
      avgDaysInStage: Math.round((avgHours / 24) * 10) / 10,
      avgHoursInStage: Math.round(avgHours * 10) / 10,
      healthyCount,
      atRiskCount,
      criticalCount,
      slaCompliance: Math.round(slaCompliance),
      healthStatus,
      totalValue,
      avgValue: Math.round(avgValue),
      atRiskValue
    }
  })
}

export function getHandoffMetrics(): HandoffMetrics[] {
  const metrics: HandoffMetrics[] = []

  // BD → Sales
  const bdToSalesLeads = getHandoffLeads('bd_to_sales')
  const bdPending = bdToSalesLeads.filter(l => l.handoffStatus === 'pending' || l.handoffStatus === 'delayed').length
  const bdDelayed = bdToSalesLeads.filter(l => l.handoffStatus === 'delayed').length
  const bdAvgHours = bdToSalesLeads.length > 0
    ? bdToSalesLeads.reduce((sum, l) => sum + l.hoursInStage, 0) / bdToSalesLeads.length
    : 0
  const bdWithinSla = bdToSalesLeads.filter(l => l.hoursInStage <= 24).length

  metrics.push({
    type: 'bd_to_sales',
    displayName: 'BD → Sales Handoff',
    pending: bdPending,
    avgWaitHours: Math.round(bdAvgHours * 10) / 10,
    delayedCount: bdDelayed,
    slaCompliance: bdToSalesLeads.length > 0 ? Math.round((bdWithinSla / bdToSalesLeads.length) * 100) : 100,
    trend: generateHandoffTrend(),
    leadsAtRisk: bdToSalesLeads.filter(l => l.healthStatus !== 'healthy').length
  })

  // Sales → Ops
  const salesToOpsLeads = getHandoffLeads('sales_to_ops')
  const opsPending = salesToOpsLeads.filter(l => l.handoffStatus === 'pending' || l.handoffStatus === 'delayed').length
  const opsDelayed = salesToOpsLeads.filter(l => l.handoffStatus === 'delayed').length
  const opsAvgHours = salesToOpsLeads.length > 0
    ? salesToOpsLeads.reduce((sum, l) => sum + l.hoursInStage, 0) / salesToOpsLeads.length
    : 0
  const opsWithinSla = salesToOpsLeads.filter(l => l.hoursInStage <= 24).length

  metrics.push({
    type: 'sales_to_ops',
    displayName: 'Sales → Ops Handoff',
    pending: opsPending,
    avgWaitHours: Math.round(opsAvgHours * 10) / 10,
    delayedCount: opsDelayed,
    slaCompliance: salesToOpsLeads.length > 0 ? Math.round((opsWithinSla / salesToOpsLeads.length) * 100) : 100,
    trend: generateHandoffTrend(),
    leadsAtRisk: salesToOpsLeads.filter(l => l.healthStatus !== 'healthy').length
  })

  return metrics
}

function generateHandoffTrend(): { day: string; hours: number; count: number }[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.slice(-14).map((day, i) => ({
    day: `${day} ${i < 7 ? '(Last)' : ''}`.trim(),
    hours: Math.round((randomFloat(8, 36)) * 10) / 10,
    count: randomInt(2, 8)
  }))
}

export function getPipelineSummary() {
  const leads = getLeads()
  const stageMetrics = getStageMetrics()

  // Find bottleneck (stage with worst SLA compliance among handoff stages)
  const handoffStages = stageMetrics.filter(s =>
    s.stage === 'sales_handoff' || s.stage === 'ops_handoff'
  )
  const bottleneck = handoffStages.reduce((worst, current) =>
    current.slaCompliance < worst.slaCompliance ? current : worst
  , handoffStages[0])

  // Calculate total lead-to-service time (average across completed leads)
  const completedLeads = leads.filter(l => l.currentStage === 'service_delivery')
  let avgLeadToServiceDays = 0
  if (completedLeads.length > 0) {
    const totalDays = completedLeads.reduce((sum, lead) => {
      const totalTime = lead.stageHistory.reduce((t, h) => {
        if (h.exitedAt) {
          return t + (h.exitedAt.getTime() - h.enteredAt.getTime())
        }
        return t + (Date.now() - h.enteredAt.getTime())
      }, 0)
      return sum + totalTime / (24 * 60 * 60 * 1000)
    }, 0)
    avgLeadToServiceDays = Math.round((totalDays / completedLeads.length) * 10) / 10
  }

  // Value metrics (J2 - Leadership request: "We need to see dollar values, not just counts")
  const totalPipelineValue = leads.reduce((sum, l) => sum + l.estimatedValue, 0)
  const atRiskLeadsData = leads.filter(l => l.healthStatus !== 'healthy')
  const atRiskValue = atRiskLeadsData.reduce((sum, l) => sum + l.estimatedValue, 0)
  const avgDealSize = leads.length > 0 ? totalPipelineValue / leads.length : 0

  return {
    totalLeads: leads.length,
    healthyLeads: leads.filter(l => l.healthStatus === 'healthy').length,
    atRiskLeads: leads.filter(l => l.healthStatus === 'at_risk').length,
    criticalLeads: leads.filter(l => l.healthStatus === 'critical').length,
    avgLeadToServiceDays,
    bottleneckStage: bottleneck?.stageName || 'None',
    bottleneckSlaCompliance: bottleneck?.slaCompliance || 100,
    conversionRate: Math.round((completedLeads.length / leads.length) * 100),
    // Value metrics
    totalPipelineValue,
    atRiskValue,
    avgDealSize: Math.round(avgDealSize)
  }
}

export function getRiskReasonBreakdown(): { reason: RiskReason; count: number; label: string }[] {
  const atRiskLeads = getAtRiskLeads()
  const reasons: Record<RiskReason, number> = {
    exceeded_sla: 0,
    no_activity: 0,
    missing_data: 0,
    handoff_delayed: 0,
    reassignment_pending: 0
  }

  atRiskLeads.forEach(lead => {
    lead.riskReasons.forEach(reason => {
      reasons[reason]++
    })
  })

  const labels: Record<RiskReason, string> = {
    exceeded_sla: 'Exceeded SLA',
    no_activity: 'No Activity',
    missing_data: 'Missing Data',
    handoff_delayed: 'Handoff Delayed',
    reassignment_pending: 'Reassignment Pending'
  }

  return Object.entries(reasons)
    .map(([reason, count]) => ({
      reason: reason as RiskReason,
      count,
      label: labels[reason as RiskReason]
    }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
}

// ============================================================================
// ROI CALCULATION HELPERS
// ============================================================================

export interface ROIInputs {
  monthlyLeadVolume: number
  avgManualTimePerHandoffMinutes: number
  laborCostPerHour: number
}

export interface ROIOutputs {
  annualHoursSaved: number
  annualCostSavings: number
  fteEquivalent: number
  paybackMonths: number
}

export function calculateAutomationROI(inputs: ROIInputs): ROIOutputs {
  const { monthlyLeadVolume, avgManualTimePerHandoffMinutes, laborCostPerHour } = inputs

  // Calculate total manual time per lead (across all automatable processes)
  const totalManualMinutesPerLead = AUTOMATION_OPPORTUNITIES.reduce(
    (sum, opp) => sum + opp.manualTimeMinutes, 0
  )
  const totalAutomatedMinutesPerLead = AUTOMATION_OPPORTUNITIES.reduce(
    (sum, opp) => sum + opp.automatedTimeMinutes, 0
  )

  const minutesSavedPerLead = totalManualMinutesPerLead - totalAutomatedMinutesPerLead
  const hoursSavedPerLead = minutesSavedPerLead / 60

  const annualLeadVolume = monthlyLeadVolume * 12
  const annualHoursSaved = Math.round(annualLeadVolume * hoursSavedPerLead)
  const annualCostSavings = Math.round(annualHoursSaved * laborCostPerHour)

  // FTE equivalent (assuming 2080 working hours per year)
  const fteEquivalent = Math.round((annualHoursSaved / 2080) * 10) / 10

  // Rough implementation cost estimate for payback calculation
  const estimatedImplementationCost = 50000
  const paybackMonths = Math.round((estimatedImplementationCost / (annualCostSavings / 12)) * 10) / 10

  return {
    annualHoursSaved,
    annualCostSavings,
    fteEquivalent,
    paybackMonths
  }
}

export const DEFAULT_ROI_INPUTS: ROIInputs = {
  monthlyLeadVolume: 500,
  avgManualTimePerHandoffMinutes: 15,
  laborCostPerHour: 35
}
