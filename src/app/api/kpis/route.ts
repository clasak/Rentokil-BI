import { NextRequest, NextResponse } from 'next/server'
import { calculateKPIValues } from '@/lib/kpi-calculations'
import { KPI_DICTIONARY, TOP_10_KPIS } from '@/lib/kpis'
import type { Role } from '@/types'

interface KPIResponse {
  slug: string
  name: string
  category: string
  value: number
  target?: number
  variance?: number
  variance_pct?: number
  status: 'good' | 'warning' | 'critical' | 'neutral'
  trend?: number[]
  delta?: number
  higherIsBetter: boolean
  format: string
}

interface KPIsResponse {
  success: boolean
  timestamp: string
  role: Role
  kpis: KPIResponse[]
  count: number
  top10_only: boolean
}

/**
 * GET /api/kpis
 * Returns all KPI values for the Tommy agent and dashboards
 *
 * Query params:
 * - role: Role to filter data (default: 'exec')
 * - userId: User ID for role-based filtering
 * - top10: If 'true', only return TOP_10_KPIS
 */
export async function GET(request: NextRequest): Promise<NextResponse<KPIsResponse>> {
  const searchParams = request.nextUrl.searchParams
  const role = (searchParams.get('role') as Role) || 'exec'
  const userId = searchParams.get('userId') || undefined
  const top10Only = searchParams.get('top10') === 'true'

  try {
    // Calculate all KPIs with role-based filtering
    const kpiValues = calculateKPIValues(role, userId)

    const kpis: KPIResponse[] = []

    // Determine which KPIs to return
    const slugsToReturn = top10Only
      ? TOP_10_KPIS
      : Array.from(kpiValues.keys())

    for (const slug of slugsToReturn) {
      const kpiValue = kpiValues.get(slug)
      const kpiDef = KPI_DICTIONARY.find(k => k.slug === slug)

      if (!kpiValue || !kpiDef) continue

      // Calculate variance
      let variance: number | undefined
      let variancePct: number | undefined
      if (kpiValue.target && kpiValue.target !== 0) {
        variance = kpiValue.value - kpiValue.target
        variancePct = (variance / Math.abs(kpiValue.target)) * 100
      }

      // Determine status
      let status: 'good' | 'warning' | 'critical' | 'neutral' = 'neutral'
      if (kpiDef.warningThreshold !== undefined && kpiDef.criticalThreshold !== undefined) {
        if (kpiDef.higherIsBetter) {
          if (kpiValue.value < kpiDef.criticalThreshold) {
            status = 'critical'
          } else if (kpiValue.value < kpiDef.warningThreshold) {
            status = 'warning'
          } else {
            status = 'good'
          }
        } else {
          if (kpiValue.value > kpiDef.criticalThreshold) {
            status = 'critical'
          } else if (kpiValue.value > kpiDef.warningThreshold) {
            status = 'warning'
          } else {
            status = 'good'
          }
        }
      }

      kpis.push({
        slug,
        name: kpiDef.name,
        category: kpiDef.category,
        value: kpiValue.value,
        target: kpiValue.target,
        variance,
        variance_pct: variancePct,
        status,
        trend: kpiValue.trend,
        delta: kpiValue.delta,
        higherIsBetter: kpiDef.higherIsBetter,
        format: kpiDef.format,
      })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      role,
      kpis,
      count: kpis.length,
      top10_only: top10Only,
    })
  } catch (error) {
    console.error('[KPIs API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        role,
        kpis: [],
        count: 0,
        top10_only: top10Only,
      },
      { status: 500 }
    )
  }
}
