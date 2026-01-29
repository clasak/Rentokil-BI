/**
 * Run Salesforce Table Discovery
 *
 * This script directly queries BigQuery INFORMATION_SCHEMA to discover
 * all Salesforce-related tables in the production dataset.
 *
 * Usage:
 *   npx tsx scripts/run-salesforce-discovery.ts
 */

import { discoverSalesforceTables, getSalesforceTableSchema } from '../src/lib/bigquery/queries/salesforce-discovery'

async function main() {
  console.log('================================================')
  console.log('🔍 Salesforce Table Discovery')
  console.log('================================================\n')

  console.log('Searching for Salesforce-related tables in BigQuery...\n')
  console.log('Search patterns:')
  console.log('  - %salesforce%')
  console.log('  - %RTXSF%')
  console.log('  - %lead%')
  console.log('  - %opportunity%')
  console.log('  - %quote%')
  console.log('  - %account%')
  console.log('  - %contact%')
  console.log('  - %contract%')
  console.log('  - %proposal%\n')

  try {
    const tables = await discoverSalesforceTables({
      includeEmptyTables: false, // Exclude empty tables
    })

    if (tables.length === 0) {
      console.log('❌ No Salesforce tables found')
      return
    }

    console.log(`✅ Found ${tables.length} Salesforce-related tables\n`)

    // Group by RTXSF status
    const rtxsfTables = tables.filter((t) => t.is_rtxsf)
    const otherTables = tables.filter((t) => !t.is_rtxsf)

    console.log('================================================')
    console.log(`📊 RTXSF Tables (${rtxsfTables.length})`)
    console.log('================================================\n')

    if (rtxsfTables.length > 0) {
      console.table(
        rtxsfTables.map((t) => ({
          Dataset: t.table_schema,
          'Table Name': t.table_name,
          Rows: t.row_count.toLocaleString(),
          'Size (MB)': (t.size_bytes / 1024 / 1024).toFixed(2),
          'Last Modified': t.last_modified,
        }))
      )
    }

    console.log('\n================================================')
    console.log(`📊 Other Salesforce-Related Tables (${otherTables.length})`)
    console.log('================================================\n')

    if (otherTables.length > 0) {
      console.table(
        otherTables.map((t) => ({
          Dataset: t.table_schema,
          'Table Name': t.table_name,
          Rows: t.row_count.toLocaleString(),
          'Size (MB)': (t.size_bytes / 1024 / 1024).toFixed(2),
          'Last Modified': t.last_modified,
        }))
      )
    }

    // Summary statistics
    console.log('\n================================================')
    console.log('📈 Summary Statistics')
    console.log('================================================\n')

    const totalRows = tables.reduce((sum, t) => sum + t.row_count, 0)
    const totalSizeBytes = tables.reduce((sum, t) => sum + t.size_bytes, 0)
    const totalSizeMB = totalSizeBytes / 1024 / 1024
    const totalSizeGB = totalSizeMB / 1024

    console.log(`Total Tables: ${tables.length}`)
    console.log(`Total Rows: ${totalRows.toLocaleString()}`)
    console.log(`Total Size: ${totalSizeGB.toFixed(2)} GB`)
    console.log(`RTXSF Tables: ${rtxsfTables.length}`)
    console.log(`Other Tables: ${otherTables.length}\n`)

    // Highlight top 10 largest tables
    console.log('================================================')
    console.log('🔝 Top 10 Largest Tables')
    console.log('================================================\n')

    const topTables = [...tables]
      .sort((a, b) => b.row_count - a.row_count)
      .slice(0, 10)

    console.table(
      topTables.map((t, idx) => ({
        '#': idx + 1,
        Dataset: t.table_schema,
        'Table Name': t.table_name,
        Rows: t.row_count.toLocaleString(),
        'Size (MB)': (t.size_bytes / 1024 / 1024).toFixed(2),
      }))
    )

    // Show currently integrated tables
    console.log('\n================================================')
    console.log('✅ Currently Integrated Tables (3)')
    console.log('================================================\n')

    const integratedTables = [
      'Raw_RTXSF_Opportunity_Daily',
      'Raw_RTXSF_Quote_Daily',
      'Raw_RTXSF_QuoteLineItem_Daily',
    ]

    integratedTables.forEach((tableName) => {
      const table = tables.find((t) => t.table_name === tableName)
      if (table) {
        console.log(`✓ ${table.table_schema}.${table.table_name}`)
        console.log(`  Rows: ${table.row_count.toLocaleString()}`)
        console.log(`  Size: ${(table.size_bytes / 1024 / 1024).toFixed(2)} MB`)
        console.log(`  Last Modified: ${table.last_modified}\n`)
      } else {
        console.log(`✗ ${tableName} - Not found\n`)
      }
    })

    // Show high-value candidates for Phase 2A
    console.log('================================================')
    console.log('🎯 High-Value Candidates for Phase 2A')
    console.log('================================================\n')

    const candidates = tables.filter(
      (t) =>
        t.is_rtxsf &&
        !integratedTables.includes(t.table_name) &&
        t.row_count > 100 && // Has meaningful data
        (t.table_name.includes('Account') ||
          t.table_name.includes('Contact') ||
          t.table_name.includes('User') ||
          t.table_name.includes('Product') ||
          t.table_name.includes('Pricebook'))
    )

    if (candidates.length > 0) {
      console.log(`Found ${candidates.length} candidate tables:\n`)
      candidates.forEach((t) => {
        console.log(`• ${t.table_schema}.${t.table_name}`)
        console.log(`  Rows: ${t.row_count.toLocaleString()}`)
        console.log(`  Purpose: Account management, service catalog, users\n`)
      })
    } else {
      console.log('No obvious candidates found. May need to explore further.\n')
    }

    // Sample schema for top table (optional - can be slow for large schemas)
    if (topTables.length > 0 && process.argv.includes('--schema')) {
      const topTable = topTables[0]
      console.log('\n================================================')
      console.log(`📋 Sample Schema: ${topTable.table_schema}.${topTable.table_name}`)
      console.log('================================================\n')

      const schema = await getSalesforceTableSchema(
        topTable.table_schema,
        topTable.table_name
      )

      if (schema.length > 0) {
        console.table(
          schema.slice(0, 20).map((col) => ({
            Column: col.column_name,
            Type: col.data_type,
            Nullable: col.is_nullable,
          }))
        )
        if (schema.length > 20) {
          console.log(`\n... and ${schema.length - 20} more columns`)
        }
      }
    }

    console.log('\n================================================')
    console.log('✅ Discovery Complete')
    console.log('================================================\n')

    console.log('Next Steps:')
    console.log('1. Review the discovered tables above')
    console.log('2. Identify 5-10 high-value tables for Phase 2A')
    console.log('3. Run with --schema flag to view column details:')
    console.log('   npx tsx scripts/run-salesforce-discovery.ts --schema')
    console.log('4. Document findings in docs/SALESFORCE-DISCOVERY-REPORT.md\n')
  } catch (error) {
    console.error('\n❌ Discovery failed:', error)
    console.error('\nPossible causes:')
    console.error('- BigQuery authentication not configured')
    console.error('- No access to bidata-sharedus-production')
    console.error('- Network connectivity issues\n')
    process.exit(1)
  }
}

main()
