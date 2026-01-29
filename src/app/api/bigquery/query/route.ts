/**
 * BigQuery Query API Route
 *
 * POST endpoint that routes query requests to the appropriate BigQuery query function.
 * Falls back gracefully with error information.
 */

import { NextRequest, NextResponse } from 'next/server'
import { BigQueryError } from '@/lib/bigquery/error-handler'
import { ValidationError } from '@/lib/bigquery/validation'
import { sanitizeErrorMessage, getErrorCode } from '@/lib/bigquery/error-sanitizer'
import { getErrorDetails } from '@/lib/environment'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { canAccessQuery, canAccessOrgUnit } from '@/lib/bigquery/permissions'
import { getRoleBasedFilters } from '@/lib/bigquery/role-filters'
import { logQueryAccess, logQueryDenied, logUnauthorized, logQueryError } from '@/lib/audit-log'
import { isAdminEmail } from '@/lib/admin'
import type { Role, User } from '@/types'
import {
  getLeadsByPestType,
  getLeadTrends,
  getLeadRankings,
  getLeadCancellations,
  getLeadGeographic,
  getLeadFunnel,
} from '@/lib/bigquery/queries/leads'

import {
  getSpeedToInstall,
  getSalesToday,
  getBacklog,
  getCanceledAgreements,
  getStartRate,
  getSalesMarkets,
  getSalesRegions,
  getSalesBranches,
  getSalesFilterHierarchy,
} from '@/lib/bigquery/queries/sales'

import {
  getPipelineByStage,
  getRepPerformance,
  getAtRiskLeads,
  getSalesPipelineSummary,
  getSalesKPIs,
} from '@/lib/bigquery/queries/sales-pipeline'

import {
  getARAging,
  getARSummary,
  getARByBranch,
  getARDetails,
  getRevenueProjections,
  getProjectionAccuracy,
  getVarianceAnalysis,
} from '@/lib/bigquery/queries/finance'

import {
  getPnLSummary,
  getRevenueBreakdown,
  getExpenseBreakdown,
  getPnLTrend,
} from '@/lib/bigquery/queries/pnl'

import {
  getPNIByBranch,
  getPNIDetails,
  getTermiteRenewals,
  getTermiteRenewalSummary,
} from '@/lib/bigquery/queries/termite'

import {
  getSALTIOverview,
  getSALTIDailyCheckIn,
  getSALTIProductivity,
  getSALTIProposalPipeline,
  getSALTIWeekendBlitz,
  getSALTIYoYTrends,
  getSALTIFunnelFallout,
  getSALTISalesLadders,
} from '@/lib/bigquery/queries/salti'

import {
  getNPSScore,
  getSurveyResponses,
  getDetractorAnalysis,
  getBranchNPSComparison,
} from '@/lib/bigquery/queries/customer-satisfaction'

import {
  getCallVolume,
  getAgentPerformance,
  getCallOutcomes,
  getHourlyDistribution,
} from '@/lib/bigquery/queries/call-center'

import {
  getLaborCostAnalysis,
  getOvertimeTrends,
  getRevenuePerLaborDollar,
  getCompensationBenchmarks,
} from '@/lib/bigquery/queries/payroll'

import {
  getAccountRetention,
  getRevenueChurn,
  getCustomerLifetimeValue,
  getPortfolioGrowth,
} from '@/lib/bigquery/queries/portfolio'

import {
  discoverSalesforceTables,
  getSalesforceTableSchema,
  getSalesforceTableSample,
  getSalesforceTableQuality,
} from '@/lib/bigquery/queries/salesforce-discovery'

import {
  getSalesforceAccounts,
  getSalesforceAccountDetail,
  getSalesforceContacts,
  getSalesforceOpportunityHistory,
  getSalesforceEmployees,
  getSalesforceQuoteDetail,
  getProductCatalog,
  getOpportunityForQuote,
  getLeads,
  getUserMostUsedServices,
} from '@/lib/bigquery/queries/salesforce'

import {
  getSoldQuotesNotInTracker,
  getSalesNotYetStarted,
  getStartsWithoutQuote,
  getCompletePipelineTimeline,
  getPipelineHealthSummary,
} from '@/lib/bigquery/queries/pipeline-reconciliation'

import {
  getOpsOverview,
  getOpsNational,
  getOpsNewStarts,
  getOpsAccounts,
  getOpsServiceEvents,
  getOpsComplaints,
} from '@/lib/bigquery/queries/ops'

import {
  getExecutiveCommandCenter,
  getKPIDetail,
} from '@/lib/bigquery/queries/executive'

import {
  getBranchDetail,
  getBranchDaily,
  getRegionDaily,
  getMarketDaily,
  getBranchOverview,
} from '@/lib/bigquery/queries/branch'

import {
  getAEPipeline,
  getAETracker,
  getTechTickets,
  getTechDispatch,
  getAETrackerTotals,
  getAECategoryBreakdown,
  getAEMonthlyProgression,
  getMonthlyTotalsDetail,
  // Xactly-linked compensation queries
  getAECompensationSummary,
  getAESalesDetails,
  getAESalesPersonList,
  getAEMonthlyCompensation,
  // Salesforce integration
  getSalesforceOpportunities,
  getSalesforceQuotes,
  // Integrated dashboard (SF + PestPac + Xactly)
  getAEIntegratedDashboard,
  // IRIS national accounts
  getIRISNationalAccounts,
  getIRISNationalAccountSummary,
} from '@/lib/bigquery/queries/ae'

import {
  getHRRetention,
  getPeopleOverview,
  getRetentionByDepartment,
  getTerminationReasons,
  getHeadcountSummary,
} from '@/lib/bigquery/queries/hr'

import {
  getTechProductivity,
  getTechProductivitySummary,
  getTechnicianList,
} from '@/lib/bigquery/queries/workforce'

import {
  getLeadServiceStageMetrics,
  getLeadServiceHandoffMetrics,
  getLeadServicePipelineSummary,
  getLeadServiceAtRiskLeads,
  getLeadServiceHandoffLeads,
  getLeadServiceRiskReasons,
} from '@/lib/bigquery/queries/lead-service'

import {
  getBCGLeadAnalytics,
  getBCGSalesAnalytics,
  getBCGCancellationAnalytics,
  getBCGPNIAnalytics,
  getBCGGLActivity,
  getBCGAnalyticsSummary,
  // Expanded BCG queries
  getBCGTerminations,
  getBCGWorkOrders,
  getBCGTechWorkOrders,
  getBCGPortfolioDaily,
  getBCGPortfolioMonthly,
  getBCGPayrollBranch,
  getBCGMRLTVSummary,
  getBCGMRLTVConversion,
  getBCGBranchWOCompleted,
  getBCGWOSupervisor,
  // BCG Sales Page queries (real data)
  getBCGSalesKPIs,
  getBCGPipelineByStage,
  getBCGRepPerformance,
  getBCGAtRiskLeads,
  getBCGSalesToday,
  getBCGBacklog,
} from '@/lib/bigquery/queries/bcg-analytics'

import {
  getDataSummary,
  getDataSummaryMetrics,
} from '@/lib/bigquery/queries/summary'

import {
  getLeadJourneyByChannel,
  getLeadJourneyTrends,
  getLeadJourneySummary,
  getLeadGapAnalysis,
  getLeadFunnelByChannel,
} from '@/lib/bigquery/queries/lead-journey'

import {
  getMarkets,
  getRegions,
  getBranches,
  getOrganizationHierarchy,
} from '@/lib/bigquery/queries/organization'

import {
  getWIGBranchMetrics,
  getWIGLaggingMetrics,
  getWIGRegionSummary,
} from '@/lib/bigquery/queries/wig'

import {
  getCrossFunctionalKPIs,
  getDepartmentHealth,
  getCrossFunctionalTrends,
  getCrossFunctionalSummary,
  getCrossFunctionalByMarket,
  getDataQualityDiagnostics,
} from '@/lib/bigquery/queries/cross-functional'

import {
  getEmployeesByRole,
} from '@/lib/bigquery/queries/employee'

import {
  getNewStarts,
  getNewStartsSummary,
  getNewStartsBySalesPerson,
} from '@/lib/bigquery/queries/new-starts'

import {
  getSalesTrackerTransactions,
  getSalesTrackerMonthlyTotals,
  getSalesTrackerDataFreshness,
} from '@/lib/bigquery/queries/sales-tracker'

import {
  getDataFreshness,
  getSourceFreshness,
  hasCriticalBreaches,
} from '@/lib/bigquery/queries/data-freshness'

import {
  getTableHealthMetrics,
  getDataQualityIssuesReal,
  getDataQualityScoreReal,
  getDataSourceHealthReal,
  getDataQualityScorecardDimensions,
  getDataQualityDetails,
  getDataQualityHistoricalTrends,
  getDataQualityPeriodComparisons,
  getDataQualityAlerts,
} from '@/lib/bigquery/queries/data-quality'

import {
  getPlatformHealthMetrics,
  getFailedJobs,
} from '@/lib/bigquery/queries/platform-health'

import {
  getUserAdoptionMetrics,
} from '@/lib/bigquery/queries/user-adoption'

import {
  getAnomalyAlerts,
} from '@/lib/bigquery/queries/anomaly-detection'

// Query registry mapping query names to functions
const QUERY_REGISTRY: Record<string, (options: Record<string, unknown>) => Promise<unknown>> = {
  // Leads (6 queries)
  'leads-by-pest-type': getLeadsByPestType,
  'lead-trends': getLeadTrends,
  'lead-rankings': getLeadRankings,
  'lead-cancellations': getLeadCancellations,
  'lead-geographic': getLeadGeographic,
  'lead-funnel': getLeadFunnel,

  // Sales (9 queries)
  'speed-to-install': getSpeedToInstall,
  'sales-today': getSalesToday,
  'backlog': getBacklog,
  'canceled-agreements': getCanceledAgreements,
  'start-rate': getStartRate,
  'sales-markets': getSalesMarkets,
  'sales-regions': getSalesRegions,
  'sales-branches': getSalesBranches,
  'sales-filter-hierarchy': getSalesFilterHierarchy,

  // Sales Pipeline (5 queries)
  'pipeline-by-stage': getPipelineByStage,
  'rep-performance': getRepPerformance,
  'at-risk-leads': getAtRiskLeads,
  'sales-pipeline-summary': getSalesPipelineSummary,
  'sales-kpis': getSalesKPIs,

  // Finance (7 queries)
  'ar-aging': getARAging,
  'ar-summary': getARSummary,
  'ar-by-branch': getARByBranch,
  'ar-details': getARDetails,
  'revenue-projections': getRevenueProjections,
  'projection-accuracy': getProjectionAccuracy,
  'variance-analysis': getVarianceAnalysis,

  // P&L (4 queries) - S0_TMX.vfct_gl_activity (61M rows)
  'pnl-summary': getPnLSummary,
  'revenue-breakdown': getRevenueBreakdown,
  'expense-breakdown': getExpenseBreakdown,
  'pnl-trend': getPnLTrend,

  // Termite (4 queries)
  'pni-by-branch': getPNIByBranch,
  'pni-details': getPNIDetails,
  'termite-renewals': getTermiteRenewals,
  'termite-renewal-summary': getTermiteRenewalSummary,

  // SALTI (8 queries)
  'salti-overview': getSALTIOverview,
  'salti-daily-check-in': getSALTIDailyCheckIn,
  'salti-productivity': getSALTIProductivity,
  'salti-proposal-pipeline': getSALTIProposalPipeline,
  'salti-weekend-blitz': getSALTIWeekendBlitz,
  'salti-yoy-trends': getSALTIYoYTrends,
  'salti-funnel-fallout': getSALTIFunnelFallout,
  'salti-sales-ladders': getSALTISalesLadders,

  // Customer Satisfaction (NPS) (4 queries)
  'nps-score': getNPSScore,
  'survey-responses': getSurveyResponses,
  'detractor-analysis': getDetractorAnalysis,
  'branch-nps-comparison': getBranchNPSComparison,

  // Call Center Performance (4 queries)
  'call-volume': getCallVolume,
  'agent-performance': getAgentPerformance,
  'call-outcomes': getCallOutcomes,
  'hourly-distribution': getHourlyDistribution,

  // Operations (6 queries)
  'ops-overview': getOpsOverview,
  'ops-national': getOpsNational,
  'ops-new-starts': getOpsNewStarts,
  'ops-accounts': getOpsAccounts,
  'ops-service-events': getOpsServiceEvents,
  'ops-complaints': getOpsComplaints,

  // Executive (2 queries)
  'executive-command-center': getExecutiveCommandCenter,
  'kpi-detail': getKPIDetail,

  // Branch/Region/Market (5 queries)
  'branch-detail': getBranchDetail,
  'branch-daily': getBranchDaily,
  'region-daily': getRegionDaily,
  'market-daily': getMarketDaily,
  'branch-overview': getBranchOverview,

  // Account Executive (12 queries)
  'ae-pipeline': getAEPipeline,
  'ae-tracker': getAETracker,
  'ae-tracker-totals': getAETrackerTotals,
  'ae-category-breakdown': getAECategoryBreakdown,
  'ae-monthly-progression': getAEMonthlyProgression,
  'ae-monthly-totals-detail': getMonthlyTotalsDetail,
  'tech-tickets': getTechTickets,
  'tech-dispatch': getTechDispatch,
  // Xactly-linked compensation queries (BCG_RTD_DB.DR_ContractSales)
  'ae-compensation-summary': getAECompensationSummary,
  'ae-sales-details': getAESalesDetails,
  'ae-salesperson-list': getAESalesPersonList,
  'ae-monthly-compensation': getAEMonthlyCompensation,
  // New Start Log (PestPac W3_Contract_Checker + Salesforce)
  'ae-new-start-entries': getNewStarts,
  'ae-new-start-summary': getNewStartsSummary,
  // Salesforce integration (S0.Raw_RTXSF_*)
  'salesforce-opportunities': getSalesforceOpportunities,
  'salesforce-quotes': getSalesforceQuotes,
  // Salesforce Discovery (INFORMATION_SCHEMA)
  'salesforce-table-discovery': discoverSalesforceTables,
  'salesforce-table-schema': (options) => getSalesforceTableSchema(options.datasetId as string, options.tableId as string),
  'salesforce-table-sample': (options) => getSalesforceTableSample(options.datasetId as string, options.tableId as string),
  'salesforce-table-quality': (options) => getSalesforceTableQuality(options.datasetId as string, options.tableId as string),
  // Salesforce Data (Phase 2A - Tier 1)
  'salesforce-accounts': getSalesforceAccounts,
  'salesforce-account-detail': getSalesforceAccountDetail,
  'salesforce-contacts': getSalesforceContacts,
  'salesforce-opportunity-history': getSalesforceOpportunityHistory,
  'salesforce-employees': getSalesforceEmployees,
  'salesforce-quote-detail': getSalesforceQuoteDetail,
  // Quote Builder queries
  'product-catalog': getProductCatalog,
  'opportunity-for-quote': (options) => getOpportunityForQuote(options.opportunityId as string),
  'salesforce-leads': getLeads,
  'user-most-used-services': getUserMostUsedServices,
  // Integrated dashboard (SF + PestPac + Xactly)
  'ae-integrated-dashboard': getAEIntegratedDashboard,
  // IRIS national accounts (S1.vw_iris_jde_daily_revenue_detail)
  'iris-national-accounts': getIRISNationalAccounts,
  'iris-national-account-summary': getIRISNationalAccountSummary,

  // Sales Tracker (3 queries) - Transaction-level tracking for AEs
  'sales-tracker-transactions': getSalesTrackerTransactions,
  'sales-tracker-monthly-totals': getSalesTrackerMonthlyTotals,
  'sales-tracker-data-freshness': getSalesTrackerDataFreshness,

  // HR (5 queries)
  'hr-retention': getHRRetention,
  'people-overview': getPeopleOverview,
  'retention-by-department': getRetentionByDepartment,
  'termination-reasons': getTerminationReasons,
  'headcount-summary': getHeadcountSummary,

  // Payroll Analytics (4 queries) - BCG_RTD_DB.BCG_EmployeePayData_NT (9.4M rows)
  'labor-cost-analysis': getLaborCostAnalysis,
  'overtime-trends': getOvertimeTrends,
  'revenue-per-labor-dollar': getRevenuePerLaborDollar,
  'compensation-benchmarks': getCompensationBenchmarks,

  // Portfolio Analytics (4 queries) - BCG_RTD_DB.DR_PortfolioDaily, DR_PortfolioMonthly
  'account-retention': getAccountRetention,
  'revenue-churn': getRevenueChurn,
  'customer-lifetime-value': getCustomerLifetimeValue,
  'portfolio-growth': getPortfolioGrowth,

  // Workforce (3 queries)
  'tech-productivity': getTechProductivity,
  'tech-productivity-summary': getTechProductivitySummary,
  'technician-list': getTechnicianList,

  // Lead Service Engine (6 queries)
  'lead-service-stage-metrics': getLeadServiceStageMetrics,
  'lead-service-handoff-metrics': getLeadServiceHandoffMetrics,
  'lead-service-pipeline-summary': getLeadServicePipelineSummary,
  'lead-service-at-risk-leads': getLeadServiceAtRiskLeads,
  'lead-service-handoff-leads-intake': (options: Record<string, unknown>) =>
    getLeadServiceHandoffLeads('lead_to_schedule', options),
  'lead-service-handoff-leads-ops': (options: Record<string, unknown>) =>
    getLeadServiceHandoffLeads('sales_to_ops', options),
  'lead-service-risk-reasons': getLeadServiceRiskReasons,

  // Data Summary (2 queries) - Admin dashboard counts
  'data-summary': getDataSummary,
  'data-summary-metrics': getDataSummaryMetrics,

  // Lead Journey (5 queries) - Channel/source tracking with res/comm breakdown
  'lead-journey-by-channel': getLeadJourneyByChannel,
  'lead-journey-trends': getLeadJourneyTrends,
  'lead-journey-summary': getLeadJourneySummary,
  'lead-gap-analysis': getLeadGapAnalysis,
  'lead-funnel-by-channel': getLeadFunnelByChannel,

  // Organization Hierarchy (4 queries) - Real market/region/branch data
  'organization-markets': getMarkets,
  'organization-regions': getRegions,
  'organization-branches': getBranches,
  'organization-hierarchy': getOrganizationHierarchy,

  // WIG Scorecard (3 queries) - Wildly Important Goals tracking
  'wig-branch-metrics': getWIGBranchMetrics,
  'wig-lagging-metrics': getWIGLaggingMetrics,
  'wig-region-summary': getWIGRegionSummary,

  // Cross-Functional Dashboard (6 queries) - Multi-source aggregation
  'cross-functional-kpis': getCrossFunctionalKPIs,
  'cross-functional-departments': getDepartmentHealth,
  'cross-functional-trends': getCrossFunctionalTrends,
  'cross-functional-summary': getCrossFunctionalSummary,
  'cross-functional-by-market': getCrossFunctionalByMarket,
  'data-quality-diagnostics': getDataQualityDiagnostics,

  // BCG Analytics (16 queries) - BCG_RTD_DB dataset integration
  'bcg-lead-analytics': getBCGLeadAnalytics,
  'bcg-sales-analytics': getBCGSalesAnalytics,
  'bcg-cancellation-analytics': getBCGCancellationAnalytics,
  'bcg-pni-analytics': getBCGPNIAnalytics,
  'bcg-gl-activity': getBCGGLActivity,
  'bcg-analytics-summary': getBCGAnalyticsSummary,
  // Expanded BCG queries
  'bcg-terminations': getBCGTerminations,
  'bcg-work-orders': getBCGWorkOrders,
  'bcg-tech-work-orders': getBCGTechWorkOrders,
  'bcg-portfolio-daily': getBCGPortfolioDaily,
  'bcg-portfolio-monthly': getBCGPortfolioMonthly,
  'bcg-payroll-branch': getBCGPayrollBranch,
  'bcg-mrltv-summary': getBCGMRLTVSummary,
  'bcg-mrltv-conversion': getBCGMRLTVConversion,
  'bcg-branch-wo-completed': getBCGBranchWOCompleted,
  'bcg-wo-supervisor': getBCGWOSupervisor,
  // BCG Sales Page queries (real data from BCG_RTD_DB)
  'bcg-sales-kpis': getBCGSalesKPIs,
  'bcg-pipeline-by-stage': getBCGPipelineByStage,
  'bcg-rep-performance': getBCGRepPerformance,
  'bcg-at-risk-leads': getBCGAtRiskLeads,
  'bcg-sales-today': getBCGSalesToday,
  'bcg-backlog': getBCGBacklog,

  // Employee lookup (for role preview)
  'employees-by-role': (options: Record<string, unknown>) =>
    getEmployeesByRole(options.role as string, options),

  // New Starts (3 queries) - Contracts sold but not yet started
  'new-starts': getNewStarts,
  'new-starts-summary': getNewStartsSummary,
  'new-starts-by-sales-person': getNewStartsBySalesPerson,

  // Data Freshness SLA (3 queries) - ETL pipeline monitoring
  'data-freshness': getDataFreshness,
  'data-freshness-source': (options: Record<string, unknown>) =>
    getSourceFreshness(options.sourceId as string),
  'data-freshness-critical': hasCriticalBreaches,

  // Data Quality (9 queries) - Real BigQuery metadata monitoring + Historical tracking
  'data-quality-table-health': getTableHealthMetrics,
  'data-quality-issues': getDataQualityIssuesReal,
  'data-quality-score': getDataQualityScoreReal,
  'data-quality-source-health': getDataSourceHealthReal,
  'data-quality-scorecard-dimensions': getDataQualityScorecardDimensions,
  'data-quality-details': (filters) => getDataQualityDetails(filters.dimension as string),
  'data-quality-historical-trends': (filters) =>
    getDataQualityHistoricalTrends(filters.dimension as string | undefined, filters.days as number | undefined),
  'data-quality-period-comparisons': getDataQualityPeriodComparisons,
  'data-quality-alerts': getDataQualityAlerts,

  // Platform Health (2 queries) - INFORMATION_SCHEMA monitoring
  'platform-health-metrics': getPlatformHealthMetrics,
  'platform-failed-jobs': (options: Record<string, unknown>) =>
    getFailedJobs(typeof options.limit === 'number' ? options.limit : 10),

  // User Adoption (1 query) - tmx_employee + ops_events tracking
  'user-adoption-summary': getUserAdoptionMetrics,

  // Anomaly Detection (1 query) - Statistical Z-score anomaly detection
  'anomaly-alerts': getAnomalyAlerts,
}

/**
 * Helper to extract display name from email
 * @param email - User email address
 * @returns Capitalized name from email local part
 */
function extractNameFromEmail(email: string): string {
  const localPart = email.split('@')[0]
  // Handle common formats: first.last, first_last, firstlast
  const parts = localPart.split(/[._]/)
  if (parts.length >= 2) {
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
  }
  // Single name, just capitalize
  return localPart.charAt(0).toUpperCase() + localPart.slice(1)
}

/**
 * POST handler for BigQuery query requests
 * Handles authentication, authorization, query execution, and audit logging
 */
export async function POST(request: NextRequest) {
  const DEMO_MODE = !isSupabaseConfigured()

  try {
    const body = await request.json()
    const { query, filters = {} } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid query parameter' },
        { status: 400 }
      )
    }

    // 1. AUTHENTICATION CHECK - Verify user has valid session
    let userProfile: User | null = null

    if (!DEMO_MODE) {
      const supabase = await createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // No valid session - log and reject
        await logUnauthorized(
          query,
          filters,
          request.headers.get('x-forwarded-for') || 'unknown',
          request.headers.get('user-agent') || 'unknown'
        )

        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized. Please log in.',
            errorCode: 'UNAUTHORIZED',
          },
          { status: 401 }
        )
      }

      // Get user profile with role and assignments
      const userEmail = session.user.email

      // Check if admin user (skip profile lookup, assign exec)
      if (userEmail && isAdminEmail(userEmail)) {
        userProfile = {
          id: session.user.id,
          name: extractNameFromEmail(userEmail),
          email: userEmail,
          role: 'exec' as Role,
          title: 'Administrator',
          assignedMarkets: [],
          assignedRegions: [],
          assignedBranches: [],
          assignedTeams: [],
        }
      } else {
        // Non-admin: Load from database
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError || !profile) {
          await logUnauthorized(
            query,
            filters,
            request.headers.get('x-forwarded-for') || 'unknown',
            request.headers.get('user-agent') || 'unknown'
          )

          return NextResponse.json(
            {
              success: false,
              error: 'User profile not found. Please complete onboarding.',
              errorCode: 'PROFILE_NOT_FOUND',
            },
            { status: 403 }
          )
        }

        // Build User object from profile
        userProfile = {
          id: session.user.id,
          name: profile.name,
          email: profile.email,
          role: (profile.role_override ? profile.role : (profile.auto_detected_role || profile.role)) as Role,
          title: profile.workday_job_title || '',
          assignedMarkets: profile.market_code ? [profile.market_code] : [],
          assignedRegions: profile.region_code ? [profile.region_code] : [],
          assignedBranches: profile.branch_code ? [profile.branch_code] : [],
          assignedTeams: [],
        }
      }
    } else {
      // DEMO MODE - Allow access without auth but log warning
      console.warn('[Auth] Running in DEMO MODE - authentication disabled for query:', query)

      // Create mock exec user for demo mode
      userProfile = {
        id: 'demo-user',
        name: 'Demo User',
        email: 'demo@example.com',
        role: 'exec' as Role,
        title: 'Demo',
        assignedMarkets: [],
        assignedRegions: [],
        assignedBranches: [],
        assignedTeams: [],
      }
    }

    // 2. AUTHORIZATION CHECK - Verify user can access this query
    if (!canAccessQuery(query, userProfile.role)) {
      await logQueryDenied(
        userProfile.id,
        userProfile.name,
        userProfile.email,
        userProfile.role,
        query,
        filters,
        `Role ${userProfile.role} not permitted to access query ${query}`
      )

      return NextResponse.json(
        {
          success: false,
          error: `Access denied. Your role (${userProfile.role}) cannot access this query.`,
          errorCode: 'FORBIDDEN',
        },
        { status: 403 }
      )
    }

    // 3. ORG UNIT ACCESS CHECK - Verify user can access requested organizational units
    if (!canAccessOrgUnit(
      userProfile.role,
      filters.market as string | undefined,
      filters.region as string | undefined,
      filters.branch as string | undefined,
      {
        markets: userProfile.assignedMarkets,
        regions: userProfile.assignedRegions,
        branches: userProfile.assignedBranches,
      }
    )) {
      await logQueryDenied(
        userProfile.id,
        userProfile.name,
        userProfile.email,
        userProfile.role,
        query,
        filters,
        `User not permitted to access org unit: ${JSON.stringify({ market: filters.market, region: filters.region, branch: filters.branch })}`
      )

      return NextResponse.json(
        {
          success: false,
          error: 'Access denied. You cannot access data for this organizational unit.',
          errorCode: 'ORG_UNIT_FORBIDDEN',
        },
        { status: 403 }
      )
    }

    // 4. INJECT SERVER-SIDE ROLE FILTERS - Override client filters for security
    const roleBasedFilters = getRoleBasedFilters(userProfile)
    const serverSideFilters = {
      ...filters,
      ...roleBasedFilters, // Server-enforced filters take precedence
    }

    // 5. EXECUTE QUERY with server-enforced filters
    const queryFn = QUERY_REGISTRY[query]
    if (!queryFn) {
      return NextResponse.json(
        { error: `Unknown query: ${query}`, availableQueries: Object.keys(QUERY_REGISTRY) },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const data = await queryFn(serverSideFilters)
    const responseTime = Date.now() - startTime

    // 6. LOG SUCCESSFUL ACCESS for audit trail
    await logQueryAccess(
      userProfile.id,
      userProfile.name,
      userProfile.email,
      userProfile.role,
      query,
      serverSideFilters,
      responseTime
    )

    return NextResponse.json({
      success: true,
      query,
      data,
      metadata: {
        responseTime,
        timestamp: new Date().toISOString(),
        source: 'bigquery',
      },
    })
  } catch (error) {
    const isDevelopment = process.env.NODE_ENV !== 'production'

    // Log query errors (if user profile available)
    // Note: userProfile may not be available if error occurred during auth
    // TODO: Track errors in catch block with proper user context

    // Handle BigQueryError specially (from centralized error handler)
    if (error instanceof BigQueryError) {
      // Log full details server-side
      console.error('[API] BigQuery error:', {
        queryName: error.queryName,
        originalError: error.originalError,
        timestamp: new Date().toISOString(),
      })

      // Type guard for options with errorCode
      const errorCode = typeof error.options === 'object' && error.options !== null && 'errorCode' in error.options
        ? String(error.options.errorCode)
        : 'QUERY_FAILED'

      // Return sanitized error to client
      return NextResponse.json(
        {
          success: false,
          error: error.message,  // Already sanitized by handleBigQueryError
          errorCode,
          ...getErrorDetails(
            {},  // Production: no extra details
            { queryName: error.queryName }  // Development: include query name
          ),
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }

    // Handle validation errors (invalid filters)
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,  // Validation errors are safe to show
          errorCode: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // Generic error handling
    const sanitizedMessage = sanitizeErrorMessage(error, isDevelopment ? 'development' : 'production')
    const errorCode = getErrorCode(error)

    console.error('[API] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: isDevelopment ? (error instanceof Error ? error.stack : undefined) : '[REDACTED]',
      timestamp: new Date().toISOString(),
    })

    // Detect specific error types for better user experience
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isAuthError = errorMessage.includes('Could not load the default credentials')
    const isNetworkError = errorMessage.includes('ENOTFOUND') || errorMessage.includes('ETIMEDOUT')

    return NextResponse.json(
      {
        success: false,
        error: isAuthError
          ? 'Authentication error. Please contact your administrator.'
          : isNetworkError
          ? 'Network connectivity issue. Please try again later.'
          : sanitizedMessage,
        errorCode,
        ...getErrorDetails(
          {},  // Production: no suggestions or stack traces
          {  // Development: helpful debugging info
            suggestion: isAuthError
              ? 'Run: gcloud auth application-default login'
              : isNetworkError
              ? 'Check network connectivity to BigQuery'
              : 'Check query syntax and table permissions',
            originalError: errorMessage,
          }
        ),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// GET endpoint for listing available queries
export async function GET() {
  return NextResponse.json({
    availableQueries: Object.keys(QUERY_REGISTRY),
    totalQueries: Object.keys(QUERY_REGISTRY).length,
    categories: {
      leads: ['leads-by-pest-type', 'lead-trends', 'lead-rankings', 'lead-cancellations', 'lead-geographic', 'lead-funnel'],
      'lead-journey': ['lead-journey-by-channel', 'lead-journey-trends', 'lead-journey-summary', 'lead-gap-analysis', 'lead-funnel-by-channel'],
      sales: ['speed-to-install', 'sales-today', 'backlog', 'canceled-agreements', 'start-rate', 'pipeline-by-stage', 'rep-performance', 'at-risk-leads', 'sales-pipeline-summary', 'sales-kpis'],
      finance: ['ar-aging', 'ar-summary', 'ar-by-branch'],
      termite: ['pni-by-branch', 'pni-details', 'termite-renewals', 'termite-renewal-summary'],
      salti: ['salti-overview', 'salti-daily-check-in', 'salti-productivity', 'salti-proposal-pipeline', 'salti-weekend-blitz', 'salti-yoy-trends', 'salti-funnel-fallout', 'salti-sales-ladders'],
      ops: ['ops-overview', 'ops-national', 'ops-new-starts'],
      executive: ['executive-command-center', 'kpi-detail'],
      branch: ['branch-detail', 'branch-daily', 'region-daily', 'market-daily', 'branch-overview'],
      ae: ['ae-pipeline', 'ae-tracker', 'ae-tracker-totals', 'ae-category-breakdown', 'ae-monthly-progression', 'ae-monthly-totals-detail', 'tech-tickets', 'tech-dispatch'],
      hr: ['hr-retention', 'people-overview', 'retention-by-department', 'termination-reasons', 'headcount-summary'],
      workforce: ['tech-productivity', 'tech-productivity-summary'],
      'lead-service': ['lead-service-stage-metrics', 'lead-service-handoff-metrics', 'lead-service-pipeline-summary', 'lead-service-at-risk-leads', 'lead-service-handoff-leads-intake', 'lead-service-handoff-leads-ops', 'lead-service-risk-reasons'],
      'bcg-analytics': [
        'bcg-lead-analytics', 'bcg-sales-analytics', 'bcg-cancellation-analytics', 'bcg-pni-analytics', 'bcg-gl-activity', 'bcg-analytics-summary',
        'bcg-terminations', 'bcg-work-orders', 'bcg-tech-work-orders', 'bcg-portfolio-daily', 'bcg-portfolio-monthly',
        'bcg-payroll-branch', 'bcg-mrltv-summary', 'bcg-mrltv-conversion', 'bcg-branch-wo-completed', 'bcg-wo-supervisor'
      ],
      summary: ['data-summary', 'data-summary-metrics'],
      organization: ['organization-markets', 'organization-regions', 'organization-branches', 'organization-hierarchy'],
      wig: ['wig-branch-metrics', 'wig-lagging-metrics', 'wig-region-summary'],
      'cross-functional': ['cross-functional-kpis', 'cross-functional-departments', 'cross-functional-trends', 'cross-functional-summary', 'cross-functional-by-market'],
      employee: ['employees-by-role'],
      'new-starts': ['new-starts', 'new-starts-summary', 'new-starts-by-sales-person'],
      'data-freshness': ['data-freshness', 'data-freshness-source', 'data-freshness-critical'],
    },
  })
}
