/**
 * RTX Data Hub Service Provider
 *
 * Implements the ServiceProvider interface using RTX Data Hub as the data source.
 * This provider can be swapped in place of the mock provider by changing
 * the NEXT_PUBLIC_DATA_SOURCE environment variable.
 */

import { rtxClient, RTXClient, createRTXClient, RTXApiError } from './client'
import type { RTXConnectionConfig, RTXConnectionStatus } from './types'
import type { Account, Opportunity, ServiceEvent, Invoice, User, Role } from '@/types'

export interface RTXServiceProvider {
  // Connection
  testConnection(): Promise<RTXConnectionStatus>
  isConfigured(): boolean

  // Accounts
  accounts: {
    getAll(): Promise<Account[]>
    getById(id: string): Promise<Account | null>
    getByBranch(branchId: string): Promise<Account[]>
    getByMarket(marketId: string): Promise<Account[]>
    getByOwner(ownerId: string): Promise<Account[]>
    getHighRisk(): Promise<Account[]>
    filterByRole(accounts: Account[], role: Role, userId: string): Account[]
  }

  // Opportunities
  opportunities: {
    getAll(): Promise<Opportunity[]>
    getById(id: string): Promise<Opportunity | null>
    getByAccount(accountId: string): Promise<Opportunity[]>
    getByOwner(ownerId: string): Promise<Opportunity[]>
    getStalled(): Promise<Opportunity[]>
    getPipeline(): Promise<Opportunity[]>
    filterByRole(opportunities: Opportunity[], role: Role, userId: string): Opportunity[]
  }

  // Service Events
  serviceEvents: {
    getAll(): Promise<ServiceEvent[]>
    getById(id: string): Promise<ServiceEvent | null>
    getByAccount(accountId: string): Promise<ServiceEvent[]>
    getByTechnician(technicianId: string): Promise<ServiceEvent[]>
    getByRoute(routeId: string): Promise<ServiceEvent[]>
    getScheduled(startDate: Date, endDate: Date): Promise<ServiceEvent[]>
    getCallbacks(): Promise<ServiceEvent[]>
  }

  // Invoices
  invoices: {
    getAll(): Promise<Invoice[]>
    getById(id: string): Promise<Invoice | null>
    getByAccount(accountId: string): Promise<Invoice[]>
    getOverdue(): Promise<Invoice[]>
    getByAgingBucket(bucket: string): Promise<Invoice[]>
  }

  // Users
  users: {
    getAll(): Promise<User[]>
  }
}

/**
 * Create RTX service provider from a client instance
 */
export function createRTXServiceProvider(client: RTXClient): RTXServiceProvider {
  return {
    testConnection: () => client.testConnection(),
    isConfigured: () => client.isConfigured(),

    accounts: {
      getAll: () => client.getAccounts(),
      getById: (id) => client.getAccountById(id),
      getByBranch: (branchId) => client.getAccountsByBranch(branchId),
      getByMarket: (marketId) => client.getAccountsByMarket(marketId),
      getByOwner: (ownerId) => client.getAccountsByOwner(ownerId),
      getHighRisk: () => client.getHighRiskAccounts(),
      filterByRole: (accounts, role, userId) => {
        // Role-based filtering logic
        switch (role) {
          case 'exec':
          case 'market_vp':
          case 'market_sales_director':
            return accounts // Full visibility
          case 'region_director':
          case 'region_sales_manager':
            // Would filter by region - need user's assigned regions
            return accounts
          case 'manager':
          case 'ops_manager':
          case 'sales_manager':
            // Would filter by branch - need user's assigned branches
            return accounts
          case 'rep':
            return accounts.filter(a => a.ownerId === userId)
          case 'technician':
            return [] // Technicians don't see account lists
          default:
            return accounts
        }
      }
    },

    opportunities: {
      getAll: () => client.getOpportunities(),
      getById: (id) => client.getOpportunityById(id),
      getByAccount: (accountId) => client.getOpportunitiesByAccount(accountId),
      getByOwner: (ownerId) => client.getOpportunitiesByOwner(ownerId),
      getStalled: () => client.getStalledOpportunities(),
      getPipeline: () => client.getPipelineOpportunities(),
      filterByRole: (opportunities, role, userId) => {
        switch (role) {
          case 'exec':
          case 'market_vp':
          case 'market_sales_director':
          case 'region_director':
          case 'region_sales_manager':
          case 'sales_manager':
            return opportunities // Full visibility for sales leadership
          case 'manager':
            // Would filter by branch
            return opportunities
          case 'rep':
            return opportunities.filter(o => o.ownerId === userId)
          case 'ops_manager':
          case 'technician':
            return [] // Ops/tech don't manage opportunities
          default:
            return opportunities
        }
      }
    },

    serviceEvents: {
      getAll: () => client.getServiceEvents(),
      getById: (id) => client.getServiceEventById(id),
      getByAccount: (accountId) => client.getServiceEventsByAccount(accountId),
      getByTechnician: (technicianId) => client.getServiceEventsByTechnician(technicianId),
      getByRoute: (routeId) => client.getServiceEventsByRoute(routeId),
      getScheduled: (startDate, endDate) => client.getScheduledEvents(startDate, endDate),
      getCallbacks: () => client.getCallbacks()
    },

    invoices: {
      getAll: () => client.getInvoices(),
      getById: (id) => client.getInvoiceById(id),
      getByAccount: (accountId) => client.getInvoicesByAccount(accountId),
      getOverdue: () => client.getOverdueInvoices(),
      getByAgingBucket: (bucket) => client.getInvoicesByAgingBucket(bucket)
    },

    users: {
      getAll: () => client.getUsers()
    }
  }
}

// Export default provider using singleton client
export const rtxServiceProvider = createRTXServiceProvider(rtxClient)

// Re-export types and client utilities
export { rtxClient, createRTXClient, RTXApiError }
export type { RTXConnectionConfig, RTXConnectionStatus }
