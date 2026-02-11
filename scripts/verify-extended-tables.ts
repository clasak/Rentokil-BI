#!/usr/bin/env tsx

/**
 * Extended BigQuery Table Verification Script
 *
 * Verifies additional tables beyond the standard verification script.
 * Runs COUNT(*) queries against BigQuery to confirm tables exist and have data.
 *
 * Usage:
 *   npx tsx scripts/verify-extended-tables.ts
 *   npx tsx scripts/verify-extended-tables.ts --environment production
 */

import { bigQueryClient, createBigQueryClient } from '../src/lib/bigquery/client'

const PROJECT_ID = 'bidata-sharedus-production'

interface ExtendedTable {
  dataset: string
  table: string
  label: string
}

const EXTENDED_TABLES: ExtendedTable[] = [
  { dataset: 'S4', table: 'Fact_ContractSales_Txn_Na_Daily_Dtl_Vw', label: 'Contract Sales' },
  { dataset: 'S4', table: 'Fact_ContractBacklog_Txn_Na_Daily_Dtl_Vw', label: 'Backlog' },
  { dataset: 'S4', table: 'Fact_ContractCancels_Txn_Na_Daily_Dtl_Vw', label: 'Cancellations' },
  { dataset: 'S4', table: 'VwUnf_daily_ar', label: 'AR Aging' },
  { dataset: 'S4', table: 'Fact_PNI_Details_Txn_Na_Daily_Dtl_vw', label: 'Termite PNI' },
  { dataset: 'S4', table: 'Fact_TermiteRenewals_Snp_Na_Daily_Agg_Vw', label: 'Renewals' },
  { dataset: 'S0_TMX', table: 'Five9_CallLog_Export', label: 'Call Center' },
  { dataset: 'S0_TMX', table: 'tmx_survey_Qualtrics_V5', label: 'NPS' },
  { dataset: 'S0_TMX', table: 'vfct_gl_activity', label: 'P&L' },
]

interface VerifyResult {
  dataset: string
  table: string
  label: string
  exists: boolean
  rowCount: number | null
  responseTimeMs: number
  error: string | null
}

async function verifyTableWithCount(
  client: typeof bigQueryClient,
  entry: ExtendedTable
): Promise<VerifyResult> {
  const start = Date.now()
  const fullRef = `\`${PROJECT_ID}.${entry.dataset}.${entry.table}\``

  try {
    const sql = `SELECT COUNT(*) as row_count FROM ${fullRef} LIMIT 1`
    const result = await client.query<{ row_count: number }>(sql)
    const elapsed = Date.now() - start
    const rowCount = result.rows[0]?.row_count ?? 0

    return {
      dataset: entry.dataset,
      table: entry.table,
      label: entry.label,
      exists: true,
      rowCount,
      responseTimeMs: elapsed,
      error: null,
    }
  } catch (err) {
    const elapsed = Date.now() - start
    const message = err instanceof Error ? err.message : String(err)

    // Determine if this is a "not found" vs other error
    const isNotFound =
      message.includes('Not found') ||
      message.includes('notFound') ||
      message.includes('does not exist')

    return {
      dataset: entry.dataset,
      table: entry.table,
      label: entry.label,
      exists: false,
      rowCount: null,
      responseTimeMs: elapsed,
      error: isNotFound ? 'Table not found' : message.slice(0, 120),
    }
  }
}

function formatRowCount(count: number | null): string {
  if (count === null) return '-'
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toString()
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length)
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const envIndex = args.indexOf('--environment')
  const customEnv = envIndex !== -1 ? args[envIndex + 1] : null

  const client = customEnv
    ? createBigQueryClient({ environment: customEnv as 'production' | 'staging' | 'dev' })
    : bigQueryClient

  const projectId = client.getProjectId()
  const environment = client.getEnvironment()

  console.log('')
  console.log('='.repeat(90))
  console.log('  Extended BigQuery Table Verification (COUNT(*) queries)')
  console.log('='.repeat(90))
  console.log(`  Project:     ${projectId}`)
  console.log(`  Environment: ${environment}`)
  console.log(`  Tables:      ${EXTENDED_TABLES.length} to verify`)
  console.log('='.repeat(90))
  console.log('')

  // Test connection
  console.log('Testing BigQuery connection...')
  const connectionStatus = await client.testConnection()

  if (!connectionStatus.connected) {
    console.error('')
    console.error('ERROR: Cannot connect to BigQuery!')
    console.error(`  ${connectionStatus.error}`)
    console.error('')
    console.error('Troubleshooting:')
    console.error('  1. Run: gcloud auth application-default login')
    console.error('  2. Check GOOGLE_APPLICATION_CREDENTIALS env var')
    console.error('  3. Verify project ID has BigQuery API enabled')
    process.exit(1)
  }

  console.log(`Connected in ${connectionStatus.responseTime}ms`)
  console.log('')

  // Run verification queries
  console.log('Running COUNT(*) queries against each table...')
  console.log('')

  const results: VerifyResult[] = []

  for (let i = 0; i < EXTENDED_TABLES.length; i++) {
    const entry = EXTENDED_TABLES[i]
    const progress = `[${i + 1}/${EXTENDED_TABLES.length}]`

    // Safe progress output - handle environments where clearLine is not available
    if (process.stdout.clearLine && process.stdout.cursorTo) {
      process.stdout.write(`  ${progress} Querying ${entry.dataset}.${entry.table}...`)
    } else {
      console.log(`  ${progress} Querying ${entry.dataset}.${entry.table}...`)
    }

    const result = await verifyTableWithCount(client, entry)
    results.push(result)

    // Clear progress line if supported
    if (process.stdout.clearLine && process.stdout.cursorTo) {
      process.stdout.clearLine(0)
      process.stdout.cursorTo(0)
    }
  }

  // Print results table
  const header = [
    padRight('#', 3),
    padRight('Table', 52),
    padRight('Label', 16),
    padRight('Exists', 8),
    padLeft('Row Count', 12),
    padLeft('Time (ms)', 10),
  ].join(' | ')

  const separator = '-'.repeat(header.length + 4)

  console.log(separator)
  console.log(`  ${header}`)
  console.log(separator)

  results.forEach((r, idx) => {
    const fullName = `${r.dataset}.${r.table}`
    const existsStr = r.exists ? 'YES' : 'NO'
    const rowStr = formatRowCount(r.rowCount)
    const timeStr = `${r.responseTimeMs}`

    const row = [
      padRight(`${idx + 1}`, 3),
      padRight(fullName, 52),
      padRight(r.label, 16),
      padRight(existsStr, 8),
      padLeft(rowStr, 12),
      padLeft(timeStr, 10),
    ].join(' | ')

    console.log(`  ${row}`)

    if (r.error) {
      console.log(`  ${''.padEnd(3)}   ${''.padEnd(52)}   Error: ${r.error}`)
    }
  })

  console.log(separator)

  // Summary
  const existingCount = results.filter((r) => r.exists).length
  const missingCount = results.length - existingCount
  const totalRows = results.reduce((sum, r) => sum + (r.rowCount ?? 0), 0)
  const avgResponseTime = Math.round(
    results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length
  )

  console.log('')
  console.log('='.repeat(90))
  console.log('  Summary')
  console.log('='.repeat(90))
  console.log(`  Tables found:    ${existingCount}/${results.length}`)
  console.log(`  Tables missing:  ${missingCount}`)
  console.log(`  Total rows:      ${formatRowCount(totalRows)}`)
  console.log(`  Avg query time:  ${avgResponseTime}ms`)
  console.log('')

  if (missingCount > 0) {
    console.log('  Missing tables:')
    results
      .filter((r) => !r.exists)
      .forEach((r) => {
        console.log(`    - ${r.dataset}.${r.table} (${r.label}): ${r.error}`)
      })
    console.log('')
  }

  if (existingCount === results.length) {
    console.log('  All extended tables verified successfully with data.')
  } else if (existingCount > 0) {
    console.log(`  ${existingCount} of ${results.length} tables verified. ${missingCount} need investigation.`)
  } else {
    console.log('  No tables found. Check environment and project configuration.')
  }

  console.log('='.repeat(90))
  console.log('')

  // Exit with error if any tables are missing
  if (missingCount > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('')
  console.error('Verification failed:', error.message)
  if (error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
})
