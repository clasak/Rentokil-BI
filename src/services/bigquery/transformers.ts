/**
 * BigQuery Data Transformers
 *
 * Converts BigQuery row data to internal application types.
 * Handles date parsing, field mapping, and data normalization.
 */

import type { Account, Opportunity, ServiceEvent, Invoice, User, Market, Branch, Role } from '@/types'
import type {
  BQCustomerRow,
  BQOpportunityRow,
  BQServiceEventRow,
  BQInvoiceRow,
  BQEmployeeRow,
  BQMarketRow,
  BQBranchRow,
  BQLeadRow
} from './types'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse BigQuery date string to Date object
 */
function parseDate(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date()
  return new Date(dateStr)
}

/**
 * Parse BigQuery date string to ISO string or undefined
 */
function parseDateOptional(dateStr: string | undefined | null): string | undefined {
  if (!dateStr) return undefined
  return new Date(dateStr).toISOString()
}

/**
 * Map BigQuery role string to internal Role type
 */
function mapRole(bqRole: string): Role {
  const roleMap: Record<string, Role> = {
    'executive': 'exec',
    'exec': 'exec',
    'market_vp': 'market_vp',
    'market_director': 'market_vp',
    'market_sales_director': 'market_sales_director',
    'region_director': 'region_director',
    'region_sales_manager': 'region_sales_manager',
    'branch_manager': 'manager',
    'manager': 'manager',
    'sales_manager': 'sales_manager',
    'operations_manager': 'ops_manager',
    'ops_manager': 'ops_manager',
    'sales_representative': 'rep',
    'sales_rep': 'rep',
    'rep': 'rep',
    'technician': 'technician',
    'tech': 'technician'
  }
  return roleMap[bqRole.toLowerCase()] || 'rep'
}

/**
 * Map BigQuery opportunity stage to internal stage
 */
function mapOpportunityStage(bqStage: string | undefined): Opportunity['stage'] {
  if (!bqStage) return 'prospect'
  const stageMap: Record<string, Opportunity['stage']> = {
    'prospect': 'prospect',
    'qualified': 'qualified',
    'proposal': 'proposal',
    'negotiation': 'negotiation',
    'closed_won': 'closed_won',
    'closed-won': 'closed_won',
    'closed won': 'closed_won',
    'won': 'closed_won',
    'closed_lost': 'closed_lost',
    'closed-lost': 'closed_lost',
    'closed lost': 'closed_lost',
    'lost': 'closed_lost'
  }
  return stageMap[bqStage.toLowerCase()] || 'prospect'
}

/**
 * Map BigQuery service event status to internal status
 */
function mapServiceEventStatus(bqStatus: string | undefined): ServiceEvent['status'] {
  if (!bqStatus) return 'scheduled'
  const statusMap: Record<string, ServiceEvent['status']> = {
    'scheduled': 'scheduled',
    'in_progress': 'scheduled', // Map in-progress to scheduled for now
    'in-progress': 'scheduled',
    'completed': 'completed',
    'missed': 'missed',
    'callback': 'callback',
    'cancelled': 'missed', // Map cancelled to missed
    'canceled': 'missed'
  }
  return statusMap[bqStatus.toLowerCase()] || 'scheduled'
}

/**
 * Map BigQuery invoice status to internal status
 */
function mapInvoiceStatus(bqStatus: string | undefined): Invoice['status'] {
  if (!bqStatus) return 'open'
  const statusMap: Record<string, Invoice['status']> = {
    'pending': 'open',
    'open': 'open',
    'paid': 'paid',
    'overdue': 'overdue',
    'disputed': 'disputed',
    'void': 'void',
    'cancelled': 'void',
    'canceled': 'void'
  }
  return statusMap[bqStatus.toLowerCase()] || 'open'
}

/**
 * Calculate aging bucket from days outstanding
 */
function calculateAgingBucket(daysOutstanding: number | undefined): Invoice['agingBucket'] {
  if (!daysOutstanding || daysOutstanding <= 30) return '0-30'
  if (daysOutstanding <= 60) return '31-60'
  if (daysOutstanding <= 90) return '61-90'
  return '90+'
}

/**
 * Map BigQuery retention risk to internal risk level
 */
function mapRetentionRisk(risk: string | undefined): Account['retentionRisk'] {
  if (!risk) return 'low'
  const riskMap: Record<string, Account['retentionRisk']> = {
    'low': 'low',
    'medium': 'medium',
    'med': 'medium',
    'high': 'high'
  }
  return riskMap[risk.toLowerCase()] || 'low'
}

/**
 * Map BigQuery vertical to internal vertical
 */
function mapVertical(vertical: string | undefined): Account['vertical'] {
  if (!vertical) return 'Commercial'
  const verticalMap: Record<string, Account['vertical']> = {
    'commercial': 'Commercial',
    'residential': 'Residential',
    'government': 'Government',
    'healthcare': 'Healthcare',
    'food service': 'Food Service',
    'food_service': 'Food Service',
    'foodservice': 'Food Service'
  }
  return verticalMap[vertical.toLowerCase()] || 'Commercial'
}

/**
 * Map BigQuery service frequency to internal frequency
 */
function mapServiceFrequency(freq: string | undefined): Account['serviceFrequency'] {
  if (!freq) return 'monthly'
  const freqMap: Record<string, Account['serviceFrequency']> = {
    'monthly': 'monthly',
    'quarterly': 'quarterly',
    'annual': 'annual',
    'annually': 'annual',
    'yearly': 'annual'
  }
  return freqMap[freq.toLowerCase()] || 'monthly'
}

// =============================================================================
// Transformers
// =============================================================================

/**
 * Transform BigQuery customer row to Account
 */
export function transformCustomerToAccount(row: BQCustomerRow): Account {
  return {
    id: row.customer_id,
    name: row.customer_name,
    vertical: mapVertical(row.vertical),
    contractValue: row.contract_value ?? 0,
    retentionRisk: mapRetentionRisk(row.retention_risk),
    lastServiceDate: row.last_service_date ? parseDate(row.last_service_date) : new Date(),
    openIssues: 0, // Would need separate query
    marketId: row.market_id ?? '',
    branchId: row.branch_id ?? '',
    ownerId: row.owner_id ?? '',
    createdAt: row.start_date ? parseDate(row.start_date) : new Date(),
    arBalance: 0, // Would need separate query/calculation
    serviceFrequency: mapServiceFrequency(row.service_frequency),
    complaints: 0 // Would need separate query
  }
}

/**
 * Transform BigQuery opportunity row to Opportunity
 */
export function transformOpportunity(row: BQOpportunityRow): Opportunity {
  const stage = mapOpportunityStage(row.stage)
  const createdDate = parseDate(row.created_date)

  return {
    id: row.opportunity_id,
    accountId: row.customer_id ?? row.account_id ?? '',
    accountName: '', // Would need join query
    name: row.opportunity_name,
    stage,
    amount: row.amount ?? 0,
    probability: row.probability ?? 0,
    createdDate,
    closeDate: parseDate(row.close_date),
    nextStepDate: row.next_step_date ? parseDate(row.next_step_date) : null,
    stageLastChanged: parseDate(row.last_modified_date),
    ownerId: row.owner_id ?? '',
    ownerName: '', // Would need join query
    marketId: row.market_id ?? '',
    branchId: row.branch_id ?? '',
    daysInStage: 0, // Would need calculation
    isStalled: false, // Would need calculation based on last activity
    nextStep: row.next_step ?? '',
    lostReason: row.lost_reason
  }
}

/**
 * Transform BigQuery service event row to ServiceEvent
 */
export function transformServiceEvent(row: BQServiceEventRow): ServiceEvent {
  // Determine if this is a callback based on the is_callback flag
  const status = row.is_callback ? 'callback' : mapServiceEventStatus(row.status)

  return {
    id: row.service_event_id ?? row.event_id ?? '',
    accountId: row.customer_id ?? row.account_id ?? '',
    technicianId: row.technician_id ?? '',
    routeId: row.route_id ?? '',
    scheduledDate: parseDate(row.scheduled_date ?? row.service_date),
    completedDate: row.completed_date ? parseDate(row.completed_date) : undefined,
    status,
    timeOnSite: row.duration_minutes ?? 0,
    serviceType: row.service_type ?? '',
    notes: row.notes ?? ''
  }
}

/**
 * Transform BigQuery invoice row to Invoice
 */
export function transformInvoice(row: BQInvoiceRow): Invoice {
  return {
    id: row.invoice_id,
    accountId: row.customer_id ?? row.account_id ?? '',
    accountName: '', // Will be populated by join query or separate lookup
    amount: row.amount ?? 0,
    invoiceDate: parseDate(row.invoice_date),
    dueDate: parseDate(row.due_date),
    status: mapInvoiceStatus(row.status),
    paidDate: row.paid_date ? parseDate(row.paid_date) : undefined,
    agingBucket: calculateAgingBucket(row.days_outstanding)
  }
}

/**
 * Transform BigQuery employee row to User
 */
export function transformEmployee(row: BQEmployeeRow): User {
  return {
    id: row.employee_id,
    name: row.employee_name ?? (`${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || 'Unknown'),
    email: row.email ?? '',
    role: mapRole(row.role ?? 'rep'),
    title: row.role ?? '', // Use role as title for now
    assignedMarkets: row.market_id ? [row.market_id] : [],
    assignedRegions: row.region_id ? [row.region_id] : [],
    assignedBranches: row.branch_id ? [row.branch_id] : [],
    assignedTeams: []
  }
}

/**
 * Transform BigQuery market row to Market
 */
export function transformMarket(row: BQMarketRow): Market {
  return {
    id: row.market_id,
    name: row.market_name,
    region: row.market_code || '' // Use code as region identifier
  }
}

/**
 * Transform BigQuery branch row to Branch
 */
export function transformBranch(row: BQBranchRow): Branch {
  return {
    id: row.branch_id,
    name: row.branch_name,
    marketId: row.market_id ?? '',
    regionId: row.region_id ?? '',
    address: row.address ? `${row.address}, ${row.city ?? ''} ${row.state ?? ''} ${row.zip ?? ''}`.trim() : ''
  }
}

// =============================================================================
// Batch Transformers
// =============================================================================

export function transformAccounts(rows: BQCustomerRow[]): Account[] {
  return rows.map(transformCustomerToAccount)
}

export function transformOpportunities(rows: BQOpportunityRow[]): Opportunity[] {
  return rows.map(transformOpportunity)
}

export function transformServiceEvents(rows: BQServiceEventRow[]): ServiceEvent[] {
  return rows.map(transformServiceEvent)
}

export function transformInvoices(rows: BQInvoiceRow[]): Invoice[] {
  return rows.map(transformInvoice)
}

export function transformEmployees(rows: BQEmployeeRow[]): User[] {
  return rows.map(transformEmployee)
}

export function transformMarkets(rows: BQMarketRow[]): Market[] {
  return rows.map(transformMarket)
}

export function transformBranches(rows: BQBranchRow[]): Branch[] {
  return rows.map(transformBranch)
}
