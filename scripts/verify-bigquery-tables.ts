#!/usr/bin/env tsx

/**
 * BigQuery Table Verification Script
 *
 * Verifies that all tables referenced in the codebase actually exist
 * in the configured BigQuery environment.
 *
 * Usage:
 *   npx tsx scripts/verify-bigquery-tables.ts
 *   npx tsx scripts/verify-bigquery-tables.ts --environment dev
 */

import { bigQueryClient, createBigQueryClient } from '../src/lib/bigquery/client'

// All tables referenced in query modules
const CRITICAL_TABLES = [
  // Organization (CRITICAL - used by 70+ pages)
  { name: 'S4.Dim_Branch_BranchID_NA_T1_Vw', module: 'organization', priority: 'CRITICAL' },

  // Leads
  { name: 'S4.Fact_Leads_Acc_Daily_Dtls_Snp', module: 'leads', priority: 'HIGH' },

  // SALTI/TMX
  { name: 'S0_TMX.tmx_lead', module: 'salti', priority: 'HIGH' },
  { name: 'S0_TMX.tmx_employee', module: 'hr', priority: 'HIGH' },
  { name: 'S0_TMX.Inspections', module: 'termite', priority: 'MEDIUM' },

  // Sales/Contracts
  { name: 'W3_Contract_Checker.T0_unf_Contract_All', module: 'sales', priority: 'HIGH' },

  // BCG Analytics (596M rows)
  { name: 'BCG_RTD_DB.DR_ContractSales', module: 'bcg-analytics', priority: 'HIGH' },
  { name: 'BCG_RTD_DB.DR_Leads', module: 'bcg-analytics', priority: 'MEDIUM' },
  { name: 'BCG_RTD_DB.DR_Cancels', module: 'bcg-analytics', priority: 'MEDIUM' },
  { name: 'BCG_RTD_DB.DR_TechWorkOrders', module: 'workforce', priority: 'MEDIUM' },
  { name: 'BCG_RTD_DB.DR_PortfolioDaily', module: 'portfolio', priority: 'MEDIUM' },
  { name: 'BCG_RTD_DB.BCG_EmployeePayData_NT', module: 'payroll', priority: 'LOW' },

  // Finance
  { name: 'Reports.VwUnf_dim_ar_detail', module: 'finance', priority: 'HIGH' },

  // P&L
  { name: 'S0_TMX.vfct_gl_activity', module: 'pnl', priority: 'MEDIUM' },

  // Termite
  { name: 'S0.raw_RNA_PNIDetails_Daily', module: 'termite', priority: 'MEDIUM' },

  // Salesforce
  { name: 'S0.Raw_RTXSF_Account', module: 'salesforce', priority: 'MEDIUM' },
  { name: 'S0.Raw_RTXSF_Opportunity', module: 'salesforce', priority: 'MEDIUM' },

  // IRIS/JDE
  { name: 'S1.vw_iris_jde_daily_revenue_detail', module: 'ae', priority: 'LOW' },
]

interface VerificationResult {
  tableName: string
  module: string
  priority: string
  exists: boolean
  error?: string
}

async function verifyTable(
  client: typeof bigQueryClient,
  tableName: string
): Promise<{ exists: boolean; error?: string }> {
  try {
    const [dataset, table] = tableName.split('.')

    if (!dataset || !table) {
      return { exists: false, error: 'Invalid table name format' }
    }

    const exists = await client.tableExists(dataset, table)
    return { exists }
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function verifyAllTables(): Promise<void> {
  const args = process.argv.slice(2)
  const envIndex = args.indexOf('--environment')
  const customEnv = envIndex !== -1 ? args[envIndex + 1] : null

  // Use custom environment if specified
  const client = customEnv
    ? createBigQueryClient({ environment: customEnv as 'production' | 'staging' | 'dev' })
    : bigQueryClient

  const projectId = client.getProjectId()
  const environment = client.getEnvironment()

  console.log('\n🔍 BigQuery Table Verification\n')
  console.log('━'.repeat(80))
  console.log(`📦 Project:     ${projectId}`)
  console.log(`🌍 Environment: ${environment}`)
  console.log(`📊 Tables:      ${CRITICAL_TABLES.length} to verify`)
  console.log('━'.repeat(80))
  console.log('')

  // Test connection first
  console.log('⏳ Testing BigQuery connection...')
  const connectionStatus = await client.testConnection()

  if (!connectionStatus.connected) {
    console.error('❌ Cannot connect to BigQuery!')
    console.error(`   Error: ${connectionStatus.error}`)
    console.log('\n💡 Troubleshooting:')
    console.log('   1. Run: gcloud auth application-default login')
    console.log('   2. Check GOOGLE_APPLICATION_CREDENTIALS env var')
    console.log('   3. Verify project ID has BigQuery API enabled')
    process.exit(1)
  }

  console.log(`✅ Connected (${connectionStatus.responseTime}ms)`)
  console.log(`   Available datasets: ${connectionStatus.datasets?.length || 0}`)
  console.log('')

  // Verify each table
  console.log('⏳ Verifying tables...\n')

  const results: VerificationResult[] = []
  let completedCount = 0

  for (const table of CRITICAL_TABLES) {
    process.stdout.write(
      `   [${++completedCount}/${CRITICAL_TABLES.length}] ${table.name}...`
    )

    const { exists, error } = await verifyTable(client, table.name)

    results.push({
      tableName: table.name,
      module: table.module,
      priority: table.priority,
      exists,
      error,
    })

    // Clear line and rewrite with result
    if (process.stdout.clearLine) {
      process.stdout.clearLine(0)
      process.stdout.cursorTo(0)
    } else {
      process.stdout.write('\n')
    }

    const status = exists ? '✅' : '❌'
    const priorityBadge =
      table.priority === 'CRITICAL'
        ? '🔴'
        : table.priority === 'HIGH'
          ? '🟠'
          : table.priority === 'MEDIUM'
            ? '🟡'
            : '🟢'

    console.log(`${status} ${priorityBadge} ${table.name.padEnd(55)} (${table.module})`)

    if (!exists && error) {
      console.log(`      └─ Error: ${error}`)
    }
  }

  // Summary
  console.log('\n' + '━'.repeat(80))
  console.log('📊 Summary\n')

  const byPriority = {
    CRITICAL: results.filter((r) => r.priority === 'CRITICAL'),
    HIGH: results.filter((r) => r.priority === 'HIGH'),
    MEDIUM: results.filter((r) => r.priority === 'MEDIUM'),
    LOW: results.filter((r) => r.priority === 'LOW'),
  }

  for (const [priority, tables] of Object.entries(byPriority)) {
    const missingCount = tables.filter((t) => !t.exists).length
    const existingCount = tables.length - missingCount
    const icon =
      priority === 'CRITICAL'
        ? '🔴'
        : priority === 'HIGH'
          ? '🟠'
          : priority === 'MEDIUM'
            ? '🟡'
            : '🟢'

    console.log(
      `${icon} ${priority.padEnd(10)} ${existingCount}/${tables.length} exist ${missingCount > 0 ? `(${missingCount} missing)` : ''}`
    )
  }

  const totalMissing = results.filter((r) => !r.exists).length
  const totalExisting = results.length - totalMissing

  console.log('')
  console.log(`📈 Total: ${totalExisting}/${results.length} tables exist`)

  // Missing tables list
  if (totalMissing > 0) {
    console.log('\n' + '━'.repeat(80))
    console.log('❌ Missing Tables\n')

    const missing = results.filter((r) => !r.exists)
    missing.forEach((r) => {
      const priorityBadge =
        r.priority === 'CRITICAL'
          ? '🔴'
          : r.priority === 'HIGH'
            ? '🟠'
            : r.priority === 'MEDIUM'
              ? '🟡'
              : '🟢'
      console.log(`${priorityBadge} ${r.tableName}`)
      console.log(`   Module: ${r.module}`)
      console.log(`   Priority: ${r.priority}`)
      if (r.error) {
        console.log(`   Error: ${r.error}`)
      }
      console.log('')
    })
  }

  // Recommendations
  console.log('━'.repeat(80))
  console.log('💡 Recommendations\n')

  const criticalMissing = results.filter(
    (r) => !r.exists && r.priority === 'CRITICAL'
  ).length
  const highMissing = results.filter(
    (r) => !r.exists && r.priority === 'HIGH'
  ).length

  if (criticalMissing > 0) {
    console.log('🔴 CRITICAL: Organization hierarchy table is missing!')
    console.log('   Action: Check environment configuration in .env.local')
    console.log('   Current: BIGQUERY_ENVIRONMENT=' + environment)
    console.log('')
    console.log('   Try switching environment:')
    console.log('   • npx tsx scripts/verify-bigquery-tables.ts --environment dev')
    console.log('   • npx tsx scripts/verify-bigquery-tables.ts --environment staging')
    console.log('')
  } else if (highMissing > 0) {
    console.log('🟠 HIGH priority tables are missing.')
    console.log('   Action: Verify table names and availability in this environment.')
    console.log('')
  } else if (totalMissing > 0) {
    console.log('🟡 Some medium/low priority tables are missing.')
    console.log('   Impact: Limited - only affects specific dashboards.')
    console.log('')
  } else {
    console.log('✅ All tables verified! Environment is correctly configured.')
    console.log('')
  }

  // Available datasets (for debugging)
  if (connectionStatus.datasets && connectionStatus.datasets.length > 0) {
    console.log('━'.repeat(80))
    console.log('📁 Available Datasets in Project\n')
    connectionStatus.datasets.forEach((dataset) => {
      console.log(`   • ${dataset}`)
    })
    console.log('')
  }

  console.log('━'.repeat(80))
  console.log('')

  // Exit code
  if (criticalMissing > 0 || highMissing > 0) {
    process.exit(1)
  }
}

// Run verification
verifyAllTables().catch((error) => {
  console.error('\n❌ Verification failed:', error.message)
  console.error('\n' + error.stack)
  process.exit(1)
})
