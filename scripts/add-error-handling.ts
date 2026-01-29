#!/usr/bin/env npx tsx

/**
 * Script to add centralized error handling to all BigQuery query modules
 *
 * This script:
 * 1. Adds import statements for handleBigQueryError and validators
 * 2. Replaces console.error + return [] with throw handleBigQueryError
 * 3. Handles special cases (returns objects instead of arrays)
 */

import * as fs from 'fs'
import * as path from 'path'

const QUERIES_DIR = path.join(__dirname, '../src/lib/bigquery/queries')

const FILES_TO_UPDATE = [
  'ae.ts',
  'branch.ts',
  'cross-functional.ts',
  'data-freshness.ts',
  'employee.ts',
  'executive.ts',
  'finance.ts',
  'hr.ts',
  'lead-journey.ts',
  'lead-service.ts',
  'leads.ts',
  'new-starts.ts',
  'ops.ts',
  'organization-workforce.ts',
  'organization.ts',
  'sales-pipeline.ts',
  'sales-tracker.ts',
  'sales.ts',
  'salti.ts',
  'summary.ts',
  'termite.ts',
  'wig.ts',
  'workforce.ts',
]

interface UpdateStats {
  filesProcessed: number
  importsAdded: number
  errorHandlersUpdated: number
  errors: string[]
}

function addImports(content: string): { updated: string; added: boolean } {
  // Check if error handler import already exists
  if (content.includes("from '../error-handler'")) {
    return { updated: content, added: false }
  }

  // Find the client import line
  const clientImportRegex = /^import\s+{[^}]+}\s+from\s+['"]\.\.\/client['"]/m
  const match = content.match(clientImportRegex)

  if (!match) {
    console.warn('Could not find client import to add error handler import after')
    return { updated: content, added: false }
  }

  // Add error handler import after client import
  const insertAfter = match.index! + match[0].length
  const newImports = `\nimport { handleBigQueryError } from '../error-handler'\nimport { validateOrgCode, validateNumeric, validateString } from '../validation'`

  const updated = content.slice(0, insertAfter) + newImports + content.slice(insertAfter)

  return { updated, added: true }
}

function updateErrorHandlers(content: string, filename: string): { updated: string; count: number } {
  let updated = content
  let count = 0

  // Pattern 1: console.error + return []
  const pattern1 = /} catch \(error\) {\s*console\.(error|warn)\(\[[^\]]+\][^\n]+\n\s*return \[\]\s*}/g
  const matches1 = content.match(pattern1)

  if (matches1) {
    matches1.forEach(match => {
      // Extract function name from error message
      const functionNameMatch = match.match(/console\.(error|warn)\(\[[^\]]+\]\s+([^\s]+)\s+failed/)
      if (functionNameMatch) {
        const functionName = functionNameMatch[2]
        const replacement = `} catch (error) {\n    throw handleBigQueryError(error, '${functionName}', options)\n  }`
        updated = updated.replace(match, replacement)
        count++
      }
    })
  }

  // Pattern 2: console.error + return {} (for functions returning objects)
  const pattern2 = /} catch \(error\) {\s*console\.(error|warn)\(\[[^\]]+\][^\n]+\n\s*return {[\s\S]*?}\s*}/g
  const matches2 = content.match(pattern2)

  if (matches2) {
    matches2.forEach(match => {
      // Extract function name from error message
      const functionNameMatch = match.match(/console\.(error|warn)\(\[[^\]]+\]\s+([^\s]+)\s+failed/)
      if (functionNameMatch) {
        const functionName = functionNameMatch[2]
        const replacement = `} catch (error) {\n    throw handleBigQueryError(error, '${functionName}', options)\n  }`
        updated = updated.replace(match, replacement)
        count++
      }
    })
  }

  return { updated, count }
}

async function processFile(filename: string): Promise<Partial<UpdateStats>> {
  const filepath = path.join(QUERIES_DIR, filename)

  try {
    let content = fs.readFileSync(filepath, 'utf-8')

    // Step 1: Add imports
    const { updated: withImports, added: importsAdded } = addImports(content)
    content = withImports

    // Step 2: Update error handlers
    const { updated: withErrorHandlers, count: errorHandlersUpdated } = updateErrorHandlers(content, filename)
    content = withErrorHandlers

    // Write back if any changes were made
    if (importsAdded || errorHandlersUpdated > 0) {
      fs.writeFileSync(filepath, content, 'utf-8')
      console.log(`✅ ${filename}: ${importsAdded ? '+ imports' : ''} ${errorHandlersUpdated > 0 ? `+ ${errorHandlersUpdated} error handlers` : ''}`)
    } else {
      console.log(`⏭️  ${filename}: Already up to date`)
    }

    return {
      filesProcessed: 1,
      importsAdded: importsAdded ? 1 : 0,
      errorHandlersUpdated,
      errors: [],
    }
  } catch (error) {
    const message = `❌ ${filename}: ${error instanceof Error ? error.message : String(error)}`
    console.error(message)
    return {
      filesProcessed: 1,
      importsAdded: 0,
      errorHandlersUpdated: 0,
      errors: [message],
    }
  }
}

async function main() {
  console.log('🔧 Adding centralized error handling to BigQuery query modules\n')

  const stats: UpdateStats = {
    filesProcessed: 0,
    importsAdded: 0,
    errorHandlersUpdated: 0,
    errors: [],
  }

  for (const filename of FILES_TO_UPDATE) {
    const fileStats = await processFile(filename)
    stats.filesProcessed += fileStats.filesProcessed || 0
    stats.importsAdded += fileStats.importsAdded || 0
    stats.errorHandlersUpdated += fileStats.errorHandlersUpdated || 0
    stats.errors.push(...(fileStats.errors || []))
  }

  console.log('\n📊 Summary:')
  console.log(`   Files processed: ${stats.filesProcessed}`)
  console.log(`   Imports added: ${stats.importsAdded}`)
  console.log(`   Error handlers updated: ${stats.errorHandlersUpdated}`)

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`)
    stats.errors.forEach(err => console.log(`   ${err}`))
    process.exit(1)
  } else {
    console.log('\n✅ All files updated successfully!')
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
