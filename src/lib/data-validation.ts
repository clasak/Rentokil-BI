/**
 * Data Validation Layer
 *
 * Provides real-time validation checks for KPI calculations and data integrity.
 * This layer connects the actual data to the Data Quality dashboard by running
 * validation rules and reporting issues.
 *
 * In simulation mode, this validates the synthetic data.
 * In production, this would validate real data from RTX/Salesforce/etc.
 */

import { calculateKPIValues } from './kpi-calculations'
import { KPIValue } from '@/types'
import { KPI_DICTIONARY, getKPIBySlug } from './kpis'
import { isValidNumber, safeDivide } from './utils'

export type ValidationSeverity = 'critical' | 'warning' | 'info'
export type ValidationCategory = 'null_detection' | 'nan_detection' | 'range_validation' | 'freshness' | 'cross_source' | 'calculation_error'

export interface ValidationIssue {
  id: string
  category: ValidationCategory
  severity: ValidationSeverity
  kpiSlug?: string
  fieldName: string
  displayName: string
  message: string
  actualValue: string | number | null
  expectedRange?: { min: number; max: number }
  detectedAt: Date
  source: string
  remediation: string
}

export interface ValidationResult {
  isValid: boolean
  score: number // 0-100
  issues: ValidationIssue[]
  checks: ValidationCheck[]
  lastValidated: Date
}

export interface ValidationCheck {
  name: string
  category: ValidationCategory
  passed: boolean
  recordsChecked: number
  issuesFound: number
  executionTime: number // ms
}

// Define validation rules with expected ranges
// Note: KPI slugs use underscores (e.g., 'revenue_mtd')
const KPI_VALIDATION_RULES: Record<string, { min: number; max: number; unit: string }> = {
  'revenue_mtd': { min: 0, max: 50000000, unit: 'currency' },
  'pipeline_30_60_90': { min: 0, max: 100000000, unit: 'currency' },
  'forecast_revenue': { min: 0, max: 50000000, unit: 'currency' },
  'variance_to_target': { min: -100, max: 100, unit: 'percent' },
  'service_risk_index': { min: 0, max: 100, unit: 'index' },
  'scheduling_pressure': { min: 0, max: 200, unit: 'index' },
  'ar_aging': { min: 0, max: 1000000000, unit: 'currency' },
  'retention_risk': { min: 0, max: 50, unit: 'count' },
  'nrr': { min: 50, max: 150, unit: 'percent' },
  'margin_proxy': { min: 0, max: 100, unit: 'percent' },
  'crm_hygiene': { min: 0, max: 100, unit: 'percent' },
  'win_rate': { min: 0, max: 100, unit: 'percent' },
  'avg_deal_size': { min: 0, max: 1000000, unit: 'currency' }
}

/**
 * Run all validation checks against current KPI data
 */
export function runValidation(): ValidationResult {
  const startTime = Date.now()
  const issues: ValidationIssue[] = []
  const checks: ValidationCheck[] = []

  // Get current KPI values
  const kpiValues = calculateKPIValues()

  // 1. NaN Detection
  const nanCheck = runNaNDetection(kpiValues, issues)
  checks.push(nanCheck)

  // 2. Range Validation
  const rangeCheck = runRangeValidation(kpiValues, issues)
  checks.push(rangeCheck)

  // 3. NULL Detection (for delta percent)
  const nullCheck = runNullDetection(kpiValues, issues)
  checks.push(nullCheck)

  // 4. Calculation Consistency
  const calcCheck = runCalculationConsistency(kpiValues, issues)
  checks.push(calcCheck)

  // Calculate overall score
  const totalChecks = checks.reduce((sum, c) => sum + c.recordsChecked, 0)
  const totalIssues = issues.length
  const score = totalChecks > 0 ? Math.round((1 - totalIssues / totalChecks) * 100) : 100

  return {
    isValid: issues.filter(i => i.severity === 'critical').length === 0,
    score: Math.max(0, Math.min(100, score)),
    issues,
    checks,
    lastValidated: new Date()
  }
}

/**
 * Detect NaN values in KPI calculations
 */
function runNaNDetection(
  kpiValues: Map<string, KPIValue>,
  issues: ValidationIssue[]
): ValidationCheck {
  const startTime = Date.now()
  let recordsChecked = 0
  let issuesFound = 0

  kpiValues.forEach((kpiValue, slug) => {
    if (!kpiValue) return
    recordsChecked++

    const kpiDef = getKPIBySlug(slug)
    const displayName = kpiDef?.name || slug

    // Check main value
    if (typeof kpiValue.value === 'number' && !isValidNumber(kpiValue.value)) {
      issuesFound++
      issues.push({
        id: `nan-${slug}-value`,
        category: 'nan_detection',
        severity: 'critical',
        kpiSlug: slug,
        fieldName: 'value',
        displayName,
        message: `KPI value is NaN or Infinity`,
        actualValue: String(kpiValue.value),
        detectedAt: new Date(),
        source: 'calculated',
        remediation: 'Check division operations for zero denominators'
      })
    }

    // Check delta percent
    if (typeof kpiValue.deltaPercent === 'number' && !isValidNumber(kpiValue.deltaPercent)) {
      issuesFound++
      issues.push({
        id: `nan-${slug}-delta`,
        category: 'nan_detection',
        severity: 'warning',
        kpiSlug: slug,
        fieldName: 'deltaPercent',
        displayName: `${displayName} (% Change)`,
        message: `Delta percentage is NaN - likely due to zero prior value`,
        actualValue: String(kpiValue.deltaPercent),
        detectedAt: new Date(),
        source: 'calculated',
        remediation: 'Guard division by prior value with fallback when prior is zero'
      })
    }
  })

  return {
    name: 'NaN Detection',
    category: 'nan_detection',
    passed: issuesFound === 0,
    recordsChecked,
    issuesFound,
    executionTime: Date.now() - startTime
  }
}

/**
 * Validate KPI values are within expected ranges
 */
function runRangeValidation(
  kpiValues: Map<string, KPIValue>,
  issues: ValidationIssue[]
): ValidationCheck {
  const startTime = Date.now()
  let recordsChecked = 0
  let issuesFound = 0

  kpiValues.forEach((kpiValue, slug) => {
    if (!kpiValue || typeof kpiValue.value !== 'number') return

    const rule = KPI_VALIDATION_RULES[slug]
    if (!rule) return

    recordsChecked++
    const kpiDef = getKPIBySlug(slug)
    const displayName = kpiDef?.name || slug

    if (kpiValue.value < rule.min || kpiValue.value > rule.max) {
      issuesFound++
      const severity: ValidationSeverity =
        kpiValue.value < rule.min * 0.5 || kpiValue.value > rule.max * 2 ? 'critical' : 'warning'

      issues.push({
        id: `range-${slug}`,
        category: 'range_validation',
        severity,
        kpiSlug: slug,
        fieldName: 'value',
        displayName,
        message: `Value ${kpiValue.value} is outside expected range [${rule.min}, ${rule.max}]`,
        actualValue: kpiValue.value,
        expectedRange: rule,
        detectedAt: new Date(),
        source: 'calculated',
        remediation: `Verify calculation logic for ${slug}. Expected ${rule.unit} value between ${rule.min} and ${rule.max}`
      })
    }
  })

  return {
    name: 'Range Validation',
    category: 'range_validation',
    passed: issuesFound === 0,
    recordsChecked,
    issuesFound,
    executionTime: Date.now() - startTime
  }
}

/**
 * Detect NULL or undefined values where they shouldn't exist
 */
function runNullDetection(
  kpiValues: Map<string, KPIValue>,
  issues: ValidationIssue[]
): ValidationCheck {
  const startTime = Date.now()
  let recordsChecked = 0
  let issuesFound = 0

  // Critical KPIs that should always have values (using underscore slugs)
  const requiredKPIs = ['revenue_mtd', 'pipeline_30_60_90', 'forecast_revenue']

  requiredKPIs.forEach(slug => {
    recordsChecked++
    const kpiValue = kpiValues.get(slug)
    const kpiDef = getKPIBySlug(slug)
    const displayName = kpiDef?.name || slug

    if (!kpiValue || kpiValue.value === null || kpiValue.value === undefined) {
      issuesFound++
      issues.push({
        id: `null-${slug}`,
        category: 'null_detection',
        severity: 'critical',
        kpiSlug: slug,
        fieldName: 'value',
        displayName,
        message: `Required KPI is missing or null`,
        actualValue: null,
        detectedAt: new Date(),
        source: 'calculated',
        remediation: 'Ensure data source is connected and calculation runs successfully'
      })
    }
  })

  return {
    name: 'NULL Detection',
    category: 'null_detection',
    passed: issuesFound === 0,
    recordsChecked,
    issuesFound,
    executionTime: Date.now() - startTime
  }
}

/**
 * Check for calculation consistency (e.g., variance should reconcile)
 */
function runCalculationConsistency(
  kpiValues: Map<string, KPIValue>,
  issues: ValidationIssue[]
): ValidationCheck {
  const startTime = Date.now()
  let recordsChecked = 0
  let issuesFound = 0

  // Check pipeline value (single consolidated metric)
  const pipelineAll = kpiValues.get('pipeline_30_60_90')

  if (pipelineAll && typeof pipelineAll.value === 'number') {
    recordsChecked++
    // Pipeline should be positive
    if (pipelineAll.value < 0) {
      issuesFound++
      issues.push({
        id: 'consistency-pipeline-negative',
        category: 'calculation_error',
        severity: 'critical',
        fieldName: 'pipeline_30_60_90',
        displayName: 'Pipeline 30/60/90',
        message: `Pipeline value is negative (${pipelineAll.value})`,
        actualValue: pipelineAll.value,
        detectedAt: new Date(),
        source: 'calculated',
        remediation: 'Review opportunity amount calculations - pipeline cannot be negative'
      })
    }
  }

  // Check that percentages are in valid range (0-100 typically)
  const percentageKPIs = ['variance_to_target', 'margin_proxy', 'crm_hygiene', 'nrr']
  percentageKPIs.forEach(slug => {
    const kpiValue = kpiValues.get(slug)
    if (!kpiValue || typeof kpiValue.value !== 'number') return
    recordsChecked++

    const kpiDef = getKPIBySlug(slug)
    const displayName = kpiDef?.name || slug

    // Special handling for NRR which can be > 100
    const maxPercent = slug === 'nrr' ? 200 : 100
    const minPercent = slug === 'variance_to_target' ? -100 : 0

    if (kpiValue.value < minPercent || kpiValue.value > maxPercent) {
      issuesFound++
      issues.push({
        id: `consistency-${slug}-percent`,
        category: 'calculation_error',
        severity: kpiValue.value > 1000 ? 'critical' : 'warning',
        kpiSlug: slug,
        fieldName: 'value',
        displayName,
        message: `Percentage value ${kpiValue.value}% is outside expected range [${minPercent}%, ${maxPercent}%]`,
        actualValue: kpiValue.value,
        expectedRange: { min: minPercent, max: maxPercent },
        detectedAt: new Date(),
        source: 'calculated',
        remediation: 'Check calculation formula - ensure result is properly scaled as percentage'
      })
    }
  })

  return {
    name: 'Calculation Consistency',
    category: 'calculation_error',
    passed: issuesFound === 0,
    recordsChecked,
    issuesFound,
    executionTime: Date.now() - startTime
  }
}

/**
 * Get a summary of validation status for dashboard display
 */
export function getValidationSummary(): {
  score: number
  status: 'healthy' | 'warning' | 'critical'
  critical: number
  warning: number
  info: number
  lastChecked: Date
} {
  const result = runValidation()

  const critical = result.issues.filter(i => i.severity === 'critical').length
  const warning = result.issues.filter(i => i.severity === 'warning').length
  const info = result.issues.filter(i => i.severity === 'info').length

  let status: 'healthy' | 'warning' | 'critical' = 'healthy'
  if (critical > 0) status = 'critical'
  else if (warning > 0) status = 'warning'

  return {
    score: result.score,
    status,
    critical,
    warning,
    info,
    lastChecked: result.lastValidated
  }
}

/**
 * Format validation issues for display in Data Quality dashboard
 */
export function getFormattedValidationIssues(): Array<{
  id: string
  category: string
  severity: ValidationSeverity
  title: string
  description: string
  field: string
  value: string
  source: string
  remediation: string
  detectedAt: string
}> {
  const result = runValidation()

  return result.issues.map(issue => ({
    id: issue.id,
    category: issue.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    severity: issue.severity,
    title: issue.displayName,
    description: issue.message,
    field: issue.fieldName,
    value: issue.actualValue === null ? 'NULL' : String(issue.actualValue),
    source: issue.source,
    remediation: issue.remediation,
    detectedAt: issue.detectedAt.toISOString()
  }))
}
