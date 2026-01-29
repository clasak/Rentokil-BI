/**
 * Organization Hierarchy API Route
 *
 * Returns all NA markets, regions, and branches from BigQuery.
 * Uses the verified S2.VwUnf_Branch table via query functions.
 *
 * FIXED: Changed from S0_TMX.tmx_employee to S2.VwUnf_Branch
 * to ensure consistency with organization query functions and proper hierarchy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOrganizationHierarchy } from '@/lib/bigquery/queries/organization'

/**
 * GET /api/organization/hierarchy
 *
 * Returns full organization hierarchy: markets, regions, branches
 * Query params:
 *   - includeAll: boolean - include inactive branches (default: false)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const includeAll = searchParams.get('includeAll') === 'true'

  try {
    // Fetch hierarchy using verified query functions
    const hierarchy = await getOrganizationHierarchy({ includeInactive: includeAll })

    const response = {
      success: true,
      data: {
        markets: hierarchy.markets,
        regions: hierarchy.regions,
        branches: hierarchy.branches,
      },
      counts: {
        markets: hierarchy.markets.length,
        regions: hierarchy.regions.length,
        branches: hierarchy.branches.length,
      },
      meta: {
        includeAll,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        source: 'S2.VwUnf_Branch',
      },
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', // Cache for 5 min
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    })
  } catch (error) {
    console.error('[Organization Hierarchy] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
