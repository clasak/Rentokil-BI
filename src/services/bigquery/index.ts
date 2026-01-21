/**
 * BigQuery Service Provider
 *
 * Implements the full ServiceProvider interface using Google BigQuery
 * as the data source. Connects to the RTX data warehouse.
 *
 * ENVIRONMENT VARIABLES:
 *   NEXT_PUBLIC_BIGQUERY_PROJECT  - Project ID (bidata-sharedus-production)
 *   BIGQUERY_DATASET              - Dataset name (default: rtx_data)
 *
 * AUTHENTICATION:
 *   - Local: Run `gcloud auth application-default login`
 *   - GCP: Uses service account automatically
 */

import type { ServiceProvider } from '../types'
import type {
  Account, Opportunity, ServiceEvent, Invoice, User, Market, Branch,
  Team, Route, Activity, Complaint, TechnicianCapacity,
  KPIValue, DataSource, DataQualityMetric, ReconciliationItem,
  ActionItem, VarianceDriver, ForecastPoint, ForecastAssumption,
  BacktestResult, Role
} from '@/types'
import type {
  AccountExecutive, AEDashboardStats, Proposal, Sale
} from '@/types/sales-tracker'
import type {
  NewStartEntry, NewStartAEFields, NewStartAEInput, NewStartOpsFields, NewStartStatus, NewStartSummary
} from '@/types/new-start-log'
import type {
  Branch as DailyBranch, DailySalesEntry, DailySalesMetrics,
  BranchDashboardStats, RegionSummary, WeeklyRollup, RegionCode
} from '@/types/daily-sales-cadence'
import type {
  SalesforceQuoteDraft, StartPacket, StartPacketStatus,
  OpsEmailResponse, ParseValidationResult, PDFStorageMetadata
} from '@/types/salesforce-quote'

import { BigQueryClient, bigQueryClient, isBigQueryConfigured, BigQueryError } from './client'
import { BQ_TABLES } from './types'
import type {
  BQCustomerRow, BQOpportunityRow, BQServiceEventRow, BQInvoiceRow,
  BQEmployeeRow, BQMarketRow, BQBranchRow
} from './types'
import {
  transformAccounts, transformOpportunities, transformServiceEvents,
  transformInvoices, transformEmployees, transformMarkets, transformBranches,
  transformCustomerToAccount, transformOpportunity, transformServiceEvent,
  transformInvoice, transformEmployee
} from './transformers'

// =============================================================================
// Helper Functions
// =============================================================================

function notImplemented(method: string): never {
  throw new Error(
    `BigQuery service method "${method}" not yet implemented. ` +
    `This method requires additional table mapping or is not available via BigQuery.`
  )
}

/**
 * Filter data by role (client-side filtering)
 * In production, this could be enhanced with BigQuery row-level security
 */
function filterByRoleGeneric<T extends { ownerId?: string; branchId?: string }>(
  items: T[],
  role: Role,
  userId: string
): T[] {
  switch (role) {
    case 'exec':
    case 'market_director':
      return items // Full visibility
    case 'region_director':
    case 'manager':
    case 'ops_manager':
    case 'sales_manager':
      // Would filter by branch/region - needs user's assignments
      return items
    case 'rep':
      return items.filter(item => item.ownerId === userId)
    case 'technician':
      return [] // Technicians don't see these lists
    default:
      return items
  }
}

// =============================================================================
// BigQuery Service Provider Implementation
// =============================================================================

export function createBigQueryServiceProvider(client: BigQueryClient = bigQueryClient): ServiceProvider {
  const table = (name: string) => client.getTableName(name)

  return {
    // =========================================================================
    // Core Entity Services
    // =========================================================================

    markets: {
      async getAll(): Promise<Market[]> {
        const rows = await client.query<BQMarketRow>(
          `SELECT * FROM ${table(BQ_TABLES.MARKETS)}`
        )
        return transformMarkets(rows)
      },
      async getById(id: string): Promise<Market | null> {
        const rows = await client.query<BQMarketRow>(
          `SELECT * FROM ${table(BQ_TABLES.MARKETS)} WHERE market_id = @id`,
          { id }
        )
        return rows[0] ? transformMarkets([rows[0]])[0] : null
      }
    },

    branches: {
      async getAll(): Promise<Branch[]> {
        const rows = await client.query<BQBranchRow>(
          `SELECT * FROM ${table(BQ_TABLES.BRANCHES)} WHERE is_active = TRUE`
        )
        return transformBranches(rows)
      },
      async getById(id: string): Promise<Branch | null> {
        const rows = await client.query<BQBranchRow>(
          `SELECT * FROM ${table(BQ_TABLES.BRANCHES)} WHERE branch_id = @id`,
          { id }
        )
        return rows[0] ? transformBranches([rows[0]])[0] : null
      },
      async getByMarket(marketId: string): Promise<Branch[]> {
        const rows = await client.query<BQBranchRow>(
          `SELECT * FROM ${table(BQ_TABLES.BRANCHES)} WHERE market_id = @marketId AND is_active = TRUE`,
          { marketId }
        )
        return transformBranches(rows)
      }
    },

    teams: {
      async getAll(): Promise<Team[]> {
        // Teams may not exist in BigQuery - return empty or query if table exists
        console.warn('[BigQuery] Teams table not mapped - returning empty array')
        return []
      },
      async getById(): Promise<Team | null> {
        return null
      },
      async getByBranch(): Promise<Team[]> {
        return []
      }
    },

    routes: {
      async getAll(): Promise<Route[]> {
        // Routes may need custom table mapping
        console.warn('[BigQuery] Routes table not mapped - returning empty array')
        return []
      },
      async getById(): Promise<Route | null> {
        return null
      },
      async getByBranch(): Promise<Route[]> {
        return []
      }
    },

    users: {
      async getAll(): Promise<User[]> {
        const rows = await client.query<BQEmployeeRow>(
          `SELECT * FROM ${table(BQ_TABLES.EMPLOYEES)} WHERE is_active = TRUE`
        )
        return transformEmployees(rows)
      },
      async getById(id: string): Promise<User | null> {
        const rows = await client.query<BQEmployeeRow>(
          `SELECT * FROM ${table(BQ_TABLES.EMPLOYEES)} WHERE employee_id = @id`,
          { id }
        )
        return rows[0] ? transformEmployee(rows[0]) : null
      },
      async getByRole(role: Role): Promise<User[]> {
        const rows = await client.query<BQEmployeeRow>(
          `SELECT * FROM ${table(BQ_TABLES.EMPLOYEES)} WHERE LOWER(role) = @role AND is_active = TRUE`,
          { role }
        )
        return transformEmployees(rows)
      },
      async getCurrentUser(userId: string): Promise<User | null> {
        return this.getById(userId)
      }
    },

    // =========================================================================
    // Account Services
    // =========================================================================

    accounts: {
      async getAll(): Promise<Account[]> {
        const rows = await client.query<BQCustomerRow>(
          `SELECT * FROM ${table(BQ_TABLES.CUSTOMERS)} WHERE is_active = TRUE`
        )
        return transformAccounts(rows)
      },
      async getById(id: string): Promise<Account | null> {
        const rows = await client.query<BQCustomerRow>(
          `SELECT * FROM ${table(BQ_TABLES.CUSTOMERS)} WHERE customer_id = @id`,
          { id }
        )
        return rows[0] ? transformCustomerToAccount(rows[0]) : null
      },
      async getByOwner(ownerId: string): Promise<Account[]> {
        const rows = await client.query<BQCustomerRow>(
          `SELECT * FROM ${table(BQ_TABLES.CUSTOMERS)} WHERE owner_id = @ownerId AND is_active = TRUE`,
          { ownerId }
        )
        return transformAccounts(rows)
      },
      async getByBranch(branchId: string): Promise<Account[]> {
        const rows = await client.query<BQCustomerRow>(
          `SELECT * FROM ${table(BQ_TABLES.CUSTOMERS)} WHERE branch_id = @branchId AND is_active = TRUE`,
          { branchId }
        )
        return transformAccounts(rows)
      },
      async getByMarket(marketId: string): Promise<Account[]> {
        const rows = await client.query<BQCustomerRow>(
          `SELECT * FROM ${table(BQ_TABLES.CUSTOMERS)} WHERE market_id = @marketId AND is_active = TRUE`,
          { marketId }
        )
        return transformAccounts(rows)
      },
      async getByRetentionRisk(risk: Account['retentionRisk']): Promise<Account[]> {
        const rows = await client.query<BQCustomerRow>(
          `SELECT * FROM ${table(BQ_TABLES.CUSTOMERS)} WHERE LOWER(retention_risk) = @risk AND is_active = TRUE`,
          { risk }
        )
        return transformAccounts(rows)
      },
      async create(): Promise<Account> {
        throw new BigQueryError('BigQuery is read-only. Cannot create accounts.', 'READ_ONLY')
      },
      async update(): Promise<Account> {
        throw new BigQueryError('BigQuery is read-only. Cannot update accounts.', 'READ_ONLY')
      },
      async delete(): Promise<void> {
        throw new BigQueryError('BigQuery is read-only. Cannot delete accounts.', 'READ_ONLY')
      },
      async filterByRole(accounts: Account[], role: Role, userId: string): Promise<Account[]> {
        return filterByRoleGeneric(accounts, role, userId)
      }
    },

    // =========================================================================
    // Opportunity Services
    // =========================================================================

    opportunities: {
      async getAll(): Promise<Opportunity[]> {
        const rows = await client.query<BQOpportunityRow>(
          `SELECT * FROM ${table(BQ_TABLES.OPPORTUNITIES)} ORDER BY close_date DESC`
        )
        return transformOpportunities(rows)
      },
      async getById(id: string): Promise<Opportunity | null> {
        const rows = await client.query<BQOpportunityRow>(
          `SELECT * FROM ${table(BQ_TABLES.OPPORTUNITIES)} WHERE opportunity_id = @id`,
          { id }
        )
        return rows[0] ? transformOpportunity(rows[0]) : null
      },
      async getByAccount(accountId: string): Promise<Opportunity[]> {
        const rows = await client.query<BQOpportunityRow>(
          `SELECT * FROM ${table(BQ_TABLES.OPPORTUNITIES)} WHERE customer_id = @accountId`,
          { accountId }
        )
        return transformOpportunities(rows)
      },
      async getByOwner(ownerId: string): Promise<Opportunity[]> {
        const rows = await client.query<BQOpportunityRow>(
          `SELECT * FROM ${table(BQ_TABLES.OPPORTUNITIES)} WHERE owner_id = @ownerId`,
          { ownerId }
        )
        return transformOpportunities(rows)
      },
      async getByStage(stage: Opportunity['stage']): Promise<Opportunity[]> {
        const rows = await client.query<BQOpportunityRow>(
          `SELECT * FROM ${table(BQ_TABLES.OPPORTUNITIES)} WHERE LOWER(stage) = @stage`,
          { stage }
        )
        return transformOpportunities(rows)
      },
      async getStalled(): Promise<Opportunity[]> {
        // Stalled = no activity in 14+ days and not closed
        const rows = await client.query<BQOpportunityRow>(
          `SELECT * FROM ${table(BQ_TABLES.OPPORTUNITIES)}
           WHERE LOWER(stage) NOT IN ('closed_won', 'closed_lost', 'won', 'lost')
           AND DATE_DIFF(CURRENT_DATE(), DATE(last_modified_date), DAY) > 14`
        )
        return transformOpportunities(rows)
      },
      async create(): Promise<Opportunity> {
        throw new BigQueryError('BigQuery is read-only. Cannot create opportunities.', 'READ_ONLY')
      },
      async update(): Promise<Opportunity> {
        throw new BigQueryError('BigQuery is read-only. Cannot update opportunities.', 'READ_ONLY')
      },
      async delete(): Promise<void> {
        throw new BigQueryError('BigQuery is read-only. Cannot delete opportunities.', 'READ_ONLY')
      },
      async filterByRole(opps: Opportunity[], role: Role, userId: string): Promise<Opportunity[]> {
        return filterByRoleGeneric(opps, role, userId)
      }
    },

    // =========================================================================
    // Activity Services
    // =========================================================================

    activities: {
      async getAll(): Promise<Activity[]> {
        console.warn('[BigQuery] Activities table not mapped - returning empty array')
        return []
      },
      async getById(): Promise<Activity | null> {
        return null
      },
      async getByAccount(): Promise<Activity[]> {
        return []
      },
      async getByOpportunity(): Promise<Activity[]> {
        return []
      },
      async getByUser(): Promise<Activity[]> {
        return []
      },
      async create(): Promise<Activity> {
        throw new BigQueryError('BigQuery is read-only. Cannot create activities.', 'READ_ONLY')
      }
    },

    // =========================================================================
    // Service Event Services
    // =========================================================================

    serviceEvents: {
      async getAll(): Promise<ServiceEvent[]> {
        const rows = await client.query<BQServiceEventRow>(
          `SELECT * FROM ${table(BQ_TABLES.SERVICE_EVENTS)} ORDER BY scheduled_date DESC LIMIT 10000`
        )
        return transformServiceEvents(rows)
      },
      async getById(id: string): Promise<ServiceEvent | null> {
        const rows = await client.query<BQServiceEventRow>(
          `SELECT * FROM ${table(BQ_TABLES.SERVICE_EVENTS)} WHERE service_event_id = @id`,
          { id }
        )
        return rows[0] ? transformServiceEvent(rows[0]) : null
      },
      async getByAccount(accountId: string): Promise<ServiceEvent[]> {
        const rows = await client.query<BQServiceEventRow>(
          `SELECT * FROM ${table(BQ_TABLES.SERVICE_EVENTS)} WHERE customer_id = @accountId`,
          { accountId }
        )
        return transformServiceEvents(rows)
      },
      async getByTechnician(technicianId: string): Promise<ServiceEvent[]> {
        const rows = await client.query<BQServiceEventRow>(
          `SELECT * FROM ${table(BQ_TABLES.SERVICE_EVENTS)} WHERE technician_id = @technicianId`,
          { technicianId }
        )
        return transformServiceEvents(rows)
      },
      async getByRoute(routeId: string): Promise<ServiceEvent[]> {
        const rows = await client.query<BQServiceEventRow>(
          `SELECT * FROM ${table(BQ_TABLES.SERVICE_EVENTS)} WHERE route_id = @routeId`,
          { routeId }
        )
        return transformServiceEvents(rows)
      },
      async getByStatus(status: ServiceEvent['status']): Promise<ServiceEvent[]> {
        const rows = await client.query<BQServiceEventRow>(
          `SELECT * FROM ${table(BQ_TABLES.SERVICE_EVENTS)} WHERE LOWER(status) = @status`,
          { status }
        )
        return transformServiceEvents(rows)
      },
      async getCallbacks(): Promise<ServiceEvent[]> {
        const rows = await client.query<BQServiceEventRow>(
          `SELECT * FROM ${table(BQ_TABLES.SERVICE_EVENTS)} WHERE is_callback = TRUE`
        )
        return transformServiceEvents(rows)
      },
      async create(): Promise<ServiceEvent> {
        throw new BigQueryError('BigQuery is read-only. Cannot create service events.', 'READ_ONLY')
      },
      async update(): Promise<ServiceEvent> {
        throw new BigQueryError('BigQuery is read-only. Cannot update service events.', 'READ_ONLY')
      }
    },

    // =========================================================================
    // Invoice Services
    // =========================================================================

    invoices: {
      async getAll(): Promise<Invoice[]> {
        const rows = await client.query<BQInvoiceRow>(
          `SELECT * FROM ${table(BQ_TABLES.INVOICES)} ORDER BY invoice_date DESC LIMIT 10000`
        )
        return transformInvoices(rows)
      },
      async getById(id: string): Promise<Invoice | null> {
        const rows = await client.query<BQInvoiceRow>(
          `SELECT * FROM ${table(BQ_TABLES.INVOICES)} WHERE invoice_id = @id`,
          { id }
        )
        return rows[0] ? transformInvoice(rows[0]) : null
      },
      async getByAccount(accountId: string): Promise<Invoice[]> {
        const rows = await client.query<BQInvoiceRow>(
          `SELECT * FROM ${table(BQ_TABLES.INVOICES)} WHERE customer_id = @accountId`,
          { accountId }
        )
        return transformInvoices(rows)
      },
      async getByStatus(status: Invoice['status']): Promise<Invoice[]> {
        const rows = await client.query<BQInvoiceRow>(
          `SELECT * FROM ${table(BQ_TABLES.INVOICES)} WHERE LOWER(status) = @status`,
          { status }
        )
        return transformInvoices(rows)
      },
      async getByAgingBucket(bucket: Invoice['agingBucket']): Promise<Invoice[]> {
        let condition: string
        switch (bucket) {
          case '0-30':
            condition = 'days_outstanding BETWEEN 0 AND 30'
            break
          case '31-60':
            condition = 'days_outstanding BETWEEN 31 AND 60'
            break
          case '61-90':
            condition = 'days_outstanding BETWEEN 61 AND 90'
            break
          case '90+':
            condition = 'days_outstanding > 90'
            break
          default:
            condition = 'TRUE'
        }
        const rows = await client.query<BQInvoiceRow>(
          `SELECT * FROM ${table(BQ_TABLES.INVOICES)} WHERE ${condition}`
        )
        return transformInvoices(rows)
      },
      async getOverdue(): Promise<Invoice[]> {
        const rows = await client.query<BQInvoiceRow>(
          `SELECT * FROM ${table(BQ_TABLES.INVOICES)} WHERE LOWER(status) = 'overdue' OR days_outstanding > 0`
        )
        return transformInvoices(rows)
      },
      async create(): Promise<Invoice> {
        throw new BigQueryError('BigQuery is read-only. Cannot create invoices.', 'READ_ONLY')
      },
      async update(): Promise<Invoice> {
        throw new BigQueryError('BigQuery is read-only. Cannot update invoices.', 'READ_ONLY')
      }
    },

    // =========================================================================
    // Complaint Services
    // =========================================================================

    complaints: {
      async getAll(): Promise<Complaint[]> {
        console.warn('[BigQuery] Complaints table not mapped - returning empty array')
        return []
      },
      async getById(): Promise<Complaint | null> {
        return null
      },
      async getByAccount(): Promise<Complaint[]> {
        return []
      },
      async getByStatus(): Promise<Complaint[]> {
        return []
      },
      async getBySeverity(): Promise<Complaint[]> {
        return []
      }
    },

    // =========================================================================
    // KPI Services
    // =========================================================================

    kpis: {
      async getAllValues(): Promise<KPIValue[]> {
        // KPIs are calculated from underlying data
        // For now, fall back to mock calculations
        // TODO: Implement BigQuery-based KPI calculations
        console.warn('[BigQuery] KPI calculations not implemented - requires custom queries')
        return []
      },
      async getValueBySlug(): Promise<KPIValue | null> {
        return null
      },
      async getVarianceDrivers(): Promise<VarianceDriver[]> {
        return []
      },
      async getReconciliation(): Promise<ReconciliationItem | null> {
        return null
      },
      async getActionItems(): Promise<ActionItem[]> {
        return []
      }
    },

    // =========================================================================
    // Data Quality Services
    // =========================================================================

    dataQuality: {
      async getDataSources(): Promise<DataSource[]> {
        const config = client.getConfig()
        return [{
          name: 'BigQuery',
          system: `${config.projectId}.${config.dataset}`,
          lastRefresh: new Date(),
          status: 'fresh',
          recordCount: 0, // Would need COUNT queries
          knownIssues: []
        }]
      },
      async getQualityMetrics(): Promise<DataQualityMetric[]> {
        return []
      },
      async refreshDataSource(): Promise<DataSource> {
        // BigQuery data is refreshed by ETL pipelines, not on-demand
        throw new BigQueryError('BigQuery data refresh is managed by ETL pipelines.', 'NOT_SUPPORTED')
      }
    },

    // =========================================================================
    // Forecast Services
    // =========================================================================

    forecast: {
      async getForecastPoints(): Promise<ForecastPoint[]> {
        // Forecasts may be in BigQuery or calculated
        console.warn('[BigQuery] Forecast tables not mapped')
        return []
      },
      async getAssumptions(): Promise<ForecastAssumption[]> {
        return []
      },
      async getBacktestResults(): Promise<BacktestResult[]> {
        return []
      }
    },

    // =========================================================================
    // Capacity Services
    // =========================================================================

    capacity: {
      async getAll(): Promise<TechnicianCapacity[]> {
        console.warn('[BigQuery] Capacity tables not mapped')
        return []
      },
      async getByBranch(): Promise<TechnicianCapacity[]> {
        return []
      },
      async getByTechnician(): Promise<TechnicianCapacity[]> {
        return []
      },
      async getByDate(): Promise<TechnicianCapacity[]> {
        return []
      }
    },

    // =========================================================================
    // Sales Tracker Services (AE-specific, likely not in BigQuery)
    // =========================================================================

    salesTracker: {
      async initializeData(): Promise<AccountExecutive> {
        notImplemented('salesTracker.initializeData')
      },
      async getData(): Promise<AccountExecutive | null> {
        return null
      },
      async getDashboardStats(): Promise<AEDashboardStats> {
        notImplemented('salesTracker.getDashboardStats')
      },
      async addProposal(): Promise<Proposal> {
        throw new BigQueryError('BigQuery is read-only.', 'READ_ONLY')
      },
      async addSale(): Promise<Sale> {
        throw new BigQueryError('BigQuery is read-only.', 'READ_ONLY')
      },
      async markProposalSold(): Promise<void> {
        throw new BigQueryError('BigQuery is read-only.', 'READ_ONLY')
      },
      async markProposalDead(): Promise<void> {
        throw new BigQueryError('BigQuery is read-only.', 'READ_ONLY')
      }
    },

    // =========================================================================
    // New Start Services (operational, likely not in BigQuery)
    // =========================================================================

    newStarts: {
      async initialize(): Promise<NewStartEntry[]> {
        return []
      },
      async getAll(): Promise<NewStartEntry[]> {
        return []
      },
      async getById(): Promise<NewStartEntry | null> {
        return null
      },
      async getSummary(): Promise<NewStartSummary> {
        return {
          total: 0,
          pendingOps: 0,
          scheduled: 0,
          confirmed: 0,
          inProgress: 0,
          completed: 0,
          onHold: 0,
          totalInitialValue: 0,
          totalContractValue: 0
        }
      },
      async getByStatus(): Promise<NewStartEntry[]> {
        return []
      },
      async getByOpsManager(): Promise<NewStartEntry[]> {
        return []
      },
      async getBySalesRep(): Promise<NewStartEntry[]> {
        return []
      },
      async create(): Promise<NewStartEntry> {
        throw new BigQueryError('BigQuery is read-only.', 'READ_ONLY')
      },
      async updateOpsFields(): Promise<NewStartEntry | null> {
        throw new BigQueryError('BigQuery is read-only.', 'READ_ONLY')
      }
    },

    // =========================================================================
    // Daily Sales Services (operational, likely not in BigQuery)
    // =========================================================================

    dailySales: {
      async initialize(): Promise<void> {},
      async getBranches(): Promise<DailyBranch[]> {
        return []
      },
      async getBranchesByRegion(): Promise<DailyBranch[]> {
        return []
      },
      async getBranchByCode(): Promise<DailyBranch | null> {
        return null
      },
      async getAllRegions(): Promise<RegionCode[]> {
        return []
      },
      async getEntriesForBranch(): Promise<DailySalesEntry[]> {
        return []
      },
      async getEntriesForDate(): Promise<DailySalesEntry[]> {
        return []
      },
      async getEntriesForRegion(): Promise<DailySalesEntry[]> {
        return []
      },
      async addEntry(): Promise<DailySalesEntry> {
        throw new BigQueryError('BigQuery is read-only.', 'READ_ONLY')
      },
      async getBranchDashboardStats(): Promise<BranchDashboardStats> {
        notImplemented('dailySales.getBranchDashboardStats')
      },
      async getRegionSummary(): Promise<RegionSummary> {
        notImplemented('dailySales.getRegionSummary')
      },
      async getWeeklyRollup(): Promise<WeeklyRollup> {
        notImplemented('dailySales.getWeeklyRollup')
      }
    },

    // =========================================================================
    // Salesforce Parser Services (not BigQuery-related)
    // =========================================================================

    salesforceParser: {
      async parseQuote(): Promise<SalesforceQuoteDraft> {
        notImplemented('salesforceParser.parseQuote')
      },
      async validateDraft(): Promise<ParseValidationResult> {
        return {
          isValid: false,
          errors: [{ field: 'provider', message: 'BigQuery provider does not support PDF parsing' }],
          warnings: []
        }
      },
      async mapToNewStartFields(): Promise<Partial<NewStartAEInput>> {
        return {}
      }
    },

    // =========================================================================
    // Start Packet Services (not BigQuery-related)
    // =========================================================================

    startPackets: {
      async create(): Promise<StartPacket> {
        throw new BigQueryError('BigQuery is read-only.', 'READ_ONLY')
      },
      async getById(): Promise<StartPacket | null> {
        return null
      },
      async getAll(): Promise<StartPacket[]> {
        return []
      },
      async getByStatus(): Promise<StartPacket[]> {
        return []
      },
      async update(): Promise<StartPacket | null> {
        throw new BigQueryError('BigQuery is read-only.', 'READ_ONLY')
      },
      async delete(): Promise<boolean> {
        throw new BigQueryError('BigQuery is read-only.', 'READ_ONLY')
      },
      async sendOpsNotification(): Promise<OpsEmailResponse> {
        throw new BigQueryError('BigQuery provider does not support email.', 'NOT_SUPPORTED')
      }
    },

    // =========================================================================
    // PDF Storage Services (not BigQuery-related)
    // =========================================================================

    pdfStorage: {
      async store(): Promise<PDFStorageMetadata> {
        throw new BigQueryError('BigQuery provider does not support file storage.', 'NOT_SUPPORTED')
      },
      async retrieve(): Promise<{ data: ArrayBuffer; mimeType: string } | null> {
        return null
      },
      async getMetadata(): Promise<PDFStorageMetadata | null> {
        return null
      },
      async list(): Promise<PDFStorageMetadata[]> {
        return []
      },
      async getByStartPacket(): Promise<PDFStorageMetadata[]> {
        return []
      },
      async delete(): Promise<boolean> {
        throw new BigQueryError('BigQuery is read-only.', 'READ_ONLY')
      },
      async associateWithStartPacket(): Promise<PDFStorageMetadata | null> {
        throw new BigQueryError('BigQuery is read-only.', 'READ_ONLY')
      },
      async cleanup(): Promise<number> {
        return 0
      },
      isAvailable(): boolean {
        return false
      }
    },

    // =========================================================================
    // Utility Methods
    // =========================================================================

    async refreshData(): Promise<void> {
      // BigQuery data is refreshed by ETL pipelines
      console.log('[BigQuery] Data refresh is managed by ETL pipelines, not on-demand.')
    },

    async setDataQualityIssues(): Promise<void> {
      // Not applicable for BigQuery
      console.log('[BigQuery] Data quality issues toggle not applicable.')
    }
  }
}

// =============================================================================
// Exports
// =============================================================================

export const bigQueryServiceProvider = createBigQueryServiceProvider()

export { bigQueryClient, isBigQueryConfigured, BigQueryClient, BigQueryError } from './client'
export type { BigQueryConfig, BigQueryEnvironment } from './client'
export * from './types'
