import { NextRequest, NextResponse } from 'next/server'
import { calculateKPIValues, calculateHierarchicalKPIValues, getKPIContributionBreakdown } from '@/lib/kpi-calculations'
import { KPI_DICTIONARY, TOP_10_KPIS } from '@/lib/kpis'
import { getUserById } from '@/lib/data'
import type { Role } from '@/types'
import type { HierarchicalKPIResult, SubordinateKPIResult } from '@/types/hierarchy'

// Valid roles for input validation
const VALID_ROLES: Role[] = ['exec', 'market_director', 'market_sales_director', 'region_director', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician']

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
  aggregationType?: string
}

interface KPIsResponse {
  success: boolean
  timestamp: string
  role: Role
  kpis: KPIResponse[]
  count: number
  top10_only: boolean
}

interface HierarchicalKPIsResponse {
  success: boolean
  timestamp: string
  role: Role
  userId?: string
  level: {
    level: string
    id: string
    name: string
    entityType: string
  }
  kpis: KPIResponse[]
  subordinates?: {
    id: string
    name: string
    type: string
    role?: string
    kpis: KPIResponse[]
    contributionPercent: number
    hasSubordinates: boolean
    subordinateCount?: number
  }[]
  count: number
}

/**
 * Helper to convert KPI value to response format
 */
function formatKPIResponse(
  slug: string,
  kpiValue: { value: number; target?: number; trend: number[]; delta: number; status: string },
  aggregationType?: string
): KPIResponse | null {
  const kpiDef = KPI_DICTIONARY.find(k => k.slug === slug)
  if (!kpiDef) return null

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

  return {
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
    aggregationType,
  }
}

/**
 * GET /api/kpis
 * Returns all KPI values for the Tommy agent and dashboards
 *
 * Query params:
 * - role: Role to filter data (default: 'exec')
 * - userId: User ID for role-based filtering
 * - top10: If 'true', only return TOP_10_KPIS
 * - hierarchical: If 'true', return hierarchical data with subordinate breakdown
 * - includeSubordinates: If 'true' with hierarchical, include subordinate KPIs
 */
export async function GET(request: NextRequest): Promise<NextResponse<KPIsResponse | HierarchicalKPIsResponse>> {
  const searchParams = request.nextUrl.searchParams
  const roleParam = searchParams.get('role') || 'exec'
  const userId = searchParams.get('userId') || undefined
  const top10Only = searchParams.get('top10') === 'true'
  const hierarchical = searchParams.get('hierarchical') === 'true'
  const includeSubordinates = searchParams.get('includeSubordinates') !== 'false'

  // Validate role parameter
  if (!VALID_ROLES.includes(roleParam as Role)) {
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        role: 'exec' as Role,
        kpis: [],
        count: 0,
        top10_only: top10Only,
        error: 'Invalid role parameter',
      } as KPIsResponse & { error: string },
      { status: 400 }
    )
  }
  const role = roleParam as Role

  // Validate userId exists if provided
  if (userId && !getUserById(userId)) {
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        role,
        kpis: [],
        count: 0,
        top10_only: top10Only,
        error: 'User not found',
      } as KPIsResponse & { error: string },
      { status: 404 }
    )
  }

  try {
    // Hierarchical mode - return cascading KPI data with subordinate breakdown
    if (hierarchical && userId) {
      const kpiSlugs = top10Only ? TOP_10_KPIS : undefined
      const hierarchicalResult = calculateHierarchicalKPIValues(role, userId, {
        includeSubordinates,
        kpiSlugs,
      })

      // Format KPIs for response
      const kpis: KPIResponse[] = hierarchicalResult.kpis
        .map(kpi => formatKPIResponse(kpi.slug, kpi, kpi.aggregationType))
        .filter((k): k is KPIResponse => k !== null)

      // Format subordinates
      const subordinates = hierarchicalResult.subordinates?.map(sub => ({
        id: sub.subordinateId,
        name: sub.subordinateName,
        type: sub.subordinateType,
        role: sub.subordinateRole,
        kpis: sub.kpis
          .map(kpi => formatKPIResponse(kpi.slug, kpi, kpi.aggregationType))
          .filter((k): k is KPIResponse => k !== null),
        contributionPercent: sub.contributionPercent,
        hasSubordinates: sub.hasSubordinates,
        subordinateCount: sub.subordinateCount,
      }))

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        role,
        userId,
        level: hierarchicalResult.level,
        kpis,
        subordinates,
        count: kpis.length,
      })
    }

    // Standard mode - return flat KPI list
    const kpiValues = calculateKPIValues(role, userId)
    const kpis: KPIResponse[] = []

    // Determine which KPIs to return
    const slugsToReturn = top10Only
      ? TOP_10_KPIS
      : Array.from(kpiValues.keys())

    for (const slug of slugsToReturn) {
      const kpiValue = kpiValues.get(slug)
      if (!kpiValue) continue

      const formatted = formatKPIResponse(slug, kpiValue)
      if (formatted) {
        kpis.push(formatted)
      }
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

/**
 * GET /api/kpis/breakdown
 * Get contribution breakdown for a specific KPI across subordinates
 *
 * This is a convenience endpoint - you can also use the hierarchical param on /api/kpis
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { kpiSlug, role, userId } = body as { kpiSlug: string; role: Role; userId: string }

    if (!kpiSlug || !role || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: kpiSlug, role, userId' },
        { status: 400 }
      )
    }

    const breakdown = getKPIContributionBreakdown(kpiSlug, role, userId)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      kpiSlug,
      role,
      userId,
      total: breakdown.total,
      subordinates: breakdown.subordinates,
    })
  } catch (error) {
    console.error('[KPIs API] Breakdown error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to calculate breakdown' },
      { status: 500 }
    )
  }
}
