/**
 * Organization Data Verification Script
 *
 * Verifies that ALL markets, regions, and branches from BigQuery
 * are correctly fetched and structured for the application.
 */

import {
  getMarkets,
  getRegions,
  getBranches,
  getOrganizationHierarchy,
} from '../src/lib/bigquery/queries/organization'

async function verifyOrganizationData() {
  console.log('🔍 ORGANIZATION DATA VERIFICATION\n')
  console.log('=' + '='.repeat(79))

  try {
    // Fetch all data
    console.log('\n📊 Fetching organization hierarchy from BigQuery...\n')
    const hierarchy = await getOrganizationHierarchy()

    // Markets verification
    console.log('=' + '='.repeat(79))
    console.log('📍 MARKETS VERIFICATION')
    console.log('=' + '='.repeat(79))
    console.log(`Total Markets: ${hierarchy.markets.length}\n`)

    if (hierarchy.markets.length === 0) {
      console.error('❌ ERROR: No markets found!')
    } else {
      console.log('Markets found:')
      hierarchy.markets.forEach((market, index) => {
        console.log(
          `  ${index + 1}. ${market.market_name} (${market.market_code}) - ${market.region_count} regions, ${market.branch_count} branches`
        )
      })
    }

    // Regions verification
    console.log('\n' + '=' + '='.repeat(79))
    console.log('🗂️  REGIONS VERIFICATION')
    console.log('=' + '='.repeat(79))
    console.log(`Total Regions: ${hierarchy.regions.length}\n`)

    if (hierarchy.regions.length === 0) {
      console.error('❌ ERROR: No regions found!')
    } else {
      // Group by market
      const regionsByMarket: Record<string, typeof hierarchy.regions> = {}
      hierarchy.regions.forEach((region) => {
        if (!regionsByMarket[region.market_code]) {
          regionsByMarket[region.market_code] = []
        }
        regionsByMarket[region.market_code].push(region)
      })

      console.log('Regions by market:')
      Object.entries(regionsByMarket).forEach(([marketCode, regions]) => {
        const market = hierarchy.markets.find((m) => m.market_code === marketCode)
        console.log(`\n  ${market?.market_name || marketCode}:`)
        regions.forEach((region) => {
          console.log(
            `    - ${region.region_name} (${region.region_code}) - ${region.branch_count} branches`
          )
        })
      })
    }

    // Branches verification
    console.log('\n' + '=' + '='.repeat(79))
    console.log('🏢 BRANCHES VERIFICATION')
    console.log('=' + '='.repeat(79))
    console.log(`Total Branches: ${hierarchy.branches.length}\n`)

    if (hierarchy.branches.length === 0) {
      console.error('❌ ERROR: No branches found!')
    } else {
      // Group by region
      const branchesByRegion: Record<string, typeof hierarchy.branches> = {}
      hierarchy.branches.forEach((branch) => {
        if (!branchesByRegion[branch.region_code]) {
          branchesByRegion[branch.region_code] = []
        }
        branchesByRegion[branch.region_code].push(branch)
      })

      console.log('Sample branches by region (first 5 regions):')
      Object.entries(branchesByRegion)
        .slice(0, 5)
        .forEach(([regionCode, branches]) => {
          const region = hierarchy.regions.find((r) => r.region_code === regionCode)
          console.log(`\n  ${region?.region_name || regionCode}:`)
          branches.slice(0, 10).forEach((branch) => {
            console.log(
              `    - ${branch.branch_name} (${branch.branch_code}) [${branch.city}, ${branch.state}]`
            )
          })
          if (branches.length > 10) {
            console.log(`    ... and ${branches.length - 10} more branches`)
          }
        })
    }

    // Data integrity checks
    console.log('\n' + '=' + '='.repeat(79))
    console.log('✅ DATA INTEGRITY CHECKS')
    console.log('=' + '='.repeat(79))

    // Check 1: All regions belong to valid markets
    const validMarketCodes = new Set(hierarchy.markets.map((m) => m.market_code))
    const orphanedRegions = hierarchy.regions.filter(
      (r) => !validMarketCodes.has(r.market_code)
    )

    if (orphanedRegions.length > 0) {
      console.log(
        `\n❌ Found ${orphanedRegions.length} regions with invalid market codes:`
      )
      orphanedRegions.forEach((r) => {
        console.log(`  - ${r.region_name} references market code: ${r.market_code}`)
      })
    } else {
      console.log('\n✅ All regions have valid market codes')
    }

    // Check 2: All branches belong to valid regions
    const validRegionCodes = new Set(hierarchy.regions.map((r) => r.region_code))
    const orphanedBranches = hierarchy.branches.filter(
      (b) => !validRegionCodes.has(b.region_code)
    )

    if (orphanedBranches.length > 0) {
      console.log(
        `\n❌ Found ${orphanedBranches.length} branches with invalid region codes:`
      )
      orphanedBranches.slice(0, 10).forEach((b) => {
        console.log(`  - ${b.branch_name} references region code: ${b.region_code}`)
      })
      if (orphanedBranches.length > 10) {
        console.log(`  ... and ${orphanedBranches.length - 10} more`)
      }
    } else {
      console.log('✅ All branches have valid region codes')
    }

    // Check 3: Empty or null values
    const emptyMarkets = hierarchy.markets.filter(
      (m) => !m.market_code || !m.market_name || m.market_code.trim() === ''
    )
    const emptyRegions = hierarchy.regions.filter(
      (r) => !r.region_code || !r.region_name || r.region_code.trim() === ''
    )
    const emptyBranches = hierarchy.branches.filter(
      (b) => !b.branch_code || !b.branch_name || b.branch_code.trim() === ''
    )

    if (emptyMarkets.length > 0) {
      console.log(`\n⚠️  Found ${emptyMarkets.length} markets with empty codes/names`)
    } else {
      console.log('✅ No markets with empty codes/names')
    }

    if (emptyRegions.length > 0) {
      console.log(`\n⚠️  Found ${emptyRegions.length} regions with empty codes/names`)
    } else {
      console.log('✅ No regions with empty codes/names')
    }

    if (emptyBranches.length > 0) {
      console.log(`\n⚠️  Found ${emptyBranches.length} branches with empty codes/names`)
    } else {
      console.log('✅ No branches with empty codes/names')
    }

    // Summary
    console.log('\n' + '=' + '='.repeat(79))
    console.log('📋 SUMMARY')
    console.log('=' + '='.repeat(79))
    console.log(`Total Markets:  ${hierarchy.markets.length}`)
    console.log(`Total Regions:  ${hierarchy.regions.length}`)
    console.log(`Total Branches: ${hierarchy.branches.length}`)
    console.log(
      `\nAverage branches per market: ${(hierarchy.branches.length / hierarchy.markets.length).toFixed(1)}`
    )
    console.log(
      `Average branches per region: ${(hierarchy.branches.length / hierarchy.regions.length).toFixed(1)}`
    )

    const hasIssues =
      hierarchy.markets.length === 0 ||
      hierarchy.regions.length === 0 ||
      hierarchy.branches.length === 0 ||
      orphanedRegions.length > 0 ||
      orphanedBranches.length > 0

    if (hasIssues) {
      console.log('\n❌ VERIFICATION FAILED - Issues detected!')
      process.exit(1)
    } else {
      console.log('\n✅ VERIFICATION PASSED - All organization data is correct!')
      process.exit(0)
    }
  } catch (error) {
    console.error('\n❌ ERROR during verification:')
    console.error(error)
    process.exit(1)
  }
}

// Run verification
verifyOrganizationData()
