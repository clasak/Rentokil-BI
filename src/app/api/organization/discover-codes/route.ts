/**
 * API endpoint to discover actual BigQuery market/region/branch codes
 * Use this to find the correct codes to use in preview users
 *
 * GET /api/organization/discover-codes
 */

import { NextResponse } from 'next/server'
import { getMarkets, getRegions, getBranches } from '@/lib/bigquery/queries/organization'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Fetch sample data from each level
    const [markets, regions, branches] = await Promise.all([
      getMarkets({ limit: 10 }),
      getRegions({ limit: 20 }),
      getBranches({ limit: 30 }),
    ])

    // Find a complete hierarchy example (market with region with branch)
    const sampleMarket = markets[0]
    const sampleRegionsInMarket = regions.filter(r => r.market_code === sampleMarket?.market_code)
    const sampleRegion = sampleRegionsInMarket[0]
    const sampleBranchesInRegion = branches.filter(b =>
      b.region_code === sampleRegion?.region_code &&
      b.market_code === sampleMarket?.market_code
    )
    const sampleBranch = sampleBranchesInRegion[0]

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_markets: markets.length,
          total_regions: regions.length,
          total_branches: branches.length,
        },
        recommended_codes: {
          SAMPLE_MARKET: sampleMarket?.market_code || 'NOT_FOUND',
          SAMPLE_MARKET_NAME: sampleMarket?.market_name || 'NOT_FOUND',
          SAMPLE_REGION: sampleRegion?.region_code || 'NOT_FOUND',
          SAMPLE_REGION_NAME: sampleRegion?.region_name || 'NOT_FOUND',
          SAMPLE_BRANCH: sampleBranch?.branch_code || 'NOT_FOUND',
          SAMPLE_BRANCH_NAME: sampleBranch?.branch_name || 'NOT_FOUND',
        },
        sample_hierarchy: sampleBranch ? {
          market: `${sampleMarket.market_code} - ${sampleMarket.market_name}`,
          region: `${sampleRegion.region_code} - ${sampleRegion.region_name}`,
          branch: `${sampleBranch.branch_code} - ${sampleBranch.branch_name} (${sampleBranch.city}, ${sampleBranch.state})`,
        } : null,
        all_markets: markets.map(m => ({
          code: m.market_code,
          name: m.market_name,
          regions: m.region_count,
          branches: m.branch_count,
        })),
        sample_regions: sampleRegionsInMarket.slice(0, 5).map(r => ({
          code: r.region_code,
          name: r.region_name,
          market: r.market_code,
          branches: r.branch_count,
        })),
        sample_branches: sampleBranchesInRegion.slice(0, 5).map(b => ({
          code: b.branch_code,
          name: b.branch_name,
          region: b.region_code,
          market: b.market_code,
          city: b.city,
          state: b.state,
        })),
      },
    })
  } catch (error) {
    console.error('[discover-codes] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
