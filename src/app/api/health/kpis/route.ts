import { NextResponse } from 'next/server'
import { calculateKPIValues } from '@/lib/kpi-calculations'
import { TOP_10_KPIS, KPI_DICTIONARY } from '@/lib/kpis'

interface KPIHealthItem {
  slug: string
  name: string
  status: 'ok' | 'warning' | 'critical'
  value: number
  target?: number
  variance_pct?: number
  reason?: string
  computed_at: string
}

interface KPIHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  kpis: KPIHealthItem[]
  summary: {
    total: number
    ok: number
    warning: number
    critical: number
  }
  anomalies: {
    slug: string
    issue: string
    severity: 'warning' | 'critical'
  }[]
}

/**
 * GET /api/health/kpis
 * KPI-specific health check endpoint for Tommy agent
 *
 * Returns status of all KPI calculations including:
 * - Individual KPI status (ok/warning/critical)
 * - Variance from targets
 * - Detected anomalies
 */
export async function GET(): Promise<NextResponse<KPIHealthResponse>> {
  const now = new Date().toISOString()

  try {
    // Calculate all KPIs as executive (full access)
    const kpiValues = calculateKPIValues('exec', undefined)

    const kpis: KPIHealthItem[] = []
    const anomalies: KPIHealthResponse['anomalies'] = []

    let okCount = 0
    let warningCount = 0
    let criticalCount = 0

    // Process TOP_10_KPIS first (priority)
    for (const slug of TOP_10_KPIS) {
      const kpiValue = kpiValues.get(slug)
      const kpiDef = KPI_DICTIONARY.find(k => k.slug === slug)

      if (!kpiValue || !kpiDef) {
        anomalies.push({
          slug,
          issue: 'KPI could not be computed',
          severity: 'critical',
        })
        criticalCount++
        continue
      }

      // Determine status based on thresholds
      let status: 'ok' | 'warning' | 'critical' = 'ok'
      let reason: string | undefined

      const value = kpiValue.value
      const target = kpiValue.target

      // Check if value is within acceptable range
      if (kpiDef.warningThreshold !== undefined && kpiDef.criticalThreshold !== undefined) {
        const warningThreshold = kpiDef.warningThreshold
        const criticalThreshold = kpiDef.criticalThreshold

        if (kpiDef.higherIsBetter) {
          // Higher is better (e.g., revenue, win rate)
          if (value < criticalThreshold) {
            status = 'critical'
            reason = `Value ${value} below critical threshold ${criticalThreshold}`
          } else if (value < warningThreshold) {
            status = 'warning'
            reason = `Value ${value} below warning threshold ${warningThreshold}`
          }
        } else {
          // Lower is better (e.g., callback rate, DSO)
          if (value > criticalThreshold) {
            status = 'critical'
            reason = `Value ${value} above critical threshold ${criticalThreshold}`
          } else if (value > warningThreshold) {
            status = 'warning'
            reason = `Value ${value} above warning threshold ${warningThreshold}`
          }
        }
      }

      // Track variance if target exists
      let variancePct: number | undefined
      if (target && target !== 0) {
        variancePct = ((value - target) / Math.abs(target)) * 100
      }

      // Update counters
      if (status === 'critical') {
        criticalCount++
        anomalies.push({
          slug,
          issue: reason || 'Critical threshold breached',
          severity: 'critical',
        })
      } else if (status === 'warning') {
        warningCount++
        anomalies.push({
          slug,
          issue: reason || 'Warning threshold breached',
          severity: 'warning',
        })
      } else {
        okCount++
      }

      kpis.push({
        slug,
        name: kpiDef.name,
        status,
        value,
        target,
        variance_pct: variancePct,
        reason,
        computed_at: now,
      })
    }

    // Process remaining KPIs
    for (const [slug, kpiValue] of kpiValues) {
      if (TOP_10_KPIS.includes(slug)) continue // Already processed

      const kpiDef = KPI_DICTIONARY.find(k => k.slug === slug)
      if (!kpiDef) continue

      kpis.push({
        slug,
        name: kpiDef.name,
        status: 'ok', // Non-priority KPIs are marked ok if computed
        value: kpiValue.value,
        target: kpiValue.target,
        computed_at: now,
      })
      okCount++
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (criticalCount > 0) {
      overallStatus = 'unhealthy'
    } else if (warningCount > 0) {
      overallStatus = 'degraded'
    }

    const response: KPIHealthResponse = {
      status: overallStatus,
      timestamp: now,
      kpis,
      summary: {
        total: kpis.length,
        ok: okCount,
        warning: warningCount,
        critical: criticalCount,
      },
      anomalies,
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[KPI Health] Error:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: now,
        kpis: [],
        summary: {
          total: 0,
          ok: 0,
          warning: 0,
          critical: 0,
        },
        anomalies: [
          {
            slug: 'system',
            issue: error instanceof Error ? error.message : 'KPI calculation system error',
            severity: 'critical',
          },
        ],
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    )
  }
}
