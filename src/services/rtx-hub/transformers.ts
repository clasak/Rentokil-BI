/**
 * RTX Data Hub Transformers
 *
 * Transform RTX Data Hub schemas to our internal application types.
 * These transformations follow the rules defined in the Data Dictionary.
 */

import type { Account, Opportunity, ServiceEvent, Invoice, User } from '@/types'
import type {
  RTXAccount,
  RTXOpportunity,
  RTXServiceEvent,
  RTXInvoice,
  RTXUser
} from './types'

/**
 * Map RTX industry codes to our vertical enum
 */
const INDUSTRY_TO_VERTICAL: Record<string, Account['vertical']> = {
  'COM': 'Commercial',
  'RES': 'Residential',
  'GOV': 'Government',
  'HLT': 'Healthcare',
  'FDS': 'Food Service',
  'MFG': 'Commercial',    // Manufacturing → Commercial
  'RET': 'Commercial',    // Retail → Commercial
  'EDU': 'Government',    // Education → Government
  'HOT': 'Food Service',  // Hospitality → Food Service
}

/**
 * Map RTX retention risk levels to our enum
 */
const RISK_LEVEL_MAP: Record<string, 'low' | 'medium' | 'high'> = {
  'L': 'low',
  'M': 'medium',
  'H': 'high'
}

/**
 * Map RTX service frequency codes to our enum
 * Note: Our system only supports monthly, quarterly, annual
 */
const SERVICE_FREQ_MAP: Record<string, Account['serviceFrequency']> = {
  'W': 'monthly',      // Weekly → Monthly (closest approximation)
  'B': 'monthly',      // Bi-weekly → Monthly
  'M': 'monthly',
  'Q': 'quarterly',
  'A': 'annual',
  'O': 'monthly'       // On-demand → Monthly (default)
}

/**
 * Map RTX opportunity stage codes to our enum
 */
const OPP_STAGE_MAP: Record<string, Opportunity['stage']> = {
  'PROS': 'prospect',
  'QUAL': 'qualified',
  'PROP': 'proposal',
  'NEGO': 'negotiation',
  'CWON': 'closed_won',
  'CLST': 'closed_lost'
}

/**
 * Map RTX service status codes to our enum
 * Note: Our system only supports scheduled, completed, missed, callback
 */
const SERVICE_STATUS_MAP: Record<string, ServiceEvent['status']> = {
  'S': 'scheduled',
  'P': 'scheduled',    // In Progress → Scheduled (closest)
  'C': 'completed',
  'X': 'missed',       // Cancelled → Missed
  'M': 'missed',
  'F': 'callback'
}

/**
 * Map RTX invoice status codes to our enum
 */
const INVOICE_STATUS_MAP: Record<string, Invoice['status']> = {
  'P': 'paid',
  'O': 'open',
  'D': 'overdue',
  'X': 'disputed',
  'V': 'void'
}

/**
 * Map RTX aging bucket codes to our enum
 */
const AGING_BUCKET_MAP: Record<string, Invoice['agingBucket']> = {
  'CUR': '0-30',
  '30': '0-30',
  '60': '31-60',
  '90': '61-90',
  '90+': '90+'
}

/**
 * Map RTX job family codes to our Role enum
 */
const JOB_FAMILY_TO_ROLE: Record<string, User['role']> = {
  'EXEC': 'exec',
  'MKT_DIR': 'market_director',
  'REG_DIR': 'region_director',
  'BR_MGR': 'manager',
  'SALES_MGR': 'sales_manager',
  'OPS_MGR': 'ops_manager',
  'SALES_REP': 'rep',
  'SALES_AE': 'rep',
  'TECH': 'technician',
  'SVC_TECH': 'technician'
}

/**
 * Transform RTX Account to internal Account type
 */
export function transformAccount(rtx: RTXAccount): Account {
  return {
    id: `ACC-${rtx.CUST_ACCT_ID}`,
    name: rtx.CUST_NAME,
    vertical: INDUSTRY_TO_VERTICAL[rtx.CUST_INDUSTRY_CD] || 'Commercial',
    contractValue: Math.round(rtx.CONTRACT_ACV * 100) / 100,
    retentionRisk: RISK_LEVEL_MAP[rtx.RETENTION_RISK_LEVEL] || 'low',
    lastServiceDate: rtx.LAST_SVC_DT ? new Date(rtx.LAST_SVC_DT) : new Date(),
    openIssues: rtx.OPEN_ISSUE_CNT,
    marketId: `MKT-${rtx.SVC_MARKET_ID}`,
    branchId: `BR-${rtx.SVC_BRANCH_ID}`,
    ownerId: `USR-${rtx.ACCT_OWNER_ID}`,
    createdAt: new Date(rtx.CREATED_DT),
    arBalance: rtx.AR_BALANCE,
    serviceFrequency: SERVICE_FREQ_MAP[rtx.SVC_FREQ_CD] || 'monthly',
    complaints: rtx.COMPLAINT_CNT_90D
  }
}

/**
 * Transform array of RTX Accounts to internal Account types
 */
export function transformAccounts(rtxAccounts: RTXAccount[]): Account[] {
  return rtxAccounts.map(transformAccount)
}

/**
 * Transform RTX Opportunity to internal Opportunity type
 */
export function transformOpportunity(rtx: RTXOpportunity, accountName = 'Unknown Account'): Opportunity {
  const stage = OPP_STAGE_MAP[rtx.OPP_STAGE_CD] || 'prospect'
  const createdDate = new Date(rtx.CREATED_DT)
  const closeDate = rtx.ACTUAL_CLOSE_DT
    ? new Date(rtx.ACTUAL_CLOSE_DT)
    : rtx.EXPECTED_CLOSE_DT
      ? new Date(rtx.EXPECTED_CLOSE_DT)
      : new Date()

  return {
    id: `OPP-${rtx.OPP_ID}`,
    accountId: `ACC-${rtx.CUST_ACCT_ID}`,
    accountName,
    name: rtx.OPP_NAME,
    stage,
    amount: Math.round(rtx.OPP_AMOUNT * 100) / 100,
    probability: rtx.WIN_PROBABILITY,
    createdDate,
    closeDate,
    nextStepDate: null,
    stageLastChanged: new Date(rtx.LAST_STAGE_CHANGE_DT),
    ownerId: `USR-${rtx.OPP_OWNER_ID}`,
    ownerName: 'Unknown', // Would be populated from a separate user lookup
    marketId: 'MKT-001', // Would be derived from account
    branchId: 'BR-001',  // Would be derived from account
    daysInStage: rtx.DAYS_IN_STAGE,
    isStalled: rtx.IS_STALLED,
    nextStep: rtx.NEXT_STEP || 'No next step defined',
    lostReason: rtx.LOST_REASON_CD || undefined
  }
}

/**
 * Transform array of RTX Opportunities to internal Opportunity types
 */
export function transformOpportunities(rtxOpportunities: RTXOpportunity[]): Opportunity[] {
  return rtxOpportunities.map(rtx => transformOpportunity(rtx))
}

/**
 * Transform RTX Service Event to internal ServiceEvent type
 */
export function transformServiceEvent(rtx: RTXServiceEvent): ServiceEvent {
  return {
    id: `SVC-${rtx.SVC_ORDER_ID}`,
    accountId: `ACC-${rtx.CUST_ACCT_ID}`,
    technicianId: `USR-${rtx.TECH_EMP_ID}`,
    routeId: `RTE-${rtx.ROUTE_ID}`,
    scheduledDate: new Date(rtx.SCHEDULED_DT),
    completedDate: rtx.COMPLETED_DT ? new Date(rtx.COMPLETED_DT) : undefined,
    status: SERVICE_STATUS_MAP[rtx.SVC_STATUS_CD] || 'scheduled',
    timeOnSite: rtx.SVC_DURATION_MIN || 0,
    serviceType: rtx.SVC_TYPE_CD || 'general',
    notes: rtx.SVC_NOTES || undefined
  }
}

/**
 * Transform array of RTX Service Events to internal ServiceEvent types
 */
export function transformServiceEvents(rtxEvents: RTXServiceEvent[]): ServiceEvent[] {
  return rtxEvents.map(transformServiceEvent)
}

/**
 * Transform RTX Invoice to internal Invoice type
 */
export function transformInvoice(rtx: RTXInvoice, accountName = 'Unknown Account'): Invoice {
  return {
    id: `INV-${rtx.INVOICE_NUM}`,
    accountId: `ACC-${rtx.CUST_ACCT_ID}`,
    accountName,
    amount: Math.round(rtx.INV_TOTAL_AMT * 100) / 100,
    invoiceDate: new Date(rtx.INVOICE_DT),
    dueDate: new Date(rtx.DUE_DT),
    status: INVOICE_STATUS_MAP[rtx.INV_STATUS_CD] || 'open',
    paidDate: rtx.PAID_DT ? new Date(rtx.PAID_DT) : undefined,
    agingBucket: AGING_BUCKET_MAP[rtx.AGING_BUCKET_CD] || '0-30'
  }
}

/**
 * Transform array of RTX Invoices to internal Invoice types
 */
export function transformInvoices(rtxInvoices: RTXInvoice[]): Invoice[] {
  return rtxInvoices.map(rtx => transformInvoice(rtx))
}

/**
 * Transform RTX User to internal User type
 */
export function transformUser(rtx: RTXUser): User {
  const role = JOB_FAMILY_TO_ROLE[rtx.JOB_FAMILY_CD] || 'rep'

  return {
    id: `USR-${rtx.EMPLOYEE_ID}`,
    name: rtx.EMPLOYEE_NAME,
    email: rtx.EMAIL,
    role,
    title: rtx.JOB_FAMILY_CD,
    // All assignment arrays are required, so provide empty arrays as default
    assignedMarkets: role === 'market_director' ? [`MKT-${rtx.MARKET_ID}`] : [],
    assignedRegions: role === 'region_director' ? [`REG-${rtx.REGION_ID}`] : [],
    assignedBranches: ['manager', 'ops_manager', 'sales_manager'].includes(role)
      ? [`BR-${rtx.BRANCH_ID}`]
      : [],
    assignedTeams: []
  }
}

/**
 * Transform array of RTX Users to internal User types
 */
export function transformUsers(rtxUsers: RTXUser[]): User[] {
  return rtxUsers.map(transformUser)
}

/**
 * Reverse transform: Internal Account to RTX format (for writes)
 */
export function toRTXAccount(account: Partial<Account>): Partial<RTXAccount> {
  const verticalToIndustry: Record<string, string> = {
    'Commercial': 'COM',
    'Residential': 'RES',
    'Government': 'GOV',
    'Healthcare': 'HLT',
    'Food Service': 'FDS'
  }

  const riskToLevel: Record<string, 'L' | 'M' | 'H'> = {
    'low': 'L',
    'medium': 'M',
    'high': 'H'
  }

  const freqToCode: Record<string, string> = {
    'monthly': 'M',
    'quarterly': 'Q',
    'annual': 'A'
  }

  return {
    CUST_ACCT_ID: account.id?.replace('ACC-', ''),
    CUST_NAME: account.name,
    CUST_INDUSTRY_CD: account.vertical ? verticalToIndustry[account.vertical] : undefined,
    CONTRACT_ACV: account.contractValue,
    SVC_BRANCH_ID: account.branchId?.replace('BR-', ''),
    ACCT_OWNER_ID: account.ownerId?.replace('USR-', ''),
    RETENTION_RISK_LEVEL: account.retentionRisk ? riskToLevel[account.retentionRisk] : undefined,
    AR_BALANCE: account.arBalance,
    SVC_FREQ_CD: account.serviceFrequency ? freqToCode[account.serviceFrequency] : undefined
  }
}

/**
 * Reverse transform: Internal Opportunity to RTX format (for writes)
 */
export function toRTXOpportunity(opp: Partial<Opportunity>): Partial<RTXOpportunity> {
  const stageToCode: Record<string, string> = {
    'prospect': 'PROS',
    'qualified': 'QUAL',
    'proposal': 'PROP',
    'negotiation': 'NEGO',
    'closed_won': 'CWON',
    'closed_lost': 'CLST'
  }

  return {
    OPP_ID: opp.id?.replace('OPP-', ''),
    CUST_ACCT_ID: opp.accountId?.replace('ACC-', ''),
    OPP_NAME: opp.name,
    OPP_STAGE_CD: opp.stage ? stageToCode[opp.stage] : undefined,
    OPP_AMOUNT: opp.amount,
    WIN_PROBABILITY: opp.probability,
    OPP_OWNER_ID: opp.ownerId?.replace('USR-', ''),
    NEXT_STEP: opp.nextStep || null,
    LOST_REASON_CD: opp.lostReason || null
  }
}
