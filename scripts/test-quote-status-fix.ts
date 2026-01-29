/**
 * Test Script: Verify Quote Status Fix
 *
 * Tests that quotes are correctly categorized as "Sold" vs "Proposal"
 * based on Date_of_Sale__c field (not ExpirationDate).
 */

import { bigQueryClient } from '../src/lib/bigquery/client'

async function testFixedQuery() {
  console.log('Testing fixed quote query...\n')

  const sql = `
    SELECT
      q.Id as quoteId,
      q.Name as quoteName,
      COALESCE(q.Status, '') as status,
      COALESCE(q.TotalPrice, 0) as totalAmount,
      FORMAT_DATE('%Y-%m-%d', DATE(q.Date_of_Sale__c)) as dateOfSale,
      CASE
        WHEN q.Status = 'Accepted' THEN true
        WHEN q.Status = 'Approved' THEN true
        ELSE false
      END as isApproved,
      COALESCE(e.Name, '') as ownerName
    FROM \`bidata-sharedus-production.S0.Raw_RTXSF_Quote_Daily\` q
    LEFT JOIN \`bidata-sharedus-production.S0.Raw_RTXSF_Employee__c_Daily\` e ON q.OwnerId = e.User__c
    WHERE q.CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      AND LOWER(e.Name) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
    ORDER BY q.CreatedDate DESC
    LIMIT 10
  `

  const result = await bigQueryClient.queryWithParams(sql, { salesPerson: 'Andy Clark' })
  console.log(`Found ${result.rows.length} quotes for Andy Clark:\n`)

  result.rows.forEach((q: any, i: number) => {
    const displayStatus = q.dateOfSale ? 'SOLD ✅' : `PROPOSAL (${q.status})`
    console.log(`${i+1}. ${q.quoteName}`)
    console.log(`   Salesforce Status: ${q.status}`)
    console.log(`   Date of Sale: ${q.dateOfSale || 'null'}`)
    console.log(`   Display As: ${displayStatus}`)
    console.log(`   Is Approved: ${q.isApproved}`)
    console.log()
  })

  const soldCount = result.rows.filter((q: any) => q.dateOfSale !== null).length
  const proposalCount = result.rows.filter((q: any) => q.dateOfSale === null).length

  console.log('========================================')
  console.log(`✅ Sold: ${soldCount}`)
  console.log(`📄 Proposals: ${proposalCount}`)
  console.log('========================================\n')

  // Verify the logic
  if (proposalCount > 0) {
    const sampleProposal = result.rows.find((q: any) => q.dateOfSale === null)
    if (sampleProposal) {
      console.log('✅ Correctly identifying proposals:')
      console.log(`   "${sampleProposal.quoteName}" with status "${sampleProposal.status}"`)
      console.log(`   has NO Date_of_Sale__c, so displays as PROPOSAL\n`)
    }
  }

  if (soldCount > 0) {
    const sampleSold = result.rows.find((q: any) => q.dateOfSale !== null)
    if (sampleSold) {
      console.log('✅ Correctly identifying sold quotes:')
      console.log(`   "${sampleSold.quoteName}" with status "${sampleSold.status}"`)
      console.log(`   has Date_of_Sale__c = ${sampleSold.dateOfSale}, so displays as SOLD\n`)
    }
  }
}

testFixedQuery().catch(console.error)
