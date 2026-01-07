/**
 * Service Layer Type Definitions
 *
 * These interfaces define the contract for all data operations.
 * Both mock and Supabase implementations must follow these interfaces.
 */

import {
  Market, Branch, Team, Route, User, Account, Opportunity,
  Activity, ServiceEvent, Complaint, Invoice, TechnicianCapacity,
  KPIValue, DataSource, DataQualityMetric, ReconciliationItem,
  ActionItem, VarianceDriver, ForecastPoint, ForecastAssumption,
  BacktestResult, Role
} from '@/types'
import {
  AccountExecutive, Proposal, Sale, AEDashboardStats
} from '@/types/sales-tracker'
import {
  NewStartEntry, NewStartAEFields, NewStartOpsFields, NewStartStatus, NewStartSummary
} from '@/types/new-start-log'
import {
  Branch as DailyBranch, DailySalesEntry, DailySalesMetrics,
  BranchDashboardStats, RegionSummary, WeeklyRollup, RegionCode
} from '@/types/daily-sales-cadence'

// =============================================================================
// Core Entity Services
// =============================================================================

export interface MarketService {
  getAll(): Promise<Market[]>
  getById(id: string): Promise<Market | null>
}

export interface BranchService {
  getAll(): Promise<Branch[]>
  getById(id: string): Promise<Branch | null>
  getByMarket(marketId: string): Promise<Branch[]>
}

export interface TeamService {
  getAll(): Promise<Team[]>
  getById(id: string): Promise<Team | null>
  getByBranch(branchId: string): Promise<Team[]>
}

export interface RouteService {
  getAll(): Promise<Route[]>
  getById(id: string): Promise<Route | null>
  getByBranch(branchId: string): Promise<Route[]>
}

export interface UserService {
  getAll(): Promise<User[]>
  getById(id: string): Promise<User | null>
  getByRole(role: Role): Promise<User[]>
  getCurrentUser(userId: string): Promise<User | null>
}

// =============================================================================
// Account Services
// =============================================================================

export interface CreateAccountInput {
  name: string
  vertical: Account['vertical']
  contractValue: number
  marketId: string
  branchId: string
  ownerId: string
  serviceFrequency: Account['serviceFrequency']
}

export interface UpdateAccountInput {
  name?: string
  vertical?: Account['vertical']
  contractValue?: number
  retentionRisk?: Account['retentionRisk']
  ownerId?: string
  serviceFrequency?: Account['serviceFrequency']
}

export interface AccountService {
  getAll(): Promise<Account[]>
  getById(id: string): Promise<Account | null>
  getByOwner(ownerId: string): Promise<Account[]>
  getByBranch(branchId: string): Promise<Account[]>
  getByMarket(marketId: string): Promise<Account[]>
  getByRetentionRisk(risk: Account['retentionRisk']): Promise<Account[]>
  create(data: CreateAccountInput): Promise<Account>
  update(id: string, data: UpdateAccountInput): Promise<Account>
  delete(id: string): Promise<void>
  filterByRole(accounts: Account[], role: Role, userId: string): Promise<Account[]>
}

// =============================================================================
// Opportunity Services
// =============================================================================

export interface CreateOpportunityInput {
  accountId: string
  name: string
  amount: number
  stage: Opportunity['stage']
  closeDate: Date
  ownerId: string
}

export interface UpdateOpportunityInput {
  name?: string
  amount?: number
  stage?: Opportunity['stage']
  closeDate?: Date
  nextStep?: string
  nextStepDate?: Date | null
  lostReason?: string
}

export interface OpportunityService {
  getAll(): Promise<Opportunity[]>
  getById(id: string): Promise<Opportunity | null>
  getByAccount(accountId: string): Promise<Opportunity[]>
  getByOwner(ownerId: string): Promise<Opportunity[]>
  getByStage(stage: Opportunity['stage']): Promise<Opportunity[]>
  getStalled(): Promise<Opportunity[]>
  create(data: CreateOpportunityInput): Promise<Opportunity>
  update(id: string, data: UpdateOpportunityInput): Promise<Opportunity>
  delete(id: string): Promise<void>
  filterByRole(opps: Opportunity[], role: Role, userId: string): Promise<Opportunity[]>
}

// =============================================================================
// Activity Services
// =============================================================================

export interface CreateActivityInput {
  type: Activity['type']
  opportunityId?: string
  accountId: string
  userId: string
  notes: string
  outcome?: string
}

export interface ActivityService {
  getAll(): Promise<Activity[]>
  getById(id: string): Promise<Activity | null>
  getByAccount(accountId: string): Promise<Activity[]>
  getByOpportunity(opportunityId: string): Promise<Activity[]>
  getByUser(userId: string): Promise<Activity[]>
  create(data: CreateActivityInput): Promise<Activity>
}

// =============================================================================
// Service Event Services
// =============================================================================

export interface CreateServiceEventInput {
  accountId: string
  technicianId: string
  routeId: string
  scheduledDate: Date
  serviceType: string
}

export interface UpdateServiceEventInput {
  status?: ServiceEvent['status']
  completedDate?: Date
  timeOnSite?: number
  notes?: string
}

export interface ServiceEventService {
  getAll(): Promise<ServiceEvent[]>
  getById(id: string): Promise<ServiceEvent | null>
  getByAccount(accountId: string): Promise<ServiceEvent[]>
  getByTechnician(technicianId: string): Promise<ServiceEvent[]>
  getByRoute(routeId: string): Promise<ServiceEvent[]>
  getByStatus(status: ServiceEvent['status']): Promise<ServiceEvent[]>
  getCallbacks(): Promise<ServiceEvent[]>
  create(data: CreateServiceEventInput): Promise<ServiceEvent>
  update(id: string, data: UpdateServiceEventInput): Promise<ServiceEvent>
}

// =============================================================================
// Invoice Services
// =============================================================================

export interface CreateInvoiceInput {
  accountId: string
  amount: number
  dueDate: Date
}

export interface UpdateInvoiceInput {
  status?: Invoice['status']
  paidDate?: Date
}

export interface InvoiceService {
  getAll(): Promise<Invoice[]>
  getById(id: string): Promise<Invoice | null>
  getByAccount(accountId: string): Promise<Invoice[]>
  getByStatus(status: Invoice['status']): Promise<Invoice[]>
  getByAgingBucket(bucket: Invoice['agingBucket']): Promise<Invoice[]>
  getOverdue(): Promise<Invoice[]>
  create(data: CreateInvoiceInput): Promise<Invoice>
  update(id: string, data: UpdateInvoiceInput): Promise<Invoice>
}

// =============================================================================
// KPI Services
// =============================================================================

export interface KPIService {
  getAllValues(): Promise<KPIValue[]>
  getValueBySlug(slug: string): Promise<KPIValue | null>
  getVarianceDrivers(slug: string): Promise<VarianceDriver[]>
  getReconciliation(slug: string): Promise<ReconciliationItem | null>
  getActionItems(slug: string): Promise<ActionItem[]>
}

// =============================================================================
// Data Quality Services
// =============================================================================

export interface DataQualityService {
  getDataSources(): Promise<DataSource[]>
  getQualityMetrics(): Promise<DataQualityMetric[]>
  refreshDataSource(sourceName: string): Promise<DataSource>
}

// =============================================================================
// Forecast Services
// =============================================================================

export interface ForecastService {
  getForecastPoints(scenario: 'base' | 'upside' | 'downside'): Promise<ForecastPoint[]>
  getAssumptions(): Promise<ForecastAssumption[]>
  getBacktestResults(): Promise<BacktestResult[]>
}

// =============================================================================
// Capacity Services
// =============================================================================

export interface CapacityService {
  getAll(): Promise<TechnicianCapacity[]>
  getByBranch(branchId: string): Promise<TechnicianCapacity[]>
  getByTechnician(technicianId: string): Promise<TechnicianCapacity[]>
  getByDate(date: Date): Promise<TechnicianCapacity[]>
}

// =============================================================================
// AE Sales Tracker Services
// =============================================================================

export interface SalesTrackerService {
  initializeData(name: string): Promise<AccountExecutive>
  getData(): Promise<AccountExecutive | null>
  getDashboardStats(ae: AccountExecutive): Promise<AEDashboardStats>
  addProposal(monthIndex: number, proposal: Omit<Proposal, 'id'>): Promise<Proposal>
  addSale(monthIndex: number, sale: Omit<Sale, 'id'>): Promise<Sale>
  markProposalSold(monthIndex: number, proposalId: string): Promise<void>
  markProposalDead(monthIndex: number, proposalId: string): Promise<void>
}

// =============================================================================
// New Start Log Services
// =============================================================================

export interface NewStartService {
  initialize(): Promise<NewStartEntry[]>
  getAll(): Promise<NewStartEntry[]>
  getById(id: string): Promise<NewStartEntry | null>
  getSummary(): Promise<NewStartSummary>
  getByStatus(status: NewStartStatus): Promise<NewStartEntry[]>
  getByOpsManager(managerName: string): Promise<NewStartEntry[]>
  getBySalesRep(repName: string): Promise<NewStartEntry[]>
  create(aeFields: NewStartAEFields): Promise<NewStartEntry>
  updateOpsFields(id: string, opsFields: Partial<NewStartOpsFields>, newStatus?: NewStartStatus): Promise<NewStartEntry | null>
}

// =============================================================================
// Daily Sales Cadence Services
// =============================================================================

export interface DailySalesService {
  initialize(): Promise<void>
  getBranches(): Promise<DailyBranch[]>
  getBranchesByRegion(region: RegionCode): Promise<DailyBranch[]>
  getBranchByCode(code: string): Promise<DailyBranch | null>
  getAllRegions(): Promise<RegionCode[]>
  getEntriesForBranch(branchCode: string): Promise<DailySalesEntry[]>
  getEntriesForDate(date: string): Promise<DailySalesEntry[]>
  getEntriesForRegion(region: RegionCode): Promise<DailySalesEntry[]>
  addEntry(branchCode: string, date: string, metrics: DailySalesMetrics, submittedBy: string): Promise<DailySalesEntry>
  getBranchDashboardStats(branchCode: string): Promise<BranchDashboardStats>
  getRegionSummary(region: RegionCode, date?: string): Promise<RegionSummary>
  getWeeklyRollup(branchCode: string, weekStartDate: string): Promise<WeeklyRollup>
}

// =============================================================================
// Complaint Services
// =============================================================================

export interface ComplaintService {
  getAll(): Promise<Complaint[]>
  getById(id: string): Promise<Complaint | null>
  getByAccount(accountId: string): Promise<Complaint[]>
  getByStatus(status: Complaint['status']): Promise<Complaint[]>
  getBySeverity(severity: Complaint['severity']): Promise<Complaint[]>
}

// =============================================================================
// Combined Service Provider Interface
// =============================================================================

export interface ServiceProvider {
  // Core entities
  markets: MarketService
  branches: BranchService
  teams: TeamService
  routes: RouteService
  users: UserService

  // Business entities
  accounts: AccountService
  opportunities: OpportunityService
  activities: ActivityService
  serviceEvents: ServiceEventService
  invoices: InvoiceService
  complaints: ComplaintService

  // Analytics
  kpis: KPIService
  dataQuality: DataQualityService
  forecast: ForecastService
  capacity: CapacityService

  // Role-specific
  salesTracker: SalesTrackerService
  newStarts: NewStartService
  dailySales: DailySalesService

  // Utility
  refreshData(seed?: number): Promise<void>
  setDataQualityIssues(enabled: boolean): Promise<void>
}
