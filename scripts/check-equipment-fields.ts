/**
 * Check for equipment-related fields in QuoteLineItem table
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../src/lib/bigquery/client'

const PROJECT = BIGQUERY_CONFIG.projectId

async function checkEquipmentFields() {
  console.log('\n========================================')
  console.log('Checking QuoteLineItem Schema for Equipment Fields')
  console.log('========================================\n')

  // Get schema for QuoteLineItem table
  const schemaQuery = `
    SELECT column_name, data_type
    FROM \`${PROJECT}.S0.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'Raw_RTXSF_QuoteLineItem_Daily'
      AND (
        LOWER(column_name) LIKE '%equipment%'
        OR LOWER(column_name) LIKE '%material%'
        OR LOWER(column_name) LIKE '%device%'
        OR LOWER(column_name) LIKE '%trap%'
        OR LOWER(column_name) LIKE '%station%'
        OR LOWER(column_name) LIKE '%item%type%'
        OR LOWER(column_name) LIKE '%category%'
      )
    ORDER BY column_name
  `

  try {
    console.log('Searching for equipment-related columns...')
    const schemaResult = await bigQueryClient.query(schemaQuery)

    if (schemaResult.rows.length > 0) {
      console.log(`\n✅ Found ${schemaResult.rows.length} potential equipment fields:\n`)
      schemaResult.rows.forEach((row: any) => {
        console.log(`  - ${row.column_name} (${row.data_type})`)
      })
    } else {
      console.log('\n⚠️  No obvious equipment fields found')
      console.log('Checking all QuoteLineItem fields...')
    }
  } catch (error: any) {
    console.error('❌ Schema query failed:', error.message)
  }

  // Get all columns to see what's available
  const allColumnsQuery = `
    SELECT column_name, data_type
    FROM \`${PROJECT}.S0.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'Raw_RTXSF_QuoteLineItem_Daily'
    ORDER BY ordinal_position
  `

  try {
    console.log('\n\nAll QuoteLineItem columns:')
    const allResult = await bigQueryClient.query(allColumnsQuery)
    console.log(`\nTotal columns: ${allResult.rows.length}\n`)

    // Group by prefix for better readability
    const grouped: Record<string, string[]> = {}
    allResult.rows.forEach((row: any) => {
      const prefix = row.column_name.split('_')[0] || 'Other'
      if (!grouped[prefix]) grouped[prefix] = []
      grouped[prefix].push(`${row.column_name} (${row.data_type})`)
    })

    Object.entries(grouped).forEach(([prefix, columns]) => {
      console.log(`\n[${prefix}*]`)
      columns.forEach(col => console.log(`  ${col}`))
    })
  } catch (error: any) {
    console.error('❌ All columns query failed:', error.message)
  }

  // Check sample data to see what line items look like
  const sampleQuery = `
    SELECT
      qli.Id,
      qli.Product2Id,
      COALESCE(p.Name, '') as product_name,
      COALESCE(p.ProductCode, '') as product_code,
      COALESCE(p.Description, '') as product_description,
      COALESCE(p.Family, '') as product_family,
      COALESCE(qli.Description, '') as line_item_description,
      qli.Quantity,
      COALESCE(qli.TotalPrice, 0) as total_price
    FROM \`${PROJECT}.S0.Raw_RTXSF_QuoteLineItem_Daily\` qli
    LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Product2_Daily\` p ON qli.Product2Id = p.Id
    WHERE qli.CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    LIMIT 20
  `

  try {
    console.log('\n\n========================================')
    console.log('Sample Line Items (Last 30 Days)')
    console.log('========================================\n')
    const sampleResult = await bigQueryClient.query(sampleQuery)

    if (sampleResult.rows.length > 0) {
      sampleResult.rows.forEach((row: any, idx: number) => {
        console.log(`\n[${idx + 1}] ${row.product_name || 'Unknown Product'}`)
        console.log(`    Code: ${row.product_code || 'N/A'}`)
        console.log(`    Family: ${row.product_family || 'N/A'}`)
        console.log(`    Description: ${row.product_description?.substring(0, 80) || 'N/A'}`)
        console.log(`    Quantity: ${row.Quantity}`)
        console.log(`    Total: $${row.total_price}`)
      })
    } else {
      console.log('⚠️  No line items found in last 30 days')
    }
  } catch (error: any) {
    console.error('❌ Sample query failed:', error.message)
  }
}

checkEquipmentFields().catch(console.error)
