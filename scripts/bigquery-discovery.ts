/**
 * BigQuery Discovery Script
 *
 * Run with: npx tsx scripts/bigquery-discovery.ts
 *
 * This script queries BigQuery to fill in missing metrics:
 * - Column counts per table
 * - Row counts per table
 * - Storage sizes
 * - Dataset metadata
 */

import { BigQuery } from '@google-cloud/bigquery'

const PROJECT_ID = 'bidata-sharedus-production'

async function main() {
  console.log('BigQuery Discovery Script')
  console.log('='.repeat(60))
  console.log(`Project: ${PROJECT_ID}`)
  console.log('')

  const bigquery = new BigQuery({ projectId: PROJECT_ID })

  try {
    // Test connection
    console.log('Testing connection...')
    const [datasets] = await bigquery.getDatasets({ maxResults: 5 })
    console.log(`Connected! Found ${datasets.length} datasets (showing first 5)`)
    console.log('')

    // Get dataset count
    console.log('Counting all datasets...')
    const [allDatasets] = await bigquery.getDatasets()
    console.log(`Total Datasets: ${allDatasets.length}`)
    console.log('')

    // Get table counts per dataset
    console.log('Getting table counts per dataset...')
    console.log('-'.repeat(60))

    const datasetStats: { name: string; tables: number; views: number }[] = []

    for (const ds of allDatasets.slice(0, 20)) {
      // Limit to first 20 for speed
      try {
        const [tables] = await bigquery.dataset(ds.id!).getTables()
        const tableCount = tables.filter((t) => t.metadata?.type === 'TABLE').length
        const viewCount = tables.filter((t) => t.metadata?.type === 'VIEW').length
        datasetStats.push({ name: ds.id!, tables: tableCount, views: viewCount })
        console.log(`  ${ds.id}: ${tableCount} tables, ${viewCount} views`)
      } catch (err) {
        console.log(`  ${ds.id}: (access denied)`)
      }
    }

    console.log('')
    console.log('Top 10 Datasets by Table Count:')
    console.log('-'.repeat(60))
    datasetStats
      .sort((a, b) => b.tables - a.tables)
      .slice(0, 10)
      .forEach((ds, i) => {
        console.log(`  ${i + 1}. ${ds.name}: ${ds.tables} tables, ${ds.views} views`)
      })

    // Get row counts for key tables
    console.log('')
    console.log('Row Counts for Key Tables:')
    console.log('-'.repeat(60))

    const keyTables = [
      'S0_TMX.tmx_lead',
      'S0_TMX.tmx_lead_activity_fact',
      'S0_TMX.Inspections',
      'S0_TMX.tmx_sa_item',
      'S0_TMX.Employees_Main',
      'S0_TMX.tmx_employee',
      'S0_TMX.tmx_business_unit',
      'W3_Contract_Checker.T0_unf_Contract_All',
      'S4.Fact_Leads_Acc_Daily_Dtls_Snp',
      'S4.Dim_Branch_BranchID_NA_T1_Vw',
      'S0.raw_RNA_PNIDetails_Daily',
    ]

    for (const table of keyTables) {
      try {
        const [dataset, tableName] = table.split('.')
        const [metadata] = await bigquery.dataset(dataset).table(tableName).getMetadata()
        const rows = metadata.numRows ? Number(metadata.numRows).toLocaleString() : 'N/A'
        const bytes = metadata.numBytes
          ? `${(Number(metadata.numBytes) / 1024 / 1024 / 1024).toFixed(2)} GB`
          : 'N/A'
        const cols = metadata.schema?.fields?.length || 'N/A'
        console.log(`  ${table}:`)
        console.log(`    Rows: ${rows}, Size: ${bytes}, Columns: ${cols}`)
      } catch (err) {
        console.log(`  ${table}: (error accessing)`)
      }
    }

    // Get storage summary using INFORMATION_SCHEMA
    console.log('')
    console.log('Storage Summary (via INFORMATION_SCHEMA):')
    console.log('-'.repeat(60))

    try {
      const [rows] = await bigquery.query({
        query: `
          SELECT
            table_schema as dataset,
            COUNT(*) as table_count,
            SUM(CAST(row_count as INT64)) as total_rows,
            ROUND(SUM(size_bytes) / 1024 / 1024 / 1024, 2) as size_gb
          FROM \`${PROJECT_ID}.region-us.INFORMATION_SCHEMA.TABLE_STORAGE\`
          GROUP BY table_schema
          ORDER BY size_gb DESC
          LIMIT 15
        `,
      })

      console.log('  Dataset | Tables | Rows | Size (GB)')
      console.log('  ' + '-'.repeat(50))
      for (const row of rows) {
        const r = row as { dataset: string; table_count: number; total_rows: number; size_gb: number }
        console.log(
          `  ${r.dataset.padEnd(20)} | ${String(r.table_count).padStart(6)} | ${String(r.total_rows?.toLocaleString() || 'N/A').padStart(15)} | ${r.size_gb}`
        )
      }
    } catch (err) {
      console.log('  (INFORMATION_SCHEMA query failed - may need different permissions)')
    }

    console.log('')
    console.log('Discovery complete!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
