/**
 * BigQuery Service Types
 *
 * Type definitions for BigQuery service provider.
 * These map BigQuery query results to application types.
 */

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
