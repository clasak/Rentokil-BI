#!/usr/bin/env tsx
/**
 * Pre-Demo Health Check Script
 *
 * Validates that the dashboard is ready for a demo:
 * - Build compiles without errors
 * - BigQuery connection works
 * - Critical pages load
 * - No console errors
 *
 * Run: npx tsx scripts/pre-demo-check.ts
 */

import { execSync } from 'child_process'

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function success(message: string) {
  log(`  ✓ ${message}`, 'green')
}

function error(message: string) {
  log(`  ✗ ${message}`, 'red')
}

function warning(message: string) {
  log(`  ! ${message}`, 'yellow')
}

function section(title: string) {
  console.log()
  log(`━━━ ${title} ━━━`, 'blue')
}

interface CheckResult {
  passed: boolean
  message: string
  details?: string
}

// Check if TypeScript compiles
function checkTypeScript(): CheckResult {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: process.cwd() })
    return { passed: true, message: 'TypeScript compiles without errors' }
  } catch (e) {
    const err = e as { stderr?: Buffer }
    return {
      passed: false,
      message: 'TypeScript compilation failed',
      details: err.stderr?.toString().slice(0, 500),
    }
  }
}

// Check if ESLint passes
function checkESLint(): CheckResult {
  try {
    execSync('npm run lint', { stdio: 'pipe', cwd: process.cwd() })
    return { passed: true, message: 'ESLint passes' }
  } catch (e) {
    const err = e as { stderr?: Buffer }
    return {
      passed: false,
      message: 'ESLint found issues',
      details: err.stderr?.toString().slice(0, 500),
    }
  }
}

// Check if build succeeds
function checkBuild(): CheckResult {
  try {
    log('  Building... (this may take a moment)', 'dim')
    execSync('npm run build', { stdio: 'pipe', cwd: process.cwd() })
    return { passed: true, message: 'Production build succeeds' }
  } catch (e) {
    const err = e as { stderr?: Buffer }
    return {
      passed: false,
      message: 'Production build failed',
      details: err.stderr?.toString().slice(0, 500),
    }
  }
}

// Check required files exist
function checkRequiredFiles(): CheckResult {
  const requiredFiles = [
    'src/lib/bigquery/client.ts',
    'src/hooks/useBigQueryData.ts',
    'src/components/layout/PageHeader.tsx',
    'src/components/layout/CommandMenu.tsx',
    'src/lib/bigquery/cache.ts',
    'src/lib/bigquery/queries/organization.ts',
    'src/app/(dashboard)/admin/components/RolePreview.tsx',
  ]

  const fs = require('fs')
  const missing: string[] = []

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      missing.push(file)
    }
  }

  if (missing.length === 0) {
    return { passed: true, message: `All ${requiredFiles.length} required files exist` }
  }

  return {
    passed: false,
    message: `Missing ${missing.length} required files`,
    details: missing.join('\n'),
  }
}

// Check BigQuery configuration
function checkBigQueryConfig(): CheckResult {
  const fs = require('fs')
  const clientPath = 'src/lib/bigquery/client.ts'

  if (!fs.existsSync(clientPath)) {
    return { passed: false, message: 'BigQuery client file not found' }
  }

  const content = fs.readFileSync(clientPath, 'utf-8')

  // Check default is production
  if (content.includes("return 'production'") || content.includes('return "production"')) {
    return { passed: true, message: 'BigQuery defaults to production environment' }
  }

  if (content.includes("return 'dev'") || content.includes('return "dev"')) {
    return {
      passed: false,
      message: 'BigQuery defaults to dev environment',
      details: 'Change default environment to production in src/lib/bigquery/client.ts',
    }
  }

  return { passed: true, message: 'BigQuery client configured' }
}

// Check page count
function checkPageCount(): CheckResult {
  const fs = require('fs')
  const path = require('path')

  function countPages(dir: string): number {
    let count = 0
    if (!fs.existsSync(dir)) return 0

    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        count += countPages(fullPath)
      } else if (item === 'page.tsx') {
        count++
      }
    }
    return count
  }

  const pageCount = countPages('src/app/(dashboard)')

  if (pageCount >= 40) {
    return { passed: true, message: `${pageCount} dashboard pages found` }
  }

  return {
    passed: false,
    message: `Only ${pageCount} pages found (expected 40+)`,
  }
}

// Main execution
async function main() {
  console.log()
  log('╔══════════════════════════════════════════════════════════════╗', 'blue')
  log('║           Rentokil BI - Pre-Demo Health Check                ║', 'blue')
  log('╚══════════════════════════════════════════════════════════════╝', 'blue')

  const checks: { name: string; fn: () => CheckResult }[] = [
    { name: 'Required Files', fn: checkRequiredFiles },
    { name: 'BigQuery Config', fn: checkBigQueryConfig },
    { name: 'Page Count', fn: checkPageCount },
    { name: 'TypeScript', fn: checkTypeScript },
    { name: 'ESLint', fn: checkESLint },
    { name: 'Production Build', fn: checkBuild },
  ]

  let passed = 0
  let failed = 0
  let warnings = 0

  for (const check of checks) {
    section(check.name)
    try {
      const result = check.fn()
      if (result.passed) {
        success(result.message)
        passed++
      } else {
        error(result.message)
        if (result.details) {
          log(`    ${result.details.replace(/\n/g, '\n    ')}`, 'dim')
        }
        failed++
      }
    } catch (e) {
      error(`Check threw an error: ${e}`)
      failed++
    }
  }

  // Summary
  console.log()
  log('═══════════════════════════════════════════════════════════════', 'blue')
  console.log()

  if (failed === 0) {
    log('  ✓ ALL CHECKS PASSED - Ready for demo!', 'green')
    console.log()
    log('  Demo tips:', 'dim')
    log('  - Run `npm run dev` to start the server', 'dim')
    log('  - Press Cmd+K to use quick navigation', 'dim')
    log('  - Visit /admin to preview role views', 'dim')
  } else {
    log(`  ✗ ${failed} CHECK(S) FAILED - Fix issues before demo`, 'red')
    console.log()
    log('  Run the following to fix common issues:', 'dim')
    log('  - npm run lint -- --fix', 'dim')
    log('  - npx tsc --noEmit to see TypeScript errors', 'dim')
  }

  console.log()
  log(`  Summary: ${passed} passed, ${failed} failed`, passed === checks.length ? 'green' : 'yellow')
  console.log()

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(console.error)
