/**
 * BigQuery Query Permissions
 *
 * Defines which roles can access which queries to prevent unauthorized data access.
 * This is enforced server-side in the BigQuery API route.
 *
 * Security Pattern:
 * - Deny by default: If query not listed, access denied
 * - Explicit allow lists: Each query must declare allowed roles
 * - Role hierarchy: Higher roles inherit lower role access where appropriate
 */

import type { Role, User } from '@/types'

// Define which roles can access which queries
export const QUERY_PERMISSIONS: Record<string, Role[]> = {
  // Executive queries - only exec and directors
  'executive-command-center': ['exec', 'market_vp', 'market_sales_director'],
  'kpi-detail': ['exec', 'market_vp', 'market_sales_director', 'region_director'],

  // Market-level queries - market leadership and above
  'market-daily': ['exec', 'market_vp', 'market_sales_director'],
  'sales-markets': ['exec', 'market_vp', 'market_sales_director', 'region_director'],
  'cross-functional-by-market': ['exec', 'market_vp', 'market_sales_director'],

  // Region-level queries - region leadership and above
  'region-daily': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager'],
  'sales-regions': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager'],
  'wig-region-summary': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager'],

  // Branch-level queries - branch managers and above
  'branch-daily': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
  'branch-detail': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
  'branch-overview': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
  'sales-branches': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
  'sales-filter-hierarchy': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
  'wig-branch-metrics': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
  'wig-lagging-metrics': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],

  // Sales queries - sales leadership and AEs
  'sales-today': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'backlog': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'speed-to-install': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'start-rate': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'canceled-agreements': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'pipeline-by-stage': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'rep-performance': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'at-risk-leads': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'sales-pipeline-summary': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'sales-kpis': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],

  // AE-specific queries (own data only, enforced by role filters)
  'ae-pipeline': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'ae-tracker': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'ae-tracker-totals': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'ae-category-breakdown': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'ae-monthly-progression': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'ae-monthly-totals-detail': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'ae-compensation-summary': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'ae-sales-details': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'ae-salesperson-list': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'ae-monthly-compensation': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'ae-new-start-entries': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'ae-new-start-summary': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'ae-integrated-dashboard': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'salesforce-opportunities': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'salesforce-quotes': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'salesforce-accounts': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'salesforce-account-detail': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'salesforce-contacts': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'salesforce-opportunity-history': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'salesforce-employees': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'salesforce-quote-detail': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'product-catalog': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'user-most-used-services': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'iris-national-accounts': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'iris-national-account-summary': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],

  // Sales Tracker (AE transaction tracking - own data only)
  'sales-tracker-transactions': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'sales-tracker-monthly-totals': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'sales-tracker-data-freshness': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],

  // Tech-specific queries (own data only, enforced by role filters)
  'tech-tickets': ['exec', 'manager', 'ops_manager', 'technician'],
  'tech-dispatch': ['exec', 'manager', 'ops_manager', 'technician'],
  'tech-productivity': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager', 'technician'],
  'tech-productivity-summary': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
  'technician-list': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],

  // Leads queries - all roles except technician
  'leads-by-pest-type': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'lead-trends': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'lead-rankings': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'lead-cancellations': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'lead-geographic': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],
  'lead-funnel': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'rep'],

  // Lead Journey queries - sales and marketing leadership
  'lead-journey-by-channel': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'lead-journey-trends': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'lead-journey-summary': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'lead-gap-analysis': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'lead-funnel-by-channel': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],

  // Lead Service Engine queries - operations and sales leadership
  'lead-service-stage-metrics': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
  'lead-service-handoff-metrics': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
  'lead-service-pipeline-summary': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
  'lead-service-at-risk-leads': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
  'lead-service-handoff-leads-intake': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
  'lead-service-handoff-leads-ops': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
  'lead-service-risk-reasons': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],

  // Operations queries
  'ops-overview': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
  'ops-national': ['exec', 'market_vp', 'region_director'],
  'ops-new-starts': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
  'ops-accounts': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
  'ops-service-events': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
  'ops-complaints': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],

  // Finance queries - finance and exec only
  'ar-aging': ['exec', 'market_vp', 'region_director', 'manager'],
  'ar-summary': ['exec', 'market_vp', 'region_director', 'manager'],
  'ar-by-branch': ['exec', 'market_vp', 'region_director', 'manager'],
  'ar-details': ['exec', 'market_vp', 'region_director', 'manager'],
  'revenue-projections': ['exec', 'market_vp', 'region_director', 'manager'],
  'projection-accuracy': ['exec', 'market_vp', 'region_director', 'manager'],
  'variance-analysis': ['exec', 'market_vp', 'region_director', 'manager'],

  // P&L queries - highly sensitive financial data (exec and directors only)
  'pnl-summary': ['exec', 'market_vp', 'region_director'],
  'revenue-breakdown': ['exec', 'market_vp', 'region_director'],
  'expense-breakdown': ['exec', 'market_vp', 'region_director'],
  'pnl-trend': ['exec', 'market_vp', 'region_director'],

  // Termite (PNI) queries
  'pni-by-branch': ['exec', 'market_vp', 'region_director', 'manager', 'sales_manager', 'rep'],
  'pni-details': ['exec', 'market_vp', 'region_director', 'manager', 'sales_manager', 'rep'],
  'termite-renewals': ['exec', 'market_vp', 'region_director', 'manager', 'sales_manager', 'rep'],
  'termite-renewal-summary': ['exec', 'market_vp', 'region_director', 'manager', 'sales_manager', 'rep'],

  // SALTI queries - sales leadership
  'salti-overview': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'salti-daily-check-in': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'salti-productivity': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'salti-proposal-pipeline': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'salti-weekend-blitz': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'salti-yoy-trends': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'salti-funnel-fallout': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'salti-sales-ladders': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],

  // Customer Satisfaction (NPS) queries - leadership and managers
  'nps-score': ['exec', 'market_vp', 'region_director', 'manager'],
  'survey-responses': ['exec', 'market_vp', 'region_director', 'manager'],
  'detractor-analysis': ['exec', 'market_vp', 'region_director', 'manager'],
  'branch-nps-comparison': ['exec', 'market_vp', 'region_director', 'manager'],

  // Call Center Performance queries - leadership and operations managers
  'call-volume': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
  'agent-performance': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
  'call-outcomes': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
  'hourly-distribution': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],

  // HR queries - exec and people leadership
  'hr-retention': ['exec', 'market_vp', 'region_director'],
  'people-overview': ['exec', 'market_vp', 'region_director'],
  'retention-by-department': ['exec', 'market_vp', 'region_director'],
  'termination-reasons': ['exec', 'market_vp', 'region_director'],
  'headcount-summary': ['exec', 'market_vp', 'region_director', 'manager'],

  // Payroll Analytics queries - SENSITIVE compensation data (exec and directors only)
  'labor-cost-analysis': ['exec', 'market_vp', 'region_director'],
  'overtime-trends': ['exec', 'market_vp', 'region_director'],
  'revenue-per-labor-dollar': ['exec', 'market_vp', 'region_director'],
  'compensation-benchmarks': ['exec', 'market_vp', 'region_director'],

  // Portfolio Analytics queries - customer retention and growth (leadership and managers)
  'account-retention': ['exec', 'market_vp', 'region_director', 'manager'],
  'revenue-churn': ['exec', 'market_vp', 'region_director', 'manager'],
  'customer-lifetime-value': ['exec', 'market_vp', 'region_director', 'manager'],
  'portfolio-growth': ['exec', 'market_vp', 'region_director', 'manager'],

  // BCG Analytics queries - analytics team and leadership
  'bcg-lead-analytics': ['exec', 'market_vp', 'market_sales_director', 'region_director'],
  'bcg-sales-analytics': ['exec', 'market_vp', 'market_sales_director', 'region_director'],
  'bcg-cancellation-analytics': ['exec', 'market_vp', 'market_sales_director', 'region_director'],
  'bcg-pni-analytics': ['exec', 'market_vp', 'market_sales_director', 'region_director'],
  'bcg-gl-activity': ['exec', 'market_vp', 'region_director'],
  'bcg-analytics-summary': ['exec', 'market_vp', 'market_sales_director', 'region_director'],
  'bcg-terminations': ['exec', 'market_vp', 'region_director'],
  'bcg-work-orders': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
  'bcg-tech-work-orders': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
  'bcg-portfolio-daily': ['exec', 'market_vp', 'region_director'],
  'bcg-portfolio-monthly': ['exec', 'market_vp', 'region_director'],
  'bcg-payroll-branch': ['exec', 'market_vp', 'region_director'],
  'bcg-mrltv-summary': ['exec', 'market_vp', 'market_sales_director', 'region_director'],
  'bcg-mrltv-conversion': ['exec', 'market_vp', 'market_sales_director', 'region_director'],
  'bcg-branch-wo-completed': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
  'bcg-wo-supervisor': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
  'bcg-sales-kpis': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'bcg-pipeline-by-stage': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'bcg-rep-performance': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'bcg-at-risk-leads': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'bcg-sales-today': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
  'bcg-backlog': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],

  // Cross-functional queries - exec and directors
  'cross-functional-kpis': ['exec', 'market_vp', 'market_sales_director', 'region_director'],
  'cross-functional-departments': ['exec', 'market_vp', 'market_sales_director', 'region_director'],
  'cross-functional-trends': ['exec', 'market_vp', 'market_sales_director', 'region_director'],
  'cross-functional-summary': ['exec', 'market_vp', 'market_sales_director', 'region_director'],
  'data-quality-diagnostics': ['exec'],

  // Organization hierarchy queries - all authenticated roles
  'organization-markets': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician'],
  'organization-regions': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician'],
  'organization-branches': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician'],
  'organization-hierarchy': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician'],

  // Employee lookup (for admin role preview)
  'employees-by-role': ['exec'],

  // New Starts queries
  'new-starts': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager', 'rep'],
  'new-starts-summary': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
  'new-starts-by-sales-person': ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],

  // Admin/governance queries - exec only
  'data-summary': ['exec'],
  'data-summary-metrics': ['exec'],
  'data-freshness': ['exec'],
  'data-freshness-source': ['exec'],
  'data-freshness-critical': ['exec'],

  // Data Quality Monitoring queries - governance and leadership
  'data-quality-table-health': ['exec', 'market_vp', 'region_director'],
  'data-quality-issues': ['exec', 'market_vp', 'region_director'],
  'data-quality-score': ['exec', 'market_vp', 'region_director'],
  'data-quality-source-health': ['exec', 'market_vp', 'region_director'],
  'data-quality-scorecard-dimensions': ['exec', 'market_vp', 'region_director'],
  'data-quality-details': ['exec', 'market_vp', 'region_director'],
  'data-quality-historical-trends': ['exec', 'market_vp', 'region_director'],
  'data-quality-period-comparisons': ['exec', 'market_vp', 'region_director'],
  'data-quality-alerts': ['exec', 'market_vp', 'region_director'],

  // Platform Health Monitoring queries - exec only (admin dashboard)
  'platform-health-metrics': ['exec'],
  'platform-failed-jobs': ['exec'],

  // User Adoption queries - exec only (admin dashboard)
  'user-adoption-summary': ['exec'],

  // Anomaly Detection queries - exec only (admin dashboard)
  'anomaly-alerts': ['exec'],
}

/**
 * Check if a user has permission to execute a query based on their role.
 *
 * @param queryName - The query being requested
 * @param userRole - The user's role
 * @returns true if user can access query, false otherwise
 */
export function canAccessQuery(queryName: string, userRole: Role): boolean {
  const allowedRoles = QUERY_PERMISSIONS[queryName]

  if (!allowedRoles) {
    // If query not in permissions list, deny by default (secure)
    console.warn(`[Permissions] Query "${queryName}" not in permissions list. Denying access.`)
    return false
  }

  return allowedRoles.includes(userRole)
}

/**
 * Check if a user can access data for specific organizational units.
 * This enforces that users can only query data within their assigned scope.
 *
 * @param userRole - The user's role
 * @param requestedMarket - Market filter from query
 * @param requestedRegion - Region filter from query
 * @param requestedBranch - Branch filter from query
 * @param userAssignments - User's assigned organizational units
 * @returns true if user can access org unit, false otherwise
 */
export function canAccessOrgUnit(
  userRole: Role,
  requestedMarket?: string,
  requestedRegion?: string,
  requestedBranch?: string,
  userAssignments?: {
    markets?: string[]
    regions?: string[]
    branches?: string[]
  }
): boolean {
  // Exec can access all
  if (userRole === 'exec') return true

  // Market VP can only access assigned markets
  if (userRole === 'market_vp' || userRole === 'market_sales_director') {
    if (requestedMarket && userAssignments?.markets && userAssignments.markets.length > 0) {
      return userAssignments.markets.includes(requestedMarket)
    }
  }

  // Region directors can only access assigned regions
  if (userRole === 'region_director' || userRole === 'region_sales_manager') {
    if (requestedRegion && userAssignments?.regions && userAssignments.regions.length > 0) {
      return userAssignments.regions.includes(requestedRegion)
    }
  }

  // Branch managers can only access assigned branches
  if (userRole === 'manager' || userRole === 'sales_manager' || userRole === 'ops_manager') {
    if (requestedBranch && userAssignments?.branches && userAssignments.branches.length > 0) {
      return userAssignments.branches.includes(requestedBranch)
    }
  }

  // If no specific org unit requested, allow (will be filtered by role-based filters)
  // For reps and technicians, role-based filters (salesPerson, employeeId) are sufficient
  return true
}
