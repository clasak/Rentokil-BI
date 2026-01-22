/**
 * BigQuery Service Types
 *
 * Type definitions for BigQuery service provider.
 * These map BigQuery query results to application types.
 */

// =============================================================================
// Core Configuration Types
// =============================================================================

/**
 * BigQuery environment identifiers
 */
export type BigQueryEnvironment = 'production' | 'staging' | 'dev'

/**
 * BigQuery client configuration
 */
export interface BigQueryConfig {
  projectId: string
  dataset: string
  environment: BigQueryEnvironment
  isConfigured: boolean
}

// =============================================================================
// BigQuery Row Types (raw data from BigQuery)
// =============================================================================

/**
 * Raw customer row from BigQuery
 */
export interface BQCustomerRow {
  customer_id: string
  customer_name: string
  market_id?: string
  region_id?: string
  branch_id?: string
  owner_id?: string
  service_type?: string
  contract_value?: number
  contract_start_date?: string
  contract_end_date?: string
  health_score?: number
  status?: string
  risk_flag?: boolean
  created_at?: string
  updated_at?: string
  // Additional fields used by transformers
  vertical?: string
  retention_risk?: string
  last_service_date?: string
  start_date?: string
  service_frequency?: string
}

/**
 * Raw opportunity row from BigQuery
 */
export interface BQOpportunityRow {
  opportunity_id: string
  opportunity_name: string
  account_id?: string
  customer_id?: string
  owner_id?: string
  stage?: string
  amount?: number
  probability?: number
  close_date?: string
  source?: string
  product_type?: string
  created_at?: string
  updated_at?: string
  // Additional fields used by transformers
  created_date?: string
  next_step_date?: string
  last_modified_date?: string
  market_id?: string
  branch_id?: string
  next_step?: string
  lost_reason?: string
}

/**
 * Raw service event row from BigQuery
 */
export interface BQServiceEventRow {
  event_id: string
  service_event_id?: string
  account_id?: string
  customer_id?: string
  technician_id?: string
  route_id?: string
  event_type?: string
  scheduled_date?: string
  completed_date?: string
  status?: string
  service_type?: string
  duration_minutes?: number
  notes?: string
  // Additional fields used by transformers
  is_callback?: boolean
  service_date?: string
  completion_date?: string
  market_id?: string
  branch_id?: string
}

/**
 * Raw invoice row from BigQuery
 */
export interface BQInvoiceRow {
  invoice_id: string
  account_id?: string
  customer_id?: string
  invoice_date?: string
  due_date?: string
  amount?: number
  paid_amount?: number
  balance?: number
  status?: string
  aging_bucket?: string
  // Additional fields used by transformers
  paid_date?: string
  days_outstanding?: number
}

/**
 * Raw employee row from BigQuery
 */
export interface BQEmployeeRow {
  employee_id: string
  employee_name?: string
  first_name?: string
  last_name?: string
  email?: string
  role?: string
  market_id?: string
  region_id?: string
  branch_id?: string
  hire_date?: string
  status?: string
}

/**
 * Raw market row from BigQuery
 */
export interface BQMarketRow {
  market_id: string
  market_name: string
  vp_id?: string
  market_code?: string
}

/**
 * Raw branch row from BigQuery
 */
export interface BQBranchRow {
  branch_id: string
  branch_name: string
  market_id?: string
  region_id?: string
  manager_id?: string
  address?: string
  city?: string
  state?: string
  zip?: string
}

/**
 * Raw lead row from BigQuery
 */
export interface BQLeadRow {
  lead_id: string
  source?: string
  pest_type?: string
  status?: string
  assigned_to?: string
  market_id?: string
  region_id?: string
  branch_id?: string
  created_at?: string
  converted_at?: string
  opportunity_id?: string
}

// =============================================================================
// Domain Types
// =============================================================================

import type {
  Account,
  Opportunity,
  ServiceEvent,
  Invoice,
  User,
  Role,
} from '@/types'
import type {
  BigQueryConnectionStatus,
  BigQueryDiscoveryResult,
  BigQueryQueryResult,
} from '@/lib/bigquery'

/**
 * BigQuery service provider interface
 */
export interface BigQueryServiceProvider {
  // Connection
  testConnection(): Promise<BigQueryConnectionStatus>
  isConfigured(): boolean
  getProjectId(): string | undefined
  getEnvironment(): string

  // Discovery
  discover(): Promise<BigQueryDiscoveryResult>
  listDatasets(): Promise<string[]>
  listTables(datasetId: string): Promise<string[]>
  getTableSchema(datasetId: string, tableId: string): Promise<BigQueryTableSchema>

  // Generic query
  query<T = Record<string, unknown>>(
    sql: string,
    params?: Record<string, unknown>
  ): Promise<BigQueryQueryResult<T>>

  // Domain-specific queries (stubs - implement when you know the schema)
  accounts: BigQueryAccountService
  opportunities: BigQueryOpportunityService
  serviceEvents: BigQueryServiceEventService
  invoices: BigQueryInvoiceService
  users: BigQueryUserService
}

/**
 * BigQuery table schema response
 */
export interface BigQueryTableSchema {
  datasetId: string
  tableId: string
  columns: Array<{
    name: string
    type: string
    mode: string
    description?: string
  }>
}

/**
 * BigQuery Account Service
 * Stub interface - implement when you discover the schema
 */
export interface BigQueryAccountService {
  getAll(): Promise<Account[]>
  getById(id: string): Promise<Account | null>
  getByBranch(branchId: string): Promise<Account[]>
  getByMarket(marketId: string): Promise<Account[]>
  getByOwner(ownerId: string): Promise<Account[]>
  getHighRisk(): Promise<Account[]>
  filterByRole(accounts: Account[], role: Role, userId: string): Account[]

  // Raw query access for custom queries
  queryRaw<T = Record<string, unknown>>(sql: string): Promise<T[]>
}

/**
 * BigQuery Opportunity Service
 * Stub interface - implement when you discover the schema
 */
export interface BigQueryOpportunityService {
  getAll(): Promise<Opportunity[]>
  getById(id: string): Promise<Opportunity | null>
  getByAccount(accountId: string): Promise<Opportunity[]>
  getByOwner(ownerId: string): Promise<Opportunity[]>
  getStalled(): Promise<Opportunity[]>
  getPipeline(): Promise<Opportunity[]>
  filterByRole(opportunities: Opportunity[], role: Role, userId: string): Opportunity[]

  // Raw query access for custom queries
  queryRaw<T = Record<string, unknown>>(sql: string): Promise<T[]>
}

/**
 * BigQuery Service Event Service
 * Stub interface - implement when you discover the schema
 */
export interface BigQueryServiceEventService {
  getAll(): Promise<ServiceEvent[]>
  getById(id: string): Promise<ServiceEvent | null>
  getByAccount(accountId: string): Promise<ServiceEvent[]>
  getByTechnician(technicianId: string): Promise<ServiceEvent[]>
  getByRoute(routeId: string): Promise<ServiceEvent[]>
  getScheduled(startDate: Date, endDate: Date): Promise<ServiceEvent[]>
  getCallbacks(): Promise<ServiceEvent[]>

  // Raw query access for custom queries
  queryRaw<T = Record<string, unknown>>(sql: string): Promise<T[]>
}

/**
 * BigQuery Invoice Service
 * Stub interface - implement when you discover the schema
 */
export interface BigQueryInvoiceService {
  getAll(): Promise<Invoice[]>
  getById(id: string): Promise<Invoice | null>
  getByAccount(accountId: string): Promise<Invoice[]>
  getOverdue(): Promise<Invoice[]>
  getByAgingBucket(bucket: string): Promise<Invoice[]>

  // Raw query access for custom queries
  queryRaw<T = Record<string, unknown>>(sql: string): Promise<T[]>
}

/**
 * BigQuery User Service
 * Stub interface - implement when you discover the schema
 */
export interface BigQueryUserService {
  getAll(): Promise<User[]>

  // Raw query access for custom queries
  queryRaw<T = Record<string, unknown>>(sql: string): Promise<T[]>
}

/**
 * Configuration for table mappings
 * Fill these in when you discover the actual table names and columns
 */
export interface BigQueryTableMappings {
  accounts?: {
    dataset: string
    table: string
    columns: Record<string, string> // app column -> BigQuery column
  }
  opportunities?: {
    dataset: string
    table: string
    columns: Record<string, string>
  }
  serviceEvents?: {
    dataset: string
    table: string
    columns: Record<string, string>
  }
  invoices?: {
    dataset: string
    table: string
    columns: Record<string, string>
  }
  users?: {
    dataset: string
    table: string
    columns: Record<string, string>
  }
}
