/**
 * Diagnostic Script: Test Salesforce Queries
 *
 * Tests all three queries (accounts, opportunities, quotes) to diagnose
 * why the Sales Hub tabs are showing no data.
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../src/lib/bigquery/client'

const PROJECT = BIGQUERY_CONFIG.projectId

async function testAccountsQuery() {
  console.log('\n========================================')
  console.log('TEST 1: Accounts Query')
  console.log('========================================\n')

  const sql = `
    SELECT
      Id as account_id,
      Name as account_name,
      COALESCE(Industry, '') as industry,
      COALESCE(BillingCity, '') as billing_city,
      COALESCE(BillingState, '') as billing_state,
      FORMAT_TIMESTAMP('%Y-%m-%d', CreatedDate) as created_date,
      FORMAT_TIMESTAMP('%Y-%m-%d', LastModifiedDate) as last_modified_date
    FROM \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\`
    WHERE IsDeleted = FALSE
    ORDER BY LastModifiedDate DESC
    LIMIT 10
  `

  try {
    console.log('Running query...')
    const result = await bigQueryClient.query(sql)
    console.log(`✅ SUCCESS: Found ${result.rows.length} accounts`)

    if (result.rows.length > 0) {
      console.log('\nSample account:')
      console.log(JSON.stringify(result.rows[0], null, 2))
    } else {
      console.log('⚠️  No accounts found in table')
    }
  } catch (error: any) {
    console.error('❌ FAILED:', error.message)
  }
}

async function testOpportunitiesQuery() {
  console.log('\n========================================')
  console.log('TEST 2: Opportunities Query')
  console.log('========================================\n')

  const sql = `
    SELECT
      o.Id as opportunityId,
      o.Name as opportunityName,
      COALESCE(a.Name, '') as accountName,
      o.StageName as stageName,
      COALESCE(o.Amount, 0) as amount,
      COALESCE(o.Probability, 0) as probability,
      FORMAT_DATE('%Y-%m-%d', DATE(o.CreatedDate)) as createdDate,
      FORMAT_DATE('%Y-%m-%d', DATE(o.CloseDate)) as closeDate,
      '' as ownerName,
      o.IsWon as isWon,
      o.IsClosed as isClosed
    FROM \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\` o
    LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\` a ON o.AccountId = a.Id
    WHERE o.CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)
    ORDER BY o.CreatedDate DESC
    LIMIT 10
  `

  try {
    console.log('Running query...')
    const result = await bigQueryClient.query(sql)
    console.log(`✅ SUCCESS: Found ${result.rows.length} opportunities`)

    if (result.rows.length > 0) {
      console.log('\nSample opportunity:')
      console.log(JSON.stringify(result.rows[0], null, 2))
    } else {
      console.log('⚠️  No opportunities found in last 365 days')

      // Try without date filter
      console.log('\nTrying without date filter...')
      const sqlNoFilter = `
        SELECT COUNT(*) as total
        FROM \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\`
      `
      const totalResult = await bigQueryClient.query(sqlNoFilter)
      console.log(`Total opportunities in table: ${totalResult.rows[0].total}`)
    }
  } catch (error: any) {
    console.error('❌ FAILED:', error.message)
  }
}

async function testQuotesQuery() {
  console.log('\n========================================')
  console.log('TEST 3: Quotes Query')
  console.log('========================================\n')

  const sql = `
    SELECT
      q.Id as quoteId,
      q.Name as quoteName,
      q.OpportunityId as opportunityId,
      COALESCE(o.Name, '') as accountName,
      '' as ownerName,
      COALESCE(q.Status, '') as status,
      COALESCE(q.TotalPrice, 0) as totalAmount,
      FORMAT_DATE('%Y-%m-%d', DATE(q.ExpirationDate)) as dateOfSale,
      FORMAT_DATE('%Y-%m-%d', DATE(q.CreatedDate)) as proposalDeliveredDate
    FROM \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\` q
    LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\` o ON q.OpportunityId = o.Id
    WHERE q.CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)
    ORDER BY q.CreatedDate DESC
    LIMIT 10
  `

  try {
    console.log('Running query...')
    const result = await bigQueryClient.query(sql)
    console.log(`✅ SUCCESS: Found ${result.rows.length} quotes`)

    if (result.rows.length > 0) {
      console.log('\nSample quote:')
      console.log(JSON.stringify(result.rows[0], null, 2))
    } else {
      console.log('⚠️  No quotes found in last 365 days')

      // Try without date filter
      console.log('\nTrying without date filter...')
      const sqlNoFilter = `
        SELECT COUNT(*) as total
        FROM \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\`
      `
      const totalResult = await bigQueryClient.query(sqlNoFilter)
      console.log(`Total quotes in table: ${totalResult.rows[0].total}`)
    }
  } catch (error: any) {
    console.error('❌ FAILED:', error.message)
  }
}

async function testTableCounts() {
  console.log('\n========================================')
  console.log('TEST 4: Table Row Counts')
  console.log('========================================\n')

  const tables = [
    'Raw_RTXSF_Account_Daily',
    'Raw_RTXSF_Opportunity_Daily',
    'Raw_RTXSF_Quote_Daily',
    'Raw_RTXSF_Contact_Daily',
    'Raw_RTXSF_QuoteLineItem_Daily'
  ]

  for (const table of tables) {
    try {
      const sql = `SELECT COUNT(*) as count FROM \`${PROJECT}.S0.${table}\``
      const result = await bigQueryClient.query<{ count: number }>(sql)
      console.log(`✅ ${table}: ${result.rows[0].count.toLocaleString()} rows`)
    } catch (error: any) {
      console.log(`❌ ${table}: ${error.message}`)
    }
  }
}

async function main() {
  console.log('Salesforce Queries Diagnostic')
  console.log('Project:', PROJECT)
  console.log('Environment:', BIGQUERY_CONFIG.environment)

  await testTableCounts()
  await testAccountsQuery()
  await testOpportunitiesQuery()
  await testQuotesQuery()

  console.log('\n========================================')
  console.log('DIAGNOSTIC COMPLETE')
  console.log('========================================\n')
}

main().catch(console.error)
