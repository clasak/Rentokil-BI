/**
 * BigQuery Health Check API Route
 *
 * Tests all BigQuery queries and returns comprehensive health status.
 * Used by the admin dashboard to monitor query health.
 */

import { NextRequest, NextResponse } from 'next/server'
import { bigQueryClient, BIGQUERY_CONFIG } from '@/lib/bigquery'

// Import all query functions
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
} from '@/lib/bigquery/queries/sales'

import {
  getARAging,
  getARSummary,
  getARByBranch,
} from '@/lib/bigquery/queries/finance'

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
  getOpsOverview,
  getOpsNational,
  getOpsNewStarts,
} from '@/lib/bigquery/queries/ops'

import {
  getHRRetention,
  getPeopleOverview,
} from '@/lib/bigquery/queries/hr'

import {
  getTechProductivity,
  getTechProductivitySummary,
} from '@/lib/bigquery/queries/workforce'

import {
  getBranchDetail,
  getBranchDaily,
  getRegionDaily,
  getMarketDaily,
  getBranchOverview,
} from '@/lib/bigquery/queries/branch'

import {
  getExecutiveCommandCenter,
  getKPIDetail,
} from '@/lib/bigquery/queries/executive'

import {
  getAEPipeline,
  getAETracker,
  getTechTickets,
  getTechDispatch,
} from '@/lib/bigquery/queries/ae'

import {
  getMarkets,
  getRegions,
  getOrganizationHierarchy,
} from '@/lib/bigquery/queries/organization'

// Query configuration with page mappings
const QUERY_CONFIG = [
  // Leads
  { id: 'leads-by-pest-type', page: '/leads/type-pest', category: 'leads', fn: () => getLeadsByPestType({ daysBack: 7, limit: 5 }) },
  { id: 'lead-trends', page: '/leads/trends', category: 'leads', fn: () => getLeadTrends({ daysBack: 7 }) },
  { id: 'lead-rankings', page: '/leads/rankings', category: 'leads', fn: () => getLeadRankings({ daysBack: 7, limit: 5 }) },
  { id: 'lead-cancellations', page: '/leads/cancels', category: 'leads', fn: () => getLeadCancellations({ daysBack: 7 }) },
  { id: 'lead-geographic', page: '/leads/geographic', category: 'leads', fn: () => getLeadGeographic({ daysBack: 7, limit: 5 }) },
  { id: 'lead-funnel', page: '/leads/dashboard', category: 'leads', fn: () => getLeadFunnel({ daysBack: 7 }) },
  // Sales
  { id: 'speed-to-install', page: '/sales/speed-to-install', category: 'sales', fn: () => getSpeedToInstall({ startYearMonth: 202401 }) },
  { id: 'sales-today', page: '/sales/today', category: 'sales', fn: () => getSalesToday({}) },
  { id: 'backlog', page: '/sales/backlog', category: 'sales', fn: () => getBacklog({ limit: 5 }) },
  { id: 'canceled-agreements', page: '/sales/canceled-agreements', category: 'sales', fn: () => getCanceledAgreements({ daysBack: 7, limit: 5 }) },
  { id: 'start-rate', page: '/sales/start-rate', category: 'sales', fn: () => getStartRate({ startYearMonth: 202401 }) },
  // Finance
  { id: 'ar-aging', page: '/finance/ar', category: 'finance', fn: () => getARAging({}) },
  { id: 'ar-summary', page: '/finance/ar', category: 'finance', fn: () => getARSummary({}) },
  { id: 'ar-by-branch', page: '/finance/ar', category: 'finance', fn: () => getARByBranch({ limit: 5 }) },
  // Termite
  { id: 'pni-by-branch', page: '/termite/pni', category: 'termite', fn: () => getPNIByBranch({ daysBack: 7, limit: 5 }) },
  { id: 'pni-details', page: '/termite/pni', category: 'termite', fn: () => getPNIDetails({ daysBack: 7, limit: 5 }) },
  { id: 'termite-renewals', page: '/termite/renewals', category: 'termite', fn: () => getTermiteRenewals({ limit: 5 }) },
  { id: 'termite-renewal-summary', page: '/termite/renewals', category: 'termite', fn: () => getTermiteRenewalSummary({}) },
  // SALTI
  { id: 'salti-overview', page: '/salti', category: 'salti', fn: () => getSALTIOverview({ daysBack: 7, limit: 5 }) },
  { id: 'salti-daily-check-in', page: '/salti/daily-check-in', category: 'salti', fn: () => getSALTIDailyCheckIn({ daysBack: 7, limit: 5 }) },
  { id: 'salti-productivity', page: '/salti/productivity', category: 'salti', fn: () => getSALTIProductivity({ daysBack: 7, limit: 5 }) },
  { id: 'salti-proposal-pipeline', page: '/salti/proposal-pipeline', category: 'salti', fn: () => getSALTIProposalPipeline({ daysBack: 7, limit: 5 }) },
  { id: 'salti-weekend-blitz', page: '/salti/weekend-blitz', category: 'salti', fn: () => getSALTIWeekendBlitz({ daysBack: 7, limit: 5 }) },
  { id: 'salti-yoy-trends', page: '/salti/yoy-trends', category: 'salti', fn: () => getSALTIYoYTrends({ daysBack: 90, limit: 6 }) },
  { id: 'salti-funnel-fallout', page: '/salti/funnel-fallout', category: 'salti', fn: () => getSALTIFunnelFallout({ daysBack: 7 }) },
  { id: 'salti-sales-ladders', page: '/salti/sales-ladders', category: 'salti', fn: () => getSALTISalesLadders({ daysBack: 7, limit: 5 }) },
  // Operations
  { id: 'ops-overview', page: '/ops', category: 'ops', fn: () => getOpsOverview({ daysBack: 7 }) },
  { id: 'ops-national', page: '/ops/national', category: 'ops', fn: () => getOpsNational({ daysBack: 7, limit: 5 }) },
  { id: 'ops-new-starts', page: '/ops/new-starts', category: 'ops', fn: () => getOpsNewStarts({ daysBack: 7, limit: 5 }) },
  // HR / People
  { id: 'hr-retention', page: '/hr/retention', category: 'hr', fn: () => getHRRetention({ daysBack: 90, limit: 5 }) },
  { id: 'people-overview', page: '/people', category: 'hr', fn: () => getPeopleOverview({ limit: 5 }) },
  // Workforce
  { id: 'tech-productivity', page: '/workforce/tech-productivity', category: 'workforce', fn: () => getTechProductivity({ daysBack: 7, limit: 5 }) },
  { id: 'tech-productivity-summary', page: '/workforce/tech-productivity', category: 'workforce', fn: () => getTechProductivitySummary({ daysBack: 7 }) },
  // Branch / Region / Market
  { id: 'branch-daily', page: '/branch/daily', category: 'branch', fn: () => getBranchDaily({ daysBack: 7, limit: 5 }) },
  { id: 'region-daily', page: '/region/daily', category: 'branch', fn: () => getRegionDaily({ daysBack: 7, limit: 5 }) },
  { id: 'market-daily', page: '/market/daily', category: 'branch', fn: () => getMarketDaily({ daysBack: 7, limit: 5 }) },
  { id: 'branch-overview', page: '/branch', category: 'branch', fn: () => getBranchOverview({ daysBack: 7, limit: 5 }) },
  // Executive
  { id: 'executive-command-center', page: '/', category: 'executive', fn: () => getExecutiveCommandCenter({ daysBack: 30 }) },
  { id: 'kpi-detail', page: '/kpi/revenue', category: 'executive', fn: () => getKPIDetail({ daysBack: 30, limit: 5 }) },
  // Account Executive / Tech
  { id: 'ae-pipeline', page: '/ae', category: 'ae', fn: () => getAEPipeline({ daysBack: 30, limit: 5 }) },
  { id: 'ae-tracker', page: '/ae', category: 'ae', fn: () => getAETracker({ daysBack: 30, limit: 5 }) },
  { id: 'tech-tickets', page: '/tech/tickets', category: 'ae', fn: () => getTechTickets({ daysBack: 7, limit: 5 }) },
  { id: 'tech-dispatch', page: '/tech/tickets', category: 'ae', fn: () => getTechDispatch({ daysBack: 7, limit: 5 }) },
  // Organization Hierarchy
  { id: 'org-markets', page: '/admin', category: 'organization', fn: () => getMarkets({ limit: 10 }) },
  { id: 'org-regions', page: '/admin', category: 'organization', fn: () => getRegions({ limit: 10 }) },
  { id: 'org-hierarchy', page: '/admin', category: 'organization', fn: () => getOrganizationHierarchy({ limit: 5 }) },
]

export interface QueryHealthResult {
  id: string
  page: string
  category: string
  status: 'ok' | 'error'
  responseTime: number
  rowCount?: number
  sampleData?: Record<string, unknown>[] // First 3 rows of data
  error?: string
  lastRun: string
}

export interface HealthCheckResponse {
  timestamp: string
  connection: {
    status: 'connected' | 'failed'
    projectId: string
    environment: string
    authMethod: 'ADC' | 'service-account'
    responseTime?: number
    error?: string
  }
  queries: QueryHealthResult[]
  summary: {
    total: number
    passed: number
    failed: number
    avgResponseTime: number
  }
}

/**
 * POST /api/bigquery/health-check
 *
 * Run health check on all or selected queries.
 * Body: { queries?: string[] } - optional list of query IDs to test
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const body = await request.json().catch(() => ({}))
  const selectedQueries: string[] | undefined = body.queries

  // Test connection first
  const connectionResult = await bigQueryClient.testConnection()
  const config = bigQueryClient.getConfig()

  const connection = {
    status: connectionResult.connected ? 'connected' as const : 'failed' as const,
    projectId: BIGQUERY_CONFIG.projectId,
    environment: BIGQUERY_CONFIG.environment,
    authMethod: (config.keyFilename ? 'service-account' : 'ADC') as 'ADC' | 'service-account',
    responseTime: connectionResult.responseTime,
    error: connectionResult.error,
  }

  // If connection failed, return early
  if (!connectionResult.connected) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      connection,
      queries: [],
      summary: { total: 0, passed: 0, failed: 0, avgResponseTime: 0 },
    } as HealthCheckResponse, { status: 503 })
  }

  // Filter queries if specific ones requested
  const queriesToRun = selectedQueries
    ? QUERY_CONFIG.filter(q => selectedQueries.includes(q.id))
    : QUERY_CONFIG

  // Run all query health checks in parallel
  const queryResults = await Promise.all(
    queriesToRun.map(async (query) => {
      const queryStart = Date.now()
      try {
        const result = await query.fn()
        const isArray = Array.isArray(result)
        const rowCount = isArray ? result.length : 1
        // Get first 3 rows as sample data (cast through unknown to satisfy TypeScript)
        const sampleData = isArray
          ? (result.slice(0, 3) as unknown as Record<string, unknown>[])
          : [result as unknown as Record<string, unknown>]
        return {
          id: query.id,
          page: query.page,
          category: query.category,
          status: 'ok' as const,
          responseTime: Date.now() - queryStart,
          rowCount,
          sampleData,
          lastRun: new Date().toISOString(),
        }
      } catch (error) {
        return {
          id: query.id,
          page: query.page,
          category: query.category,
          status: 'error' as const,
          responseTime: Date.now() - queryStart,
          error: error instanceof Error ? error.message : 'Unknown error',
          lastRun: new Date().toISOString(),
        }
      }
    })
  )

  const passed = queryResults.filter(r => r.status === 'ok').length
  const failed = queryResults.filter(r => r.status === 'error').length
  const avgResponseTime = queryResults.length > 0
    ? Math.round(queryResults.reduce((sum, r) => sum + r.responseTime, 0) / queryResults.length)
    : 0

  const response: HealthCheckResponse = {
    timestamp: new Date().toISOString(),
    connection,
    queries: queryResults,
    summary: {
      total: queryResults.length,
      passed,
      failed,
      avgResponseTime,
    },
  }

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Response-Time': `${Date.now() - startTime}ms`,
    },
  })
}

/**
 * GET /api/bigquery/health-check
 *
 * Returns the list of available queries for health checking.
 */
export async function GET() {
  return NextResponse.json({
    queries: QUERY_CONFIG.map(q => ({
      id: q.id,
      page: q.page,
      category: q.category,
    })),
    categories: {
      leads: QUERY_CONFIG.filter(q => q.category === 'leads').map(q => q.id),
      sales: QUERY_CONFIG.filter(q => q.category === 'sales').map(q => q.id),
      finance: QUERY_CONFIG.filter(q => q.category === 'finance').map(q => q.id),
      termite: QUERY_CONFIG.filter(q => q.category === 'termite').map(q => q.id),
      salti: QUERY_CONFIG.filter(q => q.category === 'salti').map(q => q.id),
      ops: QUERY_CONFIG.filter(q => q.category === 'ops').map(q => q.id),
      hr: QUERY_CONFIG.filter(q => q.category === 'hr').map(q => q.id),
      workforce: QUERY_CONFIG.filter(q => q.category === 'workforce').map(q => q.id),
      branch: QUERY_CONFIG.filter(q => q.category === 'branch').map(q => q.id),
      executive: QUERY_CONFIG.filter(q => q.category === 'executive').map(q => q.id),
      ae: QUERY_CONFIG.filter(q => q.category === 'ae').map(q => q.id),
      organization: QUERY_CONFIG.filter(q => q.category === 'organization').map(q => q.id),
    },
  })
}
