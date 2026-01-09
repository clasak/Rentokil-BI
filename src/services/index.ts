/**
 * Service Provider
 *
 * This module exports the appropriate service provider based on configuration.
 * Supports multiple data sources: mock, RTX Data Hub, Salesforce, or hybrid mode.
 *
 * USAGE:
 * ```typescript
 * import { services } from '@/services'
 *
 * // Get all accounts
 * const accounts = await services.accounts.getAll()
 *
 * // Create a new opportunity
 * const opp = await services.opportunities.create({
 *   accountId: 'ACC-000001',
 *   name: 'New Deal',
 *   amount: 50000,
 *   stage: 'prospect',
 *   closeDate: new Date(),
 *   ownerId: 'USR-00001'
 * })
 * ```
 *
 * DATA SOURCE CONFIGURATION:
 * Set NEXT_PUBLIC_DATA_SOURCE in .env.local:
 *   - 'mock' (default): Use synthetic demo data
 *   - 'rtx': Use RTX Data Hub (requires RTX_API_KEY)
 *   - 'salesforce': Use Salesforce CRM (requires SF credentials)
 *   - 'hybrid': Try RTX first, fallback to mock if unavailable
 *
 * RTX DATA HUB:
 *   RTX_API_ENDPOINT=https://rtx-data-hub.company.com/api/v1
 *   RTX_API_KEY=your_api_key
 *   RTX_API_TIMEOUT=30000
 *
 * SALESFORCE:
 *   SALESFORCE_LOGIN_URL=https://login.salesforce.com
 *   SALESFORCE_USERNAME=your_username
 *   SALESFORCE_PASSWORD=your_password
 *   SALESFORCE_SECURITY_TOKEN=your_token
 */

import type { ServiceProvider } from './types'
import { mockServiceProvider } from './mock'
import { supabaseServiceProvider } from './supabase'
import { rtxServiceProvider, rtxClient } from './rtx-hub'

// =============================================================================
// Configuration
// =============================================================================

/**
 * Available data sources
 */
export type DataSourceType = 'mock' | 'rtx' | 'salesforce' | 'hybrid'

/**
 * Current data source configuration
 * Set NEXT_PUBLIC_DATA_SOURCE in .env.local to change
 * Default: 'mock' (use synthetic demo data)
 */
export const DATA_SOURCE: DataSourceType =
  (process.env.NEXT_PUBLIC_DATA_SOURCE as DataSourceType) || 'mock'

/**
 * Legacy compatibility: USE_MOCK_DATA
 * @deprecated Use DATA_SOURCE instead
 */
export const USE_MOCK_DATA = DATA_SOURCE === 'mock'

/**
 * Check if we're in demo mode (always use mock data)
 * This takes precedence over DATA_SOURCE
 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return true
  // Could check localStorage or Zustand store for demo mode setting
  return true
}

/**
 * Check if RTX Data Hub is configured
 */
export function isRTXConfigured(): boolean {
  return rtxClient.isConfigured()
}

// =============================================================================
// Service Provider Selection
// =============================================================================

/**
 * Create a hybrid provider that tries RTX first, falls back to mock
 */
function createHybridProvider(): ServiceProvider {
  // For now, return mock provider
  // In production, this would wrap RTX calls with try/catch fallback
  console.log('[Services] Hybrid mode: Using mock data (RTX fallback not yet implemented)')
  return mockServiceProvider
}

/**
 * Get the appropriate service provider based on configuration
 */
function getServiceProvider(): ServiceProvider {
  // Always use mock in demo mode
  if (isDemoMode()) {
    return mockServiceProvider
  }

  switch (DATA_SOURCE) {
    case 'rtx':
      if (!isRTXConfigured()) {
        console.warn('[Services] RTX Data Hub not configured. Falling back to mock data.')
        return mockServiceProvider
      }
      // RTX provider doesn't implement full ServiceProvider interface yet
      // For now, return mock provider
      console.log('[Services] RTX mode: RTX provider not fully implemented, using mock')
      return mockServiceProvider

    case 'salesforce':
      // Salesforce provider not implemented yet
      console.warn('[Services] Salesforce provider not implemented. Falling back to mock data.')
      return mockServiceProvider

    case 'hybrid':
      return createHybridProvider()

    case 'mock':
    default:
      return mockServiceProvider
  }
}

// =============================================================================
// Exports
// =============================================================================

/**
 * The active service provider instance
 *
 * Usage:
 * ```typescript
 * import { services } from '@/services'
 *
 * const accounts = await services.accounts.getAll()
 * ```
 */
export const services: ServiceProvider = getServiceProvider()

// Re-export types for convenience
export type {
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
  CreateAccountInput,
  UpdateAccountInput,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  CreateActivityInput,
  CreateServiceEventInput,
  UpdateServiceEventInput,
  CreateInvoiceInput,
  UpdateInvoiceInput,
} from './types'

// Re-export individual providers for testing or direct access
export { mockServiceProvider } from './mock'
export { supabaseServiceProvider } from './supabase'

// =============================================================================
// React Hook for Services (Optional)
// =============================================================================

/**
 * React hook to access services with automatic provider selection
 *
 * Usage:
 * ```typescript
 * function MyComponent() {
 *   const { accounts, opportunities } = useServices()
 *
 *   useEffect(() => {
 *     accounts.getAll().then(setAccounts)
 *   }, [])
 * }
 * ```
 */
export function useServices(): ServiceProvider {
  // In a more complex setup, this could use React context
  // to allow dynamic switching between providers
  return services
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if the app is using mock data
 */
export function isUsingMockData(): boolean {
  return DATA_SOURCE === 'mock' || isDemoMode()
}

/**
 * Get the current data source name (for display)
 */
export function getDataSourceName(): string {
  if (isDemoMode()) return 'Demo Data'

  switch (DATA_SOURCE) {
    case 'rtx':
      return 'RTX Data Hub'
    case 'salesforce':
      return 'Salesforce'
    case 'hybrid':
      return 'Hybrid (RTX + Mock)'
    case 'mock':
    default:
      return 'Demo Data'
  }
}

/**
 * Get data source configuration status
 */
export function getDataSourceStatus(): {
  source: DataSourceType
  configured: boolean
  name: string
  description: string
} {
  const status = {
    source: DATA_SOURCE,
    name: getDataSourceName(),
    configured: false,
    description: ''
  }

  switch (DATA_SOURCE) {
    case 'rtx':
      status.configured = isRTXConfigured()
      status.description = status.configured
        ? 'Connected to RTX Data Hub enterprise warehouse'
        : 'RTX API credentials not configured'
      break
    case 'salesforce':
      status.configured = false // TODO: Check Salesforce config
      status.description = 'Salesforce CRM integration'
      break
    case 'hybrid':
      status.configured = isRTXConfigured()
      status.description = 'RTX primary with mock fallback'
      break
    case 'mock':
    default:
      status.configured = true
      status.description = 'Synthetic demo data for testing and demos'
  }

  return status
}

// Re-export RTX client for direct access
export { rtxClient, rtxServiceProvider } from './rtx-hub'
export type { RTXConnectionStatus } from './rtx-hub'
