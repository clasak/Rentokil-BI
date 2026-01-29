/**
 * Test script to check if specific product codes exist
 */

import { getProductCatalog } from '../src/lib/bigquery/queries/salesforce'

async function testSpecificProducts() {
  const neededCodes = ['CP637', 'CP636', 'CP892', 'CP654', 'CP896', 'CP910', 'CP223', 'CP631']

  console.log('='.repeat(60))
  console.log('Testing for specific product codes')
  console.log('='.repeat(60))

  try {
    // Get all products (up to 500)
    const allProducts = await getProductCatalog({ limit: 500 })

    console.log(`\nTotal products found: ${allProducts.length}`)
    console.log(`\nLooking for these product codes:`)
    console.log(neededCodes.join(', '))

    const foundCodes = new Set(allProducts.map((p) => p.product_code))

    console.log(`\n${'Product Code'.padEnd(15)} | Status`)
    console.log('-'.repeat(40))

    neededCodes.forEach((code) => {
      const status = foundCodes.has(code) ? '✅ FOUND' : '❌ NOT FOUND'
      console.log(`${code.padEnd(15)} | ${status}`)

      if (foundCodes.has(code)) {
        const product = allProducts.find((p) => p.product_code === code)
        if (product) {
          console.log(`   → ${product.product_name}`)
        }
      }
    })

    const foundCount = neededCodes.filter((code) => foundCodes.has(code)).length
    console.log(`\nSummary: ${foundCount}/${neededCodes.length} codes found`)

    console.log('\n' + '='.repeat(60))
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error running test:')
    console.error(error)
    process.exit(1)
  }
}

testSpecificProducts()
