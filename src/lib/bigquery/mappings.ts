/**
 * BigQuery to Application Field Mappings
 *
 * Maps BigQuery column names (from RTX Power BI data structure) to TypeScript field names.
 * Table and column names are best guesses based on Power BI report structure.
 * May need updates after running discovery against actual BigQuery schema.
 */

// =============================================================================
// Lead Mappings (RTX Power BI Leads - Vintage View)
// =============================================================================

export const LEAD_FIELD_MAPPING = {
  // BigQuery column → App field
  lead_id: 'id',
  received_date: 'receivedDate',
  lead_stage: 'stage', // MQL, SQL, Scheduled, Inspected, Proposed, Sold, Lost, Cancelled
  lead_type: 'leadType', // INB, CTV, ISP
  lead_source: 'source', // Inbound Phone Call, Lead Forms, Website, Sales Creative
  lead_channel: 'channel', // ISP, ISP - Outbound, Marketing
  brand: 'brand', // TMX, RNA
  market: 'market',
  region: 'region',
  branch: 'branch',
  sales_employee: 'salesRep',
  sales_org: 'salesOrg',
  customer_type: 'customerType',
  pest_solution: 'pestCategory',
  pest_type: 'pestType',
  cancel_reason: 'cancelReason',
} as const

export const CANCEL_REASON_CODES: Record<string, string> = {
  ADV: 'Advertising Issue',
  BZY: 'Customer Too Busy',
  CLB: 'Closed/Bankrupt/AR Hold',
  CNR: 'Customer Not Reachable',
  DNC: 'Do Not Call',
  DUP: 'Duplicate Lead',
  EXC: 'Existing Customer',
  HNG: 'Hung Up',
  INV: 'Invalid Contact Info',
  MCH: 'Machine/Voicemail',
  MOV: 'Moved/Changed Owner',
  NND: 'No Need',
  OOA: 'Out of Area',
  OPT: 'Opted Out',
  QOC: 'Quality of Call',
  TDB: 'To Be Determined',
}

export const LEAD_STAGE_ORDER = [
  'Contacts',
  'MQL',
  'SQL',
  'Scheduled',
  'Inspected',
  'Proposed',
  'Sold',
  'Lost',
  'Cancelled',
] as const

export const LEAD_TYPES = [
  'INB',
  'CTV',
  'ISP',
  'ISP - Outbound',
  'Marketing',
] as const

export const PEST_CATEGORIES = [
  'General Pest',
  'Bird',
  'Rodent',
  'Termite',
  'Wildlife',
  'Mosquito & Tick',
  'Lawn Care',
  'Hygiene',
  'Home & Bldg Services',
  'Home Inspection',
  'Home Services',
  'Other',
] as const

// =============================================================================
// SALTI Mappings (RTX Power BI SALTI)
// =============================================================================

export const SALTI_FIELD_MAPPING = {
  // Sales metrics
  net_sales: 'netSales',
  started_sales: 'startedSales',
  close_rate: 'closeRate',
  speed_to_lead: 'speedToLead', // days from received to inspected
  bundle_rate: 'bundleRate',
  avg_per_sold_sql: 'avgPerSoldSQL',

  // 5-10-2 metrics
  inspections_per_day: 'inspectionsPerDay',
  services_proposed_per_day: 'servicesProposedPerDay',
  sales_per_day: 'salesPerDay',

  // Productivity
  schedule_rate: 'scheduleRate', // Scheduled / Received
  fulfillment_rate: 'fulfillmentRate', // Inspected / Scheduled
  offer_rate: 'offerRate', // Proposals / Inspections
  win_rate: 'winRate', // Sold / Proposals
  mql_cancel_rate: 'mqlCancelRate',
} as const

export const SALES_ORG_ROLES = [
  'CCR',
  'PCC',
  'AE',
  'PCC Trainee',
  'AE Trainee',
  'RSM',
  'ASM',
  'RAE',
  'MSD',
  'BSM',
  'Branch/Ops Leader',
  'ISP',
  'ISM',
  'BDR',
  'NAE',
  'SAE',
  'Tech',
] as const

// =============================================================================
// Sales Mappings (RTX Power BI Sales reports)
// =============================================================================

export const SALES_FIELD_MAPPING = {
  // Speed to Install
  install_48hr_pct: 'install48HrPct',
  install_72hr_pct: 'install72HrPct',
  install_96plus_pct: 'install96PlusPct',

  // Start Rate
  start_rate_48hr: 'startRate48Hr',
  start_rate_in_month: 'startRateInMonth',

  // Backlog
  backlog_count: 'backlogCount',
  backlog_value: 'backlogValue',
  age_of_sale: 'ageOfSale',

  // Canceled Agreements
  cancel_count: 'cancelCount',
  cancel_reason: 'cancelReason',
} as const

export const SALES_CANCEL_REASONS: Record<string, string> = {
  CLB: 'Bankrupt/Closed/AR Hold',
  NND: 'No need',
  CHG: 'Change to Account/Customer',
  MOV: 'Move/Change Owner',
}

// =============================================================================
// Finance Mappings
// =============================================================================

export const FINANCE_FIELD_MAPPING = {
  daily_revenue: 'dailyRevenue',
  mtd_revenue: 'mtdRevenue',
  revenue_projection: 'revenueProjection',
  ar_current: 'arCurrent',
  ar_30_day: 'ar30Day',
  ar_60_day: 'ar60Day',
  ar_90_day: 'ar90Day',
  ar_120_plus: 'ar120Plus',
} as const

// =============================================================================
// HR Mappings
// =============================================================================

export const HR_FIELD_MAPPING = {
  headcount: 'headcount',
  voluntary_terms: 'voluntaryTerms',
  involuntary_terms: 'involuntaryTerms',
  retention_pct: 'retentionPct',
  function_code: 'functionCode',
} as const

// =============================================================================
// Termite Mappings
// =============================================================================

export const TERMITE_FIELD_MAPPING = {
  // PNI
  pni_total: 'pniTotal',
  pni_future_window: 'pniFutureWindow',
  pni_missed_schedule: 'pniMissedSchedule',
  pni_not_scheduled: 'pniNotScheduled',
  pni_scheduled_future: 'pniScheduledFuture',
  pni_scheduled_in_month: 'pniScheduledInMonth',

  // Renewals
  renewal_rate: 'renewalRate',
  renewals_due: 'renewalsDue',
} as const

// =============================================================================
// Workforce Mappings
// =============================================================================

export const WORKFORCE_FIELD_MAPPING = {
  overtime_hours: 'overtimeHours',
  overtime_pct: 'overtimePct',
  service_rev_per_hour: 'serviceRevPerHour',
  hours_on_site_pct: 'hoursOnSitePct',
} as const

// =============================================================================
// Table Name Mapping
// =============================================================================

export const TABLE_MAPPING = {
  // Probable BigQuery table names → My data type
  fact_leads: 'Lead',
  fact_mql: 'Lead',
  fact_sql: 'Lead',
  fact_opportunities: 'Opportunity',
  fact_sales: 'Sale',
  fact_started_sales: 'StartedSale',
  fact_canceled_sales: 'CanceledSale',
  fact_backlog: 'BacklogItem',
  fact_ar: 'ARRecord',
  fact_revenue: 'Revenue',
  fact_pni: 'PNIRecord',
  fact_renewals: 'Renewal',
  fact_tech_productivity: 'TechProductivity',
  dim_branch: 'Branch',
  dim_region: 'Region',
  dim_market: 'Market',
  dim_sales_rep: 'SalesRep',
  dim_pest_category: 'PestCategory',
  dim_date: 'DateDimension',
} as const

// =============================================================================
// Type Exports
// =============================================================================

export type LeadFieldKey = keyof typeof LEAD_FIELD_MAPPING
export type LeadFieldValue = (typeof LEAD_FIELD_MAPPING)[LeadFieldKey]
export type LeadStage = (typeof LEAD_STAGE_ORDER)[number]
export type LeadType = (typeof LEAD_TYPES)[number]
export type PestCategory = (typeof PEST_CATEGORIES)[number]
export type SalesOrgRole = (typeof SALES_ORG_ROLES)[number]
export type TableName = keyof typeof TABLE_MAPPING
export type DataType = (typeof TABLE_MAPPING)[TableName]

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Maps a BigQuery row to application types using the provided field mapping
 */
export function mapBigQueryRow<T>(
  row: Record<string, unknown>,
  mapping: Record<string, string>
): T {
  const result: Record<string, unknown> = {}
  for (const [bqField, appField] of Object.entries(mapping)) {
    if (row[bqField] !== undefined) {
      result[appField] = row[bqField]
    }
  }
  return result as T
}

/**
 * Maps a cancel reason code to its human-readable description
 */
export function mapCancelReason(code: string): string {
  return CANCEL_REASON_CODES[code] || code
}

/**
 * Normalizes lead stage names to standard format
 */
export function mapLeadStage(stage: string): string {
  const normalized = stage.toUpperCase().trim()
  const stageMap: Record<string, string> = {
    'MARKETING QUALIFIED LEAD': 'MQL',
    'SALES QUALIFIED LEAD': 'SQL',
    CONTACT: 'Contacts',
    CONTACTS: 'Contacts',
    SCHEDULE: 'Scheduled',
    INSPECT: 'Inspected',
    INSPECTION: 'Inspected',
    PROPOSE: 'Proposed',
    PROPOSAL: 'Proposed',
    SALE: 'Sold',
    SOLD: 'Sold',
    WON: 'Sold',
    LOSE: 'Lost',
    LOST: 'Lost',
    CANCEL: 'Cancelled',
    CANCELLED: 'Cancelled',
    CANCELED: 'Cancelled',
  }
  return stageMap[normalized] || stage
}

/**
 * Gets the order index for a lead stage (for sorting)
 */
export function getLeadStageOrder(stage: string): number {
  const normalizedStage = mapLeadStage(stage)
  const index = LEAD_STAGE_ORDER.indexOf(normalizedStage as LeadStage)
  return index === -1 ? LEAD_STAGE_ORDER.length : index
}

/**
 * Maps sales cancel reason code to description
 */
export function mapSalesCancelReason(code: string): string {
  return SALES_CANCEL_REASONS[code] || code
}

/**
 * Reverse lookup: get BigQuery column name from app field name
 */
export function getColumnName(
  mapping: Record<string, string>,
  appField: string
): string | undefined {
  for (const [bqField, field] of Object.entries(mapping)) {
    if (field === appField) {
      return bqField
    }
  }
  return undefined
}

/**
 * Creates a reverse mapping (app field → BigQuery column)
 */
export function createReverseMapping(
  mapping: Record<string, string>
): Record<string, string> {
  const reverse: Record<string, string> = {}
  for (const [bqField, appField] of Object.entries(mapping)) {
    reverse[appField] = bqField
  }
  return reverse
}
