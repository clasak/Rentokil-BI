/**
 * Mock Service Implementations
 *
 * These implementations use the existing synthetic data generation
 * for demo and development purposes.
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
  CreateAccountInput,
  UpdateAccountInput,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  CreateActivityInput,
  CreateServiceEventInput,
  UpdateServiceEventInput,
  CreateInvoiceInput,
  UpdateInvoiceInput,
} from '../types'

import {
  parseSalesforceQuote,
  validateParsedDraft,
  mapToNewStartInput,
} from '@/lib/salesforce-parser'

import {
  createStartPacket,
  generateOpsEmailNotification,
  markEmailSent,
} from '@/lib/start-packet-generator'

import {
  storePdf,
  retrievePdf,
  getPdfMetadata,
  listStoredPdfs,
  getPdfsForStartPacket,
  deletePdf,
  associatePdfWithStartPacket,
  cleanupOldPdfs,
  isStorageAvailable,
} from '@/lib/pdf-storage'

import type {
  StartPacket,
  StartPacketStatus,
  OpsEmailResponse,
} from '@/types/salesforce-quote'

import {
  getMarkets,
  getBranches,
  getTeams,
  getRoutes,
  getUsers,
  getAccounts,
  getOpportunities,
  getActivities,
  getServiceEvents,
  getComplaints,
  getInvoices,
  getTechnicianCapacity,
  getDataSources,
  getDataQualityMetrics,
  getAccountById,
  getOpportunityById,
  getInvoiceById,
  getUserById,
  getOpportunitiesByAccount,
  getActivitiesByAccount,
  getActivitiesByOpportunity,
  getServiceEventsByAccount,
  getComplaintsByAccount,
  getInvoicesByAccount,
  filterByRole,
  regenerateData,
  setDataQualityIssues,
} from '@/lib/data'

import {
  calculateKPIValues,
  getVarianceDrivers,
  getReconciliation,
  getActionItems,
  getForecastData,
} from '@/lib/kpi-calculations'

import {
  generateAccountExecutiveData,
  getAEDashboardStats,
  initializeAEData,
  getAEData,
  addProposal,
  addSale,
  markProposalSold,
  markProposalDead,
} from '@/lib/sales-tracker-data'

import {
  initializeNewStartData,
  getNewStartEntries,
  getNewStartById,
  getNewStartSummary,
  addNewStart,
  updateNewStartOpsFields,
  getEntriesByStatus,
  getEntriesForOpsManager,
  getEntriesForSalesRep,
} from '@/lib/new-start-data'

import {
  initializeDailySalesData,
  getDailyEntries,
  getBranches as getDailyBranches,
  getBranchesByRegion,
  getBranchByCode,
  getEntriesForBranch,
  getEntriesForDate,
  getEntriesForRegion,
  addDailyEntry,
  getBranchDashboardStats,
  getRegionSummary,
  getWeeklyRollup,
  getAllRegions,
} from '@/lib/daily-sales-data'

import { KPI_DICTIONARY } from '@/lib/kpis'
import { Role, Account, Opportunity, Activity, Invoice } from '@/types'

// =============================================================================
// Mock Market Service
// =============================================================================

const mockMarketService: MarketService = {
  async getAll() {
    return getMarkets()
  },
  async getById(id) {
    return getMarkets().find(m => m.id === id) || null
  },
}

// =============================================================================
// Mock Branch Service
// =============================================================================

const mockBranchService: BranchService = {
  async getAll() {
    return getBranches()
  },
  async getById(id) {
    return getBranches().find(b => b.id === id) || null
  },
  async getByMarket(marketId) {
    return getBranches().filter(b => b.marketId === marketId)
  },
}

// =============================================================================
// Mock Team Service
// =============================================================================

const mockTeamService: TeamService = {
  async getAll() {
    return getTeams()
  },
  async getById(id) {
    return getTeams().find(t => t.id === id) || null
  },
  async getByBranch(branchId) {
    return getTeams().filter(t => t.branchId === branchId)
  },
}

// =============================================================================
// Mock Route Service
// =============================================================================

const mockRouteService: RouteService = {
  async getAll() {
    return getRoutes()
  },
  async getById(id) {
    return getRoutes().find(r => r.id === id) || null
  },
  async getByBranch(branchId) {
    return getRoutes().filter(r => r.branchId === branchId)
  },
}

// =============================================================================
// Mock User Service
// =============================================================================

const mockUserService: UserService = {
  async getAll() {
    return getUsers()
  },
  async getById(id) {
    return getUserById(id) || null
  },
  async getByRole(role) {
    return getUsers().filter(u => u.role === role)
  },
  async getCurrentUser(userId) {
    return getUserById(userId) || null
  },
}

// =============================================================================
// Mock Account Service
// =============================================================================

let accountIdCounter = 10000

const mockAccountService: AccountService = {
  async getAll() {
    return getAccounts()
  },
  async getById(id) {
    return getAccountById(id) || null
  },
  async getByOwner(ownerId) {
    return getAccounts().filter(a => a.ownerId === ownerId)
  },
  async getByBranch(branchId) {
    return getAccounts().filter(a => a.branchId === branchId)
  },
  async getByMarket(marketId) {
    return getAccounts().filter(a => a.marketId === marketId)
  },
  async getByRetentionRisk(risk) {
    return getAccounts().filter(a => a.retentionRisk === risk)
  },
  async create(data) {
    const newAccount: Account = {
      id: `ACC-${String(++accountIdCounter).padStart(6, '0')}`,
      ...data,
      retentionRisk: 'low',
      lastServiceDate: new Date(),
      openIssues: 0,
      createdAt: new Date(),
      arBalance: 0,
      complaints: 0,
    }
    // In mock mode, we don't persist - would need to modify data.ts
    return newAccount
  },
  async update(id, data) {
    const account = getAccountById(id)
    if (!account) throw new Error(`Account ${id} not found`)
    return { ...account, ...data }
  },
  async delete(id) {
    // Mock - no actual deletion
  },
  async filterByRole(accounts, role, userId) {
    return filterByRole(accounts, role, userId, []) as Account[]
  },
}

// =============================================================================
// Mock Opportunity Service
// =============================================================================

let oppIdCounter = 10000

const mockOpportunityService: OpportunityService = {
  async getAll() {
    return getOpportunities()
  },
  async getById(id) {
    return getOpportunityById(id) || null
  },
  async getByAccount(accountId) {
    return getOpportunitiesByAccount(accountId)
  },
  async getByOwner(ownerId) {
    return getOpportunities().filter(o => o.ownerId === ownerId)
  },
  async getByStage(stage) {
    return getOpportunities().filter(o => o.stage === stage)
  },
  async getStalled() {
    return getOpportunities().filter(o => o.isStalled)
  },
  async create(data) {
    const account = getAccountById(data.accountId)
    const owner = getUserById(data.ownerId)
    const newOpp: Opportunity = {
      id: `OPP-${String(++oppIdCounter).padStart(6, '0')}`,
      ...data,
      accountName: account?.name || 'Unknown',
      probability: 0.25,
      createdDate: new Date(),
      nextStepDate: null,
      stageLastChanged: new Date(),
      ownerName: owner?.name || 'Unknown',
      marketId: account?.marketId || '',
      branchId: account?.branchId || '',
      daysInStage: 0,
      isStalled: false,
      nextStep: 'Initial contact',
    }
    return newOpp
  },
  async update(id, data) {
    const opp = getOpportunityById(id)
    if (!opp) throw new Error(`Opportunity ${id} not found`)
    return { ...opp, ...data }
  },
  async delete(id) {
    // Mock - no actual deletion
  },
  async filterByRole(opps, role, userId) {
    return filterByRole(opps, role, userId, []) as Opportunity[]
  },
}

// =============================================================================
// Mock Activity Service
// =============================================================================

let activityIdCounter = 100000

const mockActivityService: ActivityService = {
  async getAll() {
    return getActivities()
  },
  async getById(id) {
    return getActivities().find(a => a.id === id) || null
  },
  async getByAccount(accountId) {
    return getActivitiesByAccount(accountId)
  },
  async getByOpportunity(opportunityId) {
    return getActivitiesByOpportunity(opportunityId)
  },
  async getByUser(userId) {
    return getActivities().filter(a => a.userId === userId)
  },
  async create(data) {
    const newActivity: Activity = {
      id: `ACT-${String(++activityIdCounter).padStart(6, '0')}`,
      ...data,
      timestamp: new Date(),
    }
    return newActivity
  },
}

// =============================================================================
// Mock Service Event Service
// =============================================================================

let serviceEventIdCounter = 100000

const mockServiceEventService: ServiceEventService = {
  async getAll() {
    return getServiceEvents()
  },
  async getById(id) {
    return getServiceEvents().find(s => s.id === id) || null
  },
  async getByAccount(accountId) {
    return getServiceEventsByAccount(accountId)
  },
  async getByTechnician(technicianId) {
    return getServiceEvents().filter(s => s.technicianId === technicianId)
  },
  async getByRoute(routeId) {
    return getServiceEvents().filter(s => s.routeId === routeId)
  },
  async getByStatus(status) {
    return getServiceEvents().filter(s => s.status === status)
  },
  async getCallbacks() {
    return getServiceEvents().filter(s => s.status === 'callback')
  },
  async create(data) {
    return {
      id: `SVC-${String(++serviceEventIdCounter).padStart(7, '0')}`,
      ...data,
      status: 'scheduled' as const,
      timeOnSite: 0,
    }
  },
  async update(id, data) {
    const event = getServiceEvents().find(s => s.id === id)
    if (!event) throw new Error(`Service event ${id} not found`)
    return { ...event, ...data }
  },
}

// =============================================================================
// Mock Invoice Service
// =============================================================================

let invoiceIdCounter = 100000

const mockInvoiceService: InvoiceService = {
  async getAll() {
    return getInvoices()
  },
  async getById(id) {
    return getInvoiceById(id) || null
  },
  async getByAccount(accountId) {
    return getInvoicesByAccount(accountId)
  },
  async getByStatus(status) {
    return getInvoices().filter(i => i.status === status)
  },
  async getByAgingBucket(bucket) {
    return getInvoices().filter(i => i.agingBucket === bucket)
  },
  async getOverdue() {
    return getInvoices().filter(i => i.status === 'overdue')
  },
  async create(data) {
    const account = getAccountById(data.accountId)
    const newInvoice: Invoice = {
      id: `INV-${String(++invoiceIdCounter).padStart(7, '0')}`,
      ...data,
      accountName: account?.name || 'Unknown',
      invoiceDate: new Date(),
      status: 'open',
      agingBucket: '0-30',
    }
    return newInvoice
  },
  async update(id, data) {
    const invoice = getInvoiceById(id)
    if (!invoice) throw new Error(`Invoice ${id} not found`)
    return { ...invoice, ...data }
  },
}

// =============================================================================
// Mock Complaint Service
// =============================================================================

const mockComplaintService: ComplaintService = {
  async getAll() {
    return getComplaints()
  },
  async getById(id) {
    return getComplaints().find(c => c.id === id) || null
  },
  async getByAccount(accountId) {
    return getComplaintsByAccount(accountId)
  },
  async getByStatus(status) {
    return getComplaints().filter(c => c.status === status)
  },
  async getBySeverity(severity) {
    return getComplaints().filter(c => c.severity === severity)
  },
}

// =============================================================================
// Mock KPI Service
// =============================================================================

const mockKPIService: KPIService = {
  async getAllValues() {
    const kpiMap = calculateKPIValues()
    return Array.from(kpiMap.values())
  },
  async getValueBySlug(slug) {
    const kpiMap = calculateKPIValues()
    return kpiMap.get(slug) || null
  },
  async getVarianceDrivers(slug) {
    return getVarianceDrivers(slug)
  },
  async getReconciliation(slug) {
    return getReconciliation(slug)
  },
  async getActionItems(slug) {
    return getActionItems()
  },
}

// =============================================================================
// Mock Data Quality Service
// =============================================================================

const mockDataQualityService: DataQualityService = {
  async getDataSources() {
    return getDataSources()
  },
  async getQualityMetrics() {
    return getDataQualityMetrics()
  },
  async refreshDataSource(sourceName) {
    const sources = getDataSources()
    const source = sources.find(s => s.name === sourceName)
    if (!source) throw new Error(`Data source ${sourceName} not found`)
    return { ...source, lastRefresh: new Date(), status: 'fresh' as const }
  },
}

// =============================================================================
// Mock Forecast Service
// =============================================================================

const mockForecastService: ForecastService = {
  async getForecastPoints(scenario) {
    const { forecast } = getForecastData(scenario)
    return forecast
  },
  async getAssumptions() {
    const { assumptions } = getForecastData('base')
    return assumptions
  },
  async getBacktestResults() {
    const { backtest } = getForecastData('base')
    return backtest
  },
}

// =============================================================================
// Mock Capacity Service
// =============================================================================

const mockCapacityService: CapacityService = {
  async getAll() {
    return getTechnicianCapacity()
  },
  async getByBranch(branchId) {
    return getTechnicianCapacity().filter(c => c.branchId === branchId)
  },
  async getByTechnician(technicianId) {
    return getTechnicianCapacity().filter(c => c.technicianId === technicianId)
  },
  async getByDate(date) {
    const dateStr = date.toISOString().split('T')[0]
    return getTechnicianCapacity().filter(c =>
      c.date.toISOString().split('T')[0] === dateStr
    )
  },
}

// =============================================================================
// Mock Sales Tracker Service
// =============================================================================

const mockSalesTrackerService: SalesTrackerService = {
  async initializeData(name) {
    return initializeAEData(name)
  },
  async getData() {
    return getAEData()
  },
  async getDashboardStats(ae) {
    return getAEDashboardStats(ae)
  },
  async addProposal(monthIndex, proposal) {
    return addProposal(monthIndex, proposal)
  },
  async addSale(monthIndex, sale) {
    return addSale(monthIndex, sale)
  },
  async markProposalSold(monthIndex, proposalId) {
    markProposalSold(monthIndex, proposalId)
  },
  async markProposalDead(monthIndex, proposalId) {
    markProposalDead(monthIndex, proposalId)
  },
}

// =============================================================================
// Mock New Start Service
// =============================================================================

const mockNewStartService: NewStartService = {
  async initialize() {
    return initializeNewStartData()
  },
  async getAll() {
    return getNewStartEntries()
  },
  async getById(id) {
    return getNewStartById(id) || null
  },
  async getSummary() {
    return getNewStartSummary()
  },
  async getByStatus(status) {
    return getEntriesByStatus(status)
  },
  async getByOpsManager(managerName) {
    return getEntriesForOpsManager(managerName)
  },
  async getBySalesRep(repName) {
    return getEntriesForSalesRep(repName)
  },
  async create(aeFields) {
    return addNewStart(aeFields)
  },
  async updateOpsFields(id, opsFields, newStatus) {
    return updateNewStartOpsFields(id, opsFields, newStatus)
  },
}

// =============================================================================
// Mock Daily Sales Service
// =============================================================================

const mockDailySalesService: DailySalesService = {
  async initialize() {
    initializeDailySalesData()
  },
  async getBranches() {
    return getDailyBranches()
  },
  async getBranchesByRegion(region) {
    return getBranchesByRegion(region)
  },
  async getBranchByCode(code) {
    return getBranchByCode(code) || null
  },
  async getAllRegions() {
    return getAllRegions()
  },
  async getEntriesForBranch(branchCode) {
    return getEntriesForBranch(branchCode)
  },
  async getEntriesForDate(date) {
    return getEntriesForDate(date)
  },
  async getEntriesForRegion(region) {
    return getEntriesForRegion(region)
  },
  async addEntry(branchCode, date, metrics, submittedBy) {
    return addDailyEntry(branchCode, date, metrics, submittedBy)
  },
  async getBranchDashboardStats(branchCode) {
    return getBranchDashboardStats(branchCode)
  },
  async getRegionSummary(region, date) {
    return getRegionSummary(region, date)
  },
  async getWeeklyRollup(branchCode, weekStartDate) {
    return getWeeklyRollup(branchCode, weekStartDate)
  },
}

// =============================================================================
// Salesforce Parser Service
// =============================================================================

const mockSalesforceParserService: SalesforceParserService = {
  async parseQuote(text) {
    return parseSalesforceQuote(text)
  },
  async validateDraft(draft) {
    return validateParsedDraft(draft)
  },
  async mapToNewStartFields(draft) {
    return mapToNewStartInput(draft)
  },
}

// =============================================================================
// Start Packet Service
// =============================================================================

// In-memory storage for start packets (demo mode)
const startPacketsStore: Map<string, StartPacket> = new Map()

const mockStartPacketService: StartPacketService = {
  async create(input) {
    const packet = createStartPacket(input.draft, {
      pdfStorageKey: input.pdfStorageKey || null,
    })
    startPacketsStore.set(packet.id, packet)
    console.log('[Mock StartPacket] Created:', packet.id)
    return packet
  },

  async getById(id) {
    return startPacketsStore.get(id) || null
  },

  async getAll() {
    return Array.from(startPacketsStore.values())
  },

  async getByStatus(status) {
    return Array.from(startPacketsStore.values()).filter(p => p.status === status)
  },

  async update(id, input) {
    const existing = startPacketsStore.get(id)
    if (!existing) return null

    const updated: StartPacket = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    }
    startPacketsStore.set(id, updated)
    return updated
  },

  async delete(id) {
    const existed = startPacketsStore.has(id)
    startPacketsStore.delete(id)
    return existed
  },

  async sendOpsNotification(packet, recipients) {
    const notification = generateOpsEmailNotification(packet, recipients)

    // Simulate API call to send email
    console.log('[Mock StartPacket] Sending ops notification:', {
      to: notification.to.length ? notification.to : 'default recipients',
      subject: notification.subject,
      startPacketId: packet.id,
    })

    // Update packet to mark email sent
    const updated = markEmailSent(packet)
    startPacketsStore.set(packet.id, updated)

    const response: OpsEmailResponse = {
      success: true,
      emailPreview: {
        to: notification.to.length
          ? notification.to.join(', ')
          : 'midwestmarketsalesentry@rentokil.com, brad.hudson@prestox.com',
        subject: notification.subject,
        body: notification.body,
      },
      message: 'Operations notification simulated (demo mode)',
      actualEmailSent: false,
    }

    return response
  },
}

// =============================================================================
// PDF Storage Service
// =============================================================================

const mockPDFStorageService: PDFStorageService = {
  async store(file, startPacketId) {
    return storePdf(file, startPacketId)
  },

  async retrieve(key) {
    return retrievePdf(key)
  },

  async getMetadata(key) {
    return getPdfMetadata(key)
  },

  async list() {
    return listStoredPdfs()
  },

  async getByStartPacket(startPacketId) {
    return getPdfsForStartPacket(startPacketId)
  },

  async delete(key) {
    return deletePdf(key)
  },

  async associateWithStartPacket(key, startPacketId) {
    return associatePdfWithStartPacket(key, startPacketId)
  },

  async cleanup(maxAgeDays = 30) {
    return cleanupOldPdfs(maxAgeDays)
  },

  isAvailable() {
    return isStorageAvailable()
  },
}

// =============================================================================
// Mock Service Provider
// =============================================================================

export const mockServiceProvider: ServiceProvider = {
  markets: mockMarketService,
  branches: mockBranchService,
  teams: mockTeamService,
  routes: mockRouteService,
  users: mockUserService,
  accounts: mockAccountService,
  opportunities: mockOpportunityService,
  activities: mockActivityService,
  serviceEvents: mockServiceEventService,
  invoices: mockInvoiceService,
  complaints: mockComplaintService,
  kpis: mockKPIService,
  dataQuality: mockDataQualityService,
  forecast: mockForecastService,
  capacity: mockCapacityService,
  salesTracker: mockSalesTrackerService,
  newStarts: mockNewStartService,
  dailySales: mockDailySalesService,
  salesforceParser: mockSalesforceParserService,
  startPackets: mockStartPacketService,
  pdfStorage: mockPDFStorageService,

  async refreshData(seed) {
    regenerateData(seed)
  },

  async setDataQualityIssues(enabled) {
    setDataQualityIssues(enabled)
  },
}
