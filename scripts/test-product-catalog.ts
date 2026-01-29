/**
 * Test script to check Salesforce Product catalog in BigQuery
 */

import { getProductCatalog } from '../src/lib/bigquery/queries/salesforce'

async function testProductCatalog() {
  console.log('='.repeat(60))
  console.log('Testing Product Catalog Query')
  console.log('='.repeat(60))

  try {
    console.log('\n1. Testing getProductCatalog with limit 10...')
    const products = await getProductCatalog({ limit: 10 })

    console.log(`\nResult: Found ${products.length} products`)

    if (products.length > 0) {
      console.log('\nFirst product:')
      console.log(JSON.stringify(products[0], null, 2))
    } else {
      console.log('\n⚠️  No products found. This could mean:')
      console.log('   - Raw_RTXSF_Product2_Daily table is empty')
      console.log('   - Table does not exist')
      console.log('   - No active products in the table')
      console.log('   - JOIN with PricebookEntry filtered everything out')
    }

    console.log('\n' + '='.repeat(60))
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error running test:')
    console.error(error)
    process.exit(1)
  }
}

testProductCatalog()
