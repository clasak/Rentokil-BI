#!/usr/bin/env npx tsx
/**
 * Diagnostic Script: Missing Sale Investigation
 *
 * Helps troubleshoot why a sale is not appearing in the sales tracker.
 * Checks data freshness, filters, and data quality issues.
 *
 * Usage: npm run diagnose-sale
 *        Then follow prompts to enter sale details
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../src/lib/bigquery/client'

interface DiagnosticResult {
  issue: string
  details: string
  suggestion: string
}

async function diagnoseMissingSale() {
  console.log('🔍 Sales Tracker Diagnostic Tool\n')

  const PROJECT = BIGQUERY_CONFIG.projectId
  const results: DiagnosticResult[] = []

  // Check 1: Data Freshness
  console.log('1️⃣ Checking data freshness for DR_ContractSales...')
  try {
    const freshnessQuery = `
      SELECT
        MAX(SellDate) as last_sale_date,
        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(SellDate), MINUTE) as minutes_ago,
        COUNT(*) as total_records
      FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
      WHERE SellDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
    `

    const freshnessResult = await bigQueryClient.query<{
      last_sale_date: string
      minutes_ago: number
      total_records: number
    }>(freshnessQuery)

    const freshness = freshnessResult.rows[0]
    const hours = Math.floor(freshness.minutes_ago / 60)
    const minutes = freshness.minutes_ago % 60

    console.log(`   ✓ Last sale in BigQuery: ${freshness.last_sale_date}`)
    console.log(`   ✓ Data age: ${hours}h ${minutes}m ago`)
    console.log(`   ✓ Sales in last 24h: ${freshness.total_records}\n`)

    if (freshness.minutes_ago > 360) { // SLA is 6 hours
      results.push({
        issue: 'Stale Data',
        details: `Data is ${hours}h ${minutes}m old (SLA: 6 hours)`,
        suggestion: 'Wait for next ETL run or contact data team if consistently stale',
      })
    }
  } catch (error) {
    console.error('   ❌ Failed to check data freshness:', error)
  }

  // Check 2: Recent sales without filters
  console.log('2️⃣ Checking recent sales (last 24 hours, all filters removed)...')
  try {
    const recentQuery = `
      WITH AggregatedSales AS (
        SELECT
          customer_name,
          sell_date,
          sales_person_nm,
          assigned_branch_code,
          MIN(sales_id) as sales_id,
          MIN(COALESCE(bill_to_id, location_id)) as pestPacId,
          SUM(COALESCE(contract_value, 0)) as total_contract_value,
          STRING_AGG(DISTINCT COALESCE(product_group, 'Unknown'), ', ') as product_groups
        FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
        WHERE sell_date >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        GROUP BY customer_name, sell_date, sales_person_nm, assigned_branch_code
      )
      SELECT
        FORMAT_TIMESTAMP('%Y-%m-%d %H:%M', sell_date) as sale_time,
        customer_name,
        sales_person_nm,
        assigned_branch_code,
        total_contract_value,
        product_groups,
        CASE WHEN pestPacId IS NOT NULL THEN 'YES' ELSE 'NO' END as has_pestpac_id
      FROM AggregatedSales
      ORDER BY sell_date DESC
      LIMIT 10
    `

    const recentResult = await bigQueryClient.query<{
      sale_time: string
      customer_name: string
      sales_person_nm: string
      assigned_branch_code: string
      total_contract_value: number
      product_groups: string
      has_pestpac_id: string
    }>(recentQuery)

    if (recentResult.rows.length === 0) {
      console.log('   ⚠️  No sales found in last 24 hours\n')
      results.push({
        issue: 'No Recent Sales',
        details: 'No sales recorded in DR_ContractSales in the last 24 hours',
        suggestion: 'Verify the sale was completed in PestPac/source system',
      })
    } else {
      console.log(`   ✓ Found ${recentResult.rows.length} recent sales:\n`)
      recentResult.rows.forEach((sale, idx) => {
        console.log(`   ${idx + 1}. ${sale.sale_time}`)
        console.log(`      Customer: ${sale.customer_name}`)
        console.log(`      Sales Person: ${sale.sales_person_nm}`)
        console.log(`      Branch: ${sale.assigned_branch_code}`)
        console.log(`      Value: $${sale.total_contract_value.toFixed(2)}`)
        console.log(`      Products: ${sale.product_groups}`)
        console.log(`      Has PestPac ID: ${sale.has_pestpac_id}`)
        console.log()
      })
    }
  } catch (error) {
    console.error('   ❌ Failed to query recent sales:', error)
  }

  // Check 3: Sales missing PestPac IDs (won't show as "sales" in tracker)
  console.log('3️⃣ Checking for sales without PestPac IDs (these won\'t appear in Sales tab)...')
  try {
    const missingIdQuery = `
      SELECT
        COUNT(*) as missing_id_count,
        STRING_AGG(DISTINCT sales_person_nm, ', ' LIMIT 5) as affected_sales_people
      FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
      WHERE sell_date >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        AND bill_to_id IS NULL
        AND location_id IS NULL
    `

    const missingIdResult = await bigQueryClient.query<{
      missing_id_count: number
      affected_sales_people: string
    }>(missingIdQuery)

    const missingIds = missingIdResult.rows[0]
    if (missingIds.missing_id_count > 0) {
      console.log(`   ⚠️  ${missingIds.missing_id_count} sales in last 7 days have no PestPac ID`)
      console.log(`   ⚠️  Affected sales people: ${missingIds.affected_sales_people}\n`)

      results.push({
        issue: 'Missing PestPac ID',
        details: `${missingIds.missing_id_count} sales lack bill_to_id and location_id`,
        suggestion: 'These sales appear in Proposals tab but NOT in Sales tab. Verify PestPac customer creation.',
      })
    } else {
      console.log('   ✓ All recent sales have PestPac IDs\n')
    }
  } catch (error) {
    console.error('   ❌ Failed to check for missing IDs:', error)
  }

  // Check 4: Common filter issues
  console.log('4️⃣ Checking common filtering issues...')
  try {
    const filterQuery = `
      SELECT
        EXTRACT(YEAR FROM sell_date) as sale_year,
        EXTRACT(MONTH FROM sell_date) as sale_month,
        COUNT(*) as sale_count
      FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
      WHERE sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 60 DAY)
      GROUP BY sale_year, sale_month
      ORDER BY sale_year DESC, sale_month DESC
    `

    const filterResult = await bigQueryClient.query<{
      sale_year: number
      sale_month: number
      sale_count: number
    }>(filterQuery)

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    console.log('   Recent sales by month:')
    filterResult.rows.forEach(row => {
      const isCurrent = row.sale_year === currentYear && row.sale_month === currentMonth
      const marker = isCurrent ? '👉' : '  '
      console.log(`   ${marker} ${row.sale_year}-${String(row.sale_month).padStart(2, '0')}: ${row.sale_count} sales`)
    })
    console.log()

    const currentMonthSales = filterResult.rows.find(
      row => row.sale_year === currentYear && row.sale_month === currentMonth
    )

    if (!currentMonthSales) {
      results.push({
        issue: 'No Sales in Current Month',
        details: `No sales found for ${currentYear}-${String(currentMonth).padStart(2, '0')}`,
        suggestion: 'If tracker is filtered to current month, no results will show. Check date filter.',
      })
    }
  } catch (error) {
    console.error('   ❌ Failed to analyze filters:', error)
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 DIAGNOSTIC SUMMARY\n')

  if (results.length === 0) {
    console.log('✅ No issues detected. Possible causes:')
    console.log('   • Sale is filtered out by date/month selector')
    console.log('   • Sale is filtered out by sales person name')
    console.log('   • Sale name format mismatch (check spelling)\n')
  } else {
    console.log('⚠️  Issues detected:\n')
    results.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.issue}`)
      console.log(`   Details: ${result.details}`)
      console.log(`   → ${result.suggestion}\n`)
    })
  }

  console.log('💡 Common Solutions:')
  console.log('   • Remove date/month filters to see all sales')
  console.log('   • Check sales person name spelling (case-insensitive)')
  console.log('   • Sales without PestPac ID appear only in Proposals tab')
  console.log('   • Wait 6 hours for ETL if sale just happened')
  console.log('   • Refresh browser (Ctrl+R) to clear cache\n')
}

// Run diagnostics
diagnoseMissingSale().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
