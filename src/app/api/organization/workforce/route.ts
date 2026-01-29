/**
 * Organization Workforce API
 *
 * Provides organization hierarchy data with workforce breakdown by role.
 *
 * GET /api/organization/workforce
 *   Query params:
 *   - level: 'market' | 'region' | 'branch' (default: 'market')
 *   - market: Filter by market name
 *   - region: Filter by region name
 *   - branch: Filter by branch code
 *   - limit: Max results (default: 50)
 *
 * GET /api/organization/workforce/filters
 *   Returns available filter options (markets, regions for selected market, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getMarketWorkforce,
  getRegionWorkforce,
  getBranchWorkforce,
  getWorkforceHierarchy,
  getWorkforceMarketNames,
  getWorkforceRegionNames,
  getWorkforceBranchNames,
} from '@/lib/bigquery/queries/organization-workforce'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const level = searchParams.get('level') || 'market'
  const market = searchParams.get('market') || undefined
  const region = searchParams.get('region') || undefined
  const branch = searchParams.get('branch') || undefined
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const action = searchParams.get('action') || 'data'

  try {
    // Handle filter requests
    if (action === 'filters') {
      const markets = await getWorkforceMarketNames()

      let regions: string[] = []
      let branches: string[] = []

      if (market) {
        regions = await getWorkforceRegionNames(market)
        if (region) {
          branches = await getWorkforceBranchNames(market, region)
        }
      }

      return NextResponse.json({
        markets,
        regions,
        branches,
      })
    }

    // Handle hierarchy request (all levels)
    if (action === 'hierarchy') {
      const data = await getWorkforceHierarchy({
        marketName: market,
        regionName: region,
        limit,
      })

      return NextResponse.json(data)
    }

    // Handle level-specific data requests
    const options = {
      marketName: market,
      regionName: region,
      branchCode: branch,
      limit,
    }

    let data
    switch (level) {
      case 'region':
        data = await getRegionWorkforce(options)
        break
      case 'branch':
        data = await getBranchWorkforce(options)
        break
      case 'market':
      default:
        data = await getMarketWorkforce(options)
        break
    }

    return NextResponse.json({
      level,
      filters: { market, region, branch },
      count: data.length,
      data,
    })
  } catch (error) {
    console.error('[API] Organization workforce error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch organization workforce data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
