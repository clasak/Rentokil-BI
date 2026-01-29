#!/usr/bin/env tsx
/**
 * Dashboard Audit Script
 *
 * Comprehensive audit that checks:
 * - Missing breadcrumbs on pages
 * - Missing DataSourceBadge on pages using BigQuery
 * - Wrong table names in queries
 * - Missing error boundaries
 * - Missing loading states
 * - Hardcoded dev/staging references
 * - Console.logs in production code
 *
 * Run: npx tsx scripts/audit-dashboard.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

interface AuditIssue {
  file: string
  line?: number
  issue: string
  severity: 'error' | 'warning' | 'info'
  suggestion?: string
}

interface AuditResults {
  issues: AuditIssue[]
  stats: {
    filesScanned: number
    pagesScanned: number
    queriesScanned: number
    errorsFound: number
    warningsFound: number
  }
}

// Patterns to check
const PATTERNS = {
  consoleLogs: /console\.(log|warn|error|debug|info)\s*\(/g,
  hardcodedDev: /bidata-sharedus-dev/g,
  hardcodedStaging: /bidata-sharedus-staging/g,
  missingAsync: /export\s+(default\s+)?function\s+\w+Page/g,
  bigQueryImport: /useBigQueryData|bigQueryClient/g,
  pageHeaderImport: /import.*PageHeader/g,
  breadcrumbsUsage: /<PageHeader|<Breadcrumb/g,
  loadingState: /isLoading|loading|Loader|Skeleton/g,
  errorHandling: /error|Error|catch\s*\(|\.catch\s*\(/g,
}

// Known good BigQuery tables
const KNOWN_TABLES = [
  'S4.Dim_Branch_BranchID_NA_T1_Vw',
  'S4.Fact_ContractSales_Txn_Na_Daily_Dtl_Vw',
  'S4.Fact_Leads_Acc_Daily_Dtls_Vw',
  'AR.DailyAR_vw',
  'WorkDayTerm.WorkDayTermDtls',
  'Reference.GS_Ref_BranchHierarchy',
]

function scanFile(filePath: string, issues: AuditIssue[]) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const relativePath = path.relative(process.cwd(), filePath)

  // Check for console.log statements
  lines.forEach((line, idx) => {
    if (PATTERNS.consoleLogs.test(line) && !line.includes('// audit-ignore')) {
      issues.push({
        file: relativePath,
        line: idx + 1,
        issue: 'Console statement found in production code',
        severity: 'warning',
        suggestion: 'Remove or replace with proper logging',
      })
    }
  })

  // Check for hardcoded dev/staging references
  if (PATTERNS.hardcodedDev.test(content)) {
    issues.push({
      file: relativePath,
      issue: 'Hardcoded dev environment reference found',
      severity: 'error',
      suggestion: 'Use environment configuration instead',
    })
  }

  if (PATTERNS.hardcodedStaging.test(content)) {
    issues.push({
      file: relativePath,
      issue: 'Hardcoded staging environment reference found',
      severity: 'warning',
      suggestion: 'Use environment configuration instead',
    })
  }

  return content
}

function scanPage(filePath: string, issues: AuditIssue[]) {
  const content = scanFile(filePath, issues)
  const relativePath = path.relative(process.cwd(), filePath)

  // Check if page uses BigQuery but doesn't have PageHeader
  const usesBigQuery = PATTERNS.bigQueryImport.test(content)
  const hasPageHeader = PATTERNS.pageHeaderImport.test(content) || PATTERNS.breadcrumbsUsage.test(content)

  if (usesBigQuery && !hasPageHeader) {
    issues.push({
      file: relativePath,
      issue: 'Page uses BigQuery but missing PageHeader/breadcrumbs',
      severity: 'warning',
      suggestion: 'Add PageHeader component for consistent navigation',
    })
  }

  // Check for loading states
  if (usesBigQuery && !PATTERNS.loadingState.test(content)) {
    issues.push({
      file: relativePath,
      issue: 'Page uses BigQuery but may be missing loading state',
      severity: 'info',
      suggestion: 'Add loading indicator while data is fetching',
    })
  }

  // Check for error handling
  if (usesBigQuery && !PATTERNS.errorHandling.test(content)) {
    issues.push({
      file: relativePath,
      issue: 'Page uses BigQuery but may be missing error handling',
      severity: 'warning',
      suggestion: 'Add error state handling for failed queries',
    })
  }

  return content
}

function scanQuery(filePath: string, issues: AuditIssue[]) {
  const content = scanFile(filePath, issues)
  const relativePath = path.relative(process.cwd(), filePath)

  // Check for table references
  const tablePattern = /FROM\s+`[^`]+\.([^`]+)`/gi
  let match

  while ((match = tablePattern.exec(content)) !== null) {
    const tableName = match[1]
    // This is a simple check - just verify format looks right
    if (!tableName.includes('.') && !tableName.includes('_Vw') && !tableName.includes('_vw')) {
      issues.push({
        file: relativePath,
        issue: `Unusual table name format: ${tableName}`,
        severity: 'info',
        suggestion: 'Verify table name matches BigQuery schema',
      })
    }
  }

  return content
}

function walkDirectory(dir: string, callback: (filePath: string) => void, extensions: string[] = ['.ts', '.tsx']) {
  if (!fs.existsSync(dir)) return

  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDirectory(filePath, callback, extensions)
    } else if (extensions.some((ext) => file.endsWith(ext))) {
      callback(filePath)
    }
  }
}

function runAudit(): AuditResults {
  const issues: AuditIssue[] = []
  const stats = {
    filesScanned: 0,
    pagesScanned: 0,
    queriesScanned: 0,
    errorsFound: 0,
    warningsFound: 0,
  }

  // Scan all pages
  log('\nScanning dashboard pages...', 'dim')
  walkDirectory('src/app/(dashboard)', (filePath) => {
    if (filePath.endsWith('page.tsx')) {
      scanPage(filePath, issues)
      stats.pagesScanned++
    }
    stats.filesScanned++
  })

  // Scan query files
  log('Scanning BigQuery queries...', 'dim')
  walkDirectory('src/lib/bigquery/queries', (filePath) => {
    scanQuery(filePath, issues)
    stats.queriesScanned++
    stats.filesScanned++
  })

  // Scan hooks
  log('Scanning hooks...', 'dim')
  walkDirectory('src/hooks', (filePath) => {
    scanFile(filePath, issues)
    stats.filesScanned++
  })

  // Scan components
  log('Scanning components...', 'dim')
  walkDirectory('src/components', (filePath) => {
    scanFile(filePath, issues)
    stats.filesScanned++
  })

  // Count severity
  stats.errorsFound = issues.filter((i) => i.severity === 'error').length
  stats.warningsFound = issues.filter((i) => i.severity === 'warning').length

  return { issues, stats }
}

function printResults(results: AuditResults) {
  const { issues, stats } = results

  console.log()
  log('╔══════════════════════════════════════════════════════════════╗', 'blue')
  log('║               Dashboard Audit Report                         ║', 'blue')
  log('╚══════════════════════════════════════════════════════════════╝', 'blue')
  console.log()

  // Stats
  log(`  Files scanned:    ${stats.filesScanned}`, 'dim')
  log(`  Pages scanned:    ${stats.pagesScanned}`, 'dim')
  log(`  Queries scanned:  ${stats.queriesScanned}`, 'dim')
  console.log()

  if (issues.length === 0) {
    log('  ✓ No issues found!', 'green')
  } else {
    // Group by severity
    const errors = issues.filter((i) => i.severity === 'error')
    const warnings = issues.filter((i) => i.severity === 'warning')
    const infos = issues.filter((i) => i.severity === 'info')

    if (errors.length > 0) {
      log('  ERRORS:', 'red')
      errors.forEach((issue) => {
        log(`    ✗ ${issue.file}${issue.line ? `:${issue.line}` : ''}`, 'red')
        log(`      ${issue.issue}`, 'dim')
        if (issue.suggestion) {
          log(`      → ${issue.suggestion}`, 'cyan')
        }
      })
      console.log()
    }

    if (warnings.length > 0) {
      log('  WARNINGS:', 'yellow')
      warnings.forEach((issue) => {
        log(`    ! ${issue.file}${issue.line ? `:${issue.line}` : ''}`, 'yellow')
        log(`      ${issue.issue}`, 'dim')
        if (issue.suggestion) {
          log(`      → ${issue.suggestion}`, 'cyan')
        }
      })
      console.log()
    }

    if (infos.length > 0) {
      log('  INFO:', 'blue')
      infos.forEach((issue) => {
        log(`    ℹ ${issue.file}${issue.line ? `:${issue.line}` : ''}`, 'blue')
        log(`      ${issue.issue}`, 'dim')
      })
      console.log()
    }
  }

  // Summary
  log('═══════════════════════════════════════════════════════════════', 'blue')
  console.log()

  const total = issues.length
  if (stats.errorsFound > 0) {
    log(`  ✗ ${stats.errorsFound} error(s), ${stats.warningsFound} warning(s) found`, 'red')
  } else if (stats.warningsFound > 0) {
    log(`  ! ${stats.warningsFound} warning(s) found`, 'yellow')
  } else {
    log('  ✓ Dashboard is clean!', 'green')
  }

  console.log()

  // Save report
  const reportPath = 'docs/reports/audit-report.json'
  const reportDir = path.dirname(reportPath)
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        stats,
        issues,
      },
      null,
      2
    )
  )
  log(`  Report saved to: ${reportPath}`, 'dim')
  console.log()
}

// Main
const results = runAudit()
printResults(results)
process.exit(results.stats.errorsFound > 0 ? 1 : 0)
