#!/usr/bin/env tsx
/**
 * Diagnostic script to test Platform Health BigQuery query
 * Run: npx tsx scripts/test-platform-health.ts
 */

import { getPlatformHealthMetrics } from '../src/lib/bigquery/queries/platform-health'
import { bigQueryClient } from '../src/lib/bigquery/client'

async function testQuery() {
  console.log('🔍 Testing Platform Health Query...\n')

  // Test 1: Try the full query
  console.log('📊 Test 1: Running full getPlatformHealthMetrics query')
  try {
    const result = await getPlatformHealthMetrics()
    console.log('✅ SUCCESS! Query returned data:')
    console.log(JSON.stringify(result, null, 2))
  } catch (error: any) {
    console.log('❌ FAILED! Error details:')
    console.log('Error message:', error?.message || 'Unknown error')
    console.log('Error code:', error?.code)
    console.log('Full error:', error)
  }

  console.log('\n' + '='.repeat(80) + '\n')

  // Test 2: Try a simpler query to test INFORMATION_SCHEMA access
  console.log('📊 Test 2: Testing basic INFORMATION_SCHEMA access')
  const simpleQuery = `
    SELECT COUNT(*) as job_count
    FROM \`region-us\`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
    WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
    LIMIT 1
  `

  try {
    const result = await bigQueryClient.query<{ job_count: number }>(simpleQuery)
    console.log('✅ SUCCESS! INFORMATION_SCHEMA is accessible')
    console.log('Jobs found in last 24h:', result.rows[0]?.job_count || 0)
    console.log('Rows returned:', result.rows.length)
  } catch (error: any) {
    console.log('❌ FAILED! Cannot access INFORMATION_SCHEMA')
    console.log('Error message:', error?.message || 'Unknown error')
    console.log('Error code:', error?.code)

    // Check if it's a permission error
    if (error?.message?.includes('bigquery.jobs.list') ||
        error?.message?.includes('Access Denied') ||
        error?.message?.includes('permission')) {
      console.log('\n🔐 DIAGNOSIS: Permission issue detected')
      console.log('You need the "bigquery.jobs.list" permission')
      console.log('Ask your admin to grant you the "BigQuery Job User" role or "superuser" role')
    } else {
      console.log('\n🔧 DIAGNOSIS: Not a permission issue - might be query syntax')
    }
  }

  console.log('\n' + '='.repeat(80) + '\n')

  // Test 3: Try without region prefix
  console.log('📊 Test 3: Testing without region-us prefix')
  const noRegionQuery = `
    SELECT COUNT(*) as job_count
    FROM INFORMATION_SCHEMA.JOBS_BY_PROJECT
    WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
    LIMIT 1
  `

  try {
    const result = await bigQueryClient.query<{ job_count: number }>(noRegionQuery)
    console.log('✅ SUCCESS! Query works without region prefix')
    console.log('Jobs found in last 24h:', result.rows[0]?.job_count || 0)
    console.log('💡 RECOMMENDATION: Remove "region-us" prefix from query')
  } catch (error: any) {
    console.log('❌ FAILED! Query also fails without region prefix')
    console.log('Error message:', error?.message || 'Unknown error')
  }

  console.log('\n' + '='.repeat(80) + '\n')

  // Test 4: Try with full project path
  console.log('📊 Test 4: Testing with full project path')
  const fullPathQuery = `
    SELECT COUNT(*) as job_count
    FROM \`bidata-sharedus-production\`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
    WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
    LIMIT 1
  `

  try {
    const result = await bigQueryClient.query<{ job_count: number }>(fullPathQuery)
    console.log('✅ SUCCESS! Query works with full project path')
    console.log('Jobs found in last 24h:', result.rows[0]?.job_count || 0)
    console.log('💡 RECOMMENDATION: Use full project path instead of region-us')
  } catch (error: any) {
    console.log('❌ FAILED! Query also fails with full project path')
    console.log('Error message:', error?.message || 'Unknown error')
  }

  console.log('\n' + '='.repeat(80) + '\n')
  console.log('🏁 Diagnostic complete!')
}

testQuery().catch(console.error)
