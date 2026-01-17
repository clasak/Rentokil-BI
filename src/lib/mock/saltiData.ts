/**
 * SALTI Dashboard Mock Data
 * 47 KPIs organized into 9 categories with role-based access
 */

import { Role } from '@/types'
import { filterByRole, getAccounts, getOpportunities, getUsers, getUserById } from '../data'

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
// SCALING FACTORS BY ROLE
// =============================================================================

function getScaleFactor(role?: Role, userId?: string): number {
  if (!role || !userId) return 1.0 // Full national view

  // Get user for hierarchy info
  const user = getUserById(userId)
  if (!user) return 1.0

  switch (role) {
    case 'exec':
      return 1.0 // Full national
    case 'market_vp':
    case 'market_sales_director':
      return 0.18 // ~1/6 of national (6 markets)
    case 'region_director':
    case 'region_sales_manager':
      return 0.10 // ~1/10 of national (10 regions)
    case 'manager':
    case 'sales_manager':
    case 'ops_manager':
      return 0.03 // ~1/30 of national (30 branches)
    case 'rep':
    case 'technician':
      return 0.008 // ~1 rep's worth
    default:
      return 1.0
  }
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

export function getLeadFunnelMetrics(role?: Role, userId?: string): LeadFunnelMetrics {
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

  const scale = getScaleFactor(role, userId)

  const mql = Math.round(BASE_LEAD_FUNNEL.mql_count * scale)
  const sql = Math.round(BASE_LEAD_FUNNEL.sql_count * scale)
  const scheduled = Math.round(BASE_LEAD_FUNNEL.scheduled_count * scale)
  const inspected = Math.round(BASE_LEAD_FUNNEL.inspected_count * scale)
  const proposed = Math.round(BASE_LEAD_FUNNEL.proposed_count * scale)
  const sold = Math.round(BASE_LEAD_FUNNEL.sold_count * scale)

  return {
    mql_count: mql,
    sql_count: sql,
    scheduled_count: scheduled,
    inspected_count: inspected,
    proposed_count: proposed,
    sold_count: sold,
    unscheduled_count: Math.round(BASE_LEAD_FUNNEL.unscheduled_count * scale),
    canceled_count: Math.round(BASE_LEAD_FUNNEL.canceled_count * scale),
    // Conversion rates stay the same regardless of scale
    mql_to_sql_rate: mql > 0 ? (sql / mql) * 100 : 0,
    sql_to_scheduled_rate: sql > 0 ? (scheduled / sql) * 100 : 0,
    scheduled_to_inspected_rate: scheduled > 0 ? (inspected / scheduled) * 100 : 0,
    inspected_to_proposed_rate: inspected > 0 ? (proposed / inspected) * 100 : 0,
    proposed_to_sold_rate: proposed > 0 ? (sold / proposed) * 100 : 0
  }
}

export function getTargetKPIs(role?: Role, userId?: string): TargetKPIMetrics | null {
  if (role && !canAccessCategory(role, SALES_ROLES)) {
    return null
  }

  // Target KPIs are rates/averages, don't scale by role
  // But we could add variance for realism
  const scale = getScaleFactor(role, userId)

  // Add slight variance for non-exec roles
  const variance = scale < 1 ? (Math.random() * 0.1 - 0.05) : 0

  return {
    close_rate: BASE_TARGET_KPIS.close_rate * (1 + variance),
    close_rate_target: BASE_TARGET_KPIS.close_rate_target,
    speed_to_lead: BASE_TARGET_KPIS.speed_to_lead * (1 + variance * 0.5),
    speed_to_lead_target: BASE_TARGET_KPIS.speed_to_lead_target,
    bundle_rate: BASE_TARGET_KPIS.bundle_rate * (1 + variance * 0.5),
    bundle_rate_target: BASE_TARGET_KPIS.bundle_rate_target,
    avg_started_value: Math.round(BASE_TARGET_KPIS.avg_started_value * (1 + variance)),
    avg_started_value_target: BASE_TARGET_KPIS.avg_started_value_target
  }
}

export function getProductivityRates(role?: Role, userId?: string): ProductivityRates | null {
  if (role && !canAccessCategory(role, SALES_ROLES)) {
    return null
  }

  const funnel = getLeadFunnelMetrics(role, userId)

  return {
    schedule_rate: funnel.sql_count > 0 ? (funnel.scheduled_count / funnel.sql_count) * 100 : 0,
    fulfillment_rate: funnel.inspected_count > 0 ? 92.5 : 0, // Completed / Inspected
    inspection_rate: funnel.sql_count > 0 ? (funnel.inspected_count / funnel.sql_count) * 100 : 0,
    offer_rate: funnel.sql_count > 0 ? (funnel.proposed_count / funnel.sql_count) * 100 : 0,
    proposal_rate: funnel.inspected_count > 0 ? (funnel.proposed_count / funnel.inspected_count) * 100 : 0,
    mql_cancel_rate: funnel.mql_count > 0 ? (funnel.canceled_count / funnel.mql_count) * 100 : 0,
    mql_to_sql_conversion: funnel.mql_to_sql_rate
  }
}

export function getSalesResultsMetrics(role?: Role, userId?: string): SalesResultsMetrics | null {
  if (role && !canAccessCategory(role, SALES_ROLES)) {
    return null
  }

  const scale = getScaleFactor(role, userId)

  const started = Math.round(BASE_SALES_RESULTS.started_sales * scale)
  const net = Math.round(BASE_SALES_RESULTS.net_sales * scale)
  const contracts = Math.round(BASE_SALES_RESULTS.contracts_value * scale)
  const inis = Math.round(BASE_SALES_RESULTS.inis_value * scale)
  const jobs = Math.round(BASE_SALES_RESULTS.jobs_value * scale)

  const lastYear = net / (1 + BASE_SALES_RESULTS.yoy_variance_pct / 100)

  return {
    started_sales: started,
    net_sales: net,
    contracts_value: contracts,
    contracts_units: Math.round(BASE_SALES_RESULTS.contracts_units * scale),
    inis_value: inis,
    inis_units: Math.round(BASE_SALES_RESULTS.inis_units * scale),
    jobs_value: jobs,
    jobs_units: Math.round(BASE_SALES_RESULTS.jobs_units * scale),
    started_as_pct_of_net: net > 0 ? (started / net) * 100 : 0,
    cy_vs_lytd_pct: BASE_SALES_RESULTS.yoy_variance_pct + 100, // e.g., 108.2%
    yoy_variance: net - lastYear,
    yoy_variance_pct: BASE_SALES_RESULTS.yoy_variance_pct
  }
}

export function getFiveTenTwoMetrics(role?: Role, userId?: string): FiveTenTwoMetrics | null {
  if (role && !canAccessCategory(role, ALL_ROLES_WITH_512)) {
    return null
  }

  // For ops_manager, show technician metrics
  // For technician, show only their own
  // For others, show rep metrics

  const isOps = role === 'ops_manager'
  const isTech = role === 'technician'

  // Base metrics - these are averages so don't scale
  // But add variance for individual roles
  const variance = (role === 'rep' || role === 'technician') ? (Math.random() * 0.3 - 0.15) : 0

  return {
    inspections_per_day_per_rep: isTech
      ? BASE_512_METRICS.inspections_per_day_per_rep * (1 + variance)
      : BASE_512_METRICS.inspections_per_day_per_rep,
    services_proposed_per_day_per_rep: isTech
      ? BASE_512_METRICS.services_proposed_per_day_per_rep * (1 + variance)
      : BASE_512_METRICS.services_proposed_per_day_per_rep,
    sales_per_day_per_rep: isTech
      ? BASE_512_METRICS.sales_per_day_per_rep * (1 + variance)
      : BASE_512_METRICS.sales_per_day_per_rep,
    reps_5_plus_inspections_pct: BASE_512_METRICS.reps_5_plus_inspections_pct,
    reps_10_plus_proposed_pct: BASE_512_METRICS.reps_10_plus_proposed_pct,
    reps_2_plus_sales_pct: BASE_512_METRICS.reps_2_plus_sales_pct,
    inspections_target: 5,
    proposed_target: 10,
    sales_target: 2
  }
}

export function getFinanceMetrics(role?: Role, userId?: string): FinanceMetrics | null {
  if (role && !canAccessCategory(role, LEADERSHIP_ROLES)) {
    return null
  }

  const scale = getScaleFactor(role, userId)

  const revenueByProduct = {
    pest_job: Math.round(380000 * scale),
    pest_contract: Math.round(520000 * scale),
    termite_job: Math.round(290000 * scale),
    termite_contract: Math.round(410000 * scale),
    other: Math.round(150000 * scale)
  }

  const total = Object.values(revenueByProduct).reduce((a, b) => a + b, 0)

  return {
    revenue_by_product: revenueByProduct,
    cy_vs_ly_revenue: Math.round(total * 0.92), // Last year was 8% less
    revenue_objective: Math.round(total * 1.05) // 5% above current
  }
}

export function getPortfolioMetrics(role?: Role, userId?: string): PortfolioMetrics | null {
  if (role && !canAccessCategory(role, LEADERSHIP_ROLES)) {
    return null
  }

  const scale = getScaleFactor(role, userId)

  return {
    gross_sales: Math.round(BASE_PORTFOLIO.gross_sales * scale),
    net_price: Math.round(BASE_PORTFOLIO.net_price * scale),
    gross_adjustments: Math.round(BASE_PORTFOLIO.gross_adjustments * scale),
    gross_terminations: Math.round(BASE_PORTFOLIO.gross_terminations * scale),
    net_gain: Math.round(BASE_PORTFOLIO.net_gain * scale)
  }
}

export function getOperationalMetrics(role?: Role, userId?: string): OperationalMetrics | null {
  if (role && !canAccessCategory(role, OPS_ROLES) && role !== 'technician') {
    return null
  }

  // Operational metrics are rates, don't scale
  // But add variance for technician viewing own
  const isTech = role === 'technician'
  const variance = isTech ? (Math.random() * 0.1 - 0.05) : 0

  return {
    miss_rate: 3.2 * (1 + variance), // Lower is better
    work_order_completion: 94.5 * (1 + variance * 0.02),
    overtime_pct: 8.7 * (1 + variance)
  }
}

export function getHRMetrics(role?: Role, userId?: string): HRMetrics | null {
  if (role && !canAccessCategory(role, LEADERSHIP_ROLES)) {
    return null
  }

  const scale = getScaleFactor(role, userId)

  // Retention rate stays the same, counts scale
  return {
    headcount: Math.round(BASE_HR.headcount * scale),
    voluntary_terms: Math.round(BASE_HR.voluntary_terms * scale),
    involuntary_terms: Math.round(BASE_HR.involuntary_terms * scale),
    retention_rate: BASE_HR.retention_rate // Rate doesn't scale
  }
}

// =============================================================================
// HISTORICAL DATA
// =============================================================================

export function getLeadFunnelHistory(role?: Role, userId?: string): HistoricalDataPoint[] {
  const current = getLeadFunnelMetrics(role, userId)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return months.map((month, i) => ({
    month,
    value: Math.round(current.sold_count * (0.85 + Math.random() * 0.3))
  }))
}

export function getSalesResultsHistory(role?: Role, userId?: string): HistoricalDataPoint[] {
  const current = getSalesResultsMetrics(role, userId)
  if (!current) return []

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return months.map((month, i) => ({
    month,
    value: Math.round(current.net_sales * (0.85 + Math.random() * 0.3))
  }))
}

export function getNetGainHistory(role?: Role, userId?: string): HistoricalDataPoint[] {
  const current = getPortfolioMetrics(role, userId)
  if (!current) return []

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return months.map((month, i) => ({
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

export function getSALTIDashboardData(role?: Role, userId?: string): SALTIDashboardData {
  return {
    leadFunnel: getLeadFunnelMetrics(role, userId),
    targetKPIs: getTargetKPIs(role, userId),
    productivityRates: getProductivityRates(role, userId),
    salesResults: getSalesResultsMetrics(role, userId),
    fiveTenTwo: getFiveTenTwoMetrics(role, userId),
    finance: getFinanceMetrics(role, userId),
    portfolio: getPortfolioMetrics(role, userId),
    operational: getOperationalMetrics(role, userId),
    hr: getHRMetrics(role, userId)
  }
}
