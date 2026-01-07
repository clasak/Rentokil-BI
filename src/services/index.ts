/**
 * Service Provider
 *
 * This module exports the appropriate service provider based on configuration.
 * Set USE_MOCK_DATA=false in .env.local to use Supabase.
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
 * SWITCHING TO SUPABASE:
 * 1. Add to .env.local:
 *    USE_MOCK_DATA=false
 *    NEXT_PUBLIC_SUPABASE_URL=your-url
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
 * 2. Run database migrations
 * 3. Implement Supabase service methods in /services/supabase/
 */

import type { ServiceProvider } from './types'
import { mockServiceProvider } from './mock'
import { supabaseServiceProvider } from './supabase'

// =============================================================================
// Configuration
// =============================================================================

/**
 * Determines whether to use mock data or Supabase
 *
 * Set USE_MOCK_DATA=false in .env.local to use Supabase
 * Default: true (use mock data for demos)
 */
export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false'

/**
 * Check if we're in demo mode (always use mock data)
 * This takes precedence over USE_MOCK_DATA
 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return true
  // Could check localStorage or Zustand store for demo mode setting
  return true
}

// =============================================================================
// Service Provider Selection
// =============================================================================

/**
 * Get the appropriate service provider based on configuration
 */
function getServiceProvider(): ServiceProvider {
  // Always use mock in demo mode
  if (isDemoMode()) {
    return mockServiceProvider
  }

  // Use mock if configured or if Supabase isn't set up
  if (USE_MOCK_DATA) {
    return mockServiceProvider
  }

  // Use Supabase for production
  return supabaseServiceProvider
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
  return USE_MOCK_DATA || isDemoMode()
}

/**
 * Get the current data source name (for display)
 */
export function getDataSourceName(): string {
  return isUsingMockData() ? 'Demo Data' : 'Supabase'
}
