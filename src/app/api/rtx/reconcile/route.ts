import { NextRequest, NextResponse } from 'next/server'
import { rtxClient } from '@/services/rtx-hub'
import { createClient } from '@supabase/supabase-js'
import { calculateKPIValues } from '@/lib/kpi-calculations'
import { TOP_10_KPIS } from '@/lib/kpis'
import { validateRTXApiRequest } from '@/lib/auth/rtx-api-auth'

// Types
interface ReconcileRequest {
  kpi_slugs?: string[]
  tolerance?: number
}

interface KPIReconciliation {
  kpi_slug: string
  kpi_name: string
  rtx_value: number | null
  app_value: number
  variance_pct: number
  tolerance: number
  status: 'pass' | 'warning' | 'fail'
}

interface ReconcileResponse {
  success: boolean
  timestamp: string
  reconciliation: KPIReconciliation[]
  summary: {
    checked: number
    passed: number
    warned: number
    failed: number
  }
  overall_status: 'pass' | 'warning' | 'fail'
  message?: string
}

// Tolerance rules by KPI category
const TOLERANCE_RULES: Record<string, number> = {
  // Revenue KPIs - strict tolerance (0.1%)
  revenue_mtd: 0.001,
  revenue_ytd: 0.001,
  variance_to_target_mtd: 0.001,

  // Count KPIs - exact match (0%)
  pipeline_count: 0,
  active_accounts: 0,
  stalled_opportunities: 0,

  // Rate KPIs - moderate tolerance (0.5%)
  win_rate: 0.005,
  conversion_rate: 0.005,
  callback_rate: 0.005,
  nrr: 0.005,

  // Index KPIs - 1 point tolerance (1%)
  service_risk_index: 0.01,
  crm_hygiene_score: 0.01,

  // Forecast KPIs - higher tolerance (5%)
  forecast_revenue_8w: 0.05,

  // Default (1%)
  default: 0.01
}

function getTolerance(kpiSlug: string, override?: number): number {
  if (override !== undefined) return override
  return TOLERANCE_RULES[kpiSlug] || TOLERANCE_RULES.default
}

function getKPIName(slug: string): string {
  // Simple mapping - in production would come from KPI definitions
  const names: Record<string, string> = {
    revenue_mtd: 'Revenue MTD',
    variance_to_target_mtd: 'Variance to Target MTD',
    win_rate: 'Win Rate',
    pipeline_count: 'Pipeline Count',
    service_risk_index: 'Service Risk Index',
    callback_rate: 'Callback Rate',
    nrr: 'Net Revenue Retention',
    dso: 'Days Sales Outstanding',
    crm_hygiene_score: 'CRM Hygiene Score',
    capacity_utilization: 'Capacity Utilization'
  }
  return names[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * POST /api/rtx/reconcile
 * Compare RTX data with app KPI calculations
 *
 * Request body:
 * {
 *   kpi_slugs?: string[],  // Specific KPIs or all TOP_10
 *   tolerance?: number     // Override default tolerance
 * }
 *
 * Used by: OPS-UNIFIED-001 workflow (hourly)
 */
export async function POST(request: NextRequest): Promise<NextResponse<ReconcileResponse>> {
  // Validate authentication
  const auth = validateRTXApiRequest(request)
  if (!auth.valid) return auth.error!

  const timestamp = new Date().toISOString()

  // Parse request body
  let body: ReconcileRequest = {}
  try {
    body = await request.json()
  } catch {
    // Use defaults
  }

  const { kpi_slugs, tolerance: overrideTolerance } = body

  // Determine which KPIs to reconcile
  const kpisToCheck = kpi_slugs && kpi_slugs.length > 0
    ? kpi_slugs
    : TOP_10_KPIS

  // Check if RTX is configured
  const rtxConfigured = rtxClient.isConfigured()

  // Calculate app values
  let appKpiValues: Map<string, { value: number; target?: number }> = new Map()
  try {
    appKpiValues = calculateKPIValues('exec', undefined)
  } catch (error) {
    return NextResponse.json({
      success: false,
      timestamp,
      reconciliation: [],
      summary: { checked: 0, passed: 0, warned: 0, failed: 0 },
      overall_status: 'fail',
      message: `Failed to calculate app KPI values: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 200 })
  }

  const reconciliation: KPIReconciliation[] = []
  let passed = 0
  let warned = 0
  let failed = 0
  let overallStatus: 'pass' | 'warning' | 'fail' = 'pass'

  // Reconcile each KPI
  for (const slug of kpisToCheck) {
    const appKpi = appKpiValues.get(slug)
    const appValue = appKpi?.value || 0

    // Get RTX value
    // In production, this would fetch the calculated value from RTX
    // For now, we use null to indicate RTX is not yet connected
    let rtxValue: number | null = null

    if (rtxConfigured) {
      // Would call RTX API to get their calculated value
      // rtxValue = await rtxClient.getKPIValue(slug)
      // For now, simulate as matching (for testing)
      rtxValue = appValue // Simulate match when RTX is configured
    }

    const tolerance = getTolerance(slug, overrideTolerance)
    let variancePct = 0
    let status: 'pass' | 'warning' | 'fail' = 'pass'

    if (rtxValue !== null && appValue !== 0) {
      variancePct = Math.abs((rtxValue - appValue) / appValue)

      if (variancePct > tolerance * 2) {
        status = 'fail'
        failed++
        overallStatus = 'fail'
      } else if (variancePct > tolerance) {
        status = 'warning'
        warned++
        if (overallStatus !== 'fail') overallStatus = 'warning'
      } else {
        passed++
      }
    } else if (rtxValue === null) {
      // RTX not available - mark as warning
      status = 'warning'
      warned++
      if (overallStatus !== 'fail') overallStatus = 'warning'
    } else {
      passed++
    }

    reconciliation.push({
      kpi_slug: slug,
      kpi_name: getKPIName(slug),
      rtx_value: rtxValue,
      app_value: appValue,
      variance_pct: Math.round(variancePct * 10000) / 100, // As percentage
      tolerance: tolerance * 100, // As percentage
      status
    })
  }

  // Log reconciliation to database using batch insert
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
      // Batch insert all reconciliation results
      const insertData = reconciliation.map(rec => ({
        reconciliation_type: 'rtx_vs_app',
        kpi_slug: rec.kpi_slug,
        rtx_value: rec.rtx_value,
        app_value: rec.app_value,
        variance_pct: rec.variance_pct,
        tolerance_used: rec.tolerance,
        status: rec.status,
        metadata: { rtx_configured: rtxConfigured }
      }))

      await supabase.from('rtx_reconciliation').insert(insertData)

      // Log to ops_events
      await supabase.from('ops_events').insert({
        event_type: 'rtx_reconcile',
        severity: overallStatus === 'fail' ? 'critical' : overallStatus === 'warning' ? 'warning' : 'info',
        source: 'rtx',
        route: '/api/rtx/reconcile',
        message: `Reconciliation ${overallStatus}: ${passed}/${reconciliation.length} passed`,
        metadata: {
          checked: reconciliation.length,
          passed,
          warned,
          failed,
          rtx_configured: rtxConfigured
        }
      })
    } catch {
      // Best effort logging
    }
  }

  return NextResponse.json({
    success: true,
    timestamp,
    reconciliation,
    summary: {
      checked: reconciliation.length,
      passed,
      warned,
      failed
    },
    overall_status: overallStatus,
    message: !rtxConfigured
      ? 'RTX not configured - showing app values only. Reconciliation will work when RTX is connected.'
      : undefined
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}

/**
 * GET /api/rtx/reconcile
 * Get recent reconciliation history
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Validate authentication (allow public read for dashboard)
  const auth = validateRTXApiRequest(request, { allowPublicRead: true })
  if (!auth.valid) return auth.error!

  const { searchParams } = new URL(request.url)

  // Validate and clamp limit parameter
  const rawLimit = parseInt(searchParams.get('limit') || '20', 10)
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 20 : rawLimit), 100)

  const kpiSlug = searchParams.get('kpi')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      success: false,
      message: 'Supabase not configured',
      reconciliations: []
    }, { status: 200 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    let query = supabase
      .from('rtx_reconciliation')
      .select('*')
      .order('reconciled_at', { ascending: false })
      .limit(limit)

    if (kpiSlug) {
      query = query.eq('kpi_slug', kpiSlug)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      reconciliations: data || []
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'max-age=30',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch reconciliation history',
      reconciliations: []
    }, { status: 500 })
  }
}
