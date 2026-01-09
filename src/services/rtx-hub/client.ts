/**
 * RTX Data Hub Client
 *
 * HTTP client for connecting to RTX Data Hub enterprise data warehouse.
 * Handles authentication, pagination, rate limiting, and error handling.
 *
 * Configuration via environment variables:
 * - RTX_API_ENDPOINT: Base URL for RTX API
 * - RTX_API_KEY: API key for authentication
 * - RTX_API_TIMEOUT: Request timeout in milliseconds
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'
import type {
  RTXApiResponse,
  RTXAccount,
  RTXOpportunity,
  RTXServiceEvent,
  RTXInvoice,
  RTXUser,
  RTXBranch,
  RTXRegion,
  RTXMarket,
  RTXQueryParams,
  RTXAccountFilters,
  RTXOpportunityFilters,
  RTXServiceEventFilters,
  RTXInvoiceFilters,
  RTXConnectionConfig,
  RTXConnectionStatus
} from './types'
import {
  transformAccounts,
  transformOpportunities,
  transformServiceEvents,
  transformInvoices,
  transformUsers
} from './transformers'
import type { Account, Opportunity, ServiceEvent, Invoice, User } from '@/types'

// Default configuration
const DEFAULT_CONFIG: RTXConnectionConfig = {
  endpoint: process.env.RTX_API_ENDPOINT || 'https://rtx-data-hub.rentokil.com/api/v1',
  apiKey: process.env.RTX_API_KEY || '',
  timeout: parseInt(process.env.RTX_API_TIMEOUT || '30000', 10),
  retries: 3,
  retryDelay: 1000
}

// Rate limiting state
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 100 // Minimum 100ms between requests

/**
 * RTX Data Hub Client
 *
 * Provides methods to fetch data from RTX Data Hub and transform it
 * to our internal application types.
 */
export class RTXClient {
  private client: AxiosInstance
  private config: RTXConnectionConfig

  constructor(config: Partial<RTXConnectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.client = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
        'User-Agent': 'Rentokil-BI-App/1.0'
      }
    })

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTime
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve =>
          setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
        )
      }
      lastRequestTime = Date.now()
      return config
    })

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => this.handleError(error)
    )
  }

  /**
   * Handle API errors with retries for transient failures
   */
  private async handleError(error: AxiosError): Promise<never> {
    const statusCode = error.response?.status
    const errorMessage = (error.response?.data as { message?: string })?.message || error.message

    // Log error for debugging
    console.error(`[RTX API Error] ${statusCode}: ${errorMessage}`)

    // Don't retry on client errors (4xx)
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      throw new RTXApiError(
        `RTX API Error (${statusCode}): ${errorMessage}`,
        statusCode,
        error.config?.url
      )
    }

    // Throw for server errors and network issues
    throw new RTXApiError(
      `RTX API Error: ${errorMessage}`,
      statusCode || 0,
      error.config?.url
    )
  }

  /**
   * Make a request with automatic retries
   */
  private async requestWithRetry<T>(
    config: AxiosRequestConfig,
    attempt = 1
  ): Promise<T> {
    try {
      const response = await this.client.request<RTXApiResponse<T>>(config)
      return response.data.data
    } catch (error) {
      if (
        attempt < this.config.retries &&
        error instanceof RTXApiError &&
        (error.statusCode === 0 || error.statusCode >= 500)
      ) {
        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1)
        console.log(`[RTX API] Retry ${attempt}/${this.config.retries} after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.requestWithRetry<T>(config, attempt + 1)
      }
      throw error
    }
  }

  /**
   * Build query string from filters
   */
  private buildQueryParams(params: RTXQueryParams): URLSearchParams {
    const query = new URLSearchParams()

    if (params.pageSize) query.append('pageSize', params.pageSize.toString())
    if (params.pageNumber) query.append('page', params.pageNumber.toString())
    if (params.sortBy) query.append('sortBy', params.sortBy)
    if (params.sortOrder) query.append('sortOrder', params.sortOrder)

    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(`filter[${key}]`, String(value))
        }
      })
    }

    return query
  }

  // ===========================================================================
  // Connection & Health
  // ===========================================================================

  /**
   * Test connection to RTX Data Hub
   */
  async testConnection(): Promise<RTXConnectionStatus> {
    const startTime = Date.now()
    try {
      const response = await this.client.get('/health')
      return {
        connected: true,
        lastChecked: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        version: response.data?.version
      }
    } catch (error) {
      return {
        connected: false,
        lastChecked: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check if client is configured with valid credentials
   */
  isConfigured(): boolean {
    return !!this.config.apiKey && !!this.config.endpoint
  }

  // ===========================================================================
  // Accounts
  // ===========================================================================

  /**
   * Fetch all accounts with optional filters
   */
  async getAccounts(filters?: RTXAccountFilters): Promise<Account[]> {
    const params = this.buildQueryParams({
      pageSize: 1000,
      filters: filters as Record<string, string | number | boolean>
    })

    const rtxAccounts = await this.requestWithRetry<RTXAccount[]>({
      method: 'GET',
      url: `/accounts?${params.toString()}`
    })

    return transformAccounts(rtxAccounts)
  }

  /**
   * Fetch a single account by ID
   */
  async getAccountById(id: string): Promise<Account | null> {
    const rtxId = id.replace('ACC-', '')
    try {
      const rtxAccount = await this.requestWithRetry<RTXAccount>({
        method: 'GET',
        url: `/accounts/${rtxId}`
      })
      return transformAccounts([rtxAccount])[0]
    } catch (error) {
      if (error instanceof RTXApiError && error.statusCode === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Fetch accounts by branch
   */
  async getAccountsByBranch(branchId: string): Promise<Account[]> {
    return this.getAccounts({ branchId: branchId.replace('BR-', '') })
  }

  /**
   * Fetch accounts by market
   */
  async getAccountsByMarket(marketId: string): Promise<Account[]> {
    return this.getAccounts({ marketId: marketId.replace('MKT-', '') })
  }

  /**
   * Fetch accounts by owner
   */
  async getAccountsByOwner(ownerId: string): Promise<Account[]> {
    return this.getAccounts({ ownerId: ownerId.replace('USR-', '') })
  }

  /**
   * Fetch high-risk accounts
   */
  async getHighRiskAccounts(): Promise<Account[]> {
    return this.getAccounts({ retentionRisk: 'H' })
  }

  // ===========================================================================
  // Opportunities
  // ===========================================================================

  /**
   * Fetch all opportunities with optional filters
   */
  async getOpportunities(filters?: RTXOpportunityFilters): Promise<Opportunity[]> {
    const params = this.buildQueryParams({
      pageSize: 1000,
      filters: filters as Record<string, string | number | boolean>
    })

    const rtxOpps = await this.requestWithRetry<RTXOpportunity[]>({
      method: 'GET',
      url: `/opportunities?${params.toString()}`
    })

    return transformOpportunities(rtxOpps)
  }

  /**
   * Fetch a single opportunity by ID
   */
  async getOpportunityById(id: string): Promise<Opportunity | null> {
    const rtxId = id.replace('OPP-', '')
    try {
      const rtxOpp = await this.requestWithRetry<RTXOpportunity>({
        method: 'GET',
        url: `/opportunities/${rtxId}`
      })
      return transformOpportunities([rtxOpp])[0]
    } catch (error) {
      if (error instanceof RTXApiError && error.statusCode === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Fetch opportunities by account
   */
  async getOpportunitiesByAccount(accountId: string): Promise<Opportunity[]> {
    return this.getOpportunities({ accountId: accountId.replace('ACC-', '') })
  }

  /**
   * Fetch opportunities by owner
   */
  async getOpportunitiesByOwner(ownerId: string): Promise<Opportunity[]> {
    return this.getOpportunities({ ownerId: ownerId.replace('USR-', '') })
  }

  /**
   * Fetch stalled opportunities
   */
  async getStalledOpportunities(): Promise<Opportunity[]> {
    return this.getOpportunities({ isStalled: true })
  }

  /**
   * Fetch pipeline opportunities (not closed)
   */
  async getPipelineOpportunities(): Promise<Opportunity[]> {
    const all = await this.getOpportunities()
    return all.filter(opp =>
      opp.stage !== 'closed_won' && opp.stage !== 'closed_lost'
    )
  }

  // ===========================================================================
  // Service Events
  // ===========================================================================

  /**
   * Fetch all service events with optional filters
   */
  async getServiceEvents(filters?: RTXServiceEventFilters): Promise<ServiceEvent[]> {
    const params = this.buildQueryParams({
      pageSize: 1000,
      filters: filters as Record<string, string | number | boolean>
    })

    const rtxEvents = await this.requestWithRetry<RTXServiceEvent[]>({
      method: 'GET',
      url: `/service-events?${params.toString()}`
    })

    return transformServiceEvents(rtxEvents)
  }

  /**
   * Fetch a single service event by ID
   */
  async getServiceEventById(id: string): Promise<ServiceEvent | null> {
    const rtxId = id.replace('SVC-', '')
    try {
      const rtxEvent = await this.requestWithRetry<RTXServiceEvent>({
        method: 'GET',
        url: `/service-events/${rtxId}`
      })
      return transformServiceEvents([rtxEvent])[0]
    } catch (error) {
      if (error instanceof RTXApiError && error.statusCode === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Fetch service events by account
   */
  async getServiceEventsByAccount(accountId: string): Promise<ServiceEvent[]> {
    return this.getServiceEvents({ accountId: accountId.replace('ACC-', '') })
  }

  /**
   * Fetch service events by technician
   */
  async getServiceEventsByTechnician(technicianId: string): Promise<ServiceEvent[]> {
    return this.getServiceEvents({ technicianId: technicianId.replace('USR-', '') })
  }

  /**
   * Fetch service events by route
   */
  async getServiceEventsByRoute(routeId: string): Promise<ServiceEvent[]> {
    return this.getServiceEvents({ routeId: routeId.replace('RTE-', '') })
  }

  /**
   * Fetch scheduled service events for a date range
   */
  async getScheduledEvents(startDate: Date, endDate: Date): Promise<ServiceEvent[]> {
    return this.getServiceEvents({
      status: 'S',
      scheduledAfter: startDate.toISOString().split('T')[0],
      scheduledBefore: endDate.toISOString().split('T')[0]
    })
  }

  /**
   * Fetch callbacks
   */
  async getCallbacks(): Promise<ServiceEvent[]> {
    return this.getServiceEvents({ status: 'F' })
  }

  // ===========================================================================
  // Invoices
  // ===========================================================================

  /**
   * Fetch all invoices with optional filters
   */
  async getInvoices(filters?: RTXInvoiceFilters): Promise<Invoice[]> {
    const params = this.buildQueryParams({
      pageSize: 1000,
      filters: filters as Record<string, string | number | boolean>
    })

    const rtxInvoices = await this.requestWithRetry<RTXInvoice[]>({
      method: 'GET',
      url: `/invoices?${params.toString()}`
    })

    return transformInvoices(rtxInvoices)
  }

  /**
   * Fetch a single invoice by ID
   */
  async getInvoiceById(id: string): Promise<Invoice | null> {
    const rtxId = id.replace('INV-', '')
    try {
      const rtxInvoice = await this.requestWithRetry<RTXInvoice>({
        method: 'GET',
        url: `/invoices/${rtxId}`
      })
      return transformInvoices([rtxInvoice])[0]
    } catch (error) {
      if (error instanceof RTXApiError && error.statusCode === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Fetch invoices by account
   */
  async getInvoicesByAccount(accountId: string): Promise<Invoice[]> {
    return this.getInvoices({ accountId: accountId.replace('ACC-', '') })
  }

  /**
   * Fetch overdue invoices
   */
  async getOverdueInvoices(): Promise<Invoice[]> {
    return this.getInvoices({ status: 'D' })
  }

  /**
   * Fetch invoices by aging bucket
   */
  async getInvoicesByAgingBucket(bucket: string): Promise<Invoice[]> {
    return this.getInvoices({ agingBucket: bucket })
  }

  // ===========================================================================
  // Reference Data
  // ===========================================================================

  /**
   * Fetch all branches
   */
  async getBranches(): Promise<RTXBranch[]> {
    return this.requestWithRetry<RTXBranch[]>({
      method: 'GET',
      url: '/branches'
    })
  }

  /**
   * Fetch all regions
   */
  async getRegions(): Promise<RTXRegion[]> {
    return this.requestWithRetry<RTXRegion[]>({
      method: 'GET',
      url: '/regions'
    })
  }

  /**
   * Fetch all markets
   */
  async getMarkets(): Promise<RTXMarket[]> {
    return this.requestWithRetry<RTXMarket[]>({
      method: 'GET',
      url: '/markets'
    })
  }

  /**
   * Fetch all users
   */
  async getUsers(): Promise<User[]> {
    const rtxUsers = await this.requestWithRetry<RTXUser[]>({
      method: 'GET',
      url: '/employees'
    })
    return transformUsers(rtxUsers)
  }
}

/**
 * Custom error class for RTX API errors
 */
export class RTXApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public url?: string
  ) {
    super(message)
    this.name = 'RTXApiError'
  }
}

// Export singleton instance with default config
export const rtxClient = new RTXClient()

// Export factory function for custom config
export function createRTXClient(config: Partial<RTXConnectionConfig>): RTXClient {
  return new RTXClient(config)
}
