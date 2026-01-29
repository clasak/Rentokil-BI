#!/usr/bin/env npx tsx
/**
 * Route Validation Script
 *
 * Validates that all routes referenced in the codebase have corresponding page files
 * or redirects configured. Run this after refactoring routes to catch broken links.
 *
 * Usage: npm run validate-routes (add to package.json scripts)
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

const PAGES_DIR = path.join(process.cwd(), 'src/app/(dashboard)')
const NEXT_CONFIG = path.join(process.cwd(), 'next.config.js')

// Files to scan for route references
const FILES_TO_SCAN = [
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/AdminSidebar.tsx',
  'src/hooks/useRecentPages.ts',
  'src/lib/bigquery/queries/**/*.ts',
]

interface RouteReference {
  route: string
  file: string
  line: number
}

interface ValidationResult {
  valid: boolean
  missingRoutes: RouteReference[]
  configuredRedirects: string[]
}

/**
 * Extract route patterns from files
 */
function extractRoutes(content: string, filePath: string): RouteReference[] {
  const routes: RouteReference[] = []
  const lines = content.split('\n')

  // Match patterns like: href="/path" or '/path' or "/path"
  const routePattern = /(?:href=["']|["'])(\/(ae|admin|branch|sales|ops|tech|leads|forecast|governance|finance|hr|people|workforce|salti|termite|qbr|wbr|region|market|manager|cross-functional|lead-service-engine)[^"']*)/g

  lines.forEach((line, index) => {
    let match
    while ((match = routePattern.exec(line)) !== null) {
      routes.push({
        route: match[1],
        file: filePath,
        line: index + 1,
      })
    }
  })

  return routes
}

/**
 * Get all existing dashboard page routes
 */
async function getExistingRoutes(): Promise<Set<string>> {
  const pageFiles = await glob('src/app/(dashboard)/**/page.{tsx,jsx,ts,js}', {
    cwd: process.cwd(),
  })

  const routes = new Set<string>()

  pageFiles.forEach(file => {
    // Convert file path to route
    const route = file
      .replace('src/app/(dashboard)', '')
      .replace(/\/page\.(tsx|jsx|ts|js)$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1') // Convert [param] to :param

    routes.add(route || '/')
  })

  return routes
}

/**
 * Get configured redirects from next.config.js
 */
function getConfiguredRedirects(): string[] {
  try {
    const configContent = fs.readFileSync(NEXT_CONFIG, 'utf-8')
    const redirects: string[] = []

    // Simple regex to extract source routes from redirect config
    const sourcePattern = /source:\s*["']([^"']+)["']/g
    let match

    while ((match = sourcePattern.exec(configContent)) !== null) {
      redirects.push(match[1])
    }

    return redirects
  } catch (error) {
    console.warn('Could not read next.config.js:', error)
    return []
  }
}

/**
 * Validate all route references
 */
async function validateRoutes(): Promise<ValidationResult> {
  console.log('🔍 Validating dashboard routes...\n')

  // Get existing routes
  const existingRoutes = await getExistingRoutes()
  console.log(`✓ Found ${existingRoutes.size} existing page routes`)

  // Get configured redirects
  const configuredRedirects = getConfiguredRedirects()
  console.log(`✓ Found ${configuredRedirects.length} configured redirects\n`)

  // Scan all files for route references
  const allReferences: RouteReference[] = []

  for (const pattern of FILES_TO_SCAN) {
    const files = await glob(pattern, { cwd: process.cwd() })

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const references = extractRoutes(content, file)
      allReferences.push(...references)
    }
  }

  console.log(`✓ Scanned ${allReferences.length} route references\n`)

  // Find missing routes (not in pages and not redirected)
  const missingRoutes: RouteReference[] = []
  const checkedRoutes = new Set<string>()

  allReferences.forEach(ref => {
    // Skip if already checked
    if (checkedRoutes.has(ref.route)) return
    checkedRoutes.add(ref.route)

    // Remove query params and hash
    const cleanRoute = ref.route.split('?')[0].split('#')[0]

    // Check if route exists or is redirected
    const routeExists = existingRoutes.has(cleanRoute)
    const isRedirected = configuredRedirects.includes(cleanRoute)

    if (!routeExists && !isRedirected) {
      missingRoutes.push(ref)
    }
  })

  return {
    valid: missingRoutes.length === 0,
    missingRoutes,
    configuredRedirects,
  }
}

/**
 * Main execution
 */
async function main() {
  const result = await validateRoutes()

  if (result.valid) {
    console.log('✅ All route references are valid!\n')
    process.exit(0)
  } else {
    console.log('❌ Found missing routes:\n')

    result.missingRoutes.forEach(ref => {
      console.log(`  ${ref.route}`)
      console.log(`    Referenced in: ${ref.file}:${ref.line}`)
      console.log()
    })

    console.log('\n💡 Fix options:')
    console.log('  1. Create the missing page file')
    console.log('  2. Add redirect in next.config.js')
    console.log('  3. Update the reference to point to correct route\n')

    process.exit(1)
  }
}

main().catch(console.error)
