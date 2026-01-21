/**
 * Flexible Validator Service
 *
 * Pattern-based validation rules that work across unknown data schemas.
 * Used by /api/rtx/integrity to validate RTX data without requiring
 * explicit schema definitions upfront.
 */

export interface ValidationRule {
  id: string
  name: string
  pattern: RegExp // Field name pattern to match
  validation: (value: unknown) => boolean
  severity: 'error' | 'warning' | 'info'
  message: string
}

export interface ValidationViolation {
  field: string
  rule: string
  ruleName: string
  value: unknown
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface RecordValidationResult {
  recordId: string | unknown
  violations: ValidationViolation[]
  qualityScore: number
  isValid: boolean
}

/**
 * Built-in flexible validation rules
 *
 * These rules use field name patterns to apply appropriate validation
 * without requiring explicit schema definitions.
 */
export const FLEXIBLE_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'FV001',
    name: 'ID fields not null',
    pattern: /_id$/,
    validation: (v) => v !== null && v !== undefined && v !== '',
    severity: 'error',
    message: 'ID fields should not be null or empty'
  },
  {
    id: 'FV002',
    name: 'Amount fields non-negative',
    pattern: /amount|value|price|revenue|cost|total|balance/i,
    validation: (v) => typeof v !== 'number' || v >= 0,
    severity: 'warning',
    message: 'Amount fields should be >= 0'
  },
  {
    id: 'FV003',
    name: 'Date fields valid ISO 8601',
    pattern: /_date$|_at$|_time$|created|updated|modified|started|ended|scheduled/i,
    validation: (v) => {
      if (v === null || v === undefined) return true
      const dateStr = String(v)
      const parsed = Date.parse(dateStr)
      return !isNaN(parsed)
    },
    severity: 'warning',
    message: 'Date fields should be valid ISO 8601 format'
  },
  {
    id: 'FV004',
    name: 'Email fields valid format',
    pattern: /email/i,
    validation: (v) => {
      if (v === null || v === undefined || v === '') return true
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))
    },
    severity: 'warning',
    message: 'Email fields should match email format'
  },
  {
    id: 'FV005',
    name: 'Status fields not empty',
    pattern: /status|state|stage/i,
    validation: (v) => {
      if (v === null || v === undefined) return false
      return String(v).trim() !== ''
    },
    severity: 'warning',
    message: 'Status fields should not be empty'
  },
  {
    id: 'FV006',
    name: 'Percentage fields 0-100',
    pattern: /percent|pct|rate$/i,
    validation: (v) => {
      if (typeof v !== 'number') return true
      return v >= 0 && v <= 100
    },
    severity: 'warning',
    message: 'Percentage fields should be between 0 and 100'
  },
  {
    id: 'FV007',
    name: 'Phone fields valid digits',
    pattern: /phone|mobile|tel|fax/i,
    validation: (v) => {
      if (v === null || v === undefined || v === '') return true
      const digits = String(v).replace(/\D/g, '')
      return digits.length >= 10 && digits.length <= 15
    },
    severity: 'info',
    message: 'Phone fields should have 10-15 digits'
  },
  {
    id: 'FV008',
    name: 'Count fields non-negative integer',
    pattern: /count|quantity|qty|num_|number_of/i,
    validation: (v) => {
      if (typeof v !== 'number') return true
      return v >= 0 && Number.isInteger(v)
    },
    severity: 'warning',
    message: 'Count fields should be non-negative integers'
  },
  {
    id: 'FV009',
    name: 'URL fields valid format',
    pattern: /url|link|href|website/i,
    validation: (v) => {
      if (v === null || v === undefined || v === '') return true
      try {
        new URL(String(v))
        return true
      } catch {
        return false
      }
    },
    severity: 'info',
    message: 'URL fields should be valid URLs'
  },
  {
    id: 'FV010',
    name: 'Name fields not just whitespace',
    pattern: /^name$|_name$/i,
    validation: (v) => {
      if (v === null || v === undefined) return true
      return String(v).trim().length > 0
    },
    severity: 'warning',
    message: 'Name fields should not be only whitespace'
  }
]

/**
 * Validate a single record against all applicable rules
 */
export function validateRecord(
  record: Record<string, unknown>,
  rules: ValidationRule[] = FLEXIBLE_VALIDATION_RULES
): ValidationViolation[] {
  const violations: ValidationViolation[] = []

  for (const [fieldName, value] of Object.entries(record)) {
    for (const rule of rules) {
      // Check if the rule pattern matches the field name
      if (rule.pattern.test(fieldName)) {
        // Run the validation
        if (!rule.validation(value)) {
          violations.push({
            field: fieldName,
            rule: rule.id,
            ruleName: rule.name,
            value,
            message: rule.message,
            severity: rule.severity
          })
        }
      }
    }
  }

  return violations
}

/**
 * Calculate a quality score based on violations
 *
 * Scoring:
 * - Start at 100
 * - error: -10 points
 * - warning: -3 points
 * - info: -1 point
 * - Minimum score: 0
 */
export function calculateQualityScore(violations: ValidationViolation[]): number {
  let score = 100

  for (const v of violations) {
    switch (v.severity) {
      case 'error':
        score -= 10
        break
      case 'warning':
        score -= 3
        break
      case 'info':
        score -= 1
        break
    }
  }

  return Math.max(0, score)
}

/**
 * Validate a single record and return full result
 */
export function validateRecordFull(
  record: Record<string, unknown>,
  rules: ValidationRule[] = FLEXIBLE_VALIDATION_RULES
): RecordValidationResult {
  const violations = validateRecord(record, rules)
  const qualityScore = calculateQualityScore(violations)

  return {
    recordId: record.id,
    violations,
    qualityScore,
    isValid: violations.filter(v => v.severity === 'error').length === 0
  }
}

/**
 * Validate multiple records and return aggregated statistics
 */
export function validateRecords(
  records: Record<string, unknown>[],
  rules: ValidationRule[] = FLEXIBLE_VALIDATION_RULES
): {
  totalRecords: number
  validRecords: number
  invalidRecords: number
  averageQualityScore: number
  violationsByRule: Record<string, number>
  violationsBySeverity: Record<string, number>
  topViolations: ValidationViolation[]
} {
  const results = records.map(r => validateRecordFull(r, rules))

  // Count violations by rule
  const violationsByRule: Record<string, number> = {}
  const violationsBySeverity: Record<string, number> = { error: 0, warning: 0, info: 0 }
  const allViolations: ValidationViolation[] = []

  for (const result of results) {
    for (const violation of result.violations) {
      violationsByRule[violation.rule] = (violationsByRule[violation.rule] || 0) + 1
      violationsBySeverity[violation.severity]++
      allViolations.push(violation)
    }
  }

  // Calculate averages
  const totalScore = results.reduce((sum, r) => sum + r.qualityScore, 0)
  const averageQualityScore = records.length > 0 ? totalScore / records.length : 100

  // Get top violations (most frequent)
  const topViolations = allViolations
    .slice(0, 20) // Limit to first 20

  return {
    totalRecords: records.length,
    validRecords: results.filter(r => r.isValid).length,
    invalidRecords: results.filter(r => !r.isValid).length,
    averageQualityScore: Math.round(averageQualityScore * 100) / 100,
    violationsByRule,
    violationsBySeverity,
    topViolations
  }
}

/**
 * Get applicable rules for a set of field names
 * Useful for debugging which rules will apply to an entity
 */
export function getApplicableRules(
  fieldNames: string[],
  rules: ValidationRule[] = FLEXIBLE_VALIDATION_RULES
): { fieldName: string; rules: ValidationRule[] }[] {
  return fieldNames.map(fieldName => ({
    fieldName,
    rules: rules.filter(rule => rule.pattern.test(fieldName))
  }))
}
