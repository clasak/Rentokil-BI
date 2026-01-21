/**
 * BigQuery Type Definitions
 *
 * Maps BigQuery table schemas to internal application types.
 * These types represent the raw data structure from BigQuery tables.
 *
 * NOTE: This file is SAFE for client-side imports (types only, no runtime code).
 *
 * IMPORTANT: Update these types after running schema discovery
 * to match the actual BigQuery table schemas.
 *
 * Known Tables (based on typical RTX data warehouse):
 *   Fact Tables:
 *     - fact_leads
 *     - fact_opportunities
 *     - fact_sales
 *     - fact_service_events
 *     - fact_invoices
 *
 *   Dimension Tables:
 *     - dim_branch
 *     - dim_region
 *     - dim_market
 *     - dim_employee
 *     - dim_customer
 */

// =============================================================================
// Configuration Types (safe for client import)
// =============================================================================

export type BigQueryEnvironment = 'production' | 'staging' | 'dev'

export interface BigQueryConfig {
  projectId: string
  dataset: string
  environment: BigQueryEnvironment
}

// =============================================================================
// BigQuery Raw Row Types (matches table schemas)
// =============================================================================

/**
 * fact_leads table row
 */
export interface BQLeadRow {
  lead_id: string
  lead_stage: string
  lead_type: string
  lead_source: string
  received_date: string // BigQuery DATE as string
  converted_date?: string
  customer_id?: string
  branch_id: string
  sales_rep_id?: string
  estimated_value?: number
  actual_value?: number
  lead_status: string
  created_at: string // BigQuery TIMESTAMP
  updated_at: string
}

/**
 * fact_opportunities table row
 */
export interface BQOpportunityRow {
  opportunity_id: string
  opportunity_name: string
  customer_id: string
  amount: number
  stage: string
  probability?: number
  close_date: string
  owner_id: string
  branch_id: string
  market_id?: string
  created_date: string
  last_modified_date: string
  next_step?: string
  next_step_date?: string
  lost_reason?: string
  lead_source?: string
}

/**
 * fact_sales table row
 */
export interface BQSaleRow {
  sale_id: string
  sale_date: string
  customer_id: string
  branch_id: string
  sales_rep_id: string
  service_type: string
  contract_value: number
  monthly_recurring: number
  setup_fee?: number
  term_months?: number
  sale_type: string // 'new' | 'upsell' | 'renewal'
}

/**
 * fact_service_events table row
 */
export interface BQServiceEventRow {
  service_event_id: string
  customer_id: string
  technician_id: string
  route_id?: string
  branch_id: string
  scheduled_date: string
  completed_date?: string
  service_type: string
  status: string
  time_on_site_minutes?: number
  is_callback: boolean
  callback_reason?: string
  notes?: string
}

/**
 * fact_invoices table row
 */
export interface BQInvoiceRow {
  invoice_id: string
  customer_id: string
  branch_id: string
  invoice_date: string
  due_date: string
  amount: number
  status: string // 'pending' | 'paid' | 'overdue' | 'cancelled'
  paid_date?: string
  payment_method?: string
  days_outstanding?: number
}

/**
 * dim_branch table row
 */
export interface BQBranchRow {
  branch_id: string
  branch_code: string
  branch_name: string
  region_id: string
  market_id: string
  address?: string
  city?: string
  state?: string
  zip?: string
  manager_id?: string
  is_active: boolean
}

/**
 * dim_region table row
 */
export interface BQRegionRow {
  region_id: string
  region_code: string
  region_name: string
  market_id: string
  director_id?: string
}

/**
 * dim_market table row
 */
export interface BQMarketRow {
  market_id: string
  market_code: string
  market_name: string
  director_id?: string
}

/**
 * dim_employee table row (maps to User)
 */
export interface BQEmployeeRow {
  employee_id: string
  employee_number?: string
  first_name: string
  last_name: string
  email: string
  role: string
  branch_id?: string
  region_id?: string
  market_id?: string
  manager_id?: string
  hire_date?: string
  is_active: boolean
}

/**
 * dim_customer table row (maps to Account)
 */
export interface BQCustomerRow {
  customer_id: string
  customer_number?: string
  customer_name: string
  vertical: string // 'Commercial' | 'Residential' | etc.
  contract_value: number
  monthly_recurring: number
  branch_id: string
  market_id: string
  owner_id: string
  service_frequency: string
  retention_risk?: string
  start_date?: string
  last_service_date?: string
  is_active: boolean
}

// =============================================================================
// Query Filter Types
// =============================================================================

export interface DateRangeFilter {
  startDate?: string // YYYY-MM-DD
  endDate?: string
}

export interface BranchFilter {
  branchId?: string
  branchIds?: string[]
}

export interface MarketFilter {
  marketId?: string
  marketIds?: string[]
}

export interface AccountQueryFilters extends DateRangeFilter, BranchFilter, MarketFilter {
  ownerId?: string
  vertical?: string
  retentionRisk?: string
  isActive?: boolean
}

export interface OpportunityQueryFilters extends DateRangeFilter, BranchFilter, MarketFilter {
  ownerId?: string
  stage?: string
  stages?: string[]
  minAmount?: number
  maxAmount?: number
}

export interface ServiceEventQueryFilters extends DateRangeFilter, BranchFilter {
  technicianId?: string
  routeId?: string
  status?: string
  isCallback?: boolean
}

export interface InvoiceQueryFilters extends DateRangeFilter, BranchFilter {
  customerId?: string
  status?: string
  agingBucket?: string
}

export interface LeadQueryFilters extends DateRangeFilter, BranchFilter {
  leadStage?: string
  leadType?: string
  salesRepId?: string
}

// =============================================================================
// Aggregation Result Types
// =============================================================================

export interface LeadStageCount {
  lead_stage: string
  lead_type?: string
  count: number
}

export interface SalesSummary {
  total_sales: number
  total_value: number
  avg_value: number
  by_branch?: { branch_id: string; sales: number; value: number }[]
}

export interface ARAgingSummary {
  bucket: string // 'current' | '1-30' | '31-60' | '61-90' | '90+'
  count: number
  total_amount: number
}

export interface ServiceMetrics {
  total_events: number
  completed: number
  callbacks: number
  callback_rate: number
  avg_time_on_site: number
}

// =============================================================================
// Schema Discovery Types
// =============================================================================

export interface TableInfo {
  tableId: string
  datasetId: string
  projectId: string
  rowCount?: number
  lastModified?: string
}

export interface ColumnInfo {
  name: string
  type: string
  mode: string // NULLABLE, REQUIRED, REPEATED
  description?: string
}

export interface DatasetSchema {
  datasetId: string
  tables: {
    tableId: string
    columns: ColumnInfo[]
  }[]
}

// =============================================================================
// Table Name Constants
// =============================================================================

/**
 * BigQuery table names - update these to match actual table names
 * after running schema discovery
 */
export const BQ_TABLES = {
  // Fact tables
  LEADS: 'fact_leads',
  OPPORTUNITIES: 'fact_opportunities',
  SALES: 'fact_sales',
  SERVICE_EVENTS: 'fact_service_events',
  INVOICES: 'fact_invoices',

  // Dimension tables
  BRANCHES: 'dim_branch',
  REGIONS: 'dim_region',
  MARKETS: 'dim_market',
  EMPLOYEES: 'dim_employee',
  CUSTOMERS: 'dim_customer',

  // Add more tables as discovered
} as const

export type BQTableName = typeof BQ_TABLES[keyof typeof BQ_TABLES]
