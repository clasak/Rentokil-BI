/**
 * Check what address data exists in Salesforce Quote table
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../src/lib/bigquery/client'

const PROJECT = BIGQUERY_CONFIG.projectId

async function checkQuoteAddressData() {
  console.log('\n========================================')
  console.log('Checking Quote Address Data Availability')
  console.log('========================================\n')

  // Check what percentage of quotes have address data
  const addressAvailabilityQuery = `
    SELECT
      COUNT(*) as total_quotes,
      COUNTIF(q.ShippingStreet IS NOT NULL AND q.ShippingStreet != '') as quotes_with_shipping_street,
      COUNTIF(q.ShippingCity IS NOT NULL AND q.ShippingCity != '') as quotes_with_shipping_city,
      COUNTIF(q.BillingStreet IS NOT NULL AND q.BillingStreet != '') as quotes_with_billing_street,
      COUNTIF(q.BillingCity IS NOT NULL AND q.BillingCity != '') as quotes_with_billing_city,
      -- Check account fallback
      COUNTIF(a.ShippingStreet IS NOT NULL AND a.ShippingStreet != '') as accounts_with_shipping_street,
      COUNTIF(a.ShippingCity IS NOT NULL AND a.ShippingCity != '') as accounts_with_shipping_city,
      COUNTIF(a.BillingStreet IS NOT NULL AND a.BillingStreet != '') as accounts_with_billing_street,
      COUNTIF(a.BillingCity IS NOT NULL AND a.BillingCity != '') as accounts_with_billing_city
    FROM \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\` q
    LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\` o ON q.OpportunityId = o.Id
    LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\` a ON o.AccountId = a.Id
    WHERE q.CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
  `

  try {
    console.log('Checking address availability (last 90 days)...\n')
    const result = await bigQueryClient.query(addressAvailabilityQuery)

    if (result.rows.length > 0) {
      const row = result.rows[0] as any
      const total = row.total_quotes as number

      console.log(`Total Quotes (90 days): ${total}`)
      console.log('\nQuote-Level Address Data:')
      console.log(`  ShippingStreet: ${row.quotes_with_shipping_street} (${((row.quotes_with_shipping_street / total) * 100).toFixed(1)}%)`)
      console.log(`  ShippingCity: ${row.quotes_with_shipping_city} (${((row.quotes_with_shipping_city / total) * 100).toFixed(1)}%)`)
      console.log(`  BillingStreet: ${row.quotes_with_billing_street} (${((row.quotes_with_billing_street / total) * 100).toFixed(1)}%)`)
      console.log(`  BillingCity: ${row.quotes_with_billing_city} (${((row.quotes_with_billing_city / total) * 100).toFixed(1)}%)`)

      console.log('\nAccount-Level Address Data (Fallback):')
      console.log(`  ShippingStreet: ${row.accounts_with_shipping_street} (${((row.accounts_with_shipping_street / total) * 100).toFixed(1)}%)`)
      console.log(`  ShippingCity: ${row.accounts_with_shipping_city} (${((row.accounts_with_shipping_city / total) * 100).toFixed(1)}%)`)
      console.log(`  BillingStreet: ${row.accounts_with_billing_street} (${((row.accounts_with_billing_street / total) * 100).toFixed(1)}%)`)
      console.log(`  BillingCity: ${row.accounts_with_billing_city} (${((row.accounts_with_billing_city / total) * 100).toFixed(1)}%)`)
    }
  } catch (error: any) {
    console.error('❌ Address availability query failed:', error.message)
  }

  // Sample some quotes with their address data
  const sampleQuery = `
    SELECT
      q.Id as quote_id,
      q.Name as quote_name,
      a.Name as account_name,
      q.ShippingStreet as quote_shipping_street,
      q.ShippingCity as quote_shipping_city,
      q.ShippingState as quote_shipping_state,
      a.ShippingStreet as account_shipping_street,
      a.ShippingCity as account_shipping_city,
      a.ShippingState as account_shipping_state,
      q.BillingStreet as quote_billing_street,
      q.BillingCity as quote_billing_city,
      a.BillingStreet as account_billing_street,
      a.BillingCity as account_billing_city
    FROM \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\` q
    LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\` o ON q.OpportunityId = o.Id
    LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\` a ON o.AccountId = a.Id
    WHERE q.CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    LIMIT 10
  `

  try {
    console.log('\n\n========================================')
    console.log('Sample Quote Address Data (10 recent)')
    console.log('========================================\n')
    const sampleResult = await bigQueryClient.query(sampleQuery)

    sampleResult.rows.forEach((row: any, idx: number) => {
      console.log(`\n[${idx + 1}] ${row.quote_name} - ${row.account_name}`)
      console.log(`    Quote ID: ${row.quote_id}`)
      console.log(`    Service Address:`)
      console.log(`      From Quote: ${row.quote_shipping_street || '(empty)'}, ${row.quote_shipping_city || '(empty)'}, ${row.quote_shipping_state || '(empty)'}`)
      console.log(`      From Account: ${row.account_shipping_street || '(empty)'}, ${row.account_shipping_city || '(empty)'}, ${row.account_shipping_state || '(empty)'}`)
      console.log(`    Billing Address:`)
      console.log(`      From Quote: ${row.quote_billing_street || '(empty)'}, ${row.quote_billing_city || '(empty)'}`)
      console.log(`      From Account: ${row.account_billing_street || '(empty)'}, ${row.account_billing_city || '(empty)'}`)
    })
  } catch (error: any) {
    console.error('❌ Sample query failed:', error.message)
  }
}

checkQuoteAddressData().catch(console.error)
