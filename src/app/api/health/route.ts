import { NextResponse } from 'next/server'
import {
  getMarkets,
  getAccounts,
  getOpportunities,
  getServiceEvents,
  getInvoices,
  getUsers,
  getDataSources,
} from '@/lib/data'
import { calculateKPIValues } from '@/lib/kpi-calculations'
import { TOP_10_KPIS } from '@/lib/kpis'

// Track server start time for uptime calculation
const serverStartTime = Date.now()

interface HealthCheck {
  status: 'ok' | 'warning' | 'error'
  message?: string
  [key: string]: unknown
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime_seconds: number
  checks: {
    synthetic_data: HealthCheck
    kpi_calculations: HealthCheck
    data_sources: HealthCheck
    environment: HealthCheck
  }
  summary: {
    markets: number
    users: number
    accounts: number
    opportunities: number
    service_events: number
    invoices: number
  }
}

/**
 * GET /api/health
 * Primary health check endpoint for monitoring (Timmy agent)
 *
 * Returns overall application health status including:
 * - Synthetic data validation
 * - KPI calculation status
 * - Data source freshness
 * - Environment configuration
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const checks: HealthResponse['checks'] = {
    synthetic_data: { status: 'ok' },
    kpi_calculations: { status: 'ok' },
    data_sources: { status: 'ok' },
    environment: { status: 'ok' },
  }

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  // Check 1: Synthetic Data Validation
  try {
    const markets = getMarkets()
    const users = getUsers()
    const accounts = getAccounts()
    const opportunities = getOpportunities()
    const serviceEvents = getServiceEvents()
    const invoices = getInvoices()

    // Validate expected data volumes (based on CLAUDE.md: ~1,500 accounts, ~2,500 opps, ~12,000 service events)
    const dataValid =
      markets.length >= 5 &&
      users.length >= 50 &&
      accounts.length >= 1000 &&
      opportunities.length >= 1500 &&
      serviceEvents.length >= 5000 &&
      invoices.length >= 1000

    if (dataValid) {
      checks.synthetic_data = {
        status: 'ok',
        markets: markets.length,
        users: users.length,
        accounts: accounts.length,
        opportunities: opportunities.length,
        service_events: serviceEvents.length,
        invoices: invoices.length,
      }
    } else {
      checks.synthetic_data = {
        status: 'warning',
        message: 'Synthetic data volumes below expected thresholds',
        markets: markets.length,
        users: users.length,
        accounts: accounts.length,
        opportunities: opportunities.length,
        service_events: serviceEvents.length,
        invoices: invoices.length,
      }
      overallStatus = 'degraded'
    }
  } catch (error) {
    checks.synthetic_data = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to load synthetic data',
    }
    overallStatus = 'unhealthy'
  }

  // Check 2: KPI Calculations
  try {
    const kpiValues = calculateKPIValues('exec', undefined)
    const top10Computed = TOP_10_KPIS.every(slug => kpiValues.has(slug))
    const totalKpis = kpiValues.size

    if (top10Computed && totalKpis >= 10) {
      checks.kpi_calculations = {
        status: 'ok',
        total_kpis: totalKpis,
        top10_computed: true,
      }
    } else {
      checks.kpi_calculations = {
        status: 'warning',
        message: 'Some KPIs failed to compute',
        total_kpis: totalKpis,
        top10_computed: top10Computed,
        missing: TOP_10_KPIS.filter(slug => !kpiValues.has(slug)),
      }
      overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded'
    }
  } catch (error) {
    checks.kpi_calculations = {
      status: 'error',
      message: error instanceof Error ? error.message : 'KPI calculation failed',
    }
    overallStatus = 'unhealthy'
  }

  // Check 3: Data Sources Status
  try {
    const dataSources = getDataSources()
    const freshSources = dataSources.filter(ds => ds.status === 'fresh').length
    const staleSources = dataSources.filter(ds => ds.status === 'stale').length
    const errorSources = dataSources.filter(ds => ds.status === 'error').length

    if (errorSources > 0) {
      checks.data_sources = {
        status: 'error',
        message: `${errorSources} data source(s) in error state`,
        fresh: freshSources,
        stale: staleSources,
        error: errorSources,
      }
      overallStatus = 'unhealthy'
    } else if (staleSources > 2) {
      checks.data_sources = {
        status: 'warning',
        message: `${staleSources} data source(s) are stale`,
        fresh: freshSources,
        stale: staleSources,
        error: errorSources,
      }
      overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded'
    } else {
      checks.data_sources = {
        status: 'ok',
        fresh: freshSources,
        stale: staleSources,
        error: errorSources,
      }
    }
  } catch (error) {
    checks.data_sources = {
      status: 'warning',
      message: 'Could not verify data sources',
    }
  }

  // Check 4: Environment Configuration
  try {
    const nodeEnv = process.env.NODE_ENV || 'development'
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    checks.environment = {
      status: 'ok',
      node_env: nodeEnv,
      supabase_configured: hasSupabaseUrl && hasSupabaseKey,
      is_production: nodeEnv === 'production',
    }
  } catch (error) {
    checks.environment = {
      status: 'warning',
      message: 'Could not verify environment',
    }
  }

  // Build summary
  const summary = {
    markets: getMarkets().length,
    users: getUsers().length,
    accounts: getAccounts().length,
    opportunities: getOpportunities().length,
    service_events: getServiceEvents().length,
    invoices: getInvoices().length,
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime_seconds: Math.floor((Date.now() - serverStartTime) / 1000),
    checks,
    summary,
  }

  // Return appropriate HTTP status code
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
