/**
 * Supabase Service Implementations (Placeholders)
 *
 * These are placeholder implementations that will connect to Supabase
 * when the backend is configured.
 *
 * TO IMPLEMENT:
 * 1. Install @supabase/supabase-js: npm install @supabase/supabase-js
 * 2. Configure client.ts with your Supabase credentials
 * 3. Run database migrations to create tables
 * 4. Replace placeholder implementations with actual Supabase queries
 */

import {
  ServiceProvider,
  MarketService,
  BranchService,
  TeamService,
  RouteService,
  UserService,
  AccountService,
  OpportunityService,
  ActivityService,
  ServiceEventService,
  InvoiceService,
  ComplaintService,
  KPIService,
  DataQualityService,
  ForecastService,
  CapacityService,
  SalesTrackerService,
  NewStartService,
  DailySalesService,
  SalesforceParserService,
  StartPacketService,
  PDFStorageService,
} from '../types'

// import { supabase } from './client'

// =============================================================================
// NOT IMPLEMENTED ERROR
// =============================================================================

function notImplemented(method: string): never {
  throw new Error(
    `Supabase service method "${method}" not implemented. ` +
    `Configure Supabase and implement this method, or use mock data.`
  )
}

// =============================================================================
// Supabase Market Service (Placeholder)
// =============================================================================

const supabaseMarketService: MarketService = {
  async getAll() {
    // const { data, error } = await supabase.from('markets').select('*')
    // if (error) throw error
    // return data.map(transformMarket)
    notImplemented('MarketService.getAll')
  },
  async getById(id) {
    // const { data, error } = await supabase.from('markets').select('*').eq('id', id).single()
    // if (error) throw error
    // return data ? transformMarket(data) : null
    notImplemented('MarketService.getById')
  },
}

// =============================================================================
// Supabase Branch Service (Placeholder)
// =============================================================================

const supabaseBranchService: BranchService = {
  async getAll() {
    notImplemented('BranchService.getAll')
  },
  async getById(id) {
    notImplemented('BranchService.getById')
  },
  async getByMarket(marketId) {
    notImplemented('BranchService.getByMarket')
  },
}

// =============================================================================
// Supabase Team Service (Placeholder)
// =============================================================================

const supabaseTeamService: TeamService = {
  async getAll() {
    notImplemented('TeamService.getAll')
  },
  async getById(id) {
    notImplemented('TeamService.getById')
  },
  async getByBranch(branchId) {
    notImplemented('TeamService.getByBranch')
  },
}

// =============================================================================
// Supabase Route Service (Placeholder)
// =============================================================================

const supabaseRouteService: RouteService = {
  async getAll() {
    notImplemented('RouteService.getAll')
  },
  async getById(id) {
    notImplemented('RouteService.getById')
  },
  async getByBranch(branchId) {
    notImplemented('RouteService.getByBranch')
  },
}

// =============================================================================
// Supabase User Service (Placeholder)
// =============================================================================

const supabaseUserService: UserService = {
  async getAll() {
    notImplemented('UserService.getAll')
  },
  async getById(id) {
    notImplemented('UserService.getById')
  },
  async getByRole(role) {
    notImplemented('UserService.getByRole')
  },
  async getCurrentUser(userId) {
    notImplemented('UserService.getCurrentUser')
  },
}

// =============================================================================
// Supabase Account Service (Placeholder)
// =============================================================================

const supabaseAccountService: AccountService = {
  async getAll() {
    // Example implementation:
    // const { data, error } = await supabase
    //   .from('accounts')
    //   .select(`
    //     *,
    //     owner:users!owner_id(id, name),
    //     market:markets!market_id(id, name),
    //     branch:branches!branch_id(id, name)
    //   `)
    // if (error) throw error
    // return data.map(transformAccount)
    notImplemented('AccountService.getAll')
  },
  async getById(id) {
    notImplemented('AccountService.getById')
  },
  async getByOwner(ownerId) {
    notImplemented('AccountService.getByOwner')
  },
  async getByBranch(branchId) {
    notImplemented('AccountService.getByBranch')
  },
  async getByMarket(marketId) {
    notImplemented('AccountService.getByMarket')
  },
  async getByRetentionRisk(risk) {
    notImplemented('AccountService.getByRetentionRisk')
  },
  async create(data) {
    // const { data: newAccount, error } = await supabase
    //   .from('accounts')
    //   .insert(transformAccountInput(data))
    //   .select()
    //   .single()
    // if (error) throw error
    // return transformAccount(newAccount)
    notImplemented('AccountService.create')
  },
  async update(id, data) {
    notImplemented('AccountService.update')
  },
  async delete(id) {
    notImplemented('AccountService.delete')
  },
  async filterByRole(accounts, role, userId) {
    // RLS policies in Supabase handle this automatically
    // This method may not be needed with proper RLS setup
    return accounts
  },
}

// =============================================================================
// Supabase Opportunity Service (Placeholder)
// =============================================================================

const supabaseOpportunityService: OpportunityService = {
  async getAll() {
    notImplemented('OpportunityService.getAll')
  },
  async getById(id) {
    notImplemented('OpportunityService.getById')
  },
  async getByAccount(accountId) {
    notImplemented('OpportunityService.getByAccount')
  },
  async getByOwner(ownerId) {
    notImplemented('OpportunityService.getByOwner')
  },
  async getByStage(stage) {
    notImplemented('OpportunityService.getByStage')
  },
  async getStalled() {
    notImplemented('OpportunityService.getStalled')
  },
  async create(data) {
    notImplemented('OpportunityService.create')
  },
  async update(id, data) {
    notImplemented('OpportunityService.update')
  },
  async delete(id) {
    notImplemented('OpportunityService.delete')
  },
  async filterByRole(opps, role, userId) {
    return opps
  },
}

// =============================================================================
// Supabase Activity Service (Placeholder)
// =============================================================================

const supabaseActivityService: ActivityService = {
  async getAll() {
    notImplemented('ActivityService.getAll')
  },
  async getById(id) {
    notImplemented('ActivityService.getById')
  },
  async getByAccount(accountId) {
    notImplemented('ActivityService.getByAccount')
  },
  async getByOpportunity(opportunityId) {
    notImplemented('ActivityService.getByOpportunity')
  },
  async getByUser(userId) {
    notImplemented('ActivityService.getByUser')
  },
  async create(data) {
    notImplemented('ActivityService.create')
  },
}

// =============================================================================
// Supabase Service Event Service (Placeholder)
// =============================================================================

const supabaseServiceEventService: ServiceEventService = {
  async getAll() {
    notImplemented('ServiceEventService.getAll')
  },
  async getById(id) {
    notImplemented('ServiceEventService.getById')
  },
  async getByAccount(accountId) {
    notImplemented('ServiceEventService.getByAccount')
  },
  async getByTechnician(technicianId) {
    notImplemented('ServiceEventService.getByTechnician')
  },
  async getByRoute(routeId) {
    notImplemented('ServiceEventService.getByRoute')
  },
  async getByStatus(status) {
    notImplemented('ServiceEventService.getByStatus')
  },
  async getCallbacks() {
    notImplemented('ServiceEventService.getCallbacks')
  },
  async create(data) {
    notImplemented('ServiceEventService.create')
  },
  async update(id, data) {
    notImplemented('ServiceEventService.update')
  },
}

// =============================================================================
// Supabase Invoice Service (Placeholder)
// =============================================================================

const supabaseInvoiceService: InvoiceService = {
  async getAll() {
    notImplemented('InvoiceService.getAll')
  },
  async getById(id) {
    notImplemented('InvoiceService.getById')
  },
  async getByAccount(accountId) {
    notImplemented('InvoiceService.getByAccount')
  },
  async getByStatus(status) {
    notImplemented('InvoiceService.getByStatus')
  },
  async getByAgingBucket(bucket) {
    notImplemented('InvoiceService.getByAgingBucket')
  },
  async getOverdue() {
    notImplemented('InvoiceService.getOverdue')
  },
  async create(data) {
    notImplemented('InvoiceService.create')
  },
  async update(id, data) {
    notImplemented('InvoiceService.update')
  },
}

// =============================================================================
// Supabase Complaint Service (Placeholder)
// =============================================================================

const supabaseComplaintService: ComplaintService = {
  async getAll() {
    notImplemented('ComplaintService.getAll')
  },
  async getById(id) {
    notImplemented('ComplaintService.getById')
  },
  async getByAccount(accountId) {
    notImplemented('ComplaintService.getByAccount')
  },
  async getByStatus(status) {
    notImplemented('ComplaintService.getByStatus')
  },
  async getBySeverity(severity) {
    notImplemented('ComplaintService.getBySeverity')
  },
}

// =============================================================================
// Supabase KPI Service (Placeholder)
// =============================================================================

const supabaseKPIService: KPIService = {
  async getAllValues() {
    // KPIs would be calculated from aggregated data
    // Consider using Supabase Edge Functions for complex calculations
    notImplemented('KPIService.getAllValues')
  },
  async getValueBySlug(slug) {
    notImplemented('KPIService.getValueBySlug')
  },
  async getVarianceDrivers(slug) {
    notImplemented('KPIService.getVarianceDrivers')
  },
  async getReconciliation(slug) {
    notImplemented('KPIService.getReconciliation')
  },
  async getActionItems(slug) {
    notImplemented('KPIService.getActionItems')
  },
}

// =============================================================================
// Supabase Data Quality Service (Placeholder)
// =============================================================================

const supabaseDataQualityService: DataQualityService = {
  async getDataSources() {
    notImplemented('DataQualityService.getDataSources')
  },
  async getQualityMetrics() {
    notImplemented('DataQualityService.getQualityMetrics')
  },
  async refreshDataSource(sourceName) {
    notImplemented('DataQualityService.refreshDataSource')
  },
}

// =============================================================================
// Supabase Forecast Service (Placeholder)
// =============================================================================

const supabaseForecastService: ForecastService = {
  async getForecastPoints(scenario) {
    notImplemented('ForecastService.getForecastPoints')
  },
  async getAssumptions() {
    notImplemented('ForecastService.getAssumptions')
  },
  async getBacktestResults() {
    notImplemented('ForecastService.getBacktestResults')
  },
}

// =============================================================================
// Supabase Capacity Service (Placeholder)
// =============================================================================

const supabaseCapacityService: CapacityService = {
  async getAll() {
    notImplemented('CapacityService.getAll')
  },
  async getByBranch(branchId) {
    notImplemented('CapacityService.getByBranch')
  },
  async getByTechnician(technicianId) {
    notImplemented('CapacityService.getByTechnician')
  },
  async getByDate(date) {
    notImplemented('CapacityService.getByDate')
  },
}

// =============================================================================
// Supabase Sales Tracker Service (Placeholder)
// =============================================================================

const supabaseSalesTrackerService: SalesTrackerService = {
  async initializeData(name) {
    notImplemented('SalesTrackerService.initializeData')
  },
  async getData() {
    notImplemented('SalesTrackerService.getData')
  },
  async getDashboardStats(ae) {
    notImplemented('SalesTrackerService.getDashboardStats')
  },
  async addProposal(monthIndex, proposal) {
    notImplemented('SalesTrackerService.addProposal')
  },
  async addSale(monthIndex, sale) {
    notImplemented('SalesTrackerService.addSale')
  },
  async markProposalSold(monthIndex, proposalId) {
    notImplemented('SalesTrackerService.markProposalSold')
  },
  async markProposalDead(monthIndex, proposalId) {
    notImplemented('SalesTrackerService.markProposalDead')
  },
}

// =============================================================================
// Supabase New Start Service (Placeholder)
// =============================================================================

const supabaseNewStartService: NewStartService = {
  async initialize() {
    // No initialization needed for Supabase - data is persistent
    return []
  },
  async getAll() {
    // const { data, error } = await supabase
    //   .from('new_starts')
    //   .select('*')
    //   .order('sold_date', { ascending: false })
    // if (error) throw error
    // return data.map(transformNewStart)
    notImplemented('NewStartService.getAll')
  },
  async getById(id) {
    notImplemented('NewStartService.getById')
  },
  async getSummary() {
    notImplemented('NewStartService.getSummary')
  },
  async getByStatus(status) {
    notImplemented('NewStartService.getByStatus')
  },
  async getByOpsManager(managerName) {
    notImplemented('NewStartService.getByOpsManager')
  },
  async getBySalesRep(repName) {
    notImplemented('NewStartService.getBySalesRep')
  },
  async create(aeFields) {
    notImplemented('NewStartService.create')
  },
  async updateOpsFields(id, opsFields, newStatus) {
    notImplemented('NewStartService.updateOpsFields')
  },
}

// =============================================================================
// Supabase Daily Sales Service (Placeholder)
// =============================================================================

const supabaseDailySalesService: DailySalesService = {
  async initialize() {
    // No initialization needed for Supabase
  },
  async getBranches() {
    // Branches could be stored in Supabase or kept as static config
    notImplemented('DailySalesService.getBranches')
  },
  async getBranchesByRegion(region) {
    notImplemented('DailySalesService.getBranchesByRegion')
  },
  async getBranchByCode(code) {
    notImplemented('DailySalesService.getBranchByCode')
  },
  async getAllRegions() {
    return ['R16', 'R23', 'R24', 'R52', 'R54']
  },
  async getEntriesForBranch(branchCode) {
    notImplemented('DailySalesService.getEntriesForBranch')
  },
  async getEntriesForDate(date) {
    notImplemented('DailySalesService.getEntriesForDate')
  },
  async getEntriesForRegion(region) {
    notImplemented('DailySalesService.getEntriesForRegion')
  },
  async addEntry(branchCode, date, metrics, submittedBy) {
    // const { data, error } = await supabase
    //   .from('daily_sales_entries')
    //   .upsert({
    //     branch_code: branchCode,
    //     date,
    //     ...transformMetrics(metrics),
    //     submitted_by: submittedBy,
    //   })
    //   .select()
    //   .single()
    // if (error) throw error
    // return transformDailySalesEntry(data)
    notImplemented('DailySalesService.addEntry')
  },
  async getBranchDashboardStats(branchCode) {
    notImplemented('DailySalesService.getBranchDashboardStats')
  },
  async getRegionSummary(region, date) {
    notImplemented('DailySalesService.getRegionSummary')
  },
  async getWeeklyRollup(branchCode, weekStartDate) {
    notImplemented('DailySalesService.getWeeklyRollup')
  },
}

// =============================================================================
// Supabase Salesforce Parser Service (Placeholder)
// =============================================================================

const supabaseSalesforceParserService: SalesforceParserService = {
  async parseQuote(text) {
    notImplemented('SalesforceParserService.parseQuote')
  },
  async validateDraft(draft) {
    notImplemented('SalesforceParserService.validateDraft')
  },
  async mapToNewStartFields(draft) {
    notImplemented('SalesforceParserService.mapToNewStartFields')
  },
}

// =============================================================================
// Supabase Start Packet Service (Placeholder)
// =============================================================================

const supabaseStartPacketService: StartPacketService = {
  async create(input) {
    notImplemented('StartPacketService.create')
  },
  async getById(id) {
    notImplemented('StartPacketService.getById')
  },
  async getAll() {
    notImplemented('StartPacketService.getAll')
  },
  async getByStatus(status) {
    notImplemented('StartPacketService.getByStatus')
  },
  async update(id, input) {
    notImplemented('StartPacketService.update')
  },
  async delete(id) {
    notImplemented('StartPacketService.delete')
  },
  async sendOpsNotification(packet, recipients) {
    notImplemented('StartPacketService.sendOpsNotification')
  },
}

// =============================================================================
// Supabase PDF Storage Service (Placeholder)
// =============================================================================

const supabasePDFStorageService: PDFStorageService = {
  async store(file, startPacketId) {
    notImplemented('PDFStorageService.store')
  },
  async retrieve(key) {
    notImplemented('PDFStorageService.retrieve')
  },
  async getMetadata(key) {
    notImplemented('PDFStorageService.getMetadata')
  },
  async list() {
    notImplemented('PDFStorageService.list')
  },
  async getByStartPacket(startPacketId) {
    notImplemented('PDFStorageService.getByStartPacket')
  },
  async delete(key) {
    notImplemented('PDFStorageService.delete')
  },
  async associateWithStartPacket(key, startPacketId) {
    notImplemented('PDFStorageService.associateWithStartPacket')
  },
  async cleanup(maxAgeDays) {
    notImplemented('PDFStorageService.cleanup')
  },
  isAvailable() {
    return false // Supabase storage not configured
  },
}

// =============================================================================
// Supabase Service Provider
// =============================================================================

export const supabaseServiceProvider: ServiceProvider = {
  markets: supabaseMarketService,
  branches: supabaseBranchService,
  teams: supabaseTeamService,
  routes: supabaseRouteService,
  users: supabaseUserService,
  accounts: supabaseAccountService,
  opportunities: supabaseOpportunityService,
  activities: supabaseActivityService,
  serviceEvents: supabaseServiceEventService,
  invoices: supabaseInvoiceService,
  complaints: supabaseComplaintService,
  kpis: supabaseKPIService,
  dataQuality: supabaseDataQualityService,
  forecast: supabaseForecastService,
  capacity: supabaseCapacityService,
  salesTracker: supabaseSalesTrackerService,
  newStarts: supabaseNewStartService,
  dailySales: supabaseDailySalesService,
  salesforceParser: supabaseSalesforceParserService,
  startPackets: supabaseStartPacketService,
  pdfStorage: supabasePDFStorageService,

  async refreshData(seed) {
    // In Supabase mode, data is persistent - no refresh needed
    console.warn('refreshData called in Supabase mode - no action taken')
  },

  async setDataQualityIssues(enabled) {
    // Data quality issues would be real in production
    console.warn('setDataQualityIssues called in Supabase mode - no action taken')
  },
}
