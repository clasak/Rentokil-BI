#!/usr/bin/env tsx

/**
 * BCG_RTD_DB Dataset Validation Script
 *
 * Validates the BCG_RTD_DB dataset in BigQuery for demo stop 8 readiness.
 * Runs 3 validation queries against DR_ContractSales, DR_Leads, and DR_Cancels
 * to verify recent data availability and acceptable response times.
 *
 * Usage:
 *   npx tsx scripts/verify-bcg-rtd.ts
 */

import { BigQueryClient } from '../src/lib/bigquery/client'

// ============================================================================
// Configuration
// ============================================================================

const RESPONSE_TIME_THRESHOLD_MS = 10_000 // 10 seconds = demo risk

interface ValidationQuery {
  table: string
  dateColumn: string
  sql: string
}

const VALIDATION_QUERIES: ValidationQuery[] = [
  {
    table: 'DR_ContractSales',
    dateColumn: 'sell_date',
    sql: `SELECT COUNT(*) as total_rows FROM \`bidata-sharedus-production.BCG_RTD_DB.DR_ContractSales\` WHERE sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)`,
  },
  {
    table: 'DR_Leads',
    dateColumn: 'received_date',
    sql: `SELECT COUNT(*) as total_rows FROM \`bidata-sharedus-production.BCG_RTD_DB.DR_Leads\` WHERE DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)`,
  },
  {
    table: 'DR_Cancels',
    dateColumn: 'CancelDate',
    sql: `SELECT COUNT(*) as total_rows FROM \`bidata-sharedus-production.BCG_RTD_DB.DR_Cancels\` WHERE CancelDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)`,
  },
]

// ============================================================================
// Types
// ============================================================================

interface ValidationResult {
  table: string
  rowCount: number | null
  responseTimeMs: number
  status: 'PASS' | 'FAIL'
  error: string | null
}

// ============================================================================
// Main
// ============================================================================

async function runValidation(): Promise<void> {
  console.log('='.repeat(72))
  console.log('  BCG_RTD_DB Dataset Validation - Demo Stop 8 Readiness')
  console.log('='.repeat(72))
  console.log()
  console.log(`  Project:   bidata-sharedus-production`)
  console.log(`  Dataset:   BCG_RTD_DB`)
  console.log(`  Threshold: ${RESPONSE_TIME_THRESHOLD_MS / 1000}s max response time`)
  console.log(`  Date:      ${new Date().toISOString()}`)
  console.log()

  // Create client targeting production
  const client = new BigQueryClient({
    environment: 'production',
    projectId: 'bidata-sharedus-production',
  })

  const results: ValidationResult[] = []

  for (const query of VALIDATION_QUERIES) {
    process.stdout.write(`  Querying ${query.table}... `)

    const startTime = Date.now()
    let rowCount: number | null = null
    let error: string | null = null

    try {
      const result = await client.query<{ total_rows: number }>(query.sql)
      rowCount = result.rows[0]?.total_rows ?? 0
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    }

    const responseTimeMs = Date.now() - startTime
    const status: 'PASS' | 'FAIL' =
      error !== null || responseTimeMs > RESPONSE_TIME_THRESHOLD_MS ? 'FAIL' : 'PASS'

    results.push({ table: query.table, rowCount, responseTimeMs, status, error })

    if (error) {
      console.log(`ERROR (${responseTimeMs}ms)`)
    } else {
      console.log(`${rowCount?.toLocaleString()} rows (${responseTimeMs}ms) [${status}]`)
    }
  }

  // ========================================================================
  // Report
  // ========================================================================

  console.log()
  console.log('-'.repeat(72))
  console.log('  VALIDATION REPORT')
  console.log('-'.repeat(72))
  console.log()

  // Table header
  const colTable = 'Table'.padEnd(22)
  const colRows = 'Row Count (30d)'.padEnd(18)
  const colTime = 'Response (ms)'.padEnd(16)
  const colStatus = 'Status'
  console.log(`  ${colTable} ${colRows} ${colTime} ${colStatus}`)
  console.log(`  ${'─'.repeat(22)} ${'─'.repeat(18)} ${'─'.repeat(16)} ${'─'.repeat(8)}`)

  for (const r of results) {
    const tbl = r.table.padEnd(22)
    const rows = (r.rowCount !== null ? r.rowCount.toLocaleString() : 'ERROR').padEnd(18)
    const time = `${r.responseTimeMs}`.padEnd(16)
    const status = r.status === 'PASS' ? 'PASS' : 'FAIL'
    console.log(`  ${tbl} ${rows} ${time} ${status}`)
  }

  // Errors detail
  const errors = results.filter((r) => r.error)
  if (errors.length > 0) {
    console.log()
    console.log('  ERRORS:')
    for (const r of errors) {
      console.log(`    ${r.table}: ${r.error}`)
    }
  }

  // Slow queries detail
  const slowQueries = results.filter(
    (r) => r.responseTimeMs > RESPONSE_TIME_THRESHOLD_MS && !r.error
  )
  if (slowQueries.length > 0) {
    console.log()
    console.log('  DEMO RISK - Slow Queries (>10s):')
    for (const r of slowQueries) {
      console.log(
        `    ${r.table}: ${r.responseTimeMs}ms (${(r.responseTimeMs / 1000).toFixed(1)}s)`
      )
    }
  }

  // Summary
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length

  console.log()
  console.log('-'.repeat(72))
  console.log(`  SUMMARY: ${passed}/${results.length} PASSED, ${failed} FAILED`)

  if (failed === 0) {
    console.log('  BCG_RTD_DB is READY for demo stop 8.')
  } else {
    console.log('  BCG_RTD_DB has issues that need attention before demo stop 8.')
  }
  console.log('-'.repeat(72))
  console.log()

  // Exit with error code if any failures
  if (failed > 0) {
    process.exit(1)
  }
}

runValidation().catch((err) => {
  console.error('Fatal error running validation:', err)
  process.exit(2)
})
