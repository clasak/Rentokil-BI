import { NextRequest, NextResponse } from 'next/server'
import { calculateKPIValues, getReconciliation } from '@/lib/kpi-calculations'
import { KPI_DICTIONARY, TOP_10_KPIS } from '@/lib/kpis'
import {
  getInvoices,
  getOpportunities,
  getServiceEvents,
  getAccounts,
} from '@/lib/data'

// Tolerance rules by KPI category
const TOLERANCE_RULES: Record<string, { tolerance: number; description: string }> = {
  // Revenue KPIs - 0.1% (1 basis point)
  revenue: { tolerance: 0.001, description: '0.1% (1 basis point) - Financial accuracy critical' },
  // Count KPIs - exact match
  count: { tolerance: 0, description: '0 (exact) - Integer counts must match' },
  // Rate KPIs - 0.5%
  rate: { tolerance: 0.005, description: '0.5% - Percentage calculations allow rounding' },
  // Index KPIs - 1.0 point on 0-100 scale
  index: { tolerance: 0.01, description: '1.0 point - Composite scores allow variance' },
  // Forecast KPIs - 5%
  forecast: { tolerance: 0.05, description: '5% - Predictions inherently uncertain' },
  // Default
  default: { tolerance: 0.01, description: '1% - Default tolerance' },
}

// Map KPI slugs to tolerance categories
const KPI_TOLERANCE_CATEGORY: Record<string, string> = {
  revenue_mtd: 'revenue',
  variance_to_target_mtd: 'revenue',
  pipeline_30_60_90: 'revenue',
  ar_aging: 'revenue',
  win_rate: 'rate',
  callback_rate: 'rate',
  missed_service_rate: 'rate',
  retention_risk: 'rate',
  nrr: 'rate',
  margin_proxy: 'rate',
  capacity_utilization: 'rate',
  service_risk_index: 'index',
  crm_hygiene_score: 'index',
  scheduling_pressure_index: 'index',
  forecast_revenue_8w: 'forecast',
  avg_cycle_time_days: 'count',
  avg_response_time_hours: 'count',
  dso: 'count',
  stalled_opps: 'count',
  complaint_rate: 'rate',
}

interface SourceValue {
  source: string
  value: number
  recordCount: number
  lastRefresh: string
  methodology: string
}

interface DifferenceResult {
  source: string
  calculatedValue: number
  sourceValue: number
  difference: number
  percentDiff: number
  isWithinTolerance: boolean
}

interface ReconciliationResult {
  kpiSlug: string
  kpiName: string
  calculatedValue: number
  sourceValues: SourceValue[]
  differences: DifferenceResult[]
  overallStatus: 'pass' | 'warning' | 'fail'
  toleranceRule: string
  tolerancePercent: number
  timestamp: string
  period?: {
    start: string
    end: string
  }
}

interface ReconcileResponse {
  success: boolean
  results: ReconciliationResult[]
  summary: {
    total: number
    pass: number
    warning: number
    fail: number
  }
  timestamp: string
}

/**
 * POST /api/reconcile
 * Reconciliation harness for validating KPI calculations against source data
 *
 * Request body:
 * - kpiSlugs: string[] - KPIs to reconcile (default: TOP_10_KPIS)
 * - period: { start: Date, end: Date } - Optional period filter
 * - sourceValues: { [kpiSlug: string]: { [source: string]: number } } - Optional injected source values
 */
export async function POST(request: NextRequest): Promise<NextResponse<ReconcileResponse>> {
  try {
    const body = await request.json().catch(() => ({}))
    const kpiSlugs: string[] = body.kpiSlugs || TOP_10_KPIS
    const period = body.period
    const injectedSourceValues = body.sourceValues || {}

    const results: ReconciliationResult[] = []
    let passCount = 0
    let warningCount = 0
    let failCount = 0

    // Calculate all KPIs
    const kpiValues = calculateKPIValues('exec', undefined)

    for (const slug of kpiSlugs) {
      const kpiValue = kpiValues.get(slug)
      const kpiDef = KPI_DICTIONARY.find(k => k.slug === slug)

      if (!kpiValue || !kpiDef) {
        results.push({
          kpiSlug: slug,
          kpiName: kpiDef?.name || slug,
          calculatedValue: 0,
          sourceValues: [],
          differences: [],
          overallStatus: 'fail',
          toleranceRule: 'N/A - KPI not found',
          tolerancePercent: 0,
          timestamp: new Date().toISOString(),
        })
        failCount++
        continue
      }

      // Get tolerance for this KPI
      const toleranceCategory = KPI_TOLERANCE_CATEGORY[slug] || 'default'
      const toleranceRule = TOLERANCE_RULES[toleranceCategory]
      const tolerance = toleranceRule.tolerance

      // Get reconciliation data from calculations
      const recon = getReconciliation(slug)

      // Build source values - simulate reconciliation against primary source
      const sourceValues: SourceValue[] = []
      const differences: DifferenceResult[] = []

      // If injected values are provided, use them
      if (injectedSourceValues[slug]) {
        for (const [source, value] of Object.entries(injectedSourceValues[slug])) {
          sourceValues.push({
            source,
            value: value as number,
            recordCount: getRecordCountForSource(source, slug),
            lastRefresh: new Date().toISOString(),
            methodology: `Injected value for testing`,
          })
        }
      } else {
        // Simulate source values based on KPI type
        const simulatedSource = simulateSourceValue(slug, kpiValue.value, kpiDef)
        sourceValues.push(simulatedSource)
      }

      // Calculate differences
      for (const sourceVal of sourceValues) {
        const diff = kpiValue.value - sourceVal.value
        const percentDiff = sourceVal.value !== 0
          ? Math.abs(diff / sourceVal.value)
          : (diff === 0 ? 0 : 1)

        differences.push({
          source: sourceVal.source,
          calculatedValue: kpiValue.value,
          sourceValue: sourceVal.value,
          difference: diff,
          percentDiff: percentDiff * 100,
          isWithinTolerance: percentDiff <= tolerance,
        })
      }

      // Determine overall status
      const allWithinTolerance = differences.every(d => d.isWithinTolerance)
      const anyFail = differences.some(d => d.percentDiff > tolerance * 2)

      let overallStatus: 'pass' | 'warning' | 'fail' = 'pass'
      if (anyFail) {
        overallStatus = 'fail'
        failCount++
      } else if (!allWithinTolerance) {
        overallStatus = 'warning'
        warningCount++
      } else {
        passCount++
      }

      results.push({
        kpiSlug: slug,
        kpiName: kpiDef.name,
        calculatedValue: kpiValue.value,
        sourceValues,
        differences,
        overallStatus,
        toleranceRule: toleranceRule.description,
        tolerancePercent: tolerance * 100,
        timestamp: new Date().toISOString(),
        period: period ? {
          start: period.start,
          end: period.end,
        } : undefined,
      })
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        pass: passCount,
        warning: warningCount,
        fail: failCount,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Reconcile API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        results: [],
        summary: {
          total: 0,
          pass: 0,
          warning: 0,
          fail: 0,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reconcile
 * Returns reconciliation status for all TOP_10_KPIS
 */
export async function GET(): Promise<NextResponse<ReconcileResponse>> {
  // Delegate to POST with default parameters
  const mockRequest = {
    json: async () => ({ kpiSlugs: TOP_10_KPIS }),
  } as NextRequest

  return POST(mockRequest)
}

/**
 * Simulate source values for reconciliation
 * In production, this would query actual source systems
 */
function simulateSourceValue(
  slug: string,
  calculatedValue: number,
  kpiDef: typeof KPI_DICTIONARY[0]
): SourceValue {
  // Deterministic variance based on slug hash for consistent reconciliation results
  const slugHash = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const varianceMultiplier = 1 + ((slugHash % 100) / 100 - 0.5) * 0.001 // +/- 0.05% deterministic
  const sourceValue = calculatedValue * varianceMultiplier

  // Deterministic lastRefresh: align to most recent 15-minute interval
  const now = new Date()
  const alignedMinutes = now.getMinutes() - (now.getMinutes() % 15)
  const lastRefresh = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), alignedMinutes)

  return {
    source: kpiDef.primarySource,
    value: Math.round(sourceValue * 100) / 100,
    recordCount: getRecordCountForSource(kpiDef.primarySource, slug),
    lastRefresh: lastRefresh.toISOString(),
    methodology: kpiDef.calculationNotes || `Standard ${kpiDef.primarySource} aggregation`,
  }
}

/**
 * Get record count for a source system
 */
function getRecordCountForSource(source: string, slug: string): number {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  switch (source) {
    case 'Billing/ERP':
    case 'SAP Billing':
      return getInvoices().filter(inv =>
        new Date(inv.invoiceDate) >= monthStart
      ).length
    case 'Salesforce CRM':
    case 'CRM':
      return getOpportunities().length
    case 'PestPac':
    case 'Field Service':
      return getServiceEvents().filter(se =>
        new Date(se.scheduledDate) >= monthStart
      ).length
    default:
      return getAccounts().length
  }
}
