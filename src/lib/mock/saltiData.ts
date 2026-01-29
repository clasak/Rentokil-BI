/**
 * SALTI Dashboard Mock Data
 * 47 KPIs organized into 9 categories with role-based access
 */

import { Role } from '@/types'
import { filterByRole, getAccounts, getOpportunities, getUsers, getUserById } from '../data'
import { TEST_SCENARIOS, applyMultiplier, shouldReturnEmpty, type TestScenario } from './testScenarios'

// Helper to get test mode state without circular dependency
function getTestModeState(): { enabled: boolean; scenario: TestScenario } {
  // Import dynamically to avoid circular dependency
  if (typeof window !== 'undefined') {
    try {
      const storeData = localStorage.getItem('rentokil-bi-store')
      if (storeData) {
        const parsed = JSON.parse(storeData)
        return {
          enabled: parsed.state?.testModeEnabled || false,
          scenario: parsed.state?.testScenario || 'healthy'
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
  return { enabled: false, scenario: 'healthy' }
}

// =============================================================================
// GEOGRAPHIC FILTER TYPE
// =============================================================================

export interface GeographicFilter {
  market?: string    // Market code (e.g., 'ATL', 'FLA')
  region?: string    // Region code (e.g., 'ATL-01')
  branch?: string    // Branch code (e.g., 'ATL001')
}

// =============================================================================
// TYPES
// =============================================================================

// Lead Funnel Metrics (8 KPIs)
export interface LeadFunnelMetrics {
  mql_count: number
  sql_count: number
  scheduled_count: number
  inspected_count: number
  proposed_count: number
  sold_count: number
  unscheduled_count: number
  canceled_count: number
  // Derived conversion rates
  mql_to_sql_rate: number
  sql_to_scheduled_rate: number
  scheduled_to_inspected_rate: number
  inspected_to_proposed_rate: number
  proposed_to_sold_rate: number
}

// Target KPIs (4 KPIs)
export interface TargetKPIMetrics {
  close_rate: number
  close_rate_target: number
  speed_to_lead: number
  speed_to_lead_target: number
  bundle_rate: number
  bundle_rate_target: number
  avg_started_value: number
  avg_started_value_target: number
}

// Productivity Rates (7 KPIs)
export interface ProductivityRates {
  schedule_rate: number
  fulfillment_rate: number
  inspection_rate: number
  offer_rate: number
  proposal_rate: number
  mql_cancel_rate: number
  mql_to_sql_conversion: number
}

// Sales Results (12 KPIs)
export interface SalesResultsMetrics {
  started_sales: number
  net_sales: number
  contracts_value: number
  contracts_units: number
  inis_value: number
  inis_units: number
  jobs_value: number
  jobs_units: number
  started_as_pct_of_net: number
  cy_vs_lytd_pct: number
  yoy_variance: number
  yoy_variance_pct: number
}

// 5-10-2 Tracking (6 KPIs)
export interface FiveTenTwoMetrics {
  inspections_per_day_per_rep: number
  services_proposed_per_day_per_rep: number
  sales_per_day_per_rep: number
  reps_5_plus_inspections_pct: number
  reps_10_plus_proposed_pct: number
  reps_2_plus_sales_pct: number
  // Targets
  inspections_target: number
  proposed_target: number
  sales_target: number
}

// Finance/Revenue (3 KPIs)
export interface FinanceMetrics {
  revenue_by_product: {
    pest_job: number
    pest_contract: number
    termite_job: number
    termite_contract: number
    other: number
  }
  cy_vs_ly_revenue: number
  revenue_objective: number
}

// Portfolio (5 KPIs)
export interface PortfolioMetrics {
  gross_sales: number
  net_price: number
  gross_adjustments: number
  gross_terminations: number
  net_gain: number
}

// Operational (3 KPIs)
export interface OperationalMetrics {
  miss_rate: number
  work_order_completion: number
  overtime_pct: number
}

// HR (4 KPIs)
export interface HRMetrics {
  headcount: number
  voluntary_terms: number
  involuntary_terms: number
  retention_rate: number
}

// Historical data point
export interface HistoricalDataPoint {
  month: string
  value: number
}

// =============================================================================
// ROLE VISIBILITY HELPERS
// =============================================================================

const SALES_ROLES: Role[] = ['exec', 'market_vp', 'market_sales_director', 'region_director',
                              'region_sales_manager', 'manager', 'sales_manager', 'rep']

const LEADERSHIP_ROLES: Role[] = ['exec', 'market_vp', 'market_sales_director', 'region_director',
                                   'region_sales_manager', 'manager']

const ALL_ROLES_WITH_512: Role[] = ['exec', 'market_vp', 'market_sales_director', 'region_director',
                                     'region_sales_manager', 'manager', 'sales_manager', 'ops_manager',
                                     'rep', 'technician']

const OPS_ROLES: Role[] = ['exec', 'market_vp', 'market_sales_director', 'region_director',
                           'region_sales_manager', 'manager', 'ops_manager']

function canAccessCategory(role: Role | undefined, allowedRoles: Role[]): boolean {
  if (!role) return true // No role = show all (backwards compatible)
  return allowedRoles.includes(role)
}

// =============================================================================
// SCALING FACTORS BY ROLE AND GEOGRAPHY
// =============================================================================

// Market share approximations (based on typical branch distribution)
const MARKET_SHARES: Record<string, number> = {
  'ATL': 0.15,  // Atlantic Market - 198 branches
  'FLA': 0.10,  // Florida Market - 133 branches
  'MID': 0.26,  // Midwest Market - 338 branches (largest)
  'NE': 0.16,   // Northeast Market - 213 branches
  'PAC': 0.14,  // Pacific Market - 183 branches
  'SW': 0.11,   // Southwest Market - 142 branches
  'TXC': 0.08,  // Texas Central Market - 98 branches
}

// Region share within market (typically 4-12 regions per market)
const REGION_SCALE = 0.12  // ~1/8 of market average

// Branch share within region (typically 20-30 branches per region)
const BRANCH_SCALE = 0.04  // ~1/25 of region average

function getGeographicScaleFactor(geo?: GeographicFilter): number {
  if (!geo) return 1.0

  // Branch level - most specific
  if (geo.branch) {
    const marketShare = geo.market ? (MARKET_SHARES[geo.market] || 0.14) : 0.14
    return marketShare * REGION_SCALE * BRANCH_SCALE
  }

  // Region level
  if (geo.region) {
    const marketShare = geo.market ? (MARKET_SHARES[geo.market] || 0.14) : 0.14
    return marketShare * REGION_SCALE
  }

  // Market level
  if (geo.market && geo.market !== 'all') {
    return MARKET_SHARES[geo.market] || 0.14
  }

  return 1.0 // All markets
}

function getScaleFactor(role?: Role, userId?: string, geo?: GeographicFilter): number {
  // Start with geographic scale
  let geoScale = getGeographicScaleFactor(geo)

  if (!role || !userId) return geoScale // Geographic only

  // Get user for hierarchy info
  const user = getUserById(userId)
  if (!user) return geoScale

  // Role-based scale (relative to what they'd normally see)
  let roleScale = 1.0
  switch (role) {
    case 'exec':
      roleScale = 1.0 // Full view of whatever geography is selected
      break
    case 'market_vp':
    case 'market_sales_director':
      // If no geo filter, show their market (~1/6)
      roleScale = geoScale < 1 ? 1.0 : 0.18
      break
    case 'region_director':
    case 'region_sales_manager':
      // If no geo filter, show their region (~1/10)
      roleScale = geoScale < 1 ? 1.0 : 0.10
      break
    case 'manager':
    case 'sales_manager':
    case 'ops_manager':
      // If no geo filter, show their branch (~1/30)
      roleScale = geoScale < 1 ? 1.0 : 0.03
      break
    case 'rep':
    case 'technician':
      roleScale = geoScale < 1 ? 1.0 : 0.008
      break
    default:
      roleScale = 1.0
  }

  // When a geographic filter is applied, use the larger of the two
  // (user can see up to their permission level)
  return geoScale < 1 ? Math.max(geoScale, roleScale * geoScale) : roleScale
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

// Base national-level data (will be scaled by role)
const BASE_LEAD_FUNNEL = {
  mql_count: 1250,
  sql_count: 1000,
  scheduled_count: 850,
  inspected_count: 765,
  proposed_count: 688,
  sold_count: 482,
  unscheduled_count: 150,
  canceled_count: 125
}

const BASE_TARGET_KPIS = {
  close_rate: 38.6,
  close_rate_target: 40.0,
  speed_to_lead: 1.8,
  speed_to_lead_target: 2.0,
  bundle_rate: 1.67,
  bundle_rate_target: 1.5,
  avg_started_value: 4250,
  avg_started_value_target: 4000
}

const BASE_SALES_RESULTS = {
  started_sales: 2048500,
  net_sales: 1892350,
  contracts_value: 1245000,
  contracts_units: 312,
  inis_value: 425000,
  inis_units: 89,
  jobs_value: 378500,
  jobs_units: 156,
  yoy_variance_pct: 8.2
}

const BASE_512_METRICS = {
  inspections_per_day_per_rep: 4.2,
  services_proposed_per_day_per_rep: 8.5,
  sales_per_day_per_rep: 1.8,
  reps_5_plus_inspections_pct: 62,
  reps_10_plus_proposed_pct: 45,
  reps_2_plus_sales_pct: 58
}

const BASE_PORTFOLIO = {
  gross_sales: 2150000,
  net_price: 1935000,
  gross_adjustments: 125000,
  gross_terminations: 90000,
  net_gain: 1720000
}

const BASE_HR = {
  headcount: 487,
  voluntary_terms: 12,
  involuntary_terms: 3,
  retention_rate: 96.9
}

// =============================================================================
// GETTER FUNCTIONS
// =============================================================================

export function getLeadFunnelMetrics(role?: Role, userId?: string, geo?: GeographicFilter): LeadFunnelMetrics {
  if (role && !canAccessCategory(role, SALES_ROLES)) {
    // Return zeros for roles that can't see this
    return {
      mql_count: 0,
      sql_count: 0,
      scheduled_count: 0,
      inspected_count: 0,
      proposed_count: 0,
      sold_count: 0,
      unscheduled_count: 0,
      canceled_count: 0,
      mql_to_sql_rate: 0,
      sql_to_scheduled_rate: 0,
      scheduled_to_inspected_rate: 0,
      inspected_to_proposed_rate: 0,
      proposed_to_sold_rate: 0
    }
  }

  const scale = getScaleFactor(role, userId, geo)
  const testMode = getTestModeState()

  // Apply test scenario multiplier if enabled
  const testMultiplier = testMode.enabled ? TEST_SCENARIOS[testMode.scenario].multipliers.counts : 1

  const mql = Math.round(BASE_LEAD_FUNNEL.mql_count * scale * testMultiplier)
  const sql = Math.round(BASE_LEAD_FUNNEL.sql_count * scale * testMultiplier)
  const scheduled = Math.round(BASE_LEAD_FUNNEL.scheduled_count * scale * testMultiplier)
  const inspected = Math.round(BASE_LEAD_FUNNEL.inspected_count * scale * testMultiplier)
  const proposed = Math.round(BASE_LEAD_FUNNEL.proposed_count * scale * testMultiplier)
  const sold = Math.round(BASE_LEAD_FUNNEL.sold_count * scale * testMultiplier)

  // Apply rate multiplier for conversion rates in test mode
  const rateMultiplier = testMode.enabled ? TEST_SCENARIOS[testMode.scenario].multipliers.rates : 1

  return {
    mql_count: mql,
    sql_count: sql,
    scheduled_count: scheduled,
    inspected_count: inspected,
    proposed_count: proposed,
    sold_count: sold,
    unscheduled_count: Math.round(BASE_LEAD_FUNNEL.unscheduled_count * scale * testMultiplier),
    canceled_count: Math.round(BASE_LEAD_FUNNEL.canceled_count * scale * testMultiplier),
    // Conversion rates - apply rate multiplier in test mode
    mql_to_sql_rate: mql > 0 ? Math.min((sql / mql) * 100 * rateMultiplier, 100) : 0,
    sql_to_scheduled_rate: sql > 0 ? Math.min((scheduled / sql) * 100 * rateMultiplier, 100) : 0,
    scheduled_to_inspected_rate: scheduled > 0 ? Math.min((inspected / scheduled) * 100 * rateMultiplier, 100) : 0,
    inspected_to_proposed_rate: inspected > 0 ? Math.min((proposed / inspected) * 100 * rateMultiplier, 100) : 0,
    proposed_to_sold_rate: proposed > 0 ? Math.min((sold / proposed) * 100 * rateMultiplier, 100) : 0
  }
}

export function getTargetKPIs(role?: Role, userId?: string, geo?: GeographicFilter): TargetKPIMetrics | null {
  if (role && !canAccessCategory(role, SALES_ROLES)) {
    return null
  }

  const testMode = getTestModeState()

  // Check for empty scenario
  if (testMode.enabled && shouldReturnEmpty(testMode.scenario)) {
    return {
      close_rate: 0,
      close_rate_target: BASE_TARGET_KPIS.close_rate_target,
      speed_to_lead: 0,
      speed_to_lead_target: BASE_TARGET_KPIS.speed_to_lead_target,
      bundle_rate: 0,
      bundle_rate_target: BASE_TARGET_KPIS.bundle_rate_target,
      avg_started_value: 0,
      avg_started_value_target: BASE_TARGET_KPIS.avg_started_value_target
    }
  }

  // Target KPIs are rates/averages, don't scale by role
  // But we could add variance for realism based on geography
  const scale = getScaleFactor(role, userId, geo)

  // Add slight variance for non-exec roles
  const variance = scale < 1 ? (Math.random() * 0.1 - 0.05) : 0

  // Apply test scenario multiplier
  const rateMultiplier = testMode.enabled ? TEST_SCENARIOS[testMode.scenario].multipliers.rates : 1
  const revenueMultiplier = testMode.enabled ? TEST_SCENARIOS[testMode.scenario].multipliers.revenue : 1

  return {
    close_rate: BASE_TARGET_KPIS.close_rate * (1 + variance) * rateMultiplier,
    close_rate_target: BASE_TARGET_KPIS.close_rate_target,
    speed_to_lead: BASE_TARGET_KPIS.speed_to_lead * (1 + variance * 0.5) * rateMultiplier,
    speed_to_lead_target: BASE_TARGET_KPIS.speed_to_lead_target,
    bundle_rate: BASE_TARGET_KPIS.bundle_rate * (1 + variance * 0.5) * rateMultiplier,
    bundle_rate_target: BASE_TARGET_KPIS.bundle_rate_target,
    avg_started_value: Math.round(BASE_TARGET_KPIS.avg_started_value * (1 + variance) * revenueMultiplier),
    avg_started_value_target: BASE_TARGET_KPIS.avg_started_value_target
  }
}

export function getProductivityRates(role?: Role, userId?: string, geo?: GeographicFilter): ProductivityRates | null {
  if (role && !canAccessCategory(role, SALES_ROLES)) {
    return null
  }

  const testMode = getTestModeState()

  // Check for empty scenario
  if (testMode.enabled && shouldReturnEmpty(testMode.scenario)) {
    return {
      schedule_rate: 0,
      fulfillment_rate: 0,
      inspection_rate: 0,
      offer_rate: 0,
      proposal_rate: 0,
      mql_cancel_rate: 0,
      mql_to_sql_conversion: 0
    }
  }

  const funnel = getLeadFunnelMetrics(role, userId, geo)

  // Apply test scenario adjustments for fulfillment rate
  let fulfillmentRate = funnel.inspected_count > 0 ? 92.5 : 0
  if (testMode.enabled) {
    const scenario = TEST_SCENARIOS[testMode.scenario]
    if (scenario.trendDirection === 'down') {
      fulfillmentRate = 75 // Lower fulfillment in critical
    } else if (scenario.trendDirection === 'up' && scenario.multipliers.rates > 1.2) {
      fulfillmentRate = 98 // Higher fulfillment in growth
    }
  }

  return {
    schedule_rate: funnel.sql_count > 0 ? (funnel.scheduled_count / funnel.sql_count) * 100 : 0,
    fulfillment_rate: fulfillmentRate,
    inspection_rate: funnel.sql_count > 0 ? (funnel.inspected_count / funnel.sql_count) * 100 : 0,
    offer_rate: funnel.sql_count > 0 ? (funnel.proposed_count / funnel.sql_count) * 100 : 0,
    proposal_rate: funnel.inspected_count > 0 ? (funnel.proposed_count / funnel.inspected_count) * 100 : 0,
    mql_cancel_rate: funnel.mql_count > 0 ? (funnel.canceled_count / funnel.mql_count) * 100 : 0,
    mql_to_sql_conversion: funnel.mql_to_sql_rate
  }
}

export function getSalesResultsMetrics(role?: Role, userId?: string, geo?: GeographicFilter): SalesResultsMetrics | null {
  if (role && !canAccessCategory(role, SALES_ROLES)) {
    return null
  }

  const testMode = getTestModeState()

  // Check for empty scenario
  if (testMode.enabled && shouldReturnEmpty(testMode.scenario)) {
    return {
      started_sales: 0,
      net_sales: 0,
      contracts_value: 0,
      contracts_units: 0,
      inis_value: 0,
      inis_units: 0,
      jobs_value: 0,
      jobs_units: 0,
      started_as_pct_of_net: 0,
      cy_vs_lytd_pct: 0,
      yoy_variance: 0,
      yoy_variance_pct: 0
    }
  }

  const scale = getScaleFactor(role, userId, geo)

  // Apply test scenario multipliers
  const revenueMultiplier = testMode.enabled ? TEST_SCENARIOS[testMode.scenario].multipliers.revenue : 1
  const countsMultiplier = testMode.enabled ? TEST_SCENARIOS[testMode.scenario].multipliers.counts : 1

  const started = Math.round(BASE_SALES_RESULTS.started_sales * scale * revenueMultiplier)
  const net = Math.round(BASE_SALES_RESULTS.net_sales * scale * revenueMultiplier)
  const contracts = Math.round(BASE_SALES_RESULTS.contracts_value * scale * revenueMultiplier)
  const inis = Math.round(BASE_SALES_RESULTS.inis_value * scale * revenueMultiplier)
  const jobs = Math.round(BASE_SALES_RESULTS.jobs_value * scale * revenueMultiplier)

  // Adjust YoY variance based on scenario
  let yoyVariance = BASE_SALES_RESULTS.yoy_variance_pct
  if (testMode.enabled) {
    const scenario = TEST_SCENARIOS[testMode.scenario]
    if (scenario.trendDirection === 'down') {
      yoyVariance = -15 // Negative growth in critical/down scenarios
    } else if (scenario.trendDirection === 'up') {
      yoyVariance = scenario.multipliers.revenue > 1.2 ? 25 : 8.2 // Strong or moderate growth
    }
  }

  const lastYear = net / (1 + yoyVariance / 100)

  return {
    started_sales: started,
    net_sales: net,
    contracts_value: contracts,
    contracts_units: Math.round(BASE_SALES_RESULTS.contracts_units * scale * countsMultiplier),
    inis_value: inis,
    inis_units: Math.round(BASE_SALES_RESULTS.inis_units * scale * countsMultiplier),
    jobs_value: jobs,
    jobs_units: Math.round(BASE_SALES_RESULTS.jobs_units * scale * countsMultiplier),
    started_as_pct_of_net: net > 0 ? (started / net) * 100 : 0,
    cy_vs_lytd_pct: yoyVariance + 100, // e.g., 108.2%
    yoy_variance: net - lastYear,
    yoy_variance_pct: yoyVariance
  }
}

export function getFiveTenTwoMetrics(role?: Role, userId?: string, geo?: GeographicFilter): FiveTenTwoMetrics | null {
  if (role && !canAccessCategory(role, ALL_ROLES_WITH_512)) {
    return null
  }

  const testMode = getTestModeState()

  // Check for empty scenario
  if (testMode.enabled && shouldReturnEmpty(testMode.scenario)) {
    return {
      inspections_per_day_per_rep: 0,
      services_proposed_per_day_per_rep: 0,
      sales_per_day_per_rep: 0,
      reps_5_plus_inspections_pct: 0,
      reps_10_plus_proposed_pct: 0,
      reps_2_plus_sales_pct: 0,
      inspections_target: 5,
      proposed_target: 10,
      sales_target: 2
    }
  }

  // For technician, show only their own
  // For others, show rep metrics
  const isTech = role === 'technician'

  // Base metrics - these are averages so don't scale by role
  // But add variance for individual roles and geography
  const geoVariance = geo?.branch ? 0.15 : geo?.region ? 0.08 : geo?.market ? 0.04 : 0
  const variance = (role === 'rep' || role === 'technician') ? (Math.random() * 0.3 - 0.15) : (Math.random() * geoVariance - geoVariance / 2)

  // Apply test scenario multiplier
  const ratesMultiplier = testMode.enabled ? TEST_SCENARIOS[testMode.scenario].multipliers.rates : 1

  // For 5-10-2, adjust percentages based on scenario
  let reps5Plus = BASE_512_METRICS.reps_5_plus_inspections_pct
  let reps10Plus = BASE_512_METRICS.reps_10_plus_proposed_pct
  let reps2Plus = BASE_512_METRICS.reps_2_plus_sales_pct

  if (testMode.enabled) {
    const scenario = TEST_SCENARIOS[testMode.scenario]
    if (scenario.trendDirection === 'down') {
      reps5Plus = 35 // Low performance
      reps10Plus = 22
      reps2Plus = 28
    } else if (scenario.trendDirection === 'up' && scenario.multipliers.rates > 1.2) {
      reps5Plus = 85 // High performance
      reps10Plus = 72
      reps2Plus = 80
    }
  }

  return {
    inspections_per_day_per_rep: isTech
      ? BASE_512_METRICS.inspections_per_day_per_rep * (1 + variance) * ratesMultiplier
      : BASE_512_METRICS.inspections_per_day_per_rep * ratesMultiplier,
    services_proposed_per_day_per_rep: isTech
      ? BASE_512_METRICS.services_proposed_per_day_per_rep * (1 + variance) * ratesMultiplier
      : BASE_512_METRICS.services_proposed_per_day_per_rep * ratesMultiplier,
    sales_per_day_per_rep: isTech
      ? BASE_512_METRICS.sales_per_day_per_rep * (1 + variance) * ratesMultiplier
      : BASE_512_METRICS.sales_per_day_per_rep * ratesMultiplier,
    reps_5_plus_inspections_pct: reps5Plus,
    reps_10_plus_proposed_pct: reps10Plus,
    reps_2_plus_sales_pct: reps2Plus,
    inspections_target: 5,
    proposed_target: 10,
    sales_target: 2
  }
}

export function getFinanceMetrics(role?: Role, userId?: string, geo?: GeographicFilter): FinanceMetrics | null {
  if (role && !canAccessCategory(role, LEADERSHIP_ROLES)) {
    return null
  }

  const testMode = getTestModeState()

  // Check for empty scenario
  if (testMode.enabled && shouldReturnEmpty(testMode.scenario)) {
    return {
      revenue_by_product: {
        pest_job: 0,
        pest_contract: 0,
        termite_job: 0,
        termite_contract: 0,
        other: 0
      },
      cy_vs_ly_revenue: 0,
      revenue_objective: 0
    }
  }

  const scale = getScaleFactor(role, userId, geo)

  // Apply test scenario multiplier
  const revenueMultiplier = testMode.enabled ? TEST_SCENARIOS[testMode.scenario].multipliers.revenue : 1

  const revenueByProduct = {
    pest_job: Math.round(380000 * scale * revenueMultiplier),
    pest_contract: Math.round(520000 * scale * revenueMultiplier),
    termite_job: Math.round(290000 * scale * revenueMultiplier),
    termite_contract: Math.round(410000 * scale * revenueMultiplier),
    other: Math.round(150000 * scale * revenueMultiplier)
  }

  const total = Object.values(revenueByProduct).reduce((a, b) => a + b, 0)

  return {
    revenue_by_product: revenueByProduct,
    cy_vs_ly_revenue: Math.round(total * 0.92), // Last year was 8% less
    revenue_objective: Math.round(total * 1.05) // 5% above current
  }
}

export function getPortfolioMetrics(role?: Role, userId?: string, geo?: GeographicFilter): PortfolioMetrics | null {
  if (role && !canAccessCategory(role, LEADERSHIP_ROLES)) {
    return null
  }

  const testMode = getTestModeState()

  // Check for empty scenario
  if (testMode.enabled && shouldReturnEmpty(testMode.scenario)) {
    return {
      gross_sales: 0,
      net_price: 0,
      gross_adjustments: 0,
      gross_terminations: 0,
      net_gain: 0
    }
  }

  const scale = getScaleFactor(role, userId, geo)

  // Apply test scenario multiplier
  const revenueMultiplier = testMode.enabled ? TEST_SCENARIOS[testMode.scenario].multipliers.revenue : 1

  return {
    gross_sales: Math.round(BASE_PORTFOLIO.gross_sales * scale * revenueMultiplier),
    net_price: Math.round(BASE_PORTFOLIO.net_price * scale * revenueMultiplier),
    gross_adjustments: Math.round(BASE_PORTFOLIO.gross_adjustments * scale * revenueMultiplier),
    gross_terminations: Math.round(BASE_PORTFOLIO.gross_terminations * scale * revenueMultiplier),
    net_gain: Math.round(BASE_PORTFOLIO.net_gain * scale * revenueMultiplier)
  }
}

export function getOperationalMetrics(role?: Role, userId?: string, geo?: GeographicFilter): OperationalMetrics | null {
  if (role && !canAccessCategory(role, OPS_ROLES) && role !== 'technician') {
    return null
  }

  const testMode = getTestModeState()

  // Check for empty scenario
  if (testMode.enabled && shouldReturnEmpty(testMode.scenario)) {
    return {
      miss_rate: 0,
      work_order_completion: 0,
      overtime_pct: 0
    }
  }

  // Operational metrics are rates, don't scale
  // But add variance for technician viewing own or geographic drill-down
  const isTech = role === 'technician'
  const geoVariance = geo?.branch ? 0.1 : geo?.region ? 0.05 : geo?.market ? 0.02 : 0
  const variance = isTech ? (Math.random() * 0.1 - 0.05) : (Math.random() * geoVariance - geoVariance / 2)

  // Apply test scenario - for operational metrics, critical means worse rates
  let missRate = 3.2 * (1 + variance)
  let workOrderCompletion = 94.5 * (1 + variance * 0.02)
  let overtimePct = 8.7 * (1 + variance)

  if (testMode.enabled) {
    const scenario = TEST_SCENARIOS[testMode.scenario]
    if (scenario.trendDirection === 'down') {
      missRate = 12.5 // Higher miss rate in critical
      workOrderCompletion = 78 // Lower completion
      overtimePct = 18 // Higher overtime
    } else if (scenario.trendDirection === 'up' && scenario.multipliers.rates > 1.2) {
      missRate = 1.5 // Lower miss rate in growth
      workOrderCompletion = 98 // Higher completion
      overtimePct = 5 // Lower overtime
    }
  }

  return {
    miss_rate: missRate,
    work_order_completion: workOrderCompletion,
    overtime_pct: overtimePct
  }
}

export function getHRMetrics(role?: Role, userId?: string, geo?: GeographicFilter): HRMetrics | null {
  if (role && !canAccessCategory(role, LEADERSHIP_ROLES)) {
    return null
  }

  const testMode = getTestModeState()

  // Check for empty scenario
  if (testMode.enabled && shouldReturnEmpty(testMode.scenario)) {
    return {
      headcount: 0,
      voluntary_terms: 0,
      involuntary_terms: 0,
      retention_rate: 0
    }
  }

  const scale = getScaleFactor(role, userId, geo)

  // Apply test scenario multiplier
  const countsMultiplier = testMode.enabled ? TEST_SCENARIOS[testMode.scenario].multipliers.counts : 1
  const ratesMultiplier = testMode.enabled ? TEST_SCENARIOS[testMode.scenario].multipliers.rates : 1

  // Adjust retention rate based on scenario (inverse for critical scenarios)
  let retentionRate = BASE_HR.retention_rate
  if (testMode.enabled) {
    const scenario = TEST_SCENARIOS[testMode.scenario]
    if (scenario.trendDirection === 'down') {
      retentionRate = 85 // Lower retention in critical scenarios
    } else if (scenario.trendDirection === 'up' && scenario.multipliers.rates > 1.2) {
      retentionRate = 98 // Higher retention in growth scenarios
    }
  }

  return {
    headcount: Math.round(BASE_HR.headcount * scale * countsMultiplier),
    voluntary_terms: Math.round(BASE_HR.voluntary_terms * scale * countsMultiplier),
    involuntary_terms: Math.round(BASE_HR.involuntary_terms * scale * countsMultiplier),
    retention_rate: retentionRate
  }
}

// =============================================================================
// HISTORICAL DATA
// =============================================================================

export function getLeadFunnelHistory(role?: Role, userId?: string, geo?: GeographicFilter): HistoricalDataPoint[] {
  const current = getLeadFunnelMetrics(role, userId, geo)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return months.map((month) => ({
    month,
    value: Math.round(current.sold_count * (0.85 + Math.random() * 0.3))
  }))
}

export function getSalesResultsHistory(role?: Role, userId?: string, geo?: GeographicFilter): HistoricalDataPoint[] {
  const current = getSalesResultsMetrics(role, userId, geo)
  if (!current) return []

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return months.map((month) => ({
    month,
    value: Math.round(current.net_sales * (0.85 + Math.random() * 0.3))
  }))
}

export function getNetGainHistory(role?: Role, userId?: string, geo?: GeographicFilter): HistoricalDataPoint[] {
  const current = getPortfolioMetrics(role, userId, geo)
  if (!current) return []

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return months.map((month) => ({
    month,
    value: Math.round(current.net_gain * (0.9 + Math.random() * 0.2))
  }))
}

// =============================================================================
// ALL SALTI DATA
// =============================================================================

export interface SALTIDashboardData {
  leadFunnel: LeadFunnelMetrics
  targetKPIs: TargetKPIMetrics | null
  productivityRates: ProductivityRates | null
  salesResults: SalesResultsMetrics | null
  fiveTenTwo: FiveTenTwoMetrics | null
  finance: FinanceMetrics | null
  portfolio: PortfolioMetrics | null
  operational: OperationalMetrics | null
  hr: HRMetrics | null
}

export function getSALTIDashboardData(role?: Role, userId?: string, geo?: GeographicFilter): SALTIDashboardData {
  return {
    leadFunnel: getLeadFunnelMetrics(role, userId, geo),
    targetKPIs: getTargetKPIs(role, userId, geo),
    productivityRates: getProductivityRates(role, userId, geo),
    salesResults: getSalesResultsMetrics(role, userId, geo),
    fiveTenTwo: getFiveTenTwoMetrics(role, userId, geo),
    finance: getFinanceMetrics(role, userId, geo),
    portfolio: getPortfolioMetrics(role, userId, geo),
    operational: getOperationalMetrics(role, userId, geo),
    hr: getHRMetrics(role, userId, geo)
  }
}
