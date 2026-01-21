/**
 * BigQuery Service Provider
 *
 * Implements service interfaces for BigQuery data source.
 * This provider connects to RTX Data Hub's BigQuery warehouse.
 *
 * NOTE: This is infrastructure setup only. Actual query implementations
 * are stubs until you discover the schema using the /api/bigquery/discover endpoint.
 *
 * Usage:
 * Set NEXT_PUBLIC_DATA_SOURCE=bigquery in .env.local
 */

import {
  bigQueryClient,
  createBigQueryClient,
  BigQueryClient,
} from '@/lib/bigquery'
import type {
  BigQueryConnectionStatus,
  BigQueryDiscoveryResult,
  BigQueryQueryResult,
  BigQueryColumn,
} from '@/lib/bigquery'
import type {
  BigQueryServiceProvider,
  BigQueryTableSchema,
  BigQueryAccountService,
  BigQueryOpportunityService,
  BigQueryServiceEventService,
  BigQueryInvoiceService,
  BigQueryUserService,
} from './types'
import type { Account, Opportunity, ServiceEvent, Invoice, User, Role } from '@/types'

/**
 * Create a stub service that throws helpful errors
 * These will be implemented once you discover the schema
 */
function createNotImplementedError(service: string, method: string): Error {
  return new Error(
    `[BigQuery] ${service}.${method}() not yet implemented. ` +
    `Use the /api/bigquery/discover endpoint to find the schema, ` +
    `then implement the query in src/services/bigquery/index.ts`
  )
}

/**
 * Create BigQuery Account Service
 */
function createAccountService(client: BigQueryClient): BigQueryAccountService {
  return {
    async getAll(): Promise<Account[]> {
      throw createNotImplementedError('accounts', 'getAll')
    },

    async getById(_id: string): Promise<Account | null> {
      throw createNotImplementedError('accounts', 'getById')
    },

    async getByBranch(_branchId: string): Promise<Account[]> {
      throw createNotImplementedError('accounts', 'getByBranch')
    },

    async getByMarket(_marketId: string): Promise<Account[]> {
      throw createNotImplementedError('accounts', 'getByMarket')
    },

    async getByOwner(_ownerId: string): Promise<Account[]> {
      throw createNotImplementedError('accounts', 'getByOwner')
    },

    async getHighRisk(): Promise<Account[]> {
      throw createNotImplementedError('accounts', 'getHighRisk')
    },

    filterByRole(accounts: Account[], role: Role, userId: string): Account[] {
      // Role-based filtering - same logic as RTX provider
      switch (role) {
        case 'exec':
        case 'market_director':
          return accounts
        case 'region_director':
          return accounts
        case 'manager':
        case 'ops_manager':
        case 'sales_manager':
          return accounts
        case 'rep':
          return accounts.filter((a) => a.ownerId === userId)
        case 'technician':
          return []
        default:
          return accounts
      }
    },

    async queryRaw<T = Record<string, unknown>>(sql: string): Promise<T[]> {
      const result = await client.query<T>(sql)
      return result.rows
    },
  }
}

/**
 * Create BigQuery Opportunity Service
 */
function createOpportunityService(client: BigQueryClient): BigQueryOpportunityService {
  return {
    async getAll(): Promise<Opportunity[]> {
      throw createNotImplementedError('opportunities', 'getAll')
    },

    async getById(_id: string): Promise<Opportunity | null> {
      throw createNotImplementedError('opportunities', 'getById')
    },

    async getByAccount(_accountId: string): Promise<Opportunity[]> {
      throw createNotImplementedError('opportunities', 'getByAccount')
    },

    async getByOwner(_ownerId: string): Promise<Opportunity[]> {
      throw createNotImplementedError('opportunities', 'getByOwner')
    },

    async getStalled(): Promise<Opportunity[]> {
      throw createNotImplementedError('opportunities', 'getStalled')
    },

    async getPipeline(): Promise<Opportunity[]> {
      throw createNotImplementedError('opportunities', 'getPipeline')
    },

    filterByRole(opportunities: Opportunity[], role: Role, userId: string): Opportunity[] {
      switch (role) {
        case 'exec':
        case 'market_director':
        case 'region_director':
        case 'sales_manager':
          return opportunities
        case 'manager':
          return opportunities
        case 'rep':
          return opportunities.filter((o) => o.ownerId === userId)
        case 'ops_manager':
        case 'technician':
          return []
        default:
          return opportunities
      }
    },

    async queryRaw<T = Record<string, unknown>>(sql: string): Promise<T[]> {
      const result = await client.query<T>(sql)
      return result.rows
    },
  }
}

/**
 * Create BigQuery Service Event Service
 */
function createServiceEventService(client: BigQueryClient): BigQueryServiceEventService {
  return {
    async getAll(): Promise<ServiceEvent[]> {
      throw createNotImplementedError('serviceEvents', 'getAll')
    },

    async getById(_id: string): Promise<ServiceEvent | null> {
      throw createNotImplementedError('serviceEvents', 'getById')
    },

    async getByAccount(_accountId: string): Promise<ServiceEvent[]> {
      throw createNotImplementedError('serviceEvents', 'getByAccount')
    },

    async getByTechnician(_technicianId: string): Promise<ServiceEvent[]> {
      throw createNotImplementedError('serviceEvents', 'getByTechnician')
    },

    async getByRoute(_routeId: string): Promise<ServiceEvent[]> {
      throw createNotImplementedError('serviceEvents', 'getByRoute')
    },

    async getScheduled(_startDate: Date, _endDate: Date): Promise<ServiceEvent[]> {
      throw createNotImplementedError('serviceEvents', 'getScheduled')
    },

    async getCallbacks(): Promise<ServiceEvent[]> {
      throw createNotImplementedError('serviceEvents', 'getCallbacks')
    },

    async queryRaw<T = Record<string, unknown>>(sql: string): Promise<T[]> {
      const result = await client.query<T>(sql)
      return result.rows
    },
  }
}

/**
 * Create BigQuery Invoice Service
 */
function createInvoiceService(client: BigQueryClient): BigQueryInvoiceService {
  return {
    async getAll(): Promise<Invoice[]> {
      throw createNotImplementedError('invoices', 'getAll')
    },

    async getById(_id: string): Promise<Invoice | null> {
      throw createNotImplementedError('invoices', 'getById')
    },

    async getByAccount(_accountId: string): Promise<Invoice[]> {
      throw createNotImplementedError('invoices', 'getByAccount')
    },

    async getOverdue(): Promise<Invoice[]> {
      throw createNotImplementedError('invoices', 'getOverdue')
    },

    async getByAgingBucket(_bucket: string): Promise<Invoice[]> {
      throw createNotImplementedError('invoices', 'getByAgingBucket')
    },

    async queryRaw<T = Record<string, unknown>>(sql: string): Promise<T[]> {
      const result = await client.query<T>(sql)
      return result.rows
    },
  }
}

/**
 * Create BigQuery User Service
 */
function createUserService(client: BigQueryClient): BigQueryUserService {
  return {
    async getAll(): Promise<User[]> {
      throw createNotImplementedError('users', 'getAll')
    },

    async queryRaw<T = Record<string, unknown>>(sql: string): Promise<T[]> {
      const result = await client.query<T>(sql)
      return result.rows
    },
  }
}

/**
 * Create BigQuery Service Provider
 */
export function createBigQueryServiceProvider(
  client: BigQueryClient = bigQueryClient
): BigQueryServiceProvider {
  return {
    // Connection
    testConnection: () => client.testConnection(),
    isConfigured: () => client.isConfigured(),
    getProjectId: () => client.getProjectId(),
    getEnvironment: () => client.getEnvironment(),

    // Discovery
    discover: () => client.discover(),

    async listDatasets(): Promise<string[]> {
      const datasets = await client.listDatasets()
      return datasets.map((ds) => ds.id)
    },

    async listTables(datasetId: string): Promise<string[]> {
      const tables = await client.listTables(datasetId)
      return tables.map((t) => t.name)
    },

    async getTableSchema(datasetId: string, tableId: string): Promise<BigQueryTableSchema> {
      const columns = await client.getTableSchema(datasetId, tableId)
      return {
        datasetId,
        tableId,
        columns: columns.map((col: BigQueryColumn) => ({
          name: col.name,
          type: col.type,
          mode: col.mode,
          description: col.description,
        })),
      }
    },

    // Generic query
    query: <T = Record<string, unknown>>(
      sql: string,
      params?: Record<string, unknown>
    ) => client.queryWithParams<T>(sql, params || {}),

    // Domain-specific services
    accounts: createAccountService(client),
    opportunities: createOpportunityService(client),
    serviceEvents: createServiceEventService(client),
    invoices: createInvoiceService(client),
    users: createUserService(client),
  }
}

// Export singleton provider using default client
export const bigQueryServiceProvider = createBigQueryServiceProvider()

// Re-export client for direct access
export { bigQueryClient, createBigQueryClient } from '@/lib/bigquery'

// Re-export types
export type {
  BigQueryServiceProvider,
  BigQueryTableSchema,
  BigQueryAccountService,
  BigQueryOpportunityService,
  BigQueryServiceEventService,
  BigQueryInvoiceService,
  BigQueryUserService,
  BigQueryTableMappings,
} from './types'
