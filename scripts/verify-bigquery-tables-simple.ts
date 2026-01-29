#!/usr/bin/env tsx

/**
 * BigQuery Table Verification Script (Simplified)
 */

import { bigQueryClient, createBigQueryClient } from '../src/lib/bigquery/client'

const CRITICAL_TABLES = [
  { name: 'S4.Dim_Branch_BranchID_NA_T1_Vw', module: 'organization', priority: 'CRITICAL' },
  { name: 'S4.Fact_Leads_Acc_Daily_Dtls_Snp', module: 'leads', priority: 'HIGH' },
  { name: 'S0_TMX.tmx_lead', module: 'salti', priority: 'HIGH' },
  { name: 'S0_TMX.tmx_employee', module: 'hr', priority: 'HIGH' },
  { name: 'W3_Contract_Checker.T0_unf_Contract_All', module: 'sales', priority: 'HIGH' },
  { name: 'BCG_RTD_DB.DR_ContractSales', module: 'bcg-analytics', priority: 'HIGH' },
  { name: 'Reports.VwUnf_dim_ar_detail', module: 'finance', priority: 'HIGH' },
  { name: 'S0_TMX.vfct_gl_activity', module: 'pnl', priority: 'MEDIUM' },
  { name: 'S0.raw_RNA_PNIDetails_Daily', module: 'termite', priority: 'MEDIUM' },
]

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

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const envIndex = args.indexOf('--environment')
  const customEnv = envIndex !== -1 ? args[envIndex + 1] : null

  const client = customEnv
    ? createBigQueryClient({ environment: customEnv as 'production' | 'staging' | 'dev' })
    : bigQueryClient

  const projectId = client.getProjectId()
  const environment = client.getEnvironment()

  console.log('\n=== BigQuery Table Verification ===\n')
  console.log(`Project:     ${projectId}`)
  console.log(`Environment: ${environment}`)
  console.log(`Tables:      ${CRITICAL_TABLES.length} to verify\n`)

  // Test connection
  console.log('Testing connection...')
  const connectionStatus = await client.testConnection()

  if (!connectionStatus.connected) {
    console.error('\nERROR: Cannot connect to BigQuery!')
    console.error(`Error: ${connectionStatus.error}\n`)
    process.exit(1)
  }

  console.log(`Connected in ${connectionStatus.responseTime}ms`)
  console.log(`Available datasets: ${connectionStatus.datasets?.join(', ') || 'unknown'}\n`)

  // Verify tables
  console.log('Verifying tables...\n')

  const results = []
  for (const table of CRITICAL_TABLES) {
    const { exists, error } = await verifyTable(client, table.name)
    results.push({ ...table, exists, error })

    const status = exists ? '✅' : '❌'
    const priorityBadge =
      table.priority === 'CRITICAL' ? '🔴' :
      table.priority === 'HIGH' ? '🟠' : '🟡'

    console.log(`${status} ${priorityBadge} ${table.name} (${table.module})`)
    if (!exists && error) {
      console.log(`   Error: ${error}`)
    }
  }

  // Summary
  const totalMissing = results.filter(r => !r.exists).length
  const totalExisting = results.length - totalMissing
  const criticalMissing = results.filter(r => !r.exists && r.priority === 'CRITICAL').length
  const highMissing = results.filter(r => !r.exists && r.priority === 'HIGH').length

  console.log('\n=== Summary ===\n')
  console.log(`Total: ${totalExisting}/${results.length} tables exist`)
  console.log(`Critical missing: ${criticalMissing}`)
  console.log(`High priority missing: ${highMissing}`)
  console.log(`Total missing: ${totalMissing}`)

  if (totalMissing > 0) {
    console.log('\n=== Missing Tables ===\n')
    results.filter(r => !r.exists).forEach(r => {
      console.log(`${r.priority}: ${r.name} (${r.module})`)
    })
  }

  console.log('\n=== Recommendations ===\n')

  if (criticalMissing > 0) {
    console.log('🔴 CRITICAL: Organization table is missing!')
    console.log('   Try different environments:')
    console.log('   npm run verify-tables -- --environment dev')
    console.log('   npm run verify-tables -- --environment staging')
  } else if (totalMissing > 0) {
    console.log('⚠️  Some tables are missing but system may work partially.')
  } else {
    console.log('✅ All tables verified! Environment is correctly configured.')
  }

  console.log('')

  if (criticalMissing > 0 || highMissing > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('\nVerification failed:', error.message)
  process.exit(1)
})
